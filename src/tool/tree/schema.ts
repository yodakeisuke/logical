import { z } from "zod";

// input
export const parameter = z.object({
  action: z.enum(["get", "reset"], { 
    error: "action パラメータは 'get' または 'reset' である必要があります" 
  }).default("get").optional()
});
