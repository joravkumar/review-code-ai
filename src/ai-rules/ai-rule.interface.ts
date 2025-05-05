export type RuleSeverity = 'error' | 'warning' | 'info';

export interface AIRule {
  id: string;
  name: string;
  description: string;
  severity: RuleSeverity;
  category?: string;
  enabled?: boolean;
  // Optional custom instructions for the AI
  instructions?: string;
}
