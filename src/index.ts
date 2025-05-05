import { Command } from "commander";
import * as path from 'path';
import * as fs from 'fs';
import { AIReviewService } from "./ai-rules/ai-review.service.js";
import { AIClient } from "./ai/client.js";
import { GitLabService } from "./gitlab/gitlab.service.js";
import { delay, getLineObj } from "./utils/index.js";
import { ConfigLoader } from "./config/config-loader.js";
import { FileUtils } from "./utils/file-utils.js";
import { RateLimiter } from "./utils/rate-limiter.js";
import ora from 'ora';
import chalk from 'chalk';

const program = new Command();

program
  .option("-a, --openai-access-token <string>", "OpenAI Access Token")
  .option("-p, --project-id <number>", "GitLab Project ID")
  .option("-m, --merge-request-id <string>", "GitLab Merge Request ID")
  .option("-org, --organization-id <number>", "organization ID")
  .option("-c, --custom-model <string>", "Custom Model ID", "gpt-3.5-turbo")
  .option(
    "--mode <mode>",
    "AI mode to use (openai or gemini)",
    "openai"
  )
  .option(
    "--config <path>",
    "Path to configuration file",
    "./.review-code-ai.json"
  )
  .option("-r, --rules-path <string>", "Path to custom rules directory or file")
  .option("--no-default-rules", "Disable default rules")
  .parse(process.argv);

async function run(
  projectId: string,
  mergeRequestId: string,
  gitlabToken: string,
  openaiApiKey: string,
  geminiApiKey: string,
  mode: string,
  configPath?: string
) {
  const spinner = ora('Initializing code review...').start();
  
  try {
    // Load configuration
    spinner.text = 'Loading configuration...';
    const config = await ConfigLoader.loadConfig(configPath);
    
    // Initialize services
    const gitlab = new GitLabService(gitlabToken, projectId);
    const aiClient = new AIClient(openaiApiKey, geminiApiKey);
    
    // Initialize AIReviewService with empty rules for now
    const aiReviewService = new AIReviewService([], {
      apiUrl: '',
      accessToken: openaiApiKey,
      model: 'gpt-4',
    });
    
    const rateLimiter = new RateLimiter(config.rateLimit?.requestsPerMinute || 60);

    spinner.text = `Starting code review for merge request ${mergeRequestId} in project ${projectId}`;
    console.log();

    // Get merge request changes
    spinner.text = 'Fetching merge request changes...';
    const changes = await gitlab.getMergeRequestChanges(mergeRequestId);
    
    const filteredChanges = changes.filter((change: { new_path: string }) => {
      if (!change.new_path) return false;
      
      try {
        return FileUtils.isTextFile(change.new_path) &&
               ConfigLoader.shouldProcessFile(change.new_path, config);
      } catch (error) {
        console.warn(`Error processing file ${change.new_path}:`, error);
        return false;
      }
    });

    console.log(`\n${chalk.bold('Reviewing changes:')}`);
    console.log(`- Found ${changes.length} files with changes`);
    console.log(`- ${filteredChanges.length} files after filtering\n`);

    if (filteredChanges.length === 0) {
      spinner.succeed('No files to review after applying filters');
      return;
    }


    // Process each file
    for (const change of filteredChanges) {
      if (!change.diff) continue;

      const fileSpinner = ora(`Processing ${change.new_path}`).start();
      
      try {
        // Split diff into blocks of code
        const diffBlocks = change.diff.split("\n\n").filter(Boolean);
        fileSpinner.text = `Processing ${change.new_path} (${diffBlocks.length} blocks)`;

        // Process each block
        for (const block of diffBlocks) {
          try {
            // Apply rate limiting
            await rateLimiter.acquire();

            // Parse line numbers from the diff block
            const lineRegex = /@@\s-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/;
            const matches = lineRegex.exec(block);
            let lineObj = {};
            if (matches) {
              lineObj = getLineObj(matches, block);
            }


            // Get AI review using the configured rules
            const results = await aiReviewService.reviewWithAllRules(
              block,
              { provider: mode as "openai" | "gemini" }
            );

            // Filter out any rules that didn't find issues
            const meaningfulResults = results.filter(result => {
              if (!result.review) return false;
              
              const reviewText = result.review.trim();
              return reviewText.length > 0 && 
                     !reviewText.toUpperCase().includes("NO_ISSUES");
            });

            // If we have meaningful results, post them
            if (meaningfulResults.length > 0) {
              const formattedResults = aiReviewService.formatResults(meaningfulResults);
              if (formattedResults && formattedResults.trim().length > 0) {
                await gitlab.addReviewComment(
                  { ...lineObj, new_content: block } as any,
                  change,
                  formattedResults,
                  mergeRequestId
                );
                await delay(1000);
              }
            }
                fileSpinner.succeed(chalk.green(`Processed ${change.new_path} (${meaningfulResults.length} issues found)`));
          } catch (blockError: any) {
            fileSpinner.fail(chalk.red(`Error processing block in ${change.new_path}`));
            console.error('Block error:', blockError);
            continue;
          }
        }
      } catch (fileError: any) {
        fileSpinner.fail(chalk.red(`Error processing file ${change.new_path}`));
        console.error('File error:', fileError);
        continue;
      }
    }

    spinner.succeed(chalk.green('Code review completed successfully'));
  } catch (e: any) {
    spinner.fail(chalk.red('Code review failed'));
    
    if (e?.response?.status === 429) {
      console.log(chalk.yellow("\n⚠️  Too Many Requests, waiting 60 seconds before retry..."));
      await delay(60000);
      await run(projectId, mergeRequestId, gitlabToken, openaiApiKey, geminiApiKey, mode, configPath);
    } else {
      console.error(chalk.red("\nError:"), e);
      process.exit(1);
    }
  } finally {
    spinner.stop();
  }
}

const {
  gitlabApiUrl,
  gitlabAccessToken,
  openaiApiUrl,
  openaiAccessToken,
  projectId,
  mergeRequestId,
  organizationId,
  customModel,
  mode,
  config
} = program.opts();

run(
  projectId,
  mergeRequestId,
  gitlabAccessToken,
  openaiAccessToken,
  "",
  mode,
  config
);
module.exports = run;
