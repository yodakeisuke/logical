import { 
  LogicalTree, 
  LogicalTreeError,
  NextStep,
  createNewTree,
  storageError,
} from './data_structure.js';
import { 
  IssueId, 
  IssueError,
  IssueCollection,
  emptyTitle,
  titleTooLong,
  invalidTitles,
  validateTitle as validateIssueTitle
} from '../issue/data_structure.js';
import { Dimension } from '../issue/data_structure.js';
import { BreakdownType, DecomposeType } from '../breakdown/data_structure.js';
import {
  IssueResult,
  IssueWithRelation,
  createResultInterpreter as createIssueInterpreter
} from '../issue/dsl.js';
import {
  BreakdownError,
  BreakdownCollection
} from '../breakdown/data_structure.js';
import {
  createResultInterpreter as createBreakdownInterpreter
} from '../breakdown/dsl.js';
import { Result, ok, err } from 'neverthrow';
import { generateTimestamp } from '../../common/id.js';

export type LogicalTreeResult<T> = Result<T, LogicalTreeError>;

export const LogicalTreeOps = {
  updateTreeMeta: (tree: LogicalTree): LogicalTree => ({
    ...tree,
    meta: {
      ...tree.meta,
      updatedAt: generateTimestamp()
    }
  }),

  setNextStep: (tree: LogicalTree, nextStep: NextStep): LogicalTree => ({
    ...tree,
    nextStepYouNeedToTake: nextStep
  }),

  validateTitle: (title: string, maxLength: number = 100): LogicalTreeResult<string> => {
    if (title.trim().length === 0) {
      return err(emptyTitle());
    }
    
    if (title.length > maxLength) {
      return err(titleTooLong(maxLength));
    }
    
    return ok(title);
  }
};

export interface LogicalTreeDSL<F> {
  getTree: (tree: LogicalTree) => F;
  addRootIssue: (tree: LogicalTree, title: string) => F;
  addChildIssue: (
    tree: LogicalTree,
    parentId: IssueId,
    title: string, 
    dimension: Dimension,
    breakdownType: BreakdownType
  ) => F;
  breakdownIssue: (
    tree: LogicalTree,
    parentId: IssueId,
    labels: string[],
    dimension: Dimension,
    breakdownType: BreakdownType,
    decomposeType: DecomposeType
  ) => F;
  updateIssue: (
    tree: LogicalTree,
    issueId: IssueId,
    title: string,
    dimension: Dimension
  ) => F;
  deleteIssue: (tree: LogicalTree, issueId: IssueId) => F;
  
  saveTree: (tree: LogicalTree) => F;
  loadLatestTree: () => F;
}

export const createResultInterpreter = (
  options?: {
    validateTitle?: (title: string) => LogicalTreeResult<string>,
    saveToStorage?: (tree: LogicalTree) => LogicalTreeResult<string>,
    loadFromStorage?: () => LogicalTreeResult<LogicalTree | null>
  }
): LogicalTreeDSL<LogicalTreeResult<LogicalTree>> => {
  const titleValidator = options?.validateTitle ?? LogicalTreeOps.validateTitle;
  
  const saveToStorage = options?.saveToStorage ?? 
    ((tree: LogicalTree): LogicalTreeResult<string> => {
      try {
        const json = JSON.stringify(tree);
        return ok(json);
      } catch (error) {
        return err(storageError(String(error)));
      }
    });
  
  const loadFromStorage = options?.loadFromStorage ?? 
    ((): LogicalTreeResult<LogicalTree | null> => {
      return ok(null);
    });
  
  const createIssueInterpreterForTree = (tree: LogicalTree) => 
    createIssueInterpreter(tree.collection);
  
  const createBreakdownInterpreterForTree = (tree: LogicalTree) => 
    createBreakdownInterpreter(
      tree.collection,
      tree.breakdownCollection
    );
  
  return {
    getTree: (tree: LogicalTree) => ok<LogicalTree, LogicalTreeError>(tree),
    
    addRootIssue: (tree: LogicalTree, title: string) => {
      const titleResult = titleValidator(title);
      if (titleResult.isErr()) {
        return err<LogicalTree, LogicalTreeError>(storageError("Invalid title"));
      }
      
      const issueInterpreter = createIssueInterpreterForTree(tree);
      const rootIssueResult = issueInterpreter.createRootIssue(title);
      
      return rootIssueResult.match(
        _ => {
          const collectionResult = issueInterpreter.getCollection();
          
          return collectionResult.match(
            collection => {
              const updatedTree = LogicalTreeOps.updateTreeMeta({
                ...tree,
                collection: collection as IssueCollection,
                nextStepYouNeedToTake: 'breakdown' as NextStep
              });
              
              return ok<LogicalTree, LogicalTreeError>(updatedTree);
            },
            error => err<LogicalTree, LogicalTreeError>(error)
          );
        },
        error => err<LogicalTree, LogicalTreeError>(error)
      );
    },
    
    breakdownIssue: (tree: LogicalTree, parentId, labels, dimension, breakdownType, decomposeType) => {
      try {
        const issueInterpreter = createIssueInterpreterForTree(tree);
        const breakdownInterpreter = createBreakdownInterpreterForTree(tree);
        
        const createChildIssues = (parentId: IssueId, labels: string[]): LogicalTreeResult<IssueId[]> => {
          const childIds: IssueId[] = [];
          
          for (const label of labels) {
            const childResult = issueInterpreter.createChildIssue(
              parentId, label, dimension, breakdownType
            ) as IssueResult<IssueWithRelation>;
            
            const childData = childResult.match(
              data => {
                childIds.push(data.issue.id);
                return ok<IssueWithRelation, IssueError>(data);
              },
              error => err<IssueWithRelation, IssueError>(error)
            );
            
            if (childData.isErr()) {
              return err(childData.error);
            }
          }
          
          return ok(childIds);
        };
        
        const childIdsResult = createChildIssues(parentId, labels);
        if (childIdsResult.isErr()) {
          return err<LogicalTree, LogicalTreeError>(childIdsResult.error);
        }
        
        const childIds = childIdsResult.value;
        const collectionResult = issueInterpreter.getCollection();
        
        return collectionResult.match(
          collection => {
            const breakdownResult = breakdownInterpreter.createBreakdown(
              parentId, childIds, breakdownType, dimension, decomposeType
            );
            
            return breakdownResult.match(
              breakdown => {
                const breakdownCollectionResult = breakdownInterpreter.getCollection();
                
                return breakdownCollectionResult.match(
                  breakdownCollection => {
                    const updatedTree = LogicalTreeOps.updateTreeMeta({
                      ...tree,
                      collection: collection as IssueCollection,
                      breakdownCollection: breakdownCollection as BreakdownCollection
                    });
                    
                    return ok<LogicalTree, LogicalTreeError>(updatedTree);
                  },
                  _ => err<LogicalTree, LogicalTreeError>(invalidTitles("ブレイクダウン情報の取得に失敗しました"))
                );
              },
              breakdownError => {
                let issueError: IssueError;
                
                if (BreakdownError.isTooManyChildren(breakdownError)) {
                  issueError = invalidTitles(`ブレイクダウンが多すぎます。最大${breakdownError.maxAllowed}個までの子論点にしてください。`);
                } 
                else if (BreakdownError.isNotEnoughChildren(breakdownError)) {
                  issueError = invalidTitles(`ブレイクダウンが足りません。最低${breakdownError.minRequired}個の子論点が必要です。`);
                }
                else if (BreakdownError.isInconsistentBreakdown(breakdownError)) {
                  issueError = invalidTitles(
                    `同じbreakdown branchにぶら下がるサブイシューは、同じ軸でMECEである必要があります。` +
                    (breakdownError.expectedType ? ` 期待されるタイプ: ${breakdownError.expectedType}` : '') +
                    (breakdownError.expectedDimension ? ` 期待される次元: ${breakdownError.expectedDimension}` : '')
                  );
                }
                else {
                  issueError = invalidTitles(BreakdownError.getMessage(breakdownError));
                }
                
                return err<LogicalTree, LogicalTreeError>(issueError);
              }
            );
          },
          error => err<LogicalTree, LogicalTreeError>(error)
        );
      } catch (error) {
        return err<LogicalTree, LogicalTreeError>(invalidTitles("ブレイクダウン処理中に予期せぬエラーが発生しました"));
      }
    },
    
    addChildIssue: (tree, parentId, title, dimension, breakdownType) => {
      const issueInterpreter = createIssueInterpreterForTree(tree);
      
      // タイトルのバリデーション
      const titleResult = titleValidator(title);
      if (titleResult.isErr()) {
        return err<LogicalTree, LogicalTreeError>(titleResult.error);
      }
      
      const childIssueResult = issueInterpreter.createChildIssue(
        parentId, title, dimension, breakdownType
      );
      
      return childIssueResult.match(
        _ => {
          const collectionResult = issueInterpreter.getCollection();
          
          return collectionResult.match(
            collection => {
              const updatedTree = LogicalTreeOps.updateTreeMeta({
                ...tree,
                collection: collection as IssueCollection
              });
              
              return ok<LogicalTree, LogicalTreeError>(updatedTree);
            },
            error => err<LogicalTree, LogicalTreeError>(error)
          );
        },
        error => err<LogicalTree, LogicalTreeError>(error)
      );
    },
    
    updateIssue: (tree, issueId, title, dimension) => {
      const issueInterpreter = createIssueInterpreterForTree(tree);
      
      // タイトルのバリデーション
      const titleResult = titleValidator(title);
      if (titleResult.isErr()) {
        return err<LogicalTree, LogicalTreeError>(titleResult.error);
      }
      
      const updateIssueResult = issueInterpreter.updateIssue(
        issueId, title, dimension
      );
      
      return updateIssueResult.match(
        _ => {
          const collectionResult = issueInterpreter.getCollection();
          
          return collectionResult.match(
            collection => {
              const updatedTree = LogicalTreeOps.updateTreeMeta({
                ...tree,
                collection: collection as IssueCollection
              });
              
              return ok<LogicalTree, LogicalTreeError>(updatedTree);
            },
            error => err<LogicalTree, LogicalTreeError>(error)
          );
        },
        error => err<LogicalTree, LogicalTreeError>(error)
      );
    },
    
    deleteIssue: (tree, issueId) => {
      const issueInterpreter = createIssueInterpreterForTree(tree);
      
      const deleteResult = issueInterpreter.deleteIssue(issueId);
      
      return deleteResult.match(
        newCollection => {
          const updatedTree = LogicalTreeOps.updateTreeMeta({
            ...tree,
            collection: newCollection as IssueCollection
          });
          
          return ok<LogicalTree, LogicalTreeError>(updatedTree);
        },
        error => err<LogicalTree, LogicalTreeError>(error)
      );
    },
    
    saveTree: (tree) => {
      const result = saveToStorage(tree);
      
      return result.match(
        _ => ok<LogicalTree, LogicalTreeError>(tree),
        error => err<LogicalTree, LogicalTreeError>(error)
      );
    },
    
    loadLatestTree: () => {
      const result = loadFromStorage();
      
      return result.match(
        loadedTree => {
          if (!loadedTree) {
            return ok<LogicalTree, LogicalTreeError>(createNewTree());
          }
          
          return ok<LogicalTree, LogicalTreeError>(loadedTree);
        },
        error => err<LogicalTree, LogicalTreeError>(error)
      );
    }
  };
};