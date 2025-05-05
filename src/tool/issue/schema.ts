import { z } from "zod";
import { IssueId } from "../../term/issue/data_structure.js";

export const parametersSchema = z.object({
  operation: z.enum(["add", "update", "delete"], { 
    required_error: "操作タイプは必須です", 
    invalid_type_error: "操作タイプは 'add', 'update', または 'delete' のいずれかである必要があります"
  }),
  
  title: z.string().min(1, { message: "タイトルは1文字以上必要です" }).optional(),
  issueId: z.string().min(1, { message: "論点IDは1文字以上必要です" }).optional()
    .transform(id => id ? id as IssueId : undefined),
  dimension: z.string().min(1, { message: "次元は1文字以上必要です" }).optional()
});

export type IssueParameters = z.infer<typeof parametersSchema>;

export const validateIssueParams = (data: IssueParameters): { valid: boolean, message?: string } => {
  if (data.operation === "add" || data.operation === "update") {
    if (!data.title) {
      return { valid: false, message: "add/update操作にはタイトルが必要です" };
    }
  }
  
  if (data.operation === "update" || data.operation === "delete") {
    if (!data.issueId) {
      return { valid: false, message: "update/delete操作には論点IDが必要です" };
    }
  }
  
  if (data.operation === "update") {
    if (!data.dimension) {
      return { valid: false, message: "update操作には次元が必要です" };
    }
  }
  
  return { valid: true };
};

export const parametersDefinition = {
  type: "object",
  properties: {
    operation: {
      type: "string",
      enum: ["add", "update", "delete"],
      description: "操作種別（add: 追加, update: 更新, delete: 削除）"
    },
    title: {
      type: "string",
      description: "論点のタイトル（add/update操作で必須）"
    },
    issueId: {
      type: "string",
      description: "論点のID（update/delete操作で必須）"
    },
    dimension: {
      type: "string",
      description: "論点の次元（update操作で必須）"
    }
  },
  required: ["operation"]
};