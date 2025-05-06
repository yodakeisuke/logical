import { Result, ok, err } from "neverthrow";
import { IssueTree } from "./adt.js";
import { promises as fs } from "fs";
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// syntax
export interface TreeOp<R> {
  getTree: () => Promise<Result<R, string>>;
  saveTree: (tree: IssueTree) => Promise<Result<R, string>>;
}
type Term = <R>(alg: TreeOp<R>) => Promise<Result<R, string>>;

// smart constructors
export const getTree = (): Term =>
  <R>(alg: TreeOp<R>) => alg.getTree();

export const saveTree = (
  tree: IssueTree
): Term => <R>(alg: TreeOp<R>) => alg.saveTree(tree);

// semantics
export const treeAlg: TreeOp<IssueTree | undefined> = {
  getTree: async (): Promise<Result<IssueTree, string>> => {
    try {
      const currentModulePath = fileURLToPath(import.meta.url);
      const currentModuleDir = path.dirname(currentModulePath);
      const filePath = path.resolve(
        currentModuleDir, '..', '..', '..', '..', 'snapshot', 'tree.json'
      );
      const data = await fs.readFile(filePath, 'utf-8');
      const tree = JSON.parse(data) as IssueTree;
      return ok(tree);
    } catch (e) {
      return err(String(e));
    }
  },
  saveTree: async (tree): Promise<Result<undefined, string>> => {
    try {
      const filePath = 'snapshot/tree.json';
      await fs.writeFile(filePath, JSON.stringify(tree, null, 2));
      return ok(undefined);
    } catch (e) {
      return err(String(e));
    }
  },
};
