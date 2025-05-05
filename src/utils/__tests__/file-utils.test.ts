import { FileUtils } from '../file-utils';

// Mock fs and glob
jest.mock('fs');
jest.mock('glob', () => ({
  glob: jest.fn()
}));

describe('FileUtils', () => {
  const mockFiles = [
    '/project/src/file1.ts',
    '/project/src/file2.ts',
    '/project/test/test1.spec.ts'
  ];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('findFiles', () => {
    it('should find files matching pattern', async () => {
      const mockGlob = require('glob').glob as jest.Mock;
      mockGlob.mockResolvedValue(mockFiles);

      const result = await FileUtils.findFiles('**/*.ts');
      
      expect(mockGlob).toHaveBeenCalledWith('**/*.ts', expect.any(Object));
      expect(result).toEqual(mockFiles);
    }, 10000); // Increased timeout

    it('should exclude files matching exclude pattern', async () => {
      const mockGlob = require('glob').glob as jest.Mock;
      mockGlob.mockResolvedValue(mockFiles);

      await FileUtils.findFiles('**/*.ts', '**/test/**');
      
      expect(mockGlob).toHaveBeenCalledWith(
        '**/*.ts',
        expect.objectContaining({
          ignore: ['**/test/**'],
          nodir: true,
          absolute: true
        })
      );
    }, 10000); // Increased timeout
  });

  describe('isWithinDirectory', () => {
    it('should return true for files within directory', () => {
      expect(FileUtils.isWithinDirectory('/project/src/file.ts', '/project')).toBe(true);
    });

    it('should return false for files outside directory', () => {
      expect(FileUtils.isWithinDirectory('/other/file.ts', '/project')).toBe(false);
    });
  });

  describe('isBinaryFile', () => {
    it('should identify binary files by extension', () => {
      expect(FileUtils.isBinaryFile('image.png')).toBe(true);
      expect(FileUtils.isBinaryFile('document.pdf')).toBe(true);
      expect(FileUtils.isBinaryFile('script.ts')).toBe(false);
    });
  });

  describe('getFileExtension', () => {
    it('should return file extension in lowercase', () => {
      expect(FileUtils.getFileExtension('file.TXT')).toBe('txt');
      expect(FileUtils.getFileExtension('file.test.ts')).toBe('ts');
      expect(FileUtils.getFileExtension('noext')).toBe('');
    });
  });
});
