import { parameter } from "./schema.js";
import { z } from "zod";
import { getTreeView, jsonIssueTreeAlg } from "../../domain/readmodel/treeView.js";

export const treeTool = {
  name: "tree",
  description: `
    capability: 論点ツリーの取得、詳細分析、またはリセットを行う。
    preConditions: resetする際は、ユーザの合意を得ていること
    postActions: action=getの場合、現在の論点構造をユーザー向けにビジュアライズする。
  `,
  parameters: parameter,
  execute: async (
    args: z.infer<typeof parameter>
  ) => {
    if (args.action === "get") {
      const treeJson = await getTreeView()(jsonIssueTreeAlg);
      return {
        content: [
          {
            type: "text" as const,
            text: "ツリー全体です"
          },
          {
            type: "text" as const,
            text: JSON.stringify(treeJson)
          }
        ]
      };
    }
    return { content: [] };
  }
};

