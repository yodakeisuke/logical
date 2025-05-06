import { z } from "zod";

export const parameters = z.object({
  action: z.enum(["add"], {
    error: "操作タイプは 'add' のいずれかである必要があります",
  }),
  title: z.string().min(1, { error: "タイトルは1文字以上必要です" }),
  dimension: z.string().min(1, { error: "切り口は1文字以上必要です" }),
});