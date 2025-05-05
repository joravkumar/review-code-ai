import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

export class FileUtils {
  static async findFiles(patterns: string | string[], exclude: string | string[] = []): Promise<string[]> {
    const patternArray = Array.isArray(patterns) ? patterns : [patterns];
    const excludeArray = Array.isArray(exclude) ? exclude : [exclude];
    
    const results = await Promise.all(
      patternArray.map(async (pattern: string) => {
        try {
          const files = await glob(pattern, { 
            ignore: excludeArray.filter(Boolean) as string[],
            nodir: true,
            absolute: true
          });
          return files;
        } catch (error) {
          console.warn(`Error processing pattern ${pattern}:`, error);
          return [];
        }
      })
    );

    // Flatten and deduplicate results
    return [...new Set(results.flat())];
  }

  static async readFile(filePath: string): Promise<string> {
    return readFile(filePath, 'utf8');
  }

  static async getFileStats(filePath: string): Promise<fs.Stats> {
    return stat(filePath);
  }

  static isWithinDirectory(filePath: string, directory: string): boolean {
    const relative = path.relative(directory, filePath);
    return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
  }

  static getFileExtension(filePath: string): string {
    return path.extname(filePath).toLowerCase().substring(1);
  }

  static isBinaryFile(filePath: string): boolean {
    const binaryExtensions = [
      'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'pdf', 'zip',
      'gz', 'tar', 'exe', 'dll', 'so', 'dylib', 'class', 'jar', 'war',
      'dat', 'db', 'sqlite', 'sqlite3', 'mp3', 'mp4', 'wav', 'avi', 'mov'
    ];
    
    const ext = this.getFileExtension(filePath).toLowerCase();
    return binaryExtensions.includes(ext) || false;
  }

  static isTextFile(filePath: string): boolean {
    return !this.isBinaryFile(filePath);
  }
}
