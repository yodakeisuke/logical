import { 
  Issue, 
  IssueId, 
  IssueCollection, 
  IssueRelation,
  IssueError,
  generateIssueId,
  generateRelationId,
  Dimension,
  DimensionGroups as DimensionGroupsType,
  ROOT_DIMENSION,
  addIssue as addIssueToCollection,
  addRelation as addRelationToCollection,
  hasIssue,
  hasRootIssue,
  getIssueById,
  getRootIssue,
  getChildrenIds,
  isLeafNode,
  deleteIssueWithChildren,
  groupByDimension as groupCollectionByDimension,
  mergeCollections as mergeTwoCollections,
  validateTitle,
  issueNotFound,
  rootAlreadyExists,
  notEnoughChildren,
  tooManyChildren,
  notALeaf,
  invalidTitles,
} from './data_structure.js';
import { BreakdownType } from '../breakdown/data_structure.js';
import { Result, ok, err } from 'neverthrow';

// 型定義: DSL操作の戻り値型
export type IssueResult<T> = Result<T, IssueError>;

// 型定義: 子論点と関係情報
export type IssueWithRelation = Readonly<{
  issue: Issue;
  relation: IssueRelation;
}>;

// 型定義: ブレイクダウン結果
export type BreakdownResult = Readonly<{
  childCount: number;
  children: ReadonlyArray<IssueWithRelation>;
}>;

// 型定義: 次元ごとのグループ化結果
export type DimensionGroups = DimensionGroupsType;

// Tagless-Final DSL
export interface IssueDSL<F> {
  getCollection: () => F;
  getIssueById: (id: IssueId) => F;
  getRootIssue: () => F;
  getChildrenIds: (parentId: IssueId) => F;
  createRootIssue: (title: string) => F;
  createChildIssue: (parentId: IssueId, title: string, dimension: Dimension, breakdownType: BreakdownType) => F;
  breakdownIssue: (parentId: IssueId, labels: string[], dimension: Dimension, breakdownType: BreakdownType) => F;
  updateIssue: (id: IssueId, title: string, dimension: Dimension) => F;
  deleteIssue: (id: IssueId) => F;
  mergeCollections: (otherCollection: IssueCollection) => F;
  groupByDimension: () => F;
}

// コレクション操作の純粋関数
export const getParentIssue = (collection: IssueCollection, issueId: IssueId): Issue | undefined => {
  const parentId = collection.parentMap[issueId];
  if (!parentId) return undefined;
  return collection.issues[parentId];
};

export const getSiblingIssues = (collection: IssueCollection, issueId: IssueId): ReadonlyArray<Issue> => {
  const parentId = collection.parentMap[issueId];
  if (!parentId) return [];
  
  const siblingIds = getChildrenIds(collection, parentId) || [];
  return siblingIds
    .filter(id => id !== issueId)
    .map(id => collection.issues[id])
    .filter(Boolean) as Issue[];
};

export const getBreakdownTypeForChild = (collection: IssueCollection, parentId: IssueId): BreakdownType | undefined => {
  const childIds = getChildrenIds(collection, parentId);
  if (childIds.length === 0) return undefined;
  
  const relation = Object.values(collection.relations).find(
    relation => relation.fromIssueId === parentId && relation.toIssueId === childIds[0]
  );
  
  return relation?.breakdownType as BreakdownType | undefined;
};

// Result interpreterの実装
export const createResultInterpreter = (
  initialCollection: IssueCollection,
  options?: {
    validateTitle?: (title: string) => IssueResult<string>
  }
): IssueDSL<IssueResult<Issue | IssueCollection | ReadonlyArray<IssueId> | IssueWithRelation | BreakdownResult | DimensionGroups>> => {
  // 状態を不変として扱う
  const titleValidator = options?.validateTitle ?? validateTitle;
  
  return {
    getCollection: () => ok<IssueCollection, IssueError>(initialCollection),
    
    getIssueById: (id: IssueId) => {
      const issue = getIssueById(initialCollection, id);
      return issue 
        ? ok<Issue, IssueError>(issue) 
        : err<Issue, IssueError>(issueNotFound(id));
    },
    
    getRootIssue: () => {
      const rootIssue = getRootIssue(initialCollection);
      return rootIssue
        ? ok<Issue, IssueError>(rootIssue)
        : err<Issue, IssueError>(issueNotFound("root" as IssueId));
    },
    
    getChildrenIds: (parentId: IssueId) => {
      if (!hasIssue(initialCollection, parentId)) {
        return err<ReadonlyArray<IssueId>, IssueError>(issueNotFound(parentId));
      }
      
      const childrenIds = getChildrenIds(initialCollection, parentId);
      return ok<ReadonlyArray<IssueId>, IssueError>(childrenIds);
    },
    
    createRootIssue: (title: string) => {
      const titleResult = titleValidator(title);
      if (titleResult.isErr()) {
        return err<Issue, IssueError>(titleResult.error);
      }
      
      if (hasRootIssue(initialCollection)) {
        return err<Issue, IssueError>(rootAlreadyExists());
      }
      
      const newIssueId = generateIssueId();
      const newIssue: Issue = {
        id: newIssueId,
        title,
        dimension: ROOT_DIMENSION,
        parentId: null
      };
      
      return ok<Issue, IssueError>(newIssue);
    },
    
    createChildIssue: (parentId, title, dimension, breakdownType) => {
      const titleResult = titleValidator(title);
      if (titleResult.isErr()) {
        return err<IssueWithRelation, IssueError>(titleResult.error);
      }
      
      if (!hasIssue(initialCollection, parentId)) {
        return err<IssueWithRelation, IssueError>(issueNotFound(parentId));
      }
      
      const newIssueId = generateIssueId();
      const newRelationId = generateRelationId();
      
      const newIssue: Issue = {
        id: newIssueId,
        title,
        dimension,
        parentId
      };
      
      const newRelation: IssueRelation = {
        id: newRelationId,
        fromIssueId: parentId,
        toIssueId: newIssueId,
        breakdownType
      };
      
      return ok<IssueWithRelation, IssueError>({
        issue: newIssue,
        relation: newRelation
      });
    },
    
    breakdownIssue: (parentId, labels, dimension, breakdownType) => {
      const MIN_CHILDREN = 2;
      const MAX_CHILDREN = 5;
      
      if (labels.length < MIN_CHILDREN) {
        return err<BreakdownResult, IssueError>(notEnoughChildren(MIN_CHILDREN));
      }
      
      if (labels.length > MAX_CHILDREN) {
        return err<BreakdownResult, IssueError>(tooManyChildren(MAX_CHILDREN));
      }
      
      if (!hasIssue(initialCollection, parentId)) {
        return err<BreakdownResult, IssueError>(issueNotFound(parentId));
      }
      
      if (!isLeafNode(initialCollection, parentId)) {
        return err<BreakdownResult, IssueError>(notALeaf(parentId));
      }
      
      const emptyTitles = labels.filter(label => label.trim() === '');
      if (emptyTitles.length > 0) {
        return err<BreakdownResult, IssueError>(invalidTitles('空のタイトルが含まれています'));
      }
      
      const uniqueTitles = new Set(labels);
      if (uniqueTitles.size !== labels.length) {
        return err<BreakdownResult, IssueError>(invalidTitles('重複するタイトルが含まれています'));
      }
      
      const parentIssue = getIssueById(initialCollection, parentId);
      if (parentIssue && parentIssue.parentId) {
        const parentSiblings = getSiblingIssues(initialCollection, parentId);
        
        for (const sibling of parentSiblings) {
          const childIds = getChildrenIds(initialCollection, sibling.id);
          if (childIds.length > 0) {
            const existingBreakdownType = getBreakdownTypeForChild(initialCollection, sibling.id);
            
            if (existingBreakdownType && existingBreakdownType !== breakdownType) {
              return err<BreakdownResult, IssueError>(invalidTitles(
                `同じ階層の論点では一貫したブレイクダウンタイプを使用する必要があります。` +
                `期待される値: ${existingBreakdownType}`
              ));
            }
            
            const childIssues = childIds
              .map(id => getIssueById(initialCollection, id))
              .filter((issue): issue is Issue => issue !== undefined);
              
            if (childIssues.length > 0 && childIssues[0].dimension !== dimension) {
              return err<BreakdownResult, IssueError>(invalidTitles(
                `同じ階層の論点では一貫した次元を使用する必要があります。` +
                `期待される値: ${childIssues[0].dimension}`
              ));
            }
          }
        }
      }
      
      const createdChildren: IssueWithRelation[] = [];
      
      for (const label of labels) {
        const newIssueId = generateIssueId();
        const newRelationId = generateRelationId();
        
        const newIssue: Issue = {
          id: newIssueId,
          title: label,
          dimension,
          parentId
        };
        
        const newRelation: IssueRelation = {
          id: newRelationId,
          fromIssueId: parentId,
          toIssueId: newIssueId,
          breakdownType
        };
        
        createdChildren.push({
          issue: newIssue,
          relation: newRelation
        });
      }
      
      return ok<BreakdownResult, IssueError>({
        childCount: createdChildren.length,
        children: createdChildren
      });
    },
    
    updateIssue: (id, title, dimension) => {
      const titleResult = titleValidator(title);
      if (titleResult.isErr()) {
        return err<Issue, IssueError>(titleResult.error);
      }
      
      if (!hasIssue(initialCollection, id)) {
        return err<Issue, IssueError>(issueNotFound(id));
      }
      
      const existingIssue = initialCollection.issues[id];
      const updatedIssue = {
        ...existingIssue,
        title,
        dimension
      };
      
      return ok<Issue, IssueError>(updatedIssue);
    },
    
    deleteIssue: (id: IssueId) => {
      if (!hasIssue(initialCollection, id)) {
        return err<IssueCollection, IssueError>(issueNotFound(id));
      }
      
      const updatedCollection = deleteIssueWithChildren(initialCollection, id);
      return ok<IssueCollection, IssueError>(updatedCollection);
    },
    
    mergeCollections: (otherCollection: IssueCollection) => {
      const mergedCollection = mergeTwoCollections(initialCollection, otherCollection);
      return ok<IssueCollection, IssueError>(mergedCollection);
    },
    
    groupByDimension: () => {
      const groups = groupCollectionByDimension(initialCollection);
      return ok<DimensionGroups, IssueError>(groups);
    }
  };
};

// 状態変更を伴うインタープリタのファクトリ関数
export const createStatefulInterpreter = (
  initialCollection: IssueCollection,
  options?: {
    validateTitle?: (title: string) => IssueResult<string>
  }
): IssueDSL<IssueResult<Issue | IssueCollection | ReadonlyArray<IssueId> | IssueWithRelation | BreakdownResult | DimensionGroups>> => {
  let currentCollection = initialCollection;
  const titleValidator = options?.validateTitle ?? validateTitle;
  
  return {
    getCollection: () => ok<IssueCollection, IssueError>(currentCollection),
    
    getIssueById: (id: IssueId) => {
      const issue = getIssueById(currentCollection, id);
      return issue 
        ? ok<Issue, IssueError>(issue) 
        : err<Issue, IssueError>(issueNotFound(id));
    },
    
    getRootIssue: () => {
      const rootIssue = getRootIssue(currentCollection);
      return rootIssue
        ? ok<Issue, IssueError>(rootIssue)
        : err<Issue, IssueError>(issueNotFound("root" as IssueId));
    },
    
    getChildrenIds: (parentId: IssueId) => {
      if (!hasIssue(currentCollection, parentId)) {
        return err<ReadonlyArray<IssueId>, IssueError>(issueNotFound(parentId));
      }
      
      const childrenIds = getChildrenIds(currentCollection, parentId);
      return ok<ReadonlyArray<IssueId>, IssueError>(childrenIds);
    },
    
    createRootIssue: (title: string) => {
      const titleResult = titleValidator(title);
      if (titleResult.isErr()) {
        return err<Issue, IssueError>(titleResult.error);
      }
      
      if (hasRootIssue(currentCollection)) {
        return err<Issue, IssueError>(rootAlreadyExists());
      }
      
      const newIssueId = generateIssueId();
      const newIssue: Issue = {
        id: newIssueId,
        title,
        dimension: ROOT_DIMENSION,
        parentId: null
      };
      
      currentCollection = addIssueToCollection(currentCollection, newIssue);
      return ok<Issue, IssueError>(newIssue);
    },
    
    createChildIssue: (parentId, title, dimension, breakdownType) => {
      const titleResult = titleValidator(title);
      if (titleResult.isErr()) {
        return err<IssueWithRelation, IssueError>(titleResult.error);
      }
      
      if (!hasIssue(currentCollection, parentId)) {
        return err<IssueWithRelation, IssueError>(issueNotFound(parentId));
      }
      
      const newIssueId = generateIssueId();
      const newRelationId = generateRelationId();
      
      const newIssue: Issue = {
        id: newIssueId,
        title,
        dimension,
        parentId
      };
      
      const newRelation: IssueRelation = {
        id: newRelationId,
        fromIssueId: parentId,
        toIssueId: newIssueId,
        breakdownType
      };
      
      currentCollection = addIssueToCollection(currentCollection, newIssue);
      currentCollection = addRelationToCollection(currentCollection, newRelation);
      
      return ok<IssueWithRelation, IssueError>({
        issue: newIssue,
        relation: newRelation
      });
    },
    
    breakdownIssue: (parentId, labels, dimension, breakdownType) => {
      const MIN_CHILDREN = 2;
      const MAX_CHILDREN = 5;
      
      if (labels.length < MIN_CHILDREN) {
        return err<BreakdownResult, IssueError>(notEnoughChildren(MIN_CHILDREN));
      }
      
      if (labels.length > MAX_CHILDREN) {
        return err<BreakdownResult, IssueError>(tooManyChildren(MAX_CHILDREN));
      }
      
      if (!hasIssue(currentCollection, parentId)) {
        return err<BreakdownResult, IssueError>(issueNotFound(parentId));
      }
      
      if (!isLeafNode(currentCollection, parentId)) {
        return err<BreakdownResult, IssueError>(notALeaf(parentId));
      }
      
      const emptyTitles = labels.filter(label => label.trim() === '');
      if (emptyTitles.length > 0) {
        return err<BreakdownResult, IssueError>(invalidTitles('空のタイトルが含まれています'));
      }
      
      const uniqueTitles = new Set(labels);
      if (uniqueTitles.size !== labels.length) {
        return err<BreakdownResult, IssueError>(invalidTitles('重複するタイトルが含まれています'));
      }
      
      const parentIssue = getIssueById(currentCollection, parentId);
      if (parentIssue && parentIssue.parentId) {
        const parentSiblings = getSiblingIssues(currentCollection, parentId);
        
        for (const sibling of parentSiblings) {
          const childIds = getChildrenIds(currentCollection, sibling.id);
          if (childIds.length > 0) {
            const existingBreakdownType = getBreakdownTypeForChild(currentCollection, sibling.id);
            
            if (existingBreakdownType && existingBreakdownType !== breakdownType) {
              return err<BreakdownResult, IssueError>(invalidTitles(
                `同じ階層の論点では一貫したブレイクダウンタイプを使用する必要があります。` +
                `期待される値: ${existingBreakdownType}`
              ));
            }
            
            const childIssues = childIds
              .map(id => getIssueById(currentCollection, id))
              .filter((issue): issue is Issue => issue !== undefined);
              
            if (childIssues.length > 0 && childIssues[0].dimension !== dimension) {
              return err<BreakdownResult, IssueError>(invalidTitles(
                `同じ階層の論点では一貫した次元を使用する必要があります。` +
                `期待される値: ${childIssues[0].dimension}`
              ));
            }
          }
        }
      }
      
      const createdChildren: IssueWithRelation[] = [];
      
      for (const label of labels) {
        const newIssueId = generateIssueId();
        const newRelationId = generateRelationId();
        
        const newIssue: Issue = {
          id: newIssueId,
          title: label,
          dimension,
          parentId
        };
        
        const newRelation: IssueRelation = {
          id: newRelationId,
          fromIssueId: parentId,
          toIssueId: newIssueId,
          breakdownType
        };
        
        currentCollection = addIssueToCollection(currentCollection, newIssue);
        currentCollection = addRelationToCollection(currentCollection, newRelation);
        
        createdChildren.push({
          issue: newIssue,
          relation: newRelation
        });
      }
      
      return ok<BreakdownResult, IssueError>({
        childCount: createdChildren.length,
        children: createdChildren
      });
    },
    
    updateIssue: (id, title, dimension) => {
      const titleResult = titleValidator(title);
      if (titleResult.isErr()) {
        return err<Issue, IssueError>(titleResult.error);
      }
      
      if (!hasIssue(currentCollection, id)) {
        return err<Issue, IssueError>(issueNotFound(id));
      }
      
      const existingIssue = currentCollection.issues[id];
      const updatedIssue = {
        ...existingIssue,
        title,
        dimension
      };
      
      currentCollection = {
        ...currentCollection,
        issues: {
          ...currentCollection.issues,
          [id]: updatedIssue
        }
      };
      
      return ok<Issue, IssueError>(updatedIssue);
    },
    
    deleteIssue: (id: IssueId) => {
      if (!hasIssue(currentCollection, id)) {
        return err<IssueCollection, IssueError>(issueNotFound(id));
      }
      
      currentCollection = deleteIssueWithChildren(currentCollection, id);
      return ok<IssueCollection, IssueError>(currentCollection);
    },
    
    mergeCollections: (otherCollection: IssueCollection) => {
      currentCollection = mergeTwoCollections(currentCollection, otherCollection);
      return ok<IssueCollection, IssueError>(currentCollection);
    },
    
    groupByDimension: () => {
      const groups = groupCollectionByDimension(currentCollection);
      return ok<DimensionGroups, IssueError>(groups);
    }
  };
};

