# review-code-ai

## Summary

![](preview.png)

`review-code-ai` is an AI-powered code review tool for GitLab Merge Requests. It uses AI models (OpenAI or Google Gemini) to analyze code changes and provide intelligent feedback. The tool is designed to be flexible and can be customized with your own review rules.

## Features

- 🛠️ Configurable GitLab API endpoint
- 🤖 Support for both OpenAI and Google Gemini AI models
- 🔑 API key management with support for multiple keys (comma-separated)
- 🎨 Customizable AI model selection (e.g., gpt-3.5-turbo, gemini-pro)
- 🏗️ Project and merge request configuration
- 🔄 Automatic rate limiting and retry handling
- 💬 Inline code review comments in merge requests
- 🎯 AI-powered rule system for intelligent code analysis
- 📂 Load rules from files or directories
- 🚀 CI/CD pipeline integration


## Install

```sh
npm i review-code-ai
`````

## Use

### Use via shell script

```shell
Usage: review-code-ai [options]

Options:
  -g, --gitlab-api-url <string>       GitLab API URL (default: " https://gitlab.com/api/v4")
  -t, --gitlab-access-token <string>  GitLab Access Token
  -o, --openai-api-url <string>       OpenAI API URL (default: "https://api.openai.com/v1")
  -a, --openai-access-token <string>  OpenAI Access Token
  -p, --project-id <number>           GitLab Project ID
  -m, --merge-request-id <string>     GitLab Merge Request ID
  -org, --organization-id <number>    organization ID
  -c, --custom-model <string>       Custom Model ID (default: "gpt-3.5-turbo")
  -mode, --mode <string>              Mode use OpenAI or Gemini (default: openai)
  -r, --rules-path <string>           Path to custom rules directory or file
  --no-default-rules                  Disable default rules
  -h, --help                          display help for command
```

## Examples

Basic usage:
```sh
review-code-ai -g https://gitlab.com/api/v4 -t glpat-xxxxxxx -o https://api.openai.com -a skxxxxxxx,skxxxxxxx -p 432288 -m 8 -c gpt-3.5-turbo
```

With custom rules:
```sh
# Use both default and custom rules
review-code-ai -t $GITLAB_TOKEN -a $OPENAI_KEY -p $PROJECT_ID -m $MR_IID --rules-path ./my-rules

# Use only custom rules (disable default rules)
review-code-ai -t $GITLAB_TOKEN -a $OPENAI_KEY -p $PROJECT_ID -m $MR_IID --no-default-rules --rules-path ./my-rules

# Specify a single rule file
review-code-ai -t $GITLAB_TOKEN -a $OPENAI_KEY -p $PROJECT_ID -m $MR_IID --rules-path ./security-rules.ts
```

### Use in CI

Set the `GITLAB_TOKEN` and `CHATGPT_KEY` variables in GitLab CI/CD, `.gitlab-ci.yml` is as follows:

```yml
stages:
  - merge-request

Code Review:
  stage: merge-request  
  image: node:22
  script:
    - npm i review-code-ai -g
    - review-code-ai -t "$GITLAB_TOKEN" -a "$CHATGPT_KEY" -c "$CUSTOM_MODELS" -p "$CI_MERGE_REQUEST_PROJECT_ID" -m "$CI_MERGE_REQUEST_IID"
  only:
    - merge_requests
  when: on_success
```

## AI-Powered Rules

The tool uses an AI-powered rule system where each rule defines what the AI should look for in the code. Rules are defined with clear instructions for the AI to follow.

### Rule Structure

Each rule has the following structure:

```typescript
{
  id: string;               // Unique identifier for the rule
  name: string;             // Human-readable name
  description: string;      // Description of what the rule checks for
  severity: 'error' | 'warning' | 'info';  // Severity level
  category?: string;        // Optional category (e.g., 'security', 'performance')
  instructions: string;     // Clear instructions for the AI
  enabled?: boolean;        // Whether the rule is enabled (default: true)
}
```

### Example Rule

```typescript
// security-rule.ts
import { AIRule } from 'review-code-ai';

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
  }
];
```

### Using Custom Rules

You can use custom rules by specifying the path to your rules file or directory when running the tool:

```bash
# Use a single rules file
review-code-ai --rules-path ./my-rules/security-rule.ts

# Use all rules in a directory
review-code-ai --rules-path ./my-rules/

# Disable default rules and use only custom rules
review-code-ai --no-default-rules --rules-path ./my-rules/
```

## Configuration File

You can customize the tool's behavior using a `.review-code-ai.json` configuration file in your project root. This file is optional but useful for:
- Storing API keys and tokens
- Setting default values for command-line options
- Configuring rule paths and behavior
- Managing environment-specific settings

### Example Configuration

Create a `.review-code-ai.json` file in your project root:

```json
{
  "gitlab": {
    "apiUrl": "https://gitlab.com/api/v4",
    "accessToken": "your-gitlab-token",
    "projectId": 12345,
    "mergeRequestId": 1
  },
  "openai": {
    "apiUrl": "https://api.openai.com/v1",
    "accessToken": "your-openai-key"
  },
  "rules": {
    "defaultRules": true,
    "customRulesPath": "./my-rules/"
  }
}
```

### Configuration Options

| Section       | Option          | Description |
|---------------|-----------------|-------------|
| gitlab        | apiUrl         | GitLab API URL |
|              | accessToken    | GitLab access token |
|              | projectId      | GitLab project ID |
|              | mergeRequestId | Merge request ID |
| openai       | apiUrl         | OpenAI API URL |
|              | accessToken    | OpenAI API key |
| rules        | defaultRules   | Whether to use default rules (true/false) |
|              | customRulesPath| Path to custom rules directory |

### Using Environment Variables

You can also use environment variables in your configuration file:

```json
{
  "gitlab": {
    "accessToken": "${GITLAB_TOKEN}"
  },
  "openai": {
    "accessToken": "${OPENAI_API_KEY}"
  }
}
```

## Programmatic Usage

You can also use the library programmatically:

```typescript
import { AIReviewService } from 'review-code-ai';
import { myRules } from './my-rules';

// Initialize with custom rules
const service = new AIReviewService(
  myRules,
  { apiUrl: 'https://api.openai.com', accessToken: 'sk-...' },
  undefined,
  {
    customRulesPath: './my-rules',
    useDefaultRules: true
  }
);

await service.initialize();
```

## Contribute

Welcome to contribute code, ask questions and suggestions! 👏

## License
- This project is tested with BrowserStack
