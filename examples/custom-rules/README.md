# Custom Rules for Review Code AI

This directory contains examples of custom rules that can be used with the Review Code AI tool.

## Creating Custom Rules

Custom rules are defined using the `AIRule` interface. Each rule should have the following properties:

```typescript
interface AIRule {
  id: string;                    // Unique identifier for the rule
  name: string;                 // Human-readable name
  description: string;          // Description of what the rule checks for
  systemPrompt: string;         // Instructions for the AI when reviewing
  userPrompt: string;           // Prompt template with {diff} placeholder
  tags?: string[];              // Optional tags for categorization
  preProcessDiff?: (diff: string) => string;  // Optional diff pre-processing
  severity?: 'warning' | 'error';// Rule severity
  enabled?: boolean;            // Whether the rule is enabled
}
```

## Example Rule

Here's an example of a rule that checks for hardcoded secrets:

```typescript
{
  id: 'security-no-hardcoded-secrets',
  name: 'No Hardcoded Secrets',
  description: 'Detects potential hardcoded secrets like API keys and passwords',
  severity: 'error',
  systemPrompt: `You are a security expert reviewing code for potential security issues.

Your task is to identify any hardcoded sensitive information such as:
- API keys
- Passwords
- Secrets
- Access tokens
- Private keys
- Credentials

If you find any hardcoded sensitive information, explain the risk and suggest using environment variables or a secure secret management system instead.`,

  userPrompt: `Review the following code changes for any hardcoded sensitive information:

{diff}

If you find any hardcoded secrets, provide the following information:
1. The type of secret found
2. The risk associated with it
3. Recommended mitigation

If no hardcoded secrets are found, respond with "NO_ISSUES"`,
  tags: ['security', 'secrets', 'best-practices']
}
```

## Using Custom Rules

### Option 1: Directory of Rules

Place your rule files (`.ts` or `.js`) in a directory and specify the path when running the tool:

```bash
review-code-ai --rules-path ./path/to/rules/directory
```

### Option 2: Single Rule File

You can also specify a single rule file:

```bash
review-code-ai --rules-path ./path/to/security-rules.ts
```

### Disabling Default Rules

If you only want to use your custom rules and disable the default ones:

```bash
review-code-ai --no-default-rules --rules-path ./path/to/rules
```

## Example Rule Files

- [security-rules.ts](./security-rules.ts) - Example security-related rules

## Best Practices

1. **Be Specific**: Make your rules as specific as possible to avoid false positives.
2. **Use Tags**: Tag your rules to make them easier to manage and filter.
3. **Test Thoroughly**: Test your rules with various code examples before using them in production.
4. **Handle Edge Cases**: Consider edge cases and add appropriate handling in your rules.
5. **Document**: Clearly document what each rule checks for and any assumptions it makes.
