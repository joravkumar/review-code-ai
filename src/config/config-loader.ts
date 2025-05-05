import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { ReviewConfig, ResolvedRuleConfig } from './config.interface';
import { AIRule } from '../ai-rules/ai-rule.interface';

const readFile = promisify(fs.readFile);
const access = promisify(fs.access);

const CONFIG_FILES = [
  '.review-code-ai.json',
  '.review-code-ai.js',
  '.review-code-ai.cjs',
  'review-code-ai.config.json',
  'review-code-ai.config.js',
  'review-code-ai.config.cjs',
];

const DEFAULT_CONFIG: ReviewConfig = {
  rules: {},
  include: ['**/*.{js,jsx,ts,tsx}'],
  exclude: ['**/node_modules/**', '**/dist/**'],
  maxFileSizeKB: 1000,
  rateLimit: {
    requestsPerMinute: 60,
  },
  autoFix: false,
  output: {
    format: 'markdown',
    showRuleInfo: true,
  },
};

export class ConfigLoader {
  static async loadConfig(configPath?: string): Promise<ReviewConfig> {
    try {
      // If config path is provided, use it directly
      if (configPath) {
        return await this.loadConfigFile(configPath);
      }

      // Otherwise, search for config files in the current directory
      for (const configFile of CONFIG_FILES) {
        try {
          const fullPath = path.join(process.cwd(), configFile);
          await access(fullPath, fs.constants.F_OK);
          return await this.loadConfigFile(fullPath);
        } catch {
          // File doesn't exist, try next one
          continue;
        }
      }

      // No config file found, return default config
      return DEFAULT_CONFIG;
    } catch (error) {
      console.warn('Error loading config file, using defaults:', error);
      return DEFAULT_CONFIG;
    }
  }

  private static async loadConfigFile(filePath: string): Promise<ReviewConfig> {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.js' || ext === '.cjs') {
      // For JavaScript config files
      const configModule = require(filePath);
      const config = configModule.default || configModule;
      return { ...DEFAULT_CONFIG, ...config };
    } else if (ext === '.json') {
      // For JSON config files
      const content = await readFile(filePath, 'utf8');
      const config = JSON.parse(content);
      return { ...DEFAULT_CONFIG, ...config };
    }

    throw new Error(`Unsupported config file format: ${ext}`);
  }

  static resolveRuleConfigs(
    rules: AIRule[],
    config: ReviewConfig
  ): ResolvedRuleConfig[] {
    return rules
      .map(rule => {
        const ruleConfig = config.rules?.[rule.id];
        
        // Skip disabled rules
        if (ruleConfig === false) {
          return null;
        }

        // Merge rule with config
        const resolvedConfig: ResolvedRuleConfig = {
          rule,
          enabled: true,
          ...(typeof ruleConfig === 'object' ? ruleConfig : {})
        };

        return resolvedConfig;
      })
      .filter((rule): rule is ResolvedRuleConfig => rule !== null);
  }

  static shouldProcessFile(
    filePath: string,
    config: ReviewConfig
  ): boolean {
    const { include, exclude, maxFileSizeKB } = config;
    
    // Check file size
    try {
      const stats = fs.statSync(filePath);
      if (maxFileSizeKB && stats.size > maxFileSizeKB * 1024) {
        return false;
      }
    } catch {
      return false;
    }

    // Convert to array if needed
    const includePatterns = Array.isArray(include) ? include : [include || '**/*'];
    const excludePatterns = Array.isArray(exclude) ? exclude : [exclude || ''];

    // Check against include/exclude patterns
    const isIncluded = includePatterns.some(pattern => 
      this.matchPattern(filePath, pattern)
    );

    const isExcluded = excludePatterns.some(pattern => 
      pattern && this.matchPattern(filePath, pattern)
    );

    return isIncluded && !isExcluded;
  }

  private static matchPattern(filePath: string, pattern: string): boolean {
    // Convert Windows paths to Unix style
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Simple glob matching (can be enhanced with a proper glob library if needed)
    const regex = new RegExp(
      '^' + 
      pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '.') + 
      '$'
    );

    return regex.test(normalizedPath);
  }
}
