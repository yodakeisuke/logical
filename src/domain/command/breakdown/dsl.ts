import { ok, err, ResultAsync, Result } from "neverthrow";
import { Request } from "./schema.js";
import { Issue } from "../../term/issue/adt.js";
import { TreeOp } from "../../term/tree/dsl.js";
import { IssueTree } from "../../term/tree/adt.js";
import { IssueOp } from "../../term/issue/dsl.js";

/**
 * 語彙 「ブレイクダウン」
 * granularity: aggregate 
 * domain type: operation
 * persistence: false
 */

// syntax
export interface BreakdownOp<R> {
  defineIssue: (input: Request) => R;
}
export type Term<R> = (alg: BreakdownOp<R>) => R;

// smart constructor
export const defineIssue = (
  input: Request
): Term<ResultAsync<IssueTree, string>> =>
  (alg) => alg.defineIssue(input);

// semantics
export const breakdownAlg = (
  treeAlg: TreeOp<IssueTree>,
  issueAlg: IssueOp<Issue>,
): BreakdownOp<ResultAsync<IssueTree, string>> => ({
  defineIssue: (input) => {
    return treeAlg.retrieve()
      .andThen(tree => onlyOneRootIssueExists(tree, input))
      .map(tmp => issueAlg.from(input.parentId, input.title, input.dimension))
      .map(issue => treeAlg.from([issue]))
      .andThen(treeAlg.store);
  }
});

// business rules
const onlyOneRootIssueExists = (tree: IssueTree, input: Request): Result<IssueTree, string> => {
  const isAddingRoot = input.parentId === null;

  if (!isAddingRoot) return ok(tree);

  if (!tree) return err("tree is not found");
  if (!tree.issues) return err("issues is not found");
  if (typeof tree.issues !== 'object') return err("issues is not an object");


  // 実際に parentId が null の Issue が存在するかどうかを確認する
  const existingRootIssue = Object.values(tree.issues).find(
    (issue) => issue.parentId === null
  );

  if (existingRootIssue) return err("issue tree already exists");

  // 既存のルートIssueが見つからなかった場合
  return ok(tree);
};