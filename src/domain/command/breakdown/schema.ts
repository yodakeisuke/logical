import { z } from "zod";

// input
const Request = z.object({
    parentId: z.string().nullable(),
    title: z.string(),
    dimension: z.string(),
  });
type Request = z.infer<typeof Request>;

export { Request };