import { z } from "zod";
import { Issue } from "../issue/adt.js";
import { Arrow } from "../arrow/adt.js";

/**
 * 語彙 「論点構造」
 * granularity: entity
 * domain type: resource
 * persistence: true
 */

// domain model
export const IssueTree = z.object({
  issues: z.record(z.string(), Issue),
  arrows: z.array(Arrow),
});
export type IssueTree = z.infer<typeof IssueTree>;
