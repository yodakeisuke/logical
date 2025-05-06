import { z } from "zod";

export const parametersSchema = z.object({
  operation: z.enum(["add"], { 
    required_error: "操作タイプは必須です", 
    invalid_type_error: "操作タイプは 'add' のいずれかである必要があります" // 後ほど他の操作も追加
  }),
  title: z.string().min(1, { message: "タイトルは1文字以上必要です" }),
  dimension: z.string().min(1, { message: "切り口は1文字以上必要です" }),
});