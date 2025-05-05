import { Id, createIdFactory } from '../../common/id.js';
import { Result, ok, err } from 'neverthrow';
import { StringPhantom, createStringPhantomFactory } from '../../common/phantom.js';

// --- IssueId ---
export type IssueId = Id<'IssueId'>;
const issueIdFactory = createIdFactory<'IssueId'>('I');
export const generateIssueId = issueIdFactory.generate;
export const makeIssueId = issueIdFactory.fromString;

// --- Dimension ---
export type Dimension = StringPhantom<'Dimension'>;
export const ROOT_DIMENSION: Dimension = 'root' as Dimension;
export const FACTORS_DIMENSION = 'factors' as Dimension;
export const REASONS_DIMENSION = 'reasons' as Dimension;
export const PHASES_DIMENSION = 'phases' as Dimension;
export const CATEGORIES_DIMENSION = 'categories' as Dimension;
export const COMPONENTS_DIMENSION = 'components' as Dimension;

export const knownDimensions: Dimension[] = [
  ROOT_DIMENSION, FACTORS_DIMENSION, REASONS_DIMENSION,
  PHASES_DIMENSION, CATEGORIES_DIMENSION, COMPONENTS_DIMENSION
];

export type InvalidDimensionError = Readonly<{
  readonly _tag: "InvalidDimension";
  readonly message: string;
}>;

export const createDimension = (value: string): Result<Dimension, InvalidDimensionError> => {
  if (value.trim().length === 0) {
    return err({ _tag: "InvalidDimension", message: "次元は空であってはなりません" });
  }
  if (value.length > 50) {
    return err({ _tag: "InvalidDimension", message: "次元は50文字以内である必要があります" });
  }
  return ok(value as Dimension);
};

export const isKnownDimension = (dimension: Dimension): boolean => 
  knownDimensions.includes(dimension);

export const getDimensionDisplayName = (dimension: Dimension): string => {
  switch (dimension) {
    case ROOT_DIMENSION: return "ルート";
    case FACTORS_DIMENSION: return "要素";
    case REASONS_DIMENSION: return "理由";
    case PHASES_DIMENSION: return "フェーズ";
    case CATEGORIES_DIMENSION: return "カテゴリ";
    case COMPONENTS_DIMENSION: return "コンポーネント";
    default: return dimension as string;
  }
};

// --- Issue ---
export type Issue = Readonly<{
  id: IssueId;
  title: string;
  dimension: Dimension;
  parentId: IssueId | null;
}>;

// --- IssueRelation ---
export type BreakdownTypeReference = string & { readonly _type: "BreakdownType" };

export type IssueRelation = Readonly<{
  id: Id<'RelationId'>;
  fromIssueId: IssueId;
  toIssueId: IssueId;
  breakdownType: BreakdownTypeReference;
}>;

const relationIdFactory = createIdFactory<'RelationId'>('R');
export const generateRelationId = relationIdFactory.generate;
export const makeRelationId = relationIdFactory.fromString;

// --- IssueError ---
export type IssueError =
  | Readonly<{ readonly _tag: "EmptyTitle" }>
  | Readonly<{ readonly _tag: "TitleTooLong"; readonly maxLength: number }>
  | Readonly<{ readonly _tag: "RootAlreadyExists" }>
  | Readonly<{ readonly _tag: "IssueNotFound"; readonly issueId: IssueId | 'root' }>
  | Readonly<{ readonly _tag: "TooManyChildren"; readonly maxAllowed: number }>
  | Readonly<{ readonly _tag: "NotEnoughChildren"; readonly minRequired: number }>
  | Readonly<{ readonly _tag: "NotALeaf"; readonly issueId: IssueId }>
  | Readonly<{ readonly _tag: "InvalidTitles"; readonly reason: string }>
  | Readonly<{ readonly _tag: "InconsistentBreakdown"; readonly expected: string; readonly issueId?: IssueId }>
  | Readonly<{ readonly _tag: "InconsistentDimension"; readonly expected: Dimension; readonly issueId?: IssueId }>;

export const emptyTitle = (): IssueError => ({ _tag: "EmptyTitle" });
export const titleTooLong = (maxLength: number): IssueError => ({ _tag: "TitleTooLong", maxLength });
export const rootAlreadyExists = (): IssueError => ({ _tag: "RootAlreadyExists" });
export const issueNotFound = (issueId: IssueId | 'root'): IssueError => ({ _tag: "IssueNotFound", issueId });
export const tooManyChildren = (maxAllowed: number = 5): IssueError => ({ _tag: "TooManyChildren", maxAllowed });
export const notEnoughChildren = (minRequired: number = 2): IssueError => ({ _tag: "NotEnoughChildren", minRequired });
export const notALeaf = (issueId: IssueId): IssueError => ({ _tag: "NotALeaf", issueId });
export const invalidTitles = (reason: string): IssueError => ({ _tag: "InvalidTitles", reason });
export const inconsistentBreakdown = (expected: string, issueId?: IssueId): IssueError => ({ _tag: "InconsistentBreakdown", expected, issueId });
export const inconsistentDimension = (expected: Dimension, issueId?: IssueId): IssueError => ({ _tag: "InconsistentDimension", expected, issueId });

export const getIssueErrorMessage = (error: IssueError): string => {
  switch (error._tag) {
    case "EmptyTitle": return "タイトルを入力してください";
    case "TitleTooLong": return `タイトルは${error.maxLength}文字以内で入力してください`;
    case "RootAlreadyExists": return "ルート論点は既に存在します。複数のルート論点は追加できません。";
    case "IssueNotFound": return `指定された論点(ID: ${error.issueId})が見つかりません`;
    case "TooManyChildren": return `ブレイクダウンが多すぎます。(最大${error.maxAllowed}件)`;
    case "NotEnoughChildren": return `ブレイクダウンの数が不足しています。(最小${error.minRequired}件必要)`;
    case "NotALeaf": return `指定された論点(ID: ${error.issueId})は既に子論点を持っています。`;
    case "InvalidTitles": return `無効なタイトルが含まれています: ${error.reason}`;
    case "InconsistentBreakdown": return `同じ階層の論点では一貫したブレイクダウンタイプ(${error.expected})を使用する必要があります。${error.issueId ? `(関連ID: ${error.issueId})` : ''}`;
    case "InconsistentDimension": return `同じ階層の論点では一貫した次元(${getDimensionDisplayName(error.expected)})を使用する必要があります。${error.issueId ? `(関連ID: ${error.issueId})` : ''}`;
  }
};

export const validateTitle = (title: string, maxLength: number = 100): Result<string, IssueError> => {
  if (title.trim().length === 0) return err(emptyTitle());
  if (title.length > maxLength) return err(titleTooLong(maxLength));
  return ok(title);
};

// --- IssueCollection ---
export type IssueCollection = Readonly<{
  issues: Readonly<Record<IssueId, Issue>>;
  relations: Readonly<Record<Id<'RelationId'>, IssueRelation>>;
  childrenMap: Readonly<Record<IssueId, ReadonlyArray<IssueId>>>;
  parentMap: Readonly<Record<IssueId, IssueId | null>>;
  rootIssueId: IssueId | null;
}>;

export type DimensionGroups = Readonly<Record<Dimension, ReadonlyArray<Issue>>>;

export const createEmptyCollection = (): IssueCollection => ({
  issues: {},
  relations: {},
  childrenMap: {},
  parentMap: {},
  rootIssueId: null,
});

export const addIssue = (collection: IssueCollection, issue: Issue): IssueCollection => {
  const newIssues = { ...collection.issues, [issue.id]: issue };
  const newParentMap = { ...collection.parentMap, [issue.id]: issue.parentId };
  const newChildrenMap = { ...collection.childrenMap };
  let newRootIssueId = collection.rootIssueId;

  const oldParentId = collection.parentMap[issue.id];
  if (oldParentId && oldParentId in newChildrenMap) {
    newChildrenMap[oldParentId] = newChildrenMap[oldParentId].filter(id => id !== issue.id);
    if (newChildrenMap[oldParentId].length === 0) {
      const { [oldParentId]: _, ...rest } = newChildrenMap;
      Object.assign(newChildrenMap, rest);
    }
  }

  if (issue.parentId) {
    const siblings = newChildrenMap[issue.parentId] || [];
    if (!siblings.includes(issue.id)) {
      newChildrenMap[issue.parentId] = [...siblings, issue.id];
    }
  } else if (issue.dimension === ROOT_DIMENSION) {
    newRootIssueId = issue.id;
  } else if (collection.rootIssueId === issue.id && issue.dimension !== ROOT_DIMENSION) {
    newRootIssueId = null;
  }

  return {
    ...collection,
    issues: newIssues,
    parentMap: newParentMap,
    childrenMap: newChildrenMap,
    rootIssueId: newRootIssueId,
  };
};

export const addRelation = (collection: IssueCollection, relation: IssueRelation): IssueCollection => ({
  ...collection,
  relations: { ...collection.relations, [relation.id]: relation },
});

export const getIssueById = (collection: IssueCollection, id: IssueId): Issue | undefined =>
  collection.issues[id];

export const getRootIssue = (collection: IssueCollection): Issue | undefined =>
  collection.rootIssueId ? collection.issues[collection.rootIssueId] : undefined;

export const hasIssue = (collection: IssueCollection, id: IssueId): boolean =>
  id in collection.issues;

export const hasRootIssue = (collection: IssueCollection): boolean =>
  collection.rootIssueId !== null;

export const getChildrenIds = (collection: IssueCollection, parentId: IssueId): ReadonlyArray<IssueId> =>
  collection.childrenMap[parentId] || [];

export const isLeafNode = (collection: IssueCollection, issueId: IssueId): boolean =>
  !(issueId in collection.childrenMap) || collection.childrenMap[issueId].length === 0;

export const getParentId = (collection: IssueCollection, issueId: IssueId): IssueId | null =>
  collection.parentMap[issueId] ?? null;

export const getBreakdownTypeForChildren = (collection: IssueCollection, parentId: IssueId): BreakdownTypeReference | undefined => {
  const childrenIds = getChildrenIds(collection, parentId);
  if (childrenIds.length === 0) return undefined;

  const relation = Object.values(collection.relations).find(
    rel => rel.fromIssueId === parentId && childrenIds.includes(rel.toIssueId)
  );
  
  return relation?.breakdownType;
};

export const getDimensionForChildren = (collection: IssueCollection, parentId: IssueId): Dimension | undefined => {
  const childrenIds = getChildrenIds(collection, parentId);
  if (childrenIds.length === 0) return undefined;
  
  const firstChild = getIssueById(collection, childrenIds[0]);
  return firstChild?.dimension;
};

export const groupByDimension = (collection: IssueCollection): DimensionGroups => {
  const result: Record<Dimension, Issue[]> = {};
  
  Object.values(collection.issues).forEach(issue => {
    if (!result[issue.dimension]) {
      result[issue.dimension] = [];
    }
    result[issue.dimension].push(issue);
  });
  
  return result as DimensionGroups;
};

export const deleteIssueWithChildren = (collection: IssueCollection, issueIdToDelete: IssueId): IssueCollection => {
  if (!hasIssue(collection, issueIdToDelete)) return collection;

  const issuesToDelete = new Set<IssueId>();
  const collectIssues = (currentId: IssueId): void => {
    if (issuesToDelete.has(currentId)) return;
    
    issuesToDelete.add(currentId);
    const children = getChildrenIds(collection, currentId);
    children.forEach(childId => collectIssues(childId));
  };
  
  collectIssues(issueIdToDelete);

  const newIssues = { ...collection.issues };
  const newRelations = { ...collection.relations };
  const newChildrenMap = { ...collection.childrenMap };
  const newParentMap = { ...collection.parentMap };
  let newRootIssueId = collection.rootIssueId;

  issuesToDelete.forEach(id => {
    delete newIssues[id];
    delete newChildrenMap[id];
    
    const parentId = collection.parentMap[id];
    if (parentId && parentId in newChildrenMap) {
      newChildrenMap[parentId] = newChildrenMap[parentId].filter(childId => childId !== id);
      if (newChildrenMap[parentId].length === 0) {
        delete newChildrenMap[parentId];
      }
    }
    
    delete newParentMap[id];
    
    Object.keys(newRelations).forEach(relId => {
      const rel = newRelations[relId as keyof typeof newRelations];
      if (rel.fromIssueId === id || rel.toIssueId === id) {
        delete newRelations[relId as keyof typeof newRelations];
      }
    });
  });
  
  if (collection.rootIssueId === issueIdToDelete) {
    newRootIssueId = null;
  }
  
  return {
    issues: newIssues,
    relations: newRelations,
    childrenMap: newChildrenMap,
    parentMap: newParentMap,
    rootIssueId: newRootIssueId
  };
};

export const mergeCollections = (collection1: IssueCollection, collection2: IssueCollection): IssueCollection => {
  const mergedIssues = { ...collection1.issues };
  const mergedRelations = { ...collection1.relations };
  const mergedChildrenMap = { ...collection1.childrenMap };
  const mergedParentMap = { ...collection1.parentMap };
  
  Object.values(collection2.issues).forEach(issue => {
    mergedIssues[issue.id] = issue;
  });
  
  Object.values(collection2.relations).forEach(relation => {
    mergedRelations[relation.id] = relation;
  });
  
  Object.entries(collection2.childrenMap).forEach(([parentId, children]) => {
    if (parentId in mergedChildrenMap) {
      mergedChildrenMap[parentId as IssueId] = [
        ...mergedChildrenMap[parentId as IssueId],
        ...children
      ];
    } else {
      mergedChildrenMap[parentId as IssueId] = [...children];
    }
  });
  
  Object.entries(collection2.parentMap).forEach(([childId, parentId]) => {
    mergedParentMap[childId as IssueId] = parentId;
  });
  
  return {
    issues: mergedIssues,
    relations: mergedRelations,
    childrenMap: mergedChildrenMap,
    parentMap: mergedParentMap,
    rootIssueId: collection1.rootIssueId || collection2.rootIssueId
  };
};

