import {
  LogicalTree,
  LogicalTreeError,
  NextStep,
  createNewTree
} from '../../term/logical-tree/data_structure.js';
import { IssueError } from '../../term/issue/data_structure.js';

describe('LogicalTree Data Structure', () => {
  describe('createNewTree', () => {
    test('creates a new tree with correct initial structure', () => {
      const tree = createNewTree();
      
      // Check the structure of the tree
      expect(tree.nextStepYouNeedToTake).toBe('issue');
      expect(tree.collection.issues).toEqual([]);
      expect(tree.collection.relations).toEqual([]);
      expect(tree.breakdownCollection.breakdowns).toEqual([]);
      
      // Check metadata
      expect(tree.meta.version).toBe(3);
      expect(new Date(tree.meta.createdAt).toString()).not.toBe('Invalid Date');
      expect(new Date(tree.meta.updatedAt).toString()).not.toBe('Invalid Date');
      expect(tree.meta.createdAt).toBe(tree.meta.updatedAt);
    });
  });

  describe('LogicalTreeError', () => {
    test('storageError creates a StorageError', () => {
      const error = LogicalTreeError.storageError('Failed to save');
      expect(error._tag).toBe('StorageError');
      expect(error.message).toBe('Failed to save');
    });

    test('isStorageError identifies StorageError', () => {
      const error = LogicalTreeError.storageError('Failed to save');
      expect(LogicalTreeError.isStorageError(error)).toBe(true);
    });

    test('isIssueError identifies IssueError', () => {
      const issueError = IssueError.emptyTitle();
      expect(LogicalTreeError.isIssueError(issueError)).toBe(true);
      
      const storageError = LogicalTreeError.storageError('Failed to save');
      expect(LogicalTreeError.isIssueError(storageError)).toBe(false);
    });

    test('getMessage returns appropriate message for StorageError', () => {
      const error = LogicalTreeError.storageError('Failed to save');
      expect(LogicalTreeError.getMessage(error)).toBe(
        '保存処理中にエラーが発生しました: Failed to save'
      );
    });

    test('getMessage delegates to IssueError.getMessage for IssueError', () => {
      const issueError = IssueError.emptyTitle();
      const storageErrorMessage = LogicalTreeError.getMessage(issueError);
      const issueErrorMessage = IssueError.getMessage(issueError);
      
      expect(storageErrorMessage).toBe(issueErrorMessage);
    });
  });
});