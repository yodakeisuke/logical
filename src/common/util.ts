import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

export const getSnapshotFilePath = (metaUrl: string): string => {
  const currentModulePath = fileURLToPath(metaUrl);
  const currentModuleDir = path.dirname(currentModulePath);
  return path.resolve(
    currentModuleDir,
    '..', // from current file's dir (e.g., tree) to parent (e.g., term)
    '..', // from parent (e.g., term) to grandparent (e.g., domain)
    '..', // from grandparent (e.g., domain) to great-grandparent (e.g., src or dist)
    '..', // from great-grandparent (e.g., src or dist) to project root
    'snapshot',
    'tree.json'
  );
};
