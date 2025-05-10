import { z } from "zod";

// 1. パラメータの形状 (ZodRawShape) を定義
export const treeParamsShape = {
  action: z.enum(["get", "reset"]).describe(`
    get: "現在の論点構造全体を取得",
    reset: "全体を削除する",
  `)
};

// 2. ZodObjectインスタンスを作成 (z.inferや内部バリデーション用)
export const treeZodObject = z.object(treeParamsShape);

// 3. TypeScriptの型を z.infer で導出
export type TreeToolParameters = z.infer<typeof treeZodObject>; // 型名を TreeToolParameters に統一感を出す