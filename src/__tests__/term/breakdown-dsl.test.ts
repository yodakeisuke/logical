import {
  BreakdownCollectionOps,
  BreakdownDSL,
  BreakdownValidation,
  createResultInterpreter,
  BreakdownResult
} from '../../term/breakdown/dsl.js';

import {
  BreakdownId,
  Breakdown,
  BreakdownError,
  BreakdownCollection,
  createBreakdown,
  emptyBreakdownCollection,
  generateBreakdownId,
  makeBreakdownId
} from '../../term/breakdown/data_structure.js';

import { 
  IssueId, 
  generateIssueId, 
  makeIssueId,
  emptyCollection as emptyIssueCollection,
  IssueCollection
} from '../../term/issue/data_structure.js';

import { Result, ok, err } from 'neverthrow';

describe('Breakdown DSL', () => {
  describe('BreakdownValidation', () => {
    test('validateChildCount returns success for valid child count', () => {
      const childIds = [makeIssueId('I1'), makeIssueId('I2')];
      const result = BreakdownValidation.validateChildCount(childIds);
      expect(result.isOk()).toBe(true);
      // neverthrowではmatchメソッドを使う
      result.match(
        value => expect(value).toEqual(childIds),
        _ => fail('Should not be failure')
      );
    });

    test('validateChildCount returns failure for too few children', () => {
      const childIds = [makeIssueId('I1')];
      const result = BreakdownValidation.validateChildCount(childIds);
      expect(result.isErr()).toBe(true);
      // neverthrowではmatchメソッドを使う
      result.match(
        _ => fail('Should not be success'),
        error => {
          expect(error._tag).toBe('NotEnoughChildren');
          // 型ガードを使用して安全にアクセス
          if (BreakdownError.isNotEnoughChildren(error)) {
            expect(error.minRequired).toBe(2);
          }
        }
      );
    });

    test('validateChildCount returns failure for too many children', () => {
      const childIds = [
        makeIssueId('I1'), makeIssueId('I2'), makeIssueId('I3'),
        makeIssueId('I4'), makeIssueId('I5'), makeIssueId('I6')
      ];
      const result = BreakdownValidation.validateChildCount(childIds);
      expect(result.isErr()).toBe(true);
      // neverthrowではmatchメソッドを使う
      result.match(
        _ => fail('Should not be success'),
        error => {
          expect(error._tag).toBe('TooManyChildren');
          // 型ガードを使用して安全にアクセス
          if (BreakdownError.isTooManyChildren(error)) {
            expect(error.maxAllowed).toBe(5);
          }
        }
      );
    });
  });

  describe('BreakdownCollectionOps', () => {
    let collection: BreakdownCollection;
    let parentId: IssueId;
    let childIds: IssueId[];
    let breakdown: Breakdown;

    beforeEach(() => {
      parentId = makeIssueId('I1');
      childIds = [makeIssueId('I2'), makeIssueId('I3')];
      breakdown = createBreakdown(
        parentId,
        childIds,
        'why',
        'reasons',
        'AND'
      );

      collection = emptyBreakdownCollection();
      collection = BreakdownCollectionOps.addBreakdown(collection, breakdown);
    });

    test('addBreakdown adds a breakdown to the collection', () => {
      const newBreakdown = createBreakdown(
        makeIssueId('I4'),
        [makeIssueId('I5'), makeIssueId('I6')],
        'how',
        'methods',
        'OR'
      );

      const newCollection = BreakdownCollectionOps.addBreakdown(collection, newBreakdown);
      expect(newCollection.breakdowns.length).toBe(2);
      expect(newCollection.breakdowns[1]).toBe(newBreakdown);
      // Original collection should be unmodified
      expect(collection.breakdowns.length).toBe(1);
    });

    test('getBreakdownByParentId retrieves breakdown by parent ID', () => {
      const found = BreakdownCollectionOps.getBreakdownByParentId(collection, parentId);
      expect(found).toBe(breakdown);
    });

    test('getBreakdownByParentId returns undefined for non-existent parent', () => {
      const found = BreakdownCollectionOps.getBreakdownByParentId(collection, makeIssueId('INonExistent'));
      expect(found).toBeUndefined();
    });

    test('getBreakdownByChildId retrieves breakdown by child ID', () => {
      const found = BreakdownCollectionOps.getBreakdownByChildId(collection, childIds[0]);
      expect(found).toBe(breakdown);
    });

    test('getBreakdownByChildId returns undefined for non-existent child', () => {
      const found = BreakdownCollectionOps.getBreakdownByChildId(collection, makeIssueId('INonExistent'));
      expect(found).toBeUndefined();
    });

    test('validateBreakdownConsistency returns success for consistent new breakdown', () => {
      const issueCollection = emptyIssueCollection();
      const result = BreakdownCollectionOps.validateBreakdownConsistency(
        collection,
        issueCollection,
        makeIssueId('I4'), // new parent ID
        'why',             // same type as existing
        'reasons'          // same dimension as existing
      );
      expect(result.isOk()).toBe(true);
    });
  });

  describe('ResultInterpreter', () => {
    let interpreter: BreakdownDSL<Result<Breakdown | BreakdownCollection | IssueCollection | IssueId[], BreakdownError>>;
    let issueCollection: IssueCollection;

    beforeEach(() => {
      issueCollection = emptyIssueCollection();
      interpreter = createResultInterpreter(issueCollection);
    });

    test('getCollection returns the current empty collection', async () => {
      const result = interpreter.getCollection();
      expect(result.isOk()).toBe(true);
      // neverthrowではmatchメソッドを使う
      result.match(
        value => expect(value).toEqual(emptyBreakdownCollection()),
        _ => fail('Should not be failure')
      );
    });

    test('getBreakdownById returns failure for non-existent ID', () => {
      const result = interpreter.getBreakdownById(makeBreakdownId('BD123'));
      expect(result.isErr()).toBe(true);
      // neverthrowではmatchメソッドを使う
      result.match(
        _ => fail('Should not be success'),
        error => expect(error._tag).toBe('InvalidBreakdownStructure')
      );
    });

    test('getBreakdownByParentId returns failure for non-existent parent ID', () => {
      const result = interpreter.getBreakdownByParentId(makeIssueId('I123'));
      expect(result.isErr()).toBe(true);
      // neverthrowではmatchメソッドを使う
      result.match(
        _ => fail('Should not be success'),
        error => expect(error._tag).toBe('InvalidBreakdownStructure')
      );
    });

    test('getBreakdownByChildId returns failure for non-existent child ID', () => {
      const result = interpreter.getBreakdownByChildId(makeIssueId('I123'));
      expect(result.isErr()).toBe(true);
      // neverthrowではmatchメソッドを使う
      result.match(
        _ => fail('Should not be success'),
        error => expect(error._tag).toBe('InvalidBreakdownStructure')
      );
    });

    test('createBreakdown creates a valid breakdown', () => {
      const parentId = makeIssueId('I1');
      const childIds = [makeIssueId('I2'), makeIssueId('I3')];
      
      const result = interpreter.createBreakdown(
        parentId,
        childIds,
        'why',
        'reasons',
        'AND'
      );
      
      expect(result.isOk()).toBe(true);
      // neverthrowではmatchメソッドを使う
      result.match(
        breakdown => {
          expect(breakdown.parentIssueId).toBe(parentId);
          expect(breakdown.childIssueIds).toEqual(childIds);
          expect(breakdown.type).toBe('why');
          expect(breakdown.dimension).toBe('reasons');
          expect(breakdown.decomposeType).toBe('AND');
        },
        _ => fail('Should not be failure')
      );
      
      // Verify the breakdown was added to the collection
      const collectionResult = interpreter.getCollection();
      // neverthrowではmatchメソッドを使う
      collectionResult.match(
        collection => expect(collection.breakdowns.length).toBe(1),
        _ => fail('Should not be failure')
      );
    });

    test('createBreakdown fails if parent already has a breakdown', () => {
      const parentId = makeIssueId('I1');
      const childIds = [makeIssueId('I2'), makeIssueId('I3')];
      
      // First creation should succeed
      const firstResult = interpreter.createBreakdown(
        parentId,
        childIds,
        'why',
        'reasons',
        'AND'
      );
      expect(firstResult.isOk()).toBe(true);
      
      // Second creation with same parent should fail
      const secondResult = interpreter.createBreakdown(
        parentId,
        [makeIssueId('I4'), makeIssueId('I5')],
        'why',
        'reasons',
        'AND'
      );
      expect(secondResult.isErr()).toBe(true);
      // neverthrowではmatchメソッドを使う
      secondResult.match(
        _ => fail('Should not be success'),
        error => expect(error._tag).toBe('InvalidBreakdownStructure')
      );
    });

    test('createBreakdown fails for too few children', () => {
      const result = interpreter.createBreakdown(
        makeIssueId('I1'),
        [makeIssueId('I2')], // Only one child
        'why',
        'reasons',
        'AND'
      );
      
      expect(result.isErr()).toBe(true);
      // neverthrowではmatchメソッドを使う
      result.match(
        _ => fail('Should not be success'),
        error => expect(error._tag).toBe('NotEnoughChildren')
      );
    });

    test('createBreakdown fails for too many children', () => {
      const result = interpreter.createBreakdown(
        makeIssueId('I1'),
        // Six children
        [makeIssueId('I2'), makeIssueId('I3'), makeIssueId('I4'), 
         makeIssueId('I5'), makeIssueId('I6'), makeIssueId('I7')],
        'why',
        'reasons',
        'AND'
      );
      
      expect(result.isErr()).toBe(true);
      // neverthrowではmatchメソッドを使う
      result.match(
        _ => fail('Should not be success'),
        error => expect(error._tag).toBe('TooManyChildren')
      );
    });

    test('validateConsistency returns success for valid consistency', () => {
      const result = interpreter.validateConsistency(
        makeIssueId('I1'),
        'why',
        'reasons'
      );
      
      expect(result.isOk()).toBe(true);
    });
  });
});