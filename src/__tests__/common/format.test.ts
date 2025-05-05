import { toJson, toJsonCodeblock } from '../../common/format.js';

describe('Format Utilities', () => {
  describe('toJson', () => {
    test('converts object to JSON string', () => {
      const obj = { name: 'test', value: 123 };
      const result = toJson(obj, false);
      expect(result).toBe('{"name":"test","value":123}');
    });

    test('converts object to pretty JSON string by default', () => {
      const obj = { name: 'test', value: 123 };
      const result = toJson(obj);
      // Pretty JSON includes newlines and indentation
      expect(result).toContain('\n');
      expect(result).toContain('  ');
      // The content should still be valid
      expect(JSON.parse(result)).toEqual(obj);
    });

    test('handles nested objects', () => {
      const obj = { 
        name: 'test', 
        nested: { 
          key: 'value', 
          array: [1, 2, 3] 
        } 
      };
      const result = toJson(obj, false);
      expect(JSON.parse(result)).toEqual(obj);
    });

    test('handles arrays', () => {
      const arr = [1, 2, { name: 'test' }];
      const result = toJson(arr, false);
      expect(result).toBe('[1,2,{"name":"test"}]');
    });

    test('handles primitive values', () => {
      expect(toJson('string', false)).toBe('"string"');
      expect(toJson(123, false)).toBe('123');
      expect(toJson(true, false)).toBe('true');
      expect(toJson(null, false)).toBe('null');
    });
  });

  describe('toJsonCodeblock', () => {
    test('wraps JSON in markdown code block', () => {
      const obj = { name: 'test', value: 123 };
      const result = toJsonCodeblock(obj);
      expect(result).toMatch(/^```json\n.*\n```$/s);
      // Should contain the pretty JSON representation
      expect(result).toContain('"name": "test"');
      expect(result).toContain('"value": 123');
    });

    test('produces a valid markdown code block', () => {
      const obj = { name: 'test' };
      const result = toJsonCodeblock(obj);
      const expectedStart = '```json\n';
      const expectedEnd = '\n```';
      expect(result.startsWith(expectedStart)).toBe(true);
      expect(result.endsWith(expectedEnd)).toBe(true);
    });
  });
});