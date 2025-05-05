import { LogicalTree, LogicalTreeError, createNewTree, getLogicalTreeErrorMessage } from "../../term/logical-tree/data_structure.js";
import { createResultInterpreter } from "../../term/logical-tree/dsl.js";
import { IssueId, IssueError, getIssueErrorMessage } from "../../term/issue/data_structure.js";
import { Dimension } from "../../term/issue/data_structure.js";
import { Result, ok, err } from "neverthrow";
import { toJsonCodeblock } from "../../common/format.js";
import { createPersistence } from "../../persistence/persistence.js";
import { 
  parametersSchema, 
  IssueParameters, 
  validateIssueParams, 
  parametersDefinition 
} from "./schema.js";

const persistence = createPersistence();

const executeOperation = (
  interpreter: ReturnType<typeof createResultInterpreter>,
  tree: LogicalTree,
  params: IssueParameters
): { result: Result<LogicalTree, LogicalTreeError>; message: string } => {
  switch (params.operation) {
    case "add":
      return {
        result: interpreter.addRootIssue(tree, params.title!),
        message: `ルート論点「${params.title}」を追加しました。`
      };
    
    case "update":
      return {
        result: interpreter.updateIssue(
          tree,
          params.issueId!, 
          params.title!, 
          params.dimension! as Dimension
        ),
        message: `論点「${params.issueId}」を更新しました。`
      };
    
    case "delete":
      return {
        result: interpreter.deleteIssue(tree, params.issueId!),
        message: `論点「${params.issueId}」を削除しました。`
      };
    
    default:
      throw new Error("不明な操作タイプです。");
  }
};

const formatSuccess = (tree: LogicalTree, operationMessage: string, operation: string) => {
  const jsonCode = toJsonCodeblock(tree);
  const nextStepMessage = operation === "add" && tree.nextStepYouNeedToTake
    ? `\n次のステップは「${tree.nextStepYouNeedToTake}」です。`
    : "";
  
  return {
    content: [
      { 
        type: "text" as const, 
        text: operationMessage + nextStepMessage
      },
      {
        type: "text" as const,
        text: jsonCode
      }
    ]
  };
};

const formatError = (error: LogicalTreeError) => {
  const errorMessage = error._tag === 'IssueNotFound'
    ? `指定された論点(ID: ${error.issueId})が見つかりません。`
    : getIssueErrorMessage(error as IssueError);
  
  return {
    content: [{ 
      type: "text" as const, 
      text: errorMessage 
    }]
  };
};

const executeIssueTool = async (params: IssueParameters) => {
  const loadResult = persistence.load();
  
  return loadResult.match(
    loadedTree => {
      const initialTree = loadedTree || createNewTree();
      const interpreter = createResultInterpreter({
        saveToStorage: tree => persistence.save(tree)
      });
      
      try {
        const { result, message } = executeOperation(interpreter, initialTree, params);
        return result.match(
          tree => formatSuccess(tree, message, params.operation),
          error => formatError(error)
        );
      } catch (error) {
        return {
          content: [{ 
            type: "text" as const, 
            text: "不明な操作タイプです。" 
          }]
        };
      }
    },
    error => {
      const errorMessage = typeof error === 'string' 
        ? error 
        : getLogicalTreeErrorMessage(error);
        
      return {
        content: [{ 
          type: "text" as const, 
          text: "論点ツリーの読み込みに失敗しました：" + errorMessage
        }]
      };
    }
  );
};

export const issueTool = {
  name: "issue",
  description: `
    capability: 論点の操作（追加・更新・削除）を行う。
    preConditions: addの場合はタイトル、update/deleteの場合は論点IDが必要。
    postActions: 論点ツリーを更新し、結果を表示。
  `,
  parameters: parametersDefinition,
  execute: async (params: unknown) => {
    const validationResult = parametersSchema.safeParse(params);
    if (!validationResult.success) {
      return {
        content: [{ 
          type: "text" as const, 
          text: "パラメータが不正です: " + validationResult.error.errors.map(e => e.message).join(", ") 
        }]
      };
    }

    const operationValidation = validateIssueParams(validationResult.data);
    if (!operationValidation.valid) {
      return {
        content: [{ 
          type: "text" as const, 
          text: operationValidation.message || "パラメータが不正です" 
        }]
      };
    }

    return executeIssueTool(validationResult.data);
  }
};