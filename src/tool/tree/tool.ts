import { treeParamsShape, TreeToolParameters } from "./schema.js";
import { getTreeView, treeViewAlg } from "../../domain/readmodel/dsl.js";
import { treeJsonAlg } from "../../domain/term/tree/dsl.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { toCallToolResult } from "../util.js";

export const treeTool = {
  name: "tree",
  description: `
    capability: 論点ツリーの取得、詳細分析、またはリセットを行う。
    preConditions: resetする際は、ユーザの合意を得ていること
    postActions: action=getの場合、現在の論点構造をユーザー向けにビジュアライズする。
  `,
  parameters: treeParamsShape,
  execute: async function(
    args: TreeToolParameters,
  ): Promise<CallToolResult> {
    // baking...
    const getTreeViewProgram = () =>
      getTreeView()(treeViewAlg(treeJsonAlg));

    // workflows
    switch (args.action) {
      case "get":
        return getTreeViewProgram()
          .map(json =>
            toCallToolResult(["全体の論点構造を取得した", JSON.stringify(json)], false)
          )
          .mapErr(errorMessageString =>
            toCallToolResult([errorMessageString], true)
          )
          .match(
            (data) => data,
            (error) => error
          );
      case "reset":
        return treeJsonAlg.reset()
          .map(_ =>
            toCallToolResult(["ツリーをリセットしました"], false)
          )
          .mapErr(errorMessageString =>
            toCallToolResult([`リセットに失敗しました: ${errorMessageString}`], true)
          )
          .match(
            (data) => data,
            (error) => error
          );
      default: throw new Error(args.action satisfies never)
    }
  }
}

