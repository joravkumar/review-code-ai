export * from './file-utils';
export * from './rate-limiter';

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function getLineObj(matches: RegExpExecArray, block: string): { [key: string]: any } {
  const [_, oldStart, oldLines, newStart, newLines] = matches;
  return {
    position: {
      base_sha: '',
      start_sha: '',
      head_sha: '',
      position_type: 'text',
      new_path: '',
      old_path: '',
      old_line: oldStart ? parseInt(oldStart) : undefined,
      new_line: newStart ? parseInt(newStart) : undefined,
    },
  };
}
