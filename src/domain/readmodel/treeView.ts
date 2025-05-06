import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';

// syntax
interface TreeViewOp<R> {
  getTree(): R;
}
type Term = <R>(alg: TreeViewOp<R>) => R; // DSL の式

// smart constructor
export const getTreeView = (): Term => 
    <R>(alg: TreeViewOp<R>) => alg.getTree();

// semantics
export const jsonIssueTreeAlg: TreeViewOp<Promise<typeof TreeJson._type>> = {
  getTree: async () => {
    const filePath = path.resolve(process.cwd(), 'snapshot/tree.json');
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as typeof TreeJson._type;
  }
};

// schema
const IssueJson = z.object({
  title: z.string(),
  children: z.array(
    z.lazy(() => BreakdownJson)
  ).optional(),
});

const BreakdownJson = z.object({
  cut_asix: z.string().nullable(),
  type: z.string().optional(),
  issues: z.array(IssueJson),
});

export const TreeJson = z.object({
  root: z.object({
    title: z.string(),
    cut_asix: z.string().nullable(),
    children: z.array(BreakdownJson),
  })
});


