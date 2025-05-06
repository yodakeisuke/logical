import { parameter } from "./schema.js";
import { z } from "zod";
import { getTreeView, treeViewAlg } from "../../domain/readmodel/dsl.js";
import { treeAlg } from "../../domain/term/tree/dsl.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { ServerRequest, ServerNotification, CallToolResult } from "@modelcontextprotocol/sdk/types.js";

// 直接ツールコールバック関数として定義
export const treeTool = {
  name: "tree",
  description: `
    capability: 論点ツリーの取得、詳細分析、またはリセットを行う。
    preConditions: resetする際は、ユーザの合意を得ていること
    postActions: action=getの場合、現在の論点構造をユーザー向けにビジュアライズする。
  `,
  parameters: parameter,
  execute: async function(
    args: { [x: string]: any },
    extra: RequestHandlerExtra<ServerRequest, ServerNotification>
  ): Promise<CallToolResult> {
    // 引数からactionを取得
    const action = args.action as "get" | "reset";
    
    if (action === "get") {
      const treeResult = await getTreeView()(treeViewAlg(treeAlg));
      
      if (treeResult.isOk()) {
        const treeJson = treeResult.value;
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
      } else {
        return {
          content: [
            {
              type: "text" as const,
              text: `エラーが発生しました: ${treeResult.error}`
            }
          ],
          isError: true
        };
      }
    } else if (action === "reset") {
      // resetの処理を実装する場合はここに追加
      return {
        content: [
          {
            type: "text" as const,
            text: "ツリーをリセットしました"
          }
        ]
      };
    }
    
    // デフォルトの返り値
    return { 
      content: [
        {
          type: "text" as const,
          text: "無効なアクションです"
        }
      ],
      isError: true
    };
  }
};

