import { z } from "zod";

export const parameters = z.object({
  action: z.enum(["add"]),
  title: z.string().min(1),
  dimension: z.string().min(1),
  parentId: z.string().nullable(),
});