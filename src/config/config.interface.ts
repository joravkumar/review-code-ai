import { AIRule } from "../ai-rules/ai-rule.interface";

export interface RuleConfig {
  enabled?: boolean;
  severity?: 'high' | 'medium' | 'low' | 'info' | 'warning' | 'error';
  [key: string]: any;
}

export interface ReviewConfig {
  rules?: {
    [ruleId: string]: RuleConfig | boolean;
  };
  include?: string | string[];
  exclude?: string | string[];
  maxFileSizeKB?: number;
  rateLimit?: {
    requestsPerMinute?: number;
  };
  autoFix?: boolean;
  output?: {
    format?: 'markdown' | 'json' | 'console';
    showRuleInfo?: boolean;
  };
  overrides?: {
    [filePattern: string]: {
      rules?: {
        [ruleId: string]: RuleConfig | boolean;
      };
    };
  };
}

export interface ResolvedRuleConfig extends RuleConfig {
  rule: AIRule;
}
