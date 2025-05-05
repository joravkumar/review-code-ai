import * as fs from 'fs';
import { OpenAI } from '../openai';
import { Gemini } from '../gemini';
import { AIRule } from './ai-rule.interface';
import { allRules } from './all-rules';
import { loadRulesFromDirectory, loadRulesFromFile } from './rule-loader';

type AIProvider = 'openai' | 'gemini';

interface AIReviewOptions {
  provider?: AIProvider;
  filter?: (rule: AIRule) => boolean;
  maxConcurrent?: number;
}

interface AIReviewResult {
  ruleId: string;
  ruleName: string;
  review: string;
  severity: 'error' | 'warning' | 'info';
  metadata: {
    provider: string;
    timestamp: string;
    category?: string;
    rationale?: string;
  };
}

export class AIReviewService {
  private rules: AIRule[] = [];
  private openAIService?: OpenAI;
  private geminiService?: Gemini;
  private defaultProvider: AIProvider = 'openai';

  private customRulesPath?: string;
  private useDefaultRules: boolean = true;

  constructor(
    private rulesToUse: AIRule[] = [],
    openAIConfig?: { apiUrl: string; accessToken: string; orgId?: string; model?: string },
    geminiConfig?: { apiUrl: string; accessToken: string; model?: string },
    options?: {
      customRulesPath?: string;
      useDefaultRules?: boolean;
    }
  ) {
    this.rules = [...rulesToUse];
    this.customRulesPath = options?.customRulesPath;
    this.useDefaultRules = options?.useDefaultRules ?? true;
    
    if (openAIConfig) {
      this.openAIService = new OpenAI(
        openAIConfig.apiUrl,
        openAIConfig.accessToken,
        openAIConfig.orgId,
        openAIConfig.model
      );
    }

    if (geminiConfig) {
      this.geminiService = new Gemini(
        geminiConfig.apiUrl,
        geminiConfig.accessToken,
        geminiConfig.model
      );
    }
  }

  /**
   * Load rules from the configured paths
   */
  async initialize() {
    const rules: AIRule[] = [];

    // Load default rules if enabled
    if (this.useDefaultRules) {
      rules.push(...allRules);
    }

    // Load custom rules from file or directory if specified
    if (this.customRulesPath) {
      try {
        const stats = await fs.promises.stat(this.customRulesPath);
        let customRules: AIRule[] = [];

        if (stats.isDirectory()) {
          customRules = await loadRulesFromDirectory(this.customRulesPath);
        } else if (stats.isFile()) {
          customRules = await loadRulesFromFile(this.customRulesPath);
        }

        // Add custom rules, overriding any default rules with the same ID
        customRules.forEach(customRule => {
          const existingIndex = rules.findIndex(r => r.id === customRule.id);
          if (existingIndex >= 0) {
            rules[existingIndex] = customRule;
          } else {
            rules.push(customRule);
          }
        });
      } catch (error) {
        console.error('Error loading custom rules:', error);
      }
    }

    this.rules = rules;
  }

  addRule(rule: AIRule): void {
    this.rules.push(rule);
  }

  addRules(rules: AIRule[]): void {
    this.rules.push(...rules);
  }

  getRules(): AIRule[] {
    return [...this.rules];
  }

  getRule(ruleId: string): AIRule | undefined {
    return this.rules.find(rule => rule.id === ruleId);
  }

  removeRule(ruleId: string): boolean {
    const initialLength = this.rules.length;
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
    return this.rules.length < initialLength;
  }

  private async getAIResponse(provider: AIProvider, prompt: string): Promise<string> {
    if (provider === 'openai' && this.openAIService) {
      return this.openAIService.reviewCodeChange(prompt);
    } else if (provider === 'gemini' && this.geminiService) {
      return this.geminiService.reviewCodeChange(prompt);
    }
    throw new Error(`Unsupported or unconfigured provider: ${provider}`);
  }

  private buildReviewPrompt(code: string, rule: AIRule): string {
    return `You are a code reviewer. Please review the following code based on this rule:

Rule: ${rule.name}
Description: ${rule.description}
Severity: ${rule.severity}
${rule.instructions ? `\nAdditional Instructions:\n${rule.instructions}\n` : ''}

Code to review:
\`\`\`
${code}
\`\`\`

Please provide specific, actionable feedback in the following JSON format:
{
  "issues": [{
    "line": number,
    "message": string,
    "suggestion": string
  }]
}`;
  }

  /**
   * Extracts a more detailed rationale from the AI's review response
   * This can be customized based on the expected response format
   */
  private extractRationaleFromReview(review: string): string | null {
    try {
      // Try to parse as JSON if the review is in JSON format
      const parsed = JSON.parse(review);
      if (parsed.rationale) return parsed.rationale;
      if (parsed.analysis) return parsed.analysis;
      if (parsed.issues?.length) {
        return `Found ${parsed.issues.length} issues: ${parsed.issues.map((i: any) => i.message).join('; ')}`;
      }
    } catch (e) {
      // If not JSON, try to extract key points
      const lines = review.split('\n').filter(l => l.trim().length > 0);
      if (lines.length > 1) {
        // Return all but the first line as rationale (assuming first line is a summary)
        return lines.slice(1).join('\n').trim();
      }
    }
    return null;
  }

  async reviewWithAllRules(
    code: string,
    options: AIReviewOptions = {}
  ): Promise<AIReviewResult[]> {
    const {
      provider = this.defaultProvider,
      filter = () => true,
      maxConcurrent = 3
    } = options;

    const rulesToApply = this.rules
      .filter(rule => rule.enabled !== false)
      .filter(filter);

    const processRule = async (rule: AIRule): Promise<AIReviewResult> => {
      try {
        const prompt = this.buildReviewPrompt(code, rule);
        const review = await this.getAIResponse(provider, prompt);

        // Extract rationale from the review or use the review itself as rationale
        const rationale = this.extractRationaleFromReview(review) || 
                         `The AI identified potential issues in the code that match the rule "${rule.name}".`;

        return {
          ruleId: rule.id,
          ruleName: rule.name,
          review,
          severity: rule.severity,
          metadata: {
            provider,
            timestamp: new Date().toISOString(),
            category: rule.category,
            rationale: rationale
          }
        };
      } catch (error) {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          review: `Error processing rule: ${error instanceof Error ? error.message : String(error)}`,
          severity: 'error' as const,
          metadata: {
            provider,
            timestamp: new Date().toISOString(),
            category: rule.category,
            rationale: 'An error occurred while processing this rule.'
          }
        };
      }
    };

    // Process rules in batches to avoid overwhelming the AI service
    const batchSize = Math.max(1, Math.min(maxConcurrent, 5)); // Cap at 5 concurrent requests
    const results: AIReviewResult[] = [];

    for (let i = 0; i < rulesToApply.length; i += batchSize) {
      const batch = rulesToApply.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processRule));
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Formats review results into a readable string
   */
  formatResults(results: AIReviewResult[]): string {
    if (results.length === 0) {
      return 'No issues found.';
    }

    return results
      .filter(result => result.severity !== 'info')
      .map(result => this.formatReviewComment(result))
      .join('\n---\n');
  }


  /**
   * Formats a single review result into a standardized comment format
   */
  private formatReviewComment(result: AIReviewResult): string {
    const severity = result.severity || 'info';
    const severityEmoji = {
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    }[severity] || '•';

    return [
      `${severityEmoji} **${result.ruleName}** (${severity})`,
      '',
      '**Issue:**',
      result.review,
      '',
      '**Why it should be fixed?**',
      result.metadata?.rationale || 'This issue was identified by an automated review.',
      '',
      '---',
      `\`Severity: ${severity.toUpperCase()} | Category: ${result.metadata?.category || 'General'}\``,
      `\`Rule ID: ${result.ruleId}\``
    ].join('\n');
  }
}
