export interface AIRule {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  userPrompt: string;
  tags?: string[];
  // Optional function to modify the prompt based on the diff
  preProcessDiff?: (diff: string) => string;
  severity?: 'warning' | 'error';
  enabled?: boolean;
}
