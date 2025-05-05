import { breakdownTool } from '../../tool/breakdown.js';
import { issueTool } from '../../tool/issue.js';
import * as persistence from '../../persistence/persistence.js';
import { LogicalTree, createNewTree } from '../../term/logical-tree/data_structure.js';
import { Result, ok, err } from 'neverthrow';
import { BreakdownParameters } from '../../tool/breakdown/schema.js';

// Mock the persistence module manually
jest.mock('../../persistence/persistence.js', () => {
  return {
    createPersistence: jest.fn()
  };
});

describe('Breakdown Tool', () => {
  let mockPersistence: {
    save: jest.Mock;
    load: jest.Mock;
  };
  let savedTree: LogicalTree | null = null;
  let rootIssueId: string;

  beforeEach(async () => {
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
    
    // Setup a root issue for breakdown tests
    await issueTool.execute({
      operation: 'add',
      title: 'Root Issue For Breakdown'
    });
    
    rootIssueId = savedTree!.collection.issues[0].id;
  });

  test('breakdownTool has correct structure', () => {
    expect(breakdownTool).toHaveProperty('name', 'breakdown');
    expect(breakdownTool).toHaveProperty('description');
    expect(breakdownTool).toHaveProperty('parameters');
    expect(breakdownTool).toHaveProperty('execute');
    expect(typeof breakdownTool.execute).toBe('function');
  });

  describe('Parameter Validation', () => {
    test('returns error for invalid parameters', async () => {
      const result = await breakdownTool.execute({
        parentId: rootIssueId,
        // Missing other required parameters
      } as BreakdownParameters);
      
      expect(result.content[0].text).toContain('パラメータが不正です');
    });
    
    test('validates minimum number of labels', async () => {
      const result = await breakdownTool.execute({
        parentId: rootIssueId,
        labels: ['Single Child'], // Only one label (minimum is 2)
        dimension: 'test dimension',
        breakdownType: 'why',
        decomposeType: 'AND'
      } as BreakdownParameters);
      
      expect(result.content[0].text).toContain('パラメータが不正です');
    });
    
    test('validates maximum number of labels', async () => {
      const result = await breakdownTool.execute({
        parentId: rootIssueId,
        labels: ['Child 1', 'Child 2', 'Child 3', 'Child 4', 'Child 5', 'Child 6'], // Six labels (maximum is 5)
        dimension: 'test dimension',
        breakdownType: 'why',
        decomposeType: 'AND'
      } as BreakdownParameters);
      
      expect(result.content[0].text).toContain('パラメータが不正です');
    });
  });

  describe('Breakdown Execution', () => {
    test('successfully breaks down an issue', async () => {
      const result = await breakdownTool.execute({
        parentId: rootIssueId,
        labels: ['Child 1', 'Child 2', 'Child 3'],
        dimension: 'test dimension',
        breakdownType: 'why',
        decomposeType: 'AND'
      });
      
      // Check that persistence was called
      expect(mockPersistence.load).toHaveBeenCalled();
      expect(mockPersistence.save).toHaveBeenCalled();
      
      // Check result format
      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain(`論点「${rootIssueId}」を3個の子論点にブレイクダウンしました`);
      expect(result.content[0].text).toContain('Child 1, Child 2, Child 3');
      
      expect(result.content[1].type).toBe('text');
      expect(result.content[1].text).toContain('```json');
      
      // Check that the tree was updated
      expect(savedTree!.collection.issues).toHaveLength(4); // 1 root + 3 children
      expect(savedTree!.collection.relations).toHaveLength(3); // 3 parent-child relations
      expect(savedTree!.breakdownCollection.breakdowns).toHaveLength(1);
      expect(savedTree!.breakdownCollection.breakdowns[0].parentIssueId).toBe(rootIssueId);
      expect(savedTree!.breakdownCollection.breakdowns[0].childIssueIds).toHaveLength(3);
      expect(savedTree!.breakdownCollection.breakdowns[0].dimension).toBe('test dimension');
      expect(savedTree!.breakdownCollection.breakdowns[0].type).toBe('why');
      expect(savedTree!.breakdownCollection.breakdowns[0].decomposeType).toBe('AND');
    });
    
    test('returns error for non-existent parent ID', async () => {
      const result = await breakdownTool.execute({
        parentId: 'I999',
        labels: ['Child 1', 'Child 2'],
        dimension: 'test dimension',
        breakdownType: 'why',
        decomposeType: 'AND'
      });
      
      expect(result.content[0].text).toContain('指定された論点(ID: I999)が見つかりません');
    });
    
    test('returns error when trying to breakdown a node that already has children', async () => {
      // First breakdown
      await breakdownTool.execute({
        parentId: rootIssueId,
        labels: ['Child 1', 'Child 2'],
        dimension: 'test dimension',
        breakdownType: 'why',
        decomposeType: 'AND'
      });
      
      // Try to breakdown again
      const result = await breakdownTool.execute({
        parentId: rootIssueId,
        labels: ['Child 3', 'Child 4'],
        dimension: 'test dimension',
        breakdownType: 'why',
        decomposeType: 'AND'
      });
      
      expect(result.content[0].text).toContain('既にブレイクダウンされています');
    });
    
    test('fails when there is no tree', async () => {
      // Mock no tree returned
      mockPersistence.load.mockImplementation(() => ok(null));
      
      const result = await breakdownTool.execute({
        parentId: rootIssueId,
        labels: ['Child 1', 'Child 2'],
        dimension: 'test dimension',
        breakdownType: 'why',
        decomposeType: 'AND'
      });
      
      expect(result.content[0].text).toContain('論点ツリーが見つかりません');
    });
  });

  describe('Error Handling', () => {
    test('handles persistence load errors gracefully', async () => {
      // Mock persistence to return a failure
      mockPersistence.load.mockImplementation(() => 
        err({ _tag: 'StorageError', message: 'Test error' })
      );
      
      const result = await breakdownTool.execute({
        parentId: rootIssueId,
        labels: ['Child 1', 'Child 2'],
        dimension: 'test dimension',
        breakdownType: 'why',
        decomposeType: 'AND'
      });
      
      expect(result.content[0].text).toContain('ツリーの読み込みに失敗しました');
    });
    
    test('handles unexpected errors gracefully', async () => {
      // Mock persistence to throw an error
      mockPersistence.load.mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      
      const result = await breakdownTool.execute({
        parentId: rootIssueId,
        labels: ['Child 1', 'Child 2'],
        dimension: 'test dimension',
        breakdownType: 'why',
        decomposeType: 'AND'
      });
      
      expect(result.content[0].text).toContain('ブレイクダウン処理中に予期せぬエラーが発生しました');
    });
    
    test('handles save errors', async () => {
      // Mock save to fail
      mockPersistence.save.mockImplementation(() => 
        err({ _tag: 'StorageError', message: 'Failed to save' })
      );
      
      const result = await breakdownTool.execute({
        parentId: rootIssueId,
        labels: ['Child 1', 'Child 2'],
        dimension: 'test dimension',
        breakdownType: 'why',
        decomposeType: 'AND'
      });
      
      expect(result.content[0].text).toContain('ブレイクダウンは成功しましたが、ツリーの保存に失敗しました');
    });
  });
});