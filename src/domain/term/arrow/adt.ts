import { z } from "zod";

export const Arrow = z.object({
  id: z.string(),
  parentId: z.string(),
  childrenIds: z.array(z.string()),
  type: z.string(),
  cutAxis: z.string().nullable(),
});
