import { generateTimestamp } from '../../common/id.js';
import { 
  IssueCollection,
  IssueError,
  getIssueErrorMessage,
  createEmptyCollection as createEmptyIssueCollection
} from '../issue/data_structure.js';
import { BreakdownCollection, emptyBreakdownCollection } from '../breakdown/data_structure.js';

export type NextStep = "issue" | "breakdown" | "finished";

export type TreeMeta = {
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
};

export type LogicalTree = {
  readonly nextStepYouNeedToTake: NextStep;
  readonly collection: IssueCollection;
  readonly breakdownCollection: BreakdownCollection;
  readonly meta: TreeMeta;
};

export interface StorageError { 
  readonly _tag: "StorageError"; 
  readonly message: string;
}

export type LogicalTreeError = 
  | IssueError
  | StorageError;

export const storageError = (message: string): StorageError => 
  ({ _tag: "StorageError", message });

export const isStorageError = (error: LogicalTreeError): error is StorageError => 
  error._tag === "StorageError";

export const isIssueError = (error: LogicalTreeError): error is IssueError => 
  !isStorageError(error);

export const getLogicalTreeErrorMessage = (error: LogicalTreeError): string => {
  if (isStorageError(error)) {
    return `保存処理中にエラーが発生しました: ${error.message}`;
  }
  
  return getIssueErrorMessage(error);
};

export const createTreeMeta = (
  version: number = 3
): TreeMeta => {
  const now = generateTimestamp();
  return {
    createdAt: now,
    updatedAt: now,
    version
  };
};

export const createNewTree = (): LogicalTree => ({
  nextStepYouNeedToTake: "issue",
  collection: createEmptyIssueCollection(),
  breakdownCollection: emptyBreakdownCollection(),
  meta: createTreeMeta()
});