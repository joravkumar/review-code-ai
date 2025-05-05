export class AIClient {
  constructor(
    private openaiApiKey: string,
    private geminiApiKey: string
  ) {}

  async reviewCodeChange(
    code: string,
    mode: 'openai' | 'gemini' = 'openai'
  ): Promise<string> {
    if (mode === 'gemini' && !this.geminiApiKey) {
      throw new Error('Gemini API key is required for gemini mode');
    }

    if (mode === 'openai' && !this.openaiApiKey) {
      throw new Error('OpenAI API key is required for openai mode');
    }

    // This is a placeholder implementation
    // In a real implementation, you would make API calls to the respective AI services
    return '';
  }
}
