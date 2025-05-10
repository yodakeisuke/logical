import { z } from "zod";

// 1. パラメータの形状 (ZodRawShape) を定義
export const issueParamsShape = {
  action: z.enum(["add", "delete"]).describe(`
    add: 論点を追加する,
    delete: 論点を削除する,
  `),
  title: z.string().min(1).describe(`考え抜かれた論点を設定する`),
  dimension: z.string().min(1).describe(`親論点から派生した際の「切り口」どのような軸で親からブレイクダウンしたのか`),
  parentId: z.string().nullable().describe(`親論点のID`),
};

// 2. ZodObjectインスタンスを作成 (z.inferや内部バリデーション用)
export const issueZodObject = z.object(issueParamsShape);

// 3. TypeScriptの型を z.infer で導出
export type IssueToolParameters = z.infer<typeof issueZodObject>;
