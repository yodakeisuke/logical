import { promises as fs } from "fs";
import path from 'node:path';
import { ResultAsync } from "neverthrow";
import { IssueTree } from "./adt.js";
import { Issue } from "../issue/adt.js";
import { errorMessage, getSnapshotFilePath } from "../../../common/util.js";

// syntax
export interface TreeOp<R> {
  from: (issues: Issue[]) => IssueTree;
  store: (tree: IssueTree) => ResultAsync<R, string>;
  retrieve: () => ResultAsync<R, string>;
  reset: () => ResultAsync<R, string>;
}
type Term = <R>(alg: TreeOp<R>) => ResultAsync<R, string>;

// smart constructors
export const retrieve = (): Term =>
  <R>(alg: TreeOp<R>) => alg.retrieve();

export const store = (
  tree: IssueTree
): Term => <R>(alg: TreeOp<R>) => alg.store(tree);

// semantics
export const treeJsonAlg: TreeOp<IssueTree> = {
  from: (issues: Issue[]) => {
    const newTree: IssueTree = {
      issues: issues.length > 0 ? { [issues[0].id]: issues[0] } : {},
      arrows: [],
    };
    return newTree;
  },
  store: (tree) => {
    const filePath = getSnapshotFilePath(import.meta.url);
    const dirPath = path.dirname(filePath);
    const mkdirTask = ResultAsync.fromPromise(
      fs.mkdir(dirPath, { recursive: true }),
      errorMessage
    );
    const writeFileTask = () => ResultAsync.fromPromise(
      fs.writeFile(filePath, JSON.stringify(tree, null, 2)),
      errorMessage
    );

    return mkdirTask.andThen(writeFileTask).map(() => tree);
  },
  retrieve: () => {
    return ResultAsync.fromPromise(
      (async () => {
        const filePath = getSnapshotFilePath(import.meta.url);
        try {
          const data = await fs.readFile(filePath, 'utf-8');
          const parsedJson = JSON.parse(data);
          const validationResult = IssueTree.safeParse(parsedJson);
          if (!validationResult.success) {
            throw new Error(`Failed to parse IssueTree from snapshot. Zod errors: ${JSON.stringify(validationResult.error.format())}`);
          }
          return validationResult.data;
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
            // File not found, return an empty/default IssueTree
            return { issues: {}, arrows: [] } satisfies IssueTree;
          }
          throw e; // Re-throw other errors
        }
      })(),
      errorMessage
    );
  },
  reset: () => {
    const filePath = getSnapshotFilePath(import.meta.url);
    const emptyTree: IssueTree = { issues: {}, arrows: [] };

    return ResultAsync.fromPromise(
      (async () => { // Corrected: IIFE for async block
        try {
          await fs.unlink(filePath);
          return emptyTree; // Return empty tree on successful deletion
        } catch (e) {
          const nodeError = e as NodeJS.ErrnoException;
          if (nodeError.code === 'ENOENT') {
            return emptyTree; // File not found is a "successful" reset, return empty tree
          }
          throw nodeError; // Re-throw other errors
        }
      })(),
      (e) => errorMessage(e as Error) // Convert error to string
    );
  },
};
