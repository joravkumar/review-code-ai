import { AIRule } from '../../src/ai-rules/ai-rule.interface';

export const securityRules: AIRule[] = [
  {
    id: 'security-no-hardcoded-secrets',
    name: 'No Hardcoded Secrets',
    description: 'Detects potential hardcoded secrets like API keys and passwords',
    severity: 'error',
    category: 'security',
    instructions: `You are a security expert reviewing code for potential security issues.

Carefully examine the code for any hardcoded sensitive information such as:
- API keys (typically long strings of random characters)
- Passwords and credentials
- Secret tokens and access keys
- Private keys (look for BEGIN PRIVATE KEY or similar)
- Database connection strings with credentials

For each finding:
1. Clearly identify the type of secret found
2. Explain the security risk of hardcoding this information
3. Recommend using environment variables or a secure secret management system
4. Provide specific guidance on how to implement the fix

Format your response in clear markdown with appropriate sections.`
  },
  {
    id: 'security-sql-injection',
    name: 'SQL Injection Prevention',
    description: 'Checks for potential SQL injection vulnerabilities',
    severity: 'error',
    category: 'security',
    instructions: `You are a security expert reviewing code for SQL injection vulnerabilities.

Look for these patterns that could lead to SQL injection:
1. String concatenation in SQL queries
2. Direct interpolation of user input into SQL strings
3. Missing parameterized queries or prepared statements
4. Dynamic SQL construction without proper escaping

For each potential vulnerability:
1. Identify the exact line and code pattern
2. Explain the security risk
3. Show the fixed version using parameterized queries or prepared statements
4. Provide additional security recommendations

Format your response in clear markdown with code examples.`
  }
];

// Export as default for easier importing
export default securityRules;
