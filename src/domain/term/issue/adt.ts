import { z } from "zod";

export const Issue = z.object({
  id: z.string(),
  title: z.string(),
  dimension: z.string(), // implicit: ルート論点なら "root"
  parentId: z.string().nullable(), // implicit: parentIdがnullならルートを表す
  children: z.array(z.string()),
});

export type Issue = z.infer<typeof Issue>;
