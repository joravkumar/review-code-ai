import { OpenAI } from '../openai';
import { Gemini } from '../gemini';
import { AIRule } from './ai-rule.interface';
import { allRules } from './all-rules';

type AIProvider = 'openai' | 'gemini';

interface AIReviewResult {
  ruleId: string;
  ruleName: string;
  review: string;
  error?: boolean;
  metadata?: Record<string, any>;
}

export class AIReviewService {
  private rules: AIRule[] = [];
  private openAIService?: OpenAI;
  private geminiService?: Gemini;

  constructor(
    private rulesToUse: AIRule[] = allRules,
    openAIConfig?: { apiUrl: string; accessToken: string; orgId?: string; model?: string },
    geminiConfig?: { apiUrl: string; accessToken: string; model?: string }
  ) {
    this.rules = [...rulesToUse];
    
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

  // For backward compatibility
  async initialize() {
    // No-op since we're not loading rules from filesystem
  }

  private async getAIResponse(provider: AIProvider, systemPrompt: string, userPrompt: string): Promise<string> {
    if (provider === 'openai' && this.openAIService) {
      // For OpenAI, we need to structure the messages
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];
      return this.openAIService.reviewCodeChange(JSON.stringify(messages));
    } else if (provider === 'gemini' && this.geminiService) {
      // For Gemini, we can combine system and user prompts
      return this.geminiService.reviewCodeChange(
        `System: ${systemPrompt}\n\nUser: ${userPrompt}`
      );
    }
    throw new Error(`Unsupported or unconfigured provider: ${provider}`);
  }

  async reviewWithRule(
    diff: string, 
    ruleId: string, 
    provider: AIProvider = 'openai'
  ): Promise<AIReviewResult> {
    const rule = this.rules.find(r => r.id === ruleId);
    if (!rule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    // Pre-process the diff if a pre-processor is provided
    const processedDiff = rule.preProcessDiff ? rule.preProcessDiff(diff) : diff;
    
    // Format the user prompt with the diff
    const userPrompt = rule.userPrompt.replace('{diff}', processedDiff);
    
    // Get the AI response
    const review = await this.getAIResponse(provider, rule.systemPrompt, userPrompt);

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      review,
      metadata: {
        provider,
        timestamp: new Date().toISOString()
      }
    };
  }

  async reviewWithAllRules(
    diff: string, 
    provider: AIProvider = 'openai',
    filter?: (rule: AIRule) => boolean
  ): Promise<AIReviewResult[]> {
    let rules = [...this.rules];
    
    // Apply filter if provided
    if (filter) {
      rules = rules.filter(filter);
    }

    // Process all rules in parallel
    const results = await Promise.allSettled(
      rules.map(rule => 
        this.reviewWithRule(diff, rule.id, provider)
          .catch(error => ({
            ruleId: rule.id,
            ruleName: rule.name,
            review: `Error processing rule: ${error.message}`,
            error: true
          }))
      )
    );

    // Convert results to a consistent format
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          ruleId: rules[index].id,
          ruleName: rules[index].name,
          review: `Error: ${result.reason}`,
          error: true,
          metadata: { error: true }
        };
      }
    });
  }

  formatResults(results: AIReviewResult[]): string {
    if (results.length === 0) {
      return 'No rules were applied.';
    }

    return results.map(result => 
      `=== ${result.ruleName} (${result.ruleId}) ===\n` +
      (result['error'] ? '❌ ' : '') + 
      result.review + 
      '\n\n' +
      (result.metadata ? `[Provider: ${result.metadata.provider}, Timestamp: ${result.metadata.timestamp}]` : '') +
      '\n' + '='.repeat(40) + '\n'
    ).join('\n');
  }
}
