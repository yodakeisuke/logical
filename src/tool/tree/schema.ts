import { z } from "zod";

// input
export const parameter = z.object({
  action: z.enum(["get", "reset"]).describe(`
    get: "現在の論点構造全体を取得",
    reset: "全体を削除する",
  `)
});
