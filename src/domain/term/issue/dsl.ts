import { v4 as uuidv4 } from 'uuid';
import { z } from "zod";
import { Issue } from "./adt.js";

/**
 * 語彙 「論点」
 * granularity: entity 
 * domain type: resource
 * persistence: false
 */

// syntax
interface IssueOp<R> {
  from: (
    title: string,
    dimension: string
  ) => R;
}
type Term<R> = (alg: IssueOp<R>) => R;

// smart constructor
export const from = (
  title: string,
  dimension: string,
): Term<z.infer<typeof Issue>> =>
  <R>(alg: IssueOp<R>) => alg.from(title, dimension);

// semantics
export const IssueAlg: IssueOp<z.infer<typeof Issue>>  = {
    from: (
        title: string,
        dimension: string,
    ) => {
        return Issue.parse({
            id: uuidv4(),
            title,
            dimension,
            parentId: null,
            children: [],
        });
    }
  };