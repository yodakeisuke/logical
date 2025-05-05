import { generateId, asId, createIdFactory, generateTimestamp, Id } from '../../common/id.js';

describe('ID Utilities', () => {
  describe('generateId', () => {
    test('generates ID with the specified prefix', () => {
      const id = generateId('TEST_');
      expect(id.startsWith('TEST_')).toBe(true);
    });

    test('generates ID with the specified length', () => {
      const id = generateId('TEST_', 5);
      // Prefix length + specified length
      expect(id.length).toBe('TEST_'.length + 5);
    });

    test('pads random part with zeros when needed', () => {
      // Mock Math.random to return a small value
      const originalRandom = Math.random;
      Math.random = () => 0.001;
      
      const id = generateId('TEST_', 3);
      expect(id).toBe('TEST_001');
      
      // Restore original random function
      Math.random = originalRandom;
    });
  });

  describe('asId', () => {
    test('casts string to Id type', () => {
      const id = asId<'TestTag'>('test-id');
      expect(id).toBe('test-id');
      // Can't directly test the phantom type property
    });
  });

  describe('createIdFactory', () => {
    test('creates factory with fromString and generate methods', () => {
      const factory = createIdFactory<'TestTag'>('TST');
      expect(typeof factory.fromString).toBe('function');
      expect(typeof factory.generate).toBe('function');
    });

    test('fromString method creates Id from string', () => {
      const factory = createIdFactory<'TestTag'>('TST');
      const id = factory.fromString('TST123');
      expect(id).toBe('TST123');
    });

    test('generate method creates new Id with prefix', () => {
      const factory = createIdFactory<'TestTag'>('TST');
      const id = factory.generate();
      expect(id.startsWith('TST')).toBe(true);
    });

    test('generate method honors length parameter', () => {
      const factory = createIdFactory<'TestTag'>('TST');
      const id = factory.generate(4);
      // Prefix length + specified length
      expect(id.length).toBe('TST'.length + 4);
    });
  });

  describe('generateTimestamp', () => {
    test('generates ISO8601 timestamp', () => {
      const timestamp = generateTimestamp();
      // Simple regex to match ISO8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // Verify it's a valid date
      expect(() => new Date(timestamp)).not.toThrow();
    });
  });
});