import { 
  Breakdown,
  BreakdownCollection,
  BreakdownError,
  BreakdownId,
  createBreakdown,
  emptyBreakdownCollection,
  BreakdownType,
  DecomposeType
} from './data_structure.js';
import { 
  IssueId,
  IssueCollection,
  Dimension
} from '../issue/data_structure.js';
import { Result, ok, err } from 'neverthrow';

export type BreakdownResult<T> = Result<T, BreakdownError>;

export const BreakdownCollectionOps = {
  addBreakdown: (
    collection: BreakdownCollection, 
    breakdown: Breakdown
  ): BreakdownCollection => ({
    ...collection,
    breakdowns: [...collection.breakdowns, breakdown]
  }),
  
  getBreakdownByParentId: (
    collection: BreakdownCollection, 
    parentId: IssueId
  ): Breakdown | undefined => {
    return collection.breakdowns.find(bd => bd.parentIssueId === parentId);
  },
  
  getBreakdownByChildId: (
    collection: BreakdownCollection, 
    childId: IssueId
  ): Breakdown | undefined => {
    return collection.breakdowns.find(bd => 
      bd.childIssueIds.includes(childId)
    );
  },
  
  getSiblingBreakdowns: (
    collection: BreakdownCollection,
    issueCollection: IssueCollection,
    childId: IssueId
  ): Breakdown[] => {
    const breakdown = BreakdownCollectionOps.getBreakdownByChildId(
      collection, childId
    );
    if (!breakdown) return [];
    
    const parentId = breakdown.parentIssueId;
    
    return collection.breakdowns.filter(bd => 
      bd.id !== breakdown.id && bd.parentIssueId === parentId
    );
  },
  
  validateBreakdownConsistency: (
    collection: BreakdownCollection,
    issueCollection: IssueCollection,
    parentId: IssueId,
    type: BreakdownType,
    dimension: Dimension
  ): BreakdownResult<true> => {
    const existingBreakdown = BreakdownCollectionOps.getBreakdownByParentId(
      collection, parentId
    );
    
    if (existingBreakdown) {
      if (existingBreakdown.type !== type || existingBreakdown.dimension !== dimension) {
        return err(BreakdownError.inconsistentBreakdown(
          existingBreakdown.type, 
          existingBreakdown.dimension
        ));
      }
    } else {
      const parentBreakdown = BreakdownCollectionOps.getBreakdownByChildId(
        collection, parentId
      );
      
      if (parentBreakdown) {
        const siblingIssueIds = parentBreakdown.childIssueIds.filter(id => id !== parentId);
        
        for (const siblingId of siblingIssueIds) {
          const siblingBreakdown = BreakdownCollectionOps.getBreakdownByParentId(
            collection, siblingId
          );
          
          if (siblingBreakdown) {
            if (siblingBreakdown.type !== type) {
              return err(BreakdownError.inconsistentBreakdown(
                siblingBreakdown.type, undefined
              ));
            }
            
            if (siblingBreakdown.dimension !== dimension) {
              return err(BreakdownError.inconsistentBreakdown(
                undefined, siblingBreakdown.dimension
              ));
            }
          }
        }
      }
    }
    
    return ok(true);
  }
};

export interface BreakdownDSL<F> {
  getCollection: () => F;
  getBreakdownById: (id: BreakdownId) => F;
  getBreakdownByParentId: (parentId: IssueId) => F;
  getBreakdownByChildId: (childId: IssueId) => F;
  
  createBreakdown: (
    parentId: IssueId,
    childIds: IssueId[],
    type: BreakdownType,
    dimension: Dimension,
    decomposeType: DecomposeType
  ) => F;
  
  validateConsistency: (
    parentId: IssueId,
    type: BreakdownType,
    dimension: Dimension
  ) => F;
}

export const BreakdownValidation = {
  validateChildCount: (childIds: IssueId[]): BreakdownResult<IssueId[]> => {
    const MIN_CHILDREN = 2;
    const MAX_CHILDREN = 5;
    
    if (childIds.length < MIN_CHILDREN) {
      return err(BreakdownError.notEnoughChildren(MIN_CHILDREN));
    }
    
    if (childIds.length > MAX_CHILDREN) {
      return err(BreakdownError.tooManyChildren(MAX_CHILDREN));
    }
    
    return ok(childIds);
  }
};

export const createResultInterpreter = (
  issueCollection: IssueCollection,
  initialCollection: BreakdownCollection = emptyBreakdownCollection()
): BreakdownDSL<BreakdownResult<Breakdown | BreakdownCollection | IssueCollection | IssueId[] | boolean>> => {
  let currentCollection = initialCollection;
  
  return {
    getCollection: () => ok<BreakdownCollection, BreakdownError>(currentCollection),
    
    getBreakdownById: (id: BreakdownId) => {
      const breakdown = currentCollection.breakdowns.find(bd => bd.id === id);
      
      return breakdown
        ? ok<Breakdown, BreakdownError>(breakdown)
        : err<Breakdown, BreakdownError>(BreakdownError.invalidStructure(`ブレイクダウンID ${id} が見つかりません`));
    },
    
    getBreakdownByParentId: (parentId: IssueId) => {
      const breakdown = BreakdownCollectionOps.getBreakdownByParentId(
        currentCollection, parentId
      );
      
      return breakdown
        ? ok<Breakdown, BreakdownError>(breakdown)
        : err<Breakdown, BreakdownError>(BreakdownError.invalidStructure(`親論点ID ${parentId} に関連するブレイクダウンが見つかりません`));
    },
    
    getBreakdownByChildId: (childId: IssueId) => {
      const breakdown = BreakdownCollectionOps.getBreakdownByChildId(
        currentCollection, childId
      );
      
      return breakdown
        ? ok<Breakdown, BreakdownError>(breakdown)
        : err<Breakdown, BreakdownError>(BreakdownError.invalidStructure(`子論点ID ${childId} に関連するブレイクダウンが見つかりません`));
    },
    
    createBreakdown: (parentId, childIds, type, dimension, decomposeType) => {
      const childCountResult = BreakdownValidation.validateChildCount(childIds);
      if (childCountResult.isErr()) {
        return err<Breakdown, BreakdownError>(childCountResult.error);
      }
      
      const consistencyResult = BreakdownCollectionOps.validateBreakdownConsistency(
        currentCollection,
        issueCollection,
        parentId,
        type,
        dimension
      );
      
      if (consistencyResult.isErr()) {
        return err<Breakdown, BreakdownError>(consistencyResult.error);
      }
      
      const existingBreakdown = BreakdownCollectionOps.getBreakdownByParentId(
        currentCollection, parentId
      );
      
      if (existingBreakdown) {
        return err<Breakdown, BreakdownError>(BreakdownError.invalidStructure(
          `親論点ID ${parentId} は既にブレイクダウンされています`
        ));
      }
      
      const newBreakdown = createBreakdown(
        parentId,
        childIds,
        type,
        dimension,
        decomposeType
      );
      
      currentCollection = BreakdownCollectionOps.addBreakdown(
        currentCollection, newBreakdown
      );
      
      return ok<Breakdown, BreakdownError>(newBreakdown);
    },
    
    validateConsistency: (parentId, type, dimension) => {
      return BreakdownCollectionOps.validateBreakdownConsistency(
        currentCollection,
        issueCollection,
        parentId,
        type,
        dimension
      );
    }
  };
};