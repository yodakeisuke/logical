import { Result, ok, err } from "neverthrow";
import { IssueTree } from "./adt.js";

// syntax
export interface TreeOp<R> {
  getTree: () => R;
  saveTree: (tree: IssueTree) => R;
}
export type Term<R> = (alg: TreeOp<R>) => R;

// smart constructors
export const getTree = (): Term<Promise<Result<IssueTree, string>>> =>
  (alg) => alg.getTree();

export const saveTree = (
  tree: IssueTree
): Term<Promise<Result<void, string>>> =>
  (alg) => alg.saveTree(tree);

// semantics
export const treeAlg = (
  getTreeFunc: () => Promise<IssueTree>,
  saveTreeFunc: (tree: IssueTree) => Promise<void>
): TreeOp<Promise<Result<any, string>>> => ({
  getTree: async () => {
    try {
      const tree = await getTreeFunc();
      return ok(tree);
    } catch (e) {
      return err(String(e));
    }
  },
  saveTree: async (t) => {
    try {
      await saveTreeFunc(t);
      return ok(undefined);
    } catch (e) {
      return err(String(e));
    }
  },
});
