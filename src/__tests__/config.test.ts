import * as fs from 'fs';
import * as path from 'path';
import { ConfigLoader } from '../config/config-loader';

describe('Configuration', () => {
  const mockConfig = {
    gitlab: {
      apiUrl: 'https://gitlab.com/api/v4',
      accessToken: 'test-token'
    },
    rules: {
      defaultRules: true
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset process.env
    process.env = { ...process.env };
  });

  describe('loadConfig', () => {
    it('should load config from file if it exists', async () => {
      const tempDir = fs.mkdtempSync(path.join(process.cwd(), 'cfg-'));
      const cfgPath = path.join(tempDir, '.review-code-ai.json');
      fs.writeFileSync(cfgPath, JSON.stringify(mockConfig));

      const originalCwd = process.cwd();
      process.chdir(tempDir);

      const config = await ConfigLoader.loadConfig();

      process.chdir(originalCwd);

      expect(config.gitlab.apiUrl).toBe(mockConfig.gitlab.apiUrl);
      expect(config.rules).toEqual(mockConfig.rules);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should return defaults when config file is missing', async () => {
      const tempDir = fs.mkdtempSync(path.join(process.cwd(), 'cfg-'));
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      const config = await ConfigLoader.loadConfig();

      process.chdir(originalCwd);

      expect(config.include).toContain('**/*.{js,jsx,ts,tsx}');
      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });

  describe('shouldProcessFile', () => {
    it('determines if a file should be processed based on config', async () => {
      const tempDir = fs.mkdtempSync(path.join(process.cwd(), 'file-'));
      const filePath = path.join(tempDir, 'example.ts');
      fs.writeFileSync(filePath, 'console.log("test");');

      const config = await ConfigLoader.loadConfig();

      const result = ConfigLoader.shouldProcessFile(filePath, config);

      expect(result).toBe(true);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });
});
