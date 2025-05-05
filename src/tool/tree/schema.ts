import { z } from "zod";

export const parametersSchema = z.object({
  action: z.enum(["get", "reset"], { 
    required_error: "action パラメータが必要です", 
    invalid_type_error: "action パラメータは 'get' または 'reset' である必要があります" 
  }).default("get")
});

export type TreeParameters = z.infer<typeof parametersSchema>;

export const parametersDefinition = {
  type: "object",
  properties: {
    action: {
      type: "string",
      enum: ["get", "reset"],
      description: "get: 現在の論点ツリーを取得, reset: 論点ツリーをリセット"
    }
  },
  required: []
};