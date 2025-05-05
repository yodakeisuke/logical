import { issueTool } from '../../tool/issue.js';
import * as persistence from '../../persistence/persistence.js';
import { LogicalTree, createNewTree } from '../../term/logical-tree/data_structure.js';
import { Result, ok, err } from 'neverthrow';

// Mock the persistence module manually
jest.mock('../../persistence/persistence.js', () => {
  return {
    createPersistence: jest.fn()
  };
});

describe('Issue Tool', () => {
  let mockPersistence: {
    save: jest.Mock;
    load: jest.Mock;
  };
  let savedTree: LogicalTree | null = null;

  beforeEach(() => {
    savedTree = createNewTree();
    
    // Create mock implementation for persistence
    mockPersistence = {
      save: jest.fn().mockImplementation((tree) => {
        savedTree = tree;
        return ok('logical-tree.json');
      }),
      load: jest.fn().mockImplementation(() => ok(savedTree))
    };
    
    // Replace the actual createPersistence implementation
    (persistence.createPersistence as jest.Mock).mockReturnValue(mockPersistence);
  });

  test('issueTool has correct structure', () => {
    expect(issueTool).toHaveProperty('name', 'issue');
    expect(issueTool).toHaveProperty('description');
    expect(issueTool).toHaveProperty('parameters');
    expect(issueTool).toHaveProperty('execute');
    expect(typeof issueTool.execute).toBe('function');
  });

  describe('Parameter Validation', () => {
    test('returns error for invalid parameters', async () => {
      const result = await issueTool.execute({
        operation: 'add'
        // Missing title
      });
      
      expect(result.content[0].text).toContain('パラメータが不正です');
    });
  });

  describe('Add Operation', () => {
    test('adds a root issue', async () => {
      const result = await issueTool.execute({
        operation: 'add',
        title: 'Test Root Issue'
      });
      
      // Check that persistence was called
      expect(mockPersistence.load).toHaveBeenCalled();
      expect(mockPersistence.save).toHaveBeenCalled();
      
      // Check result format
      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('ルート論点「Test Root Issue」を追加しました');
      expect(result.content[0].text).toContain('次のステップは');
      
      expect(result.content[1].type).toBe('text');
      expect(result.content[1].text).toContain('```json');
      
      // Check that the tree was updated
      expect(savedTree!.collection.issues).toHaveLength(1);
      expect(savedTree!.collection.issues[0].title).toBe('Test Root Issue');
      expect(savedTree!.nextStepYouNeedToTake).toBe('breakdown');
    });
  });

  describe('Update Operation', () => {
    test('updates an existing issue', async () => {
      // First add an issue
      await issueTool.execute({
        operation: 'add',
        title: 'Original Root Issue'
      });
      
      const issueId = savedTree!.collection.issues[0].id;
      
      // Then update it
      const result = await issueTool.execute({
        operation: 'update',
        issueId,
        title: 'Updated Root Issue',
        dimension: 'new dimension'
      });
      
      // Check result format
      expect(result.content[0].text).toContain(`論点「${issueId}」を更新しました`);
      
      // Check that the tree was updated
      expect(savedTree!.collection.issues[0].title).toBe('Updated Root Issue');
      expect(savedTree!.collection.issues[0].dimension).toBe('new dimension');
    });
    
    test('returns error for non-existent issue ID', async () => {
      const result = await issueTool.execute({
        operation: 'update',
        issueId: 'I999',
        title: 'Will Fail',
        dimension: 'dimension'
      });
      
      expect(result.content[0].text).toContain('指定された論点(ID: I999)が見つかりません');
    });
  });

  describe('Delete Operation', () => {
    test('deletes an existing issue', async () => {
      // First add an issue
      await issueTool.execute({
        operation: 'add',
        title: 'Root Issue To Delete'
      });
      
      const issueId = savedTree!.collection.issues[0].id;
      
      // Then delete it
      const result = await issueTool.execute({
        operation: 'delete',
        issueId
      });
      
      // Check result format
      expect(result.content[0].text).toContain(`論点「${issueId}」を削除しました`);
      
      // Check that the tree was updated
      expect(savedTree!.collection.issues).toHaveLength(0);
      expect(savedTree!.nextStepYouNeedToTake).toBe('issue');
    });
    
    test('returns error for non-existent issue ID', async () => {
      const result = await issueTool.execute({
        operation: 'delete',
        issueId: 'I999'
      });
      
      expect(result.content[0].text).toContain('指定された論点(ID: I999)が見つかりません');
    });
  });

  describe('Error Handling', () => {
    test('handles persistence errors gracefully', async () => {
      // Mock persistence to throw an error
      mockPersistence.load.mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const result = await issueTool.execute({
        operation: 'add',
        title: 'Should Fail'
      });
      
      expect(result.content[0].text).toContain('論点操作中に予期せぬエラーが発生しました');
    });
  });
});