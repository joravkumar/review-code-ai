import { Command } from "commander";
import { GitLab } from "./gitlab";
import { OpenAI } from "./openai";
import { Gemini } from "./gemini";
import { delay, getDiffBlocks, getLineObj } from "./utils";
import { AIReviewService } from "./ai-rules/ai-review.service";
import * as path from "path";

const program = new Command();

program
  .option(
    "-g, --gitlab-api-url <string>",
    "GitLab API URL",
    " https://gitlab.com/api/v4"
  )
  .option("-t, --gitlab-access-token <string>", "GitLab Access Token")
  .option(
    "-o, --openai-api-url <string>",
    "OpenAI API URL",
    "https://api.openai.com/v1"
  )
  .option("-a, --openai-access-token <string>", "OpenAI Access Token")
  .option("-p, --project-id <number>", "GitLab Project ID")
  .option("-m, --merge-request-id <string>", "GitLab Merge Request ID")
  .option("-org, --organization-id <number>", "organization ID")
  .option("-c, --custom-model <string>", "Custom Model ID", "gpt-3.5-turbo")
  .option("-mode, --mode <string>", "Mode use OpenAI or Gemini", "openai") // add mode option
  .parse(process.argv);

async function run() {
  const {
    gitlabApiUrl,
    gitlabAccessToken,
    openaiApiUrl,
    openaiAccessToken,
    projectId,
    mergeRequestId,
    organizationId,
    customModel,
    mode, // get the mode option
  } = program.opts();

  const gitlab = new GitLab({
    gitlabApiUrl,
    gitlabAccessToken,
    projectId,
    mergeRequestId,
  });

  // Initialize AI Review Service with rules
  const aiReviewService = new AIReviewService(
    undefined, // Using default rules from all-rules.ts
    {
      apiUrl: openaiApiUrl,
      accessToken: openaiAccessToken,
      orgId: organizationId,
      model: customModel,
    },
    mode === "gemini"
      ? {
          apiUrl: openaiApiUrl,
          accessToken: openaiAccessToken,
          model: customModel,
        }
      : undefined
  );

  // Load AI rules
  await aiReviewService.initialize();

  let aiClient;
  if (mode === "gemini") {
    console.log("Creating Gemini client...");
    aiClient = new Gemini(openaiApiUrl, openaiAccessToken, customModel);
  } else {
    console.log("Creating OpenAI client...");
    aiClient = new OpenAI(
      openaiApiUrl,
      openaiAccessToken,
      organizationId,
      customModel
    );
  }

  await gitlab.init().catch(() => {
    console.log("gitlab init error");
  });

  const changes = await gitlab.getMergeRequestChanges().catch(() => {
    console.log("get merge request changes error");
  });

  for (const change of changes) {
    if (
      change.renamed_file ||
      change.deleted_file ||
      !change?.diff?.startsWith("@@")
    ) {
      continue;
    }
    const diffBlocks = getDiffBlocks(change.diff);
    for (const block of diffBlocks) {
      try {
        // Parse line numbers from the diff block
        const lineRegex = /@@\s-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/;
        const matches = lineRegex.exec(block);
        let lineObj = {};
        if (matches) {
          lineObj = getLineObj(matches, block);
        }

        // Use AI review service with all rules
        const results = await aiReviewService.reviewWithAllRules(
          block,
          mode as "openai" | "gemini"
        );

        // Format and post the results
        const formattedResults = aiReviewService.formatResults(results);
        if (
          formattedResults &&
          !formattedResults.includes("No rules were applied")
        ) {
          await gitlab.addReviewComment(
            { ...lineObj, new_content: block },
            change,
            `### AI Code Review Results\n\n${formattedResults}`
          );
          await delay(1000);
        }

        // Fallback to direct AI review if needed
        const directResult = await aiClient.reviewCodeChange(block);
        if (directResult && directResult !== "666") {
          await gitlab.addReviewComment(
            { ...lineObj, new_content: block },
            change,
            directResult
          );
          await delay(1000);
        }
      } catch (e: any) {
        if (e?.response?.status === 429) {
          console.log("Too Many Requests, try again");
          await delay(60 * 1000);
          diffBlocks.push(block);
        } else {
          console.error("Error processing block:", e);
        }
      }
    }
  }
  console.log("done");
}

module.exports = run;
