import { z } from "zod";
import { IssueId } from "../../term/issue/data_structure.js";

export const parametersSchema = z.object({
  parentId: z.string().min(1, { message: "親論点のIDは必須です" }).transform(value => value as IssueId),
  labels: z.array(z.string()).min(2, { message: "少なくとも2つのラベルが必要です" }).max(5, { message: "ラベルは最大5つまでです" }),
  dimension: z.string().min(1, { message: "dimensionは必須です" }),
  breakdownType: z.enum(["why", "what", "how"], { message: "breakdownTypeはwhy, what, howのいずれかである必要があります" }),
  decomposeType: z.enum(["AND", "OR"], { message: "decomposeTypeはAND, ORのいずれかである必要があります" })
});

export type BreakdownParameters = z.infer<typeof parametersSchema>;

export const parametersDefinition = {
  type: "object",
  properties: {
    parentId: {
      type: "string",
      description: "ブレイクダウンする親論点のID"
    },
    labels: {
      type: "array",
      items: {
        type: "string"
      },
      description: "子論点のタイトル一覧（2〜5個）"
    },
    dimension: {
      type: "string",
      description: "ブレイクダウンの次元（例: reasons, phases, factors）"
    },
    breakdownType: {
      type: "string",
      enum: ["why", "what", "how"],
      description: "ブレイクダウンの種類"
    },
    decomposeType: {
      type: "string",
      enum: ["AND", "OR"],
      description: "分解タイプ（AND: すべて必要、OR: いずれか必要）"
    }
  },
  required: ["parentId", "labels", "dimension", "breakdownType", "decomposeType"]
};