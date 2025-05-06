import { z } from "zod";
import { Result, ok, err } from "neverthrow";
import { v4 as uuidv4 } from "uuid";
import { Request } from "./schema.js";
import { Issue } from "../../term/issue/adt.js";

/**
 * 語彙 「ブレイクダウン」
 * granularity: aggregate 
 * domain type: operation
 * persistence: false
 */

// syntax: Breakdown operation
export interface BreakdownOp<R> {
  defineIssue: (input: Request) => R;
}
export type Term<R> = (alg: BreakdownOp<R>) => R;

// smart constructor for defineIssue
export const defineIssue = (
  input: Request
): Term<Promise<Result<IssueTree, string>>> =>
  (alg) => alg.defineIssue(input);

// IssueTree型
export type IssueTree = {
  rootId: string | null;
  issues: Record<string, z.infer<typeof Issue>>;
};

// semantics
export const breakdownAlg = (
  getTreeFunc: () => Promise<IssueTree | null>,
  saveTreeFunc: (tree: IssueTree) => Promise<void>
): BreakdownOp<Promise<Result<IssueTree, string>>> => ({
  defineIssue: async (input: Request) => {
    const current = await getTreeFunc();
    if (current && current.rootId) {
      return err("既に論点ツリーが存在します");
    }
    const id = uuidv4();
    const rootIssue = Issue.parse({
      id,
      title: input.title,
      dimension: input.dimension,
      parentId: input.parentId,
      children: [],
    });
    const newTree: IssueTree = {
      rootId: id,
      issues: { [id]: rootIssue },
    };
    await saveTreeFunc(newTree);
    return ok(newTree);
  }
});

