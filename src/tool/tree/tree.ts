import { LogicalTree, LogicalTreeError, createNewTree, getLogicalTreeErrorMessage } from "../../term/logical-tree/data_structure.js";
import { toJsonCodeblock } from "../../common/format.js";
import { createPersistence } from "../../persistence/persistence.js";
import { Result, ok, err } from "neverthrow";
import { hasRootIssue } from "../../term/issue/data_structure.js";
import { Issue } from "../../term/issue/data_structure.js";
import { parametersSchema, parametersDefinition, TreeParameters } from "./schema.js";

const persistence = createPersistence();

const validateAndRepairTree = (tree: LogicalTree): LogicalTree => {
  const rootIssues = Object.values(tree.collection.issues).filter(issue => issue.dimension === "root");
  
  // rootDimensionの論点が複数ある場合、最も古いもの以外を削除
  if (rootIssues.length > 1) {
    // 論点の作成順は不明なので、IDで並べて最初のものを保持
    const rootToKeep = rootIssues.sort((a, b) => a.id.localeCompare(b.id))[0];
    
    // 他のルート論点を削除
    const updatedIssues = { ...tree.collection.issues };
    
    Object.values(updatedIssues).forEach(issue => {
      if (issue.dimension === "root" && issue.id !== rootToKeep.id) {
        delete updatedIssues[issue.id];
      }
    });
    
    // 修復されたツリーを返す
    return {
      ...tree,
      collection: {
        ...tree.collection,
        issues: updatedIssues
      }
    };
  }
  
  return tree;
};

export const treeTool = {
  name: "tree",
  description: `
    capability: 論点ツリーの取得、詳細分析、またはリセットを行う。
    preConditions: なし
    postActions: action=resetの場合、論点構造を初期状態に戻す。action=getの場合、詳細な論点構造の分析を表示する。
  `,
  parameters: parametersDefinition,
  execute: async (params: { action?: "get" | "reset" }) => {
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
      
      const { action } = validationResult.data;
      
      if (action === "reset") {
        const newTree = createNewTree();
        const saveResult = persistence.save(newTree);
        
        return saveResult.match(
          _ => {
            return {
              content: [{ 
                type: "text" as const, 
                text: "論点構造を初期状態にリセットしました。" 
              }]
            };
          },
          error => {
            const errorMessage = typeof error === 'string' ? error : getLogicalTreeErrorMessage(error);
            return {
              content: [{ 
                type: "text" as const, 
                text: "論点構造のリセット中にエラーが発生しました: " + errorMessage
              }]
            };
          }
        );
      } else { // action === "get"
        const loadResult = persistence.load();
        
        return loadResult.match(
          loadedTree => {
            const tree = loadedTree || createNewTree();
            
            // 修復後の状態を保存
            if (loadedTree) {
              persistence.save(validateAndRepairTree(tree));
            }
            
            // ツリーの内容をJSON形式で表示
            const jsonCode = toJsonCodeblock(tree);
            
            // ツリーの基本情報も表示
            let infoText = "現在の論点構造情報:\n";
            
            // ルート論点の数を確認
            const rootIssues = Object.values(tree.collection.issues).filter((issue: Issue) => !issue.parentId);
            infoText += `・parentIdが存在しない論点: ${rootIssues.length}個\n`;
            
            // dimension=rootの論点を確認
            const dimensionRootIssues = Object.values(tree.collection.issues).filter((issue: Issue) => issue.dimension === "root");
            infoText += `・dimensionが"root"の論点: ${dimensionRootIssues.length}個\n`;
            
            // hasRootIssueの結果
            const rootIssueExists = hasRootIssue(tree.collection);
            infoText += `・hasRootIssue関数の結果: ${rootIssueExists ? "true" : "false"}\n`;

            // dimension=rootの論点を詳細表示
            if (dimensionRootIssues.length > 0) {
              infoText += `\n【dimension="root"の論点一覧】\n`;
              dimensionRootIssues.forEach((issue: Issue) => {
                infoText += `ID: ${issue.id}, タイトル: "${issue.title}", parentId: ${issue.parentId || "null"}\n`;
              });
            }

            // parentIdがないのにdimension!=rootの論点を検出
            const inconsistentRoots = rootIssues.filter((issue: Issue) => issue.dimension !== "root");
            if (inconsistentRoots.length > 0) {
              infoText += `\n【不整合なルート論点】parentIdがnullなのにdimensionが"root"ではない論点:\n`;
              inconsistentRoots.forEach((issue: Issue) => {
                infoText += `ID: ${issue.id}, タイトル: "${issue.title}", dimension: "${issue.dimension}"\n`;
              });
            }
            
            // 総論点数
            infoText += `\n・総論点数: ${Object.keys(tree.collection.issues).length}個\n`;
            
            // ブレイクダウンの数
            infoText += `・ブレイクダウン数: ${Array.isArray(tree.breakdownCollection.breakdowns) ? tree.breakdownCollection.breakdowns.length : Object.keys(tree.breakdownCollection.breakdowns).length}個\n`;
            
            // 次のステップ
            infoText += `・次のステップ: ${tree.nextStepYouNeedToTake}\n`;
            
            // 更新日時
            infoText += `・最終更新: ${tree.meta.updatedAt}\n`;
            
            return {
              content: [
                { 
                  type: "text" as const, 
                  text: infoText
                },
                {
                  type: "text" as const,
                  text: jsonCode
                }
              ]
            };
          },
          error => {
            // エラーの場合は新規ツリーで対応
            const tree = createNewTree();
            const jsonCode = toJsonCodeblock(tree);
            
            return {
              content: [
                { 
                  type: "text" as const, 
                  text: "論点ツリーの読み込みに失敗しました。新規ツリーを作成します。"
                },
                {
                  type: "text" as const,
                  text: jsonCode
                }
              ]
            };
          }
        );
      }
    } catch (error) {
      return {
        content: [{ 
          type: "text" as const, 
          text: "論点ツリーの操作中に予期せぬエラーが発生しました。" 
        }]
      };
    }
  }
};