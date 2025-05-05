import { AIRule } from './ai-rule.interface';

export const allRules: AIRule[] = [
  // Code Quality Rule
  {
    id: 'code-quality',
    name: 'Code Quality Review',
    description: 'Comprehensive review for code quality, testing, and documentation.',
    severity: 'warning',
    instructions: `Focus on:
- Code structure, organization, and modularity
- Potential bugs, edge cases, and logical errors
- Performance issues and algorithm efficiency
- Readability, maintainability, and clarity
- Security vulnerabilities and best practices
- Code duplication and redundant patterns
- Error handling and logging
- Test coverage
- Documentation and comments`
  },

  // Database Review Rule
  {
    id: 'database',
    name: 'Database Review',
    description: 'Review database schema and migrations for integrity, performance, and non-breaking changes.',
    severity: 'error',
    category: 'database',
    instructions: `Evaluate the following:
- Schema design and data integrity (normalization, constraints)
- Migration safety and non-breaking changes
- Performance optimization and indexing
- Security best practices
- Primary key strategy

Check for:
1. Proper timestamp columns in tables
2. Safe migration practices
3. Appropriate use of UUIDs
4. Missing indexes or query optimizations
5. SQL injection prevention`
  },

  // Security and Compliance Rule
  {
    id: 'security-compliance',
    name: 'Security and Compliance Review',
    description: 'Ensure code meets security and compliance requirements.',
    severity: 'error',
    category: 'security',
    instructions: `Focus on:
- Data protection and encryption
- Access controls and authentication
- Audit logging
- Secure error handling
- Compliance with security standards
- OWASP Top 10 vulnerabilities

Check for:
1. Proper access controls
2. Sensitive data handling
3. Security logging
4. Secure error handling
5. Compliance with security policies`
  }
];
