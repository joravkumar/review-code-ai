import * as fs from 'fs';
import * as path from 'path';

// Mock fs
jest.mock('fs');

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
    it('should load config from file if it exists', () => {
      const mockReadFileSync = jest.spyOn(fs, 'readFileSync');
      mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const { loadConfig } = require('../../src/config');
      const config = loadConfig();

      expect(config).toEqual(mockConfig);
      expect(mockReadFileSync).toHaveBeenCalledWith(
        path.join(process.cwd(), '.review-code-ai.json'),
        'utf8'
      );
    });

    it('should use environment variables when config file is missing', () => {
      const mockReadFileSync = jest.spyOn(fs, 'readFileSync');
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      process.env.GITLAB_ACCESS_TOKEN = 'env-token';
      process.env.OPENAI_API_KEY = 'env-openai-key';

      const { loadConfig } = require('../../src/config');
      const config = loadConfig();

      expect(config.gitlab.accessToken).toBe('env-token');
      expect(config.openai.accessToken).toBe('env-openai-key');
    });
  });

  describe('mergeConfig', () => {
    it('should merge command line options with config file', () => {
      const { mergeConfig } = require('../../src/config');
      
      const baseConfig = { gitlab: { apiUrl: 'https://gitlab.com' } };
      const cliOptions = { projectId: 123 };
      
      const result = mergeConfig(baseConfig, cliOptions);
      
      expect(result).toEqual({
        gitlab: {
          apiUrl: 'https://gitlab.com',
          projectId: 123
        }
      });
    });
  });
});
