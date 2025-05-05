import {
  BreakdownId, generateBreakdownId, makeBreakdownId,
  BreakdownType, DecomposeType, Dimension,
  Breakdown, createBreakdown, 
  BreakdownError, BreakdownCollection, emptyBreakdownCollection,
  getBreakdownTypeDescription
} from '../../term/breakdown/data_structure.js';
import { IssueId, makeIssueId } from '../../term/issue/data_structure.js';

describe('Breakdown Data Structure', () => {
  describe('ID Functions', () => {
    test('generateBreakdownId creates IDs with BD prefix', () => {
      const id = generateBreakdownId();
      expect(id.startsWith('BD')).toBe(true);
    });

    test('makeBreakdownId converts string to BreakdownId', () => {
      const id = makeBreakdownId('BD123');
      expect(id).toBe('BD123');
    });
  });

  describe('Breakdown Creation', () => {
    test('createBreakdown creates a valid breakdown entity', () => {
      const parentIssueId = makeIssueId('I123');
      const childIssueIds = [makeIssueId('I456'), makeIssueId('I789')];
      const type: BreakdownType = 'why';
      const dimension: Dimension = 'reasons';
      const decomposeType: DecomposeType = 'AND';

      const breakdown = createBreakdown(
        parentIssueId,
        childIssueIds,
        type,
        dimension,
        decomposeType
      );

      expect(breakdown.id).toBeDefined();
      expect(breakdown.id.startsWith('BD')).toBe(true);
      expect(breakdown.parentIssueId).toBe(parentIssueId);
      expect(breakdown.childIssueIds).toEqual(childIssueIds);
      expect(breakdown.type).toBe(type);
      expect(breakdown.dimension).toBe(dimension);
      expect(breakdown.decomposeType).toBe(decomposeType);
      expect(breakdown.createdAt).toBeDefined();
      expect(new Date(breakdown.createdAt).toString()).not.toBe('Invalid Date');
    });
  });

  describe('Collection Functions', () => {
    test('emptyBreakdownCollection creates empty breakdown collection', () => {
      const collection = emptyBreakdownCollection();
      expect(collection.breakdowns).toEqual([]);
    });
  });

  describe('BreakdownError Constructors', () => {
    test('invalidStructure creates InvalidBreakdownStructureError', () => {
      const error = BreakdownError.invalidStructure('Invalid structure reason');
      expect(error._tag).toBe('InvalidBreakdownStructure');
      expect(error.message).toBe('Invalid structure reason');
    });

    test('inconsistentBreakdown creates InconsistentBreakdownError', () => {
      const error = BreakdownError.inconsistentBreakdown('why', 'reasons');
      expect(error._tag).toBe('InconsistentBreakdown');
      expect(error.expectedType).toBe('why');
      expect(error.expectedDimension).toBe('reasons');
    });

    test('inconsistentBreakdown accepts partial parameters', () => {
      const errorTypeOnly = BreakdownError.inconsistentBreakdown('what');
      expect(errorTypeOnly._tag).toBe('InconsistentBreakdown');
      expect(errorTypeOnly.expectedType).toBe('what');
      expect(errorTypeOnly.expectedDimension).toBeUndefined();

      const errorDimensionOnly = BreakdownError.inconsistentBreakdown(undefined, 'methods');
      expect(errorDimensionOnly._tag).toBe('InconsistentBreakdown');
      expect(errorDimensionOnly.expectedType).toBeUndefined();
      expect(errorDimensionOnly.expectedDimension).toBe('methods');
    });

    test('tooManyChildren creates TooManyChildrenError', () => {
      const error = BreakdownError.tooManyChildren(5);
      expect(error._tag).toBe('TooManyChildren');
      expect(error.maxAllowed).toBe(5);
    });

    test('tooManyChildren uses default maxAllowed when not specified', () => {
      const error = BreakdownError.tooManyChildren();
      expect(error.maxAllowed).toBe(5);
    });

    test('notEnoughChildren creates NotEnoughChildrenError', () => {
      const error = BreakdownError.notEnoughChildren(2);
      expect(error._tag).toBe('NotEnoughChildren');
      expect(error.minRequired).toBe(2);
    });

    test('notEnoughChildren uses default minRequired when not specified', () => {
      const error = BreakdownError.notEnoughChildren();
      expect(error.minRequired).toBe(2);
    });
  });

  describe('BreakdownError Type Guards', () => {
    test('isInvalidStructure identifies InvalidBreakdownStructureError', () => {
      const error = BreakdownError.invalidStructure('Invalid structure');
      expect(BreakdownError.isInvalidStructure(error)).toBe(true);
      expect(BreakdownError.isInconsistentBreakdown(error)).toBe(false);
    });

    test('isInconsistentBreakdown identifies InconsistentBreakdownError', () => {
      const error = BreakdownError.inconsistentBreakdown('why');
      expect(BreakdownError.isInconsistentBreakdown(error)).toBe(true);
      expect(BreakdownError.isInvalidStructure(error)).toBe(false);
    });

    test('isTooManyChildren identifies TooManyChildrenError', () => {
      const error = BreakdownError.tooManyChildren();
      expect(BreakdownError.isTooManyChildren(error)).toBe(true);
      expect(BreakdownError.isInvalidStructure(error)).toBe(false);
    });

    test('isNotEnoughChildren identifies NotEnoughChildrenError', () => {
      const error = BreakdownError.notEnoughChildren();
      expect(BreakdownError.isNotEnoughChildren(error)).toBe(true);
      expect(BreakdownError.isInvalidStructure(error)).toBe(false);
    });
  });

  describe('BreakdownError Message Conversion', () => {
    test('getMessage returns descriptive message for InvalidBreakdownStructureError', () => {
      const error = BreakdownError.invalidStructure('Invalid structure reason');
      expect(BreakdownError.getMessage(error)).toBe('ブレイクダウン構造が無効です: Invalid structure reason');
    });

    test('getMessage returns descriptive message for InconsistentBreakdownError with both type and dimension', () => {
      const error = BreakdownError.inconsistentBreakdown('why', 'reasons');
      const message = BreakdownError.getMessage(error);
      expect(message).toContain('同じbreakdown branchにぶら下がるサブイシューは、同じ軸でMECEである必要があります');
      expect(message).toContain('期待されるタイプ: why');
      expect(message).toContain('期待される次元: reasons');
    });

    test('getMessage returns descriptive message for InconsistentBreakdownError with only type', () => {
      const error = BreakdownError.inconsistentBreakdown('how');
      const message = BreakdownError.getMessage(error);
      expect(message).toContain('同じbreakdown branchにぶら下がるサブイシューは、同じ軸でMECEである必要があります');
      expect(message).toContain('期待されるタイプ: how');
      expect(message).not.toContain('期待される次元');
    });

    test('getMessage returns descriptive message for InconsistentBreakdownError with only dimension', () => {
      const error = BreakdownError.inconsistentBreakdown(undefined, 'methods');
      const message = BreakdownError.getMessage(error);
      expect(message).toContain('同じbreakdown branchにぶら下がるサブイシューは、同じ軸でMECEである必要があります');
      expect(message).not.toContain('期待されるタイプ');
      expect(message).toContain('期待される次元: methods');
    });

    test('getMessage returns descriptive message for TooManyChildrenError', () => {
      const error = BreakdownError.tooManyChildren(5);
      const message = BreakdownError.getMessage(error);
      expect(message).toBe('ブレイクダウンが多すぎます。最大5個までの子論点にしてください。');
    });

    test('getMessage returns descriptive message for NotEnoughChildrenError', () => {
      const error = BreakdownError.notEnoughChildren(2);
      const message = BreakdownError.getMessage(error);
      expect(message).toBe('ブレイクダウンが足りません。最低2個の子論点が必要です。');
    });
  });

  describe('BreakdownType Description', () => {
    test('getBreakdownTypeDescription returns correct description for why type', () => {
      expect(getBreakdownTypeDescription('why')).toBe('理由や原因の探求');
    });

    test('getBreakdownTypeDescription returns correct description for what type', () => {
      expect(getBreakdownTypeDescription('what')).toBe('要素や内容の説明');
    });

    test('getBreakdownTypeDescription returns correct description for how type', () => {
      expect(getBreakdownTypeDescription('how')).toBe('方法や手段の提示');
    });
  });
});