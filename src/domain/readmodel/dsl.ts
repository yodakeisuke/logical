import { transformDomainToView, TreeJson } from './schema.js';
import { TreeOp } from '../term/tree/dsl.js';
import { IssueTree } from '../term/tree/adt.js';
import { ResultAsync } from "neverthrow";

// syntax
export interface TreeViewOp<R> {
  getTree(): R;
}
type Term = <T>(alg: TreeViewOp<T>) => T;

// smart constructors
export const getTreeView = (): Term => 
  <T>(alg: TreeViewOp<T>): T => alg.getTree();

// semantics
export const treeViewAlg = (
  treeAlg: TreeOp<IssueTree>
): TreeViewOp<ResultAsync<TreeJson, string>> => ({
  getTree: () =>
    treeAlg
      .retrieve()
      .map(transformDomainToView),
});