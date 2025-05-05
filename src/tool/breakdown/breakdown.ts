import { createResultInterpreter } from "../../term/logical-tree/dsl.js";
import { LogicalTree, getLogicalTreeErrorMessage } from "../../term/logical-tree/data_structure.js";
import { IssueError, IssueId, getIssueErrorMessage } from "../../term/issue/data_structure.js";
import { DecomposeType, BreakdownType } from "../../term/breakdown/data_structure.js";
import { Dimension } from "../../term/issue/data_structure.js";
import { toJsonCodeblock } from "../../common/format.js";
import { createPersistence } from "../../persistence/persistence.js";
import { parametersSchema, parametersDefinition } from "./schema.js";
import { z } from "zod";

const persistence = createPersistence();

const validateAndRepairTree = (tree: LogicalTree): LogicalTree => {
  return tree;
};

const executeBreakdownWithTree = (
  initialTree: LogicalTree,
  parentId: IssueId,
  labels: string[],
  dimension: string | Dimension,
  breakdownType: string | BreakdownType,
  decomposeType: DecomposeType 
) => {
  const interpreter = createResultInterpreter({
    saveToStorage: tree => persistence.save(tree)
  });
  
  const result = interpreter.breakdownIssue(
    initialTree,
    parentId, 
    labels, 
    dimension as Dimension, 
    breakdownType as BreakdownType, 
    decomposeType
  );
  
  return result.match(
    tree => {
      const saveResult = interpreter.saveTree(tree);
      
      return saveResult.match(
        _ => {
          const jsonCode = toJsonCodeblock(tree);
          const childrenMessage = `子論点タイトル: ${labels.join(', ')}\n`;
          
          return {
            content: [
              { 
                type: "text" as const, 
                text: `論点「${parentId}」を${labels.length}個の子論点にブレイクダウンしました。\n`
                    + childrenMessage
                    + `次のステップは「${tree.nextStepYouNeedToTake}」です。`
              },
              {
                type: "text" as const,
                text: jsonCode
              }
            ]
          };
        },
        error => {
          return {
            content: [{ 
              type: "text" as const, 
              text: `ブレイクダウンは成功しましたが、ツリーの保存に失敗しました: ${getLogicalTreeErrorMessage(error)}` 
            }]
          };
        }
      );
    },
    error => {
      const errorMessage = typeof error === 'string' ? error : getIssueErrorMessage(error as IssueError);
      return {
        content: [{ type: "text" as const, text: errorMessage }]
      };
    }
  );
};

export const breakdownTool = {
  name: "breakdown",
  description: `
    capability: 論点をブレイクダウンする。
    preConditions: ブレイクダウン対象の論点IDと子論点のラベル一覧が必要。
    postActions: ツリーを更新し、ブレイクダウン結果を表示。
  `,
  parameters: parametersDefinition,
  execute: async (params: z.infer<typeof parametersSchema>) => {
    try {
      const validationResult = parametersSchema.safeParse(params);
      if (!validationResult.success) {
        return {
          content: [{ 
            type: "text" as const, 
            text: "パラメータが不正です: " + validationResult.error.errors.map(e => e.message).join(", ") 
          }]
        };
      }
      
      const { parentId, labels, dimension, breakdownType, decomposeType } = validationResult.data;
      
      const loadResult = persistence.load();

      return loadResult.match(
        loadedTree => {
          if (!loadedTree) {
            return {
              content: [{ 
                type: "text" as const, 
                text: "論点ツリーが見つかりません。先に 'issue' ツールでルート論点を作成してください。" 
              }]
            };
          }
          
          const initialTree = validateAndRepairTree(loadedTree);
          
          return executeBreakdownWithTree(initialTree, parentId, labels, dimension as Dimension, breakdownType as BreakdownType, decomposeType as DecomposeType);
        },
        error => {
          const errorMessage = typeof error === 'string' ? error : getLogicalTreeErrorMessage(error);
          return {
            content: [{ 
              type: "text" as const, 
              text: "ツリーの読み込みに失敗しました：" + errorMessage 
            }]
          };
        }
      );
    } catch (error) {
      return {
        content: [{ 
          type: "text" as const, 
          text: "ブレイクダウン処理中に予期せぬエラーが発生しました。" 
        }]
      };
    }
  }
};