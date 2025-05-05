import * as fs from 'fs';
import * as path from 'path';
import { AIRule } from './ai-rule.interface';

/**
 * Load rules from a directory containing rule files
 * @param dirPath Path to the directory containing rule files
 * @returns Array of AIRule objects
 */
export async function loadRulesFromDirectory(dirPath: string): Promise<AIRule[]> {
  try {
    if (!fs.existsSync(dirPath)) {
      throw new Error(`Rules directory not found: ${dirPath}`);
    }

    const files = fs.readdirSync(dirPath);
    const ruleFiles = files.filter(file => 
      file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.json')
    );

    const rules: AIRule[] = [];

    for (const file of ruleFiles) {
      try {
        const filePath = path.join(dirPath, file);
        const ruleModule = require(filePath);
        
        // Handle different export formats
        if (Array.isArray(ruleModule)) {
          rules.push(...ruleModule.filter(isValidRule));
        } else if (ruleModule.default) {
          if (Array.isArray(ruleModule.default)) {
            rules.push(...ruleModule.default.filter(isValidRule));
          } else if (isValidRule(ruleModule.default)) {
            rules.push(ruleModule.default);
          }
        } else if (isValidRule(ruleModule)) {
          rules.push(ruleModule);
        }
      } catch (error) {
        console.error(`Error loading rule from ${file}:`, error);
      }
    }

    return rules;
  } catch (error) {
    console.error('Error loading rules:', error);
    return [];
  }
}

/**
 * Load rules from a specific file
 * @param filePath Path to the rule file
 * @returns Array of AIRule objects
 */
export async function loadRulesFromFile(filePath: string): Promise<AIRule[]> {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Rule file not found: ${filePath}`);
    }

    const ruleModule = require(filePath);
    const rules: AIRule[] = [];

    // Handle different export formats
    if (Array.isArray(ruleModule)) {
      rules.push(...ruleModule.filter(isValidRule));
    } else if (ruleModule.default) {
      if (Array.isArray(ruleModule.default)) {
        rules.push(...ruleModule.default.filter(isValidRule));
      } else if (isValidRule(ruleModule.default)) {
        rules.push(ruleModule.default);
      }
    } else if (isValidRule(ruleModule)) {
      rules.push(ruleModule);
    }

    return rules;
  } catch (error) {
    console.error(`Error loading rules from ${filePath}:`, error);
    return [];
  }
}

/**
 * Validate if an object is a valid AIRule
 */
function isValidRule(rule: any): rule is AIRule {
  return (
    rule &&
    typeof rule === 'object' &&
    typeof rule.id === 'string' &&
    typeof rule.name === 'string' &&
    typeof rule.description === 'string' &&
    typeof rule.systemPrompt === 'string' &&
    typeof rule.userPrompt === 'string' &&
    (rule.tags === undefined || Array.isArray(rule.tags)) &&
    (rule.preProcessDiff === undefined || typeof rule.preProcessDiff === 'function') &&
    (rule.severity === undefined || ['warning', 'error'].includes(rule.severity)) &&
    (rule.enabled === undefined || typeof rule.enabled === 'boolean')
  );
}
