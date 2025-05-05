import fs from 'fs';
import { asSnapshotId, calculateObjectHash, formatTimestampForFilename, listFiles } from '../../persistence/common.js';

// Manually create mock functions
const mockFsModule = {
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn()
};

// Mock fs module
jest.mock('fs', () => mockFsModule);

describe('Persistence Common Utilities', () => {
  describe('asSnapshotId', () => {
    test('casts string to SnapshotId type', () => {
      const id = asSnapshotId('test-snapshot-id');
      expect(id).toBe('test-snapshot-id');
    });
  });

  describe('calculateObjectHash', () => {
    test('generates consistent hash for the same object', () => {
      const obj = { name: 'test', value: 123 };
      const hash1 = calculateObjectHash(obj);
      const hash2 = calculateObjectHash(obj);
      expect(hash1).toBe(hash2);
    });

    test('generates different hashes for different objects', () => {
      const obj1 = { name: 'test', value: 123 };
      const obj2 = { name: 'test', value: 456 };
      const hash1 = calculateObjectHash(obj1);
      const hash2 = calculateObjectHash(obj2);
      expect(hash1).not.toBe(hash2);
    });

    test('respects length parameter', () => {
      const obj = { name: 'test', value: 123 };
      const hash = calculateObjectHash(obj, 4);
      expect(hash.length).toBe(4);
    });
  });

  describe('formatTimestampForFilename', () => {
    test('replaces colons and dots with hyphens', () => {
      const timestamp = '2023-05-01T12:34:56.789Z';
      const formatted = formatTimestampForFilename(timestamp);
      expect(formatted).toBe('2023-05-01T12-34-56-789Z');
    });

    test('handles already formatted timestamps', () => {
      const timestamp = '2023-05-01T12-34-56-789Z';
      const formatted = formatTimestampForFilename(timestamp);
      expect(formatted).toBe('2023-05-01T12-34-56-789Z');
    });
  });

  describe('listFiles', () => {
    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();
    });

    test('returns empty array when directory does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const files = listFiles('/nonexistent/dir');
      expect(files).toEqual([]);
      expect(fs.existsSync).toHaveBeenCalledWith('/nonexistent/dir');
      expect(fs.readdirSync).not.toHaveBeenCalled();
    });

    test('returns all files when no filter is provided', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['file1.txt', 'file2.txt']);
      
      const files = listFiles('/test/dir');
      
      expect(files).toEqual(['file1.txt', 'file2.txt']);
      expect(fs.existsSync).toHaveBeenCalledWith('/test/dir');
      expect(fs.readdirSync).toHaveBeenCalledWith('/test/dir');
    });

    test('filters files by pattern', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['file1.txt', 'file2.json', 'file3.txt']);
      
      const files = listFiles('/test/dir', /\.json$/);
      
      expect(files).toEqual(['file2.json']);
    });

    test('sorts files by default', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['c.txt', 'a.txt', 'b.txt']);
      
      const files = listFiles('/test/dir');
      
      expect(files).toEqual(['a.txt', 'b.txt', 'c.txt']);
    });

    test('can reverse sort order', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['c.txt', 'a.txt', 'b.txt']);
      
      const files = listFiles('/test/dir', undefined, true, true);
      
      expect(files).toEqual(['c.txt', 'b.txt', 'a.txt']);
    });

    test('can disable sorting', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['c.txt', 'a.txt', 'b.txt']);
      
      const files = listFiles('/test/dir', undefined, false);
      
      expect(files).toEqual(['c.txt', 'a.txt', 'b.txt']);
    });

    test('returns empty array on error', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('Test error');
      });
      
      // Mock console.error to prevent test output pollution
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      const files = listFiles('/test/dir');
      
      expect(files).toEqual([]);
      expect(console.error).toHaveBeenCalled();
      
      // Restore console.error
      console.error = originalConsoleError;
    });
  });
});