import { transformDomainToView, TreeJson } from './schema.js';
import { getTree, TreeOp } from '../term/tree/dsl.js';
import { Result, ok, err } from "neverthrow";
import { IssueTree } from '../term/tree/adt.js';

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
  treeAlg: TreeOp<IssueTree | undefined>
): TreeViewOp<Promise<Result<TreeJson, string>>> => ({
  getTree: async () => {
    return (await getTree()(treeAlg))
      .andThen(tree => {
        if (!tree) return err("tree is undefined");
        return ok(transformDomainToView(tree));
      })
      .orElse(e => err(e));
  },
});