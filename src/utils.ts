export const fullContent = {
    "role": "user",
    "content": "First step, the following is the revised full text of this file. Please carefully understand the code content in this file."
}

export const systemContent = {
    "role": "system",
    "content": `You are an experienced code reviewer. Your role is to critically analyze code changes and provide high-quality, actionable feedback.

Only provide feedback when you identify:
1. Clear bugs or potential runtime errors
2. Significant performance issues
3. Security vulnerabilities
4. Major architectural concerns
5. Critical code quality issues

Do NOT provide feedback for:
- Minor style issues
- Subjective preferences
- Trivial optimizations
- Self-documenting code

If the code is well-written and follows best practices, simply respond with "NO_ISSUES".`
};

export const geminiSystemContent = systemContent.content;

export const suggestContent = {
    "role": "user",
    "content": `Please review the following code changes (in git diff format). 

Only provide feedback if you find significant issues that would impact:
- Functionality
- Performance
- Security
- Maintainability
- Major code quality concerns

If the code looks good and follows best practices, respond with "NO_ISSUES".

Code changes to review:
{diff}`
};

export const geminiSuggestContent = `Please review the following code changes (in git diff format). 

Only provide feedback if you find significant issues that would impact:
- Functionality
- Performance
- Security
- Maintainability
- Major code quality concerns

If the code looks good and follows best practices, respond with "NO_ISSUES".

Code changes to review:
{diff}`;

export const openAiCompletionsConfig = {
    "temperature": 0,
    "model": "gpt-3.5-turbo",
    "stream": false,
}
export const geminiCompletionsConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
    model: "gemini-1.5-flash-latest",
}

export const delay = (time: number) => {
    return new Promise(resolve => setTimeout(resolve, time));
}

export const getDiffBlocks = (diff: string) => {
    const regex = /(?=@@\s-\d+(?:,\d+)?\s\+\d+(?:,\d+)?\s@@)/g;
    const diffBlocks: string[] = diff.split(regex);
    return diffBlocks;
}

export const getLineObj = (matches: RegExpMatchArray, item: string) => {
    const lineObj: { new_line?: number, old_line?: number } = {};
    const lastLine = item.split(/\r?\n/)?.reverse()?.[1]?.trim();
    const oldLineStart = +matches[1];
    const oldLineEnd = +matches[2] || 0;
    const newLineStart = +matches[3];
    const newLineEnd = +matches[4] || 0;
    if (lastLine?.[0] === '+') {
        lineObj.new_line = newLineStart + newLineEnd - 1;
    } else if (lastLine?.[0] === '-') {
        lineObj.old_line = oldLineStart + oldLineEnd - 1;
    } else {
        lineObj.new_line = newLineStart + newLineEnd - 1;
        lineObj.old_line = oldLineStart + oldLineEnd - 1;
    }
    return lineObj;
}