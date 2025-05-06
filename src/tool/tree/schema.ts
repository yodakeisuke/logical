import { z } from "zod";

// input
export const parameter = z.object({
  action: z.enum(["get", "reset"], { 
    required_error: "action パラメータが必要です", 
    invalid_type_error: "action パラメータは 'get' または 'reset' である必要があります" 
  }).default("get")
});
