import { issueParamsShape, IssueToolParameters } from "./schema.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { toCallToolResult } from "../util.js";
import { breakdownAlg, defineIssue } from "../../domain/command/breakdown/dsl.js";
import { treeJsonAlg } from "../../domain/term/tree/dsl.js";
import { issueAlg } from "../../domain/term/issue/dsl.js";

export const issueTool = {
  name: "issue",
  description: `
    capability: 論点を追加する。
    preConditions: 設定論点を熟慮した後であること
  `,
  parameters: issueParamsShape,
  execute: async function (
    args: IssueToolParameters,
  ): Promise<CallToolResult> {
    // baking...
    const defineIssueProgram = (params: IssueToolParameters) =>
      defineIssue({ ...params })(breakdownAlg(treeJsonAlg, issueAlg));

    // workflows
    switch (args.action) {
      case "add": {
        return defineIssueProgram(args)
          .map(data => toCallToolResult(["論点を追加しました", JSON.stringify(data)], false))
          .mapErr(error => toCallToolResult([error], true))
          .match(
            (data) => data,
            (error) => error
          );
      }
      case "delete":
        return toCallToolResult(["placeholder"], false);
      default:
        throw new Error(args.action satisfies never);
    }
  },
};