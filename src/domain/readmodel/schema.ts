import { z } from 'zod';

import type { IssueTree as DomainIssueTreeType } from '../term/tree/adt.js';
import type { Issue as DomainIssueType } from '../term/issue/adt.js';
import type { Arrow as DomainArrowType } from '../term/arrow/adt.js';

// schema for View Model
const IssueJson_Schema = z.object({
  title: z.string(),
  children: z.array(
    z.lazy(() => BreakdownJson_Schema)
  ).optional(),
});
export type IssueJson = z.infer<typeof IssueJson_Schema>;

const BreakdownJson_Schema = z.object({
  cut_asix: z.string().nullable(),
  type: z.string().optional(),
  issues: z.array(IssueJson_Schema),
});
export type BreakdownJson = z.infer<typeof BreakdownJson_Schema>;

export const TreeJson_Schema = z.object({
  root: z.object({
    title: z.string(),
    cut_asix: z.string().nullable(),
    children: z.array(BreakdownJson_Schema),
  })
});
export type TreeJson = z.infer<typeof TreeJson_Schema>;

// --- Transformation functions ---
export const transformDomainToView = (domainTree: DomainIssueTreeType): TreeJson => {
  const issuesMap = extractIssuesMap(domainTree);
  const arrows = extractArrows(domainTree);
  const rootIssue = findRootIssue(issuesMap);
  
  const buildTree = createTreeBuilder(issuesMap, arrows);
  
  return pipe(
    rootIssue.id,
    buildTree,
    children => children ?? [],
    children => createRootJson(rootIssue.title, children)
  );
}; 

// --- Helpers ---
type IssueId = string;
type IssueMap = Record<IssueId, DomainIssueType>;
type ArrowList = readonly DomainArrowType[];

const pipe = <T>(x: T, ...fns: Array<(x: any) => any>): any => 
  fns.reduce((y, f) => f(y), x);

// Extract domain components
const extractIssuesMap = (tree: DomainIssueTreeType): IssueMap => tree.issues;
const extractArrows = (tree: DomainIssueTreeType): ArrowList => tree.arrows;

// Find root issue
const findRootIssue = (issuesMap: IssueMap): DomainIssueType => {
  const rootIssue = Object.values(issuesMap).find(
    issue => issue.parentId === null || issue.dimension === "root"
  );

  if (!rootIssue) {
    throw new Error("Root issue not found in domain tree data");
  }
  
  return rootIssue;
};

// Create a filter function for arrows by parent ID
const byParentId = (parentId: IssueId) => 
  (arrow: DomainArrowType): boolean => 
    arrow.parentId === parentId;

// Filter arrows for a specific parent
const getArrowsForParent = (arrows: ArrowList) => 
  (parentId: IssueId): ArrowList => 
    arrows.filter(byParentId(parentId));

// Create a view model issue from a domain issue
const toIssueJson = (children?: BreakdownJson[]) => 
  (issue: DomainIssueType): IssueJson => ({
    title: issue.title,
    children
  });

// Create a breakdown from a domain arrow and child issues
const toBreakdownJson = (childIssues: readonly IssueJson[]) => 
  (arrow: DomainArrowType): BreakdownJson => ({
    cut_asix: arrow.cutAxis,
    type: arrow.type,
    issues: [...childIssues]
  });

// Create the root view model object
const createRootJson = (title: string, children: BreakdownJson[]): TreeJson => ({
  root: {
    title,
    cut_asix: null,
    children
  }
});

// --- Composable tree building functions ---

// Build child issues for an arrow
const buildChildIssues = (
  issuesMap: IssueMap, 
  arrows: ArrowList,
  buildTreeFn: (id: IssueId) => BreakdownJson[] | undefined
) => 
  (arrow: DomainArrowType): IssueJson[] => 
    arrow.childrenIds
      .map(id => issuesMap[id])
      .filter(Boolean)
      .map(issue => ({
        title: issue.title,
        children: buildTreeFn(issue.id)
      }));

// Recursive tree builder using function composition
const createTreeBuilder = (
  issuesMap: IssueMap,
  arrows: ArrowList,
): ((id: IssueId) => BreakdownJson[] | undefined) => {
  // This is where recursion happens
  const buildTree = (id: IssueId): BreakdownJson[] | undefined => {
    const relevantArrows = getArrowsForParent(arrows)(id);
    
    if (relevantArrows.length === 0) {
      return undefined;
    }
    
    return relevantArrows.map(arrow => {
      const childIssues = buildChildIssues(issuesMap, arrows, buildTree)(arrow);
      return toBreakdownJson(childIssues)(arrow);
    });
  };
  
  return buildTree;
};
