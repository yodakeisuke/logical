import fs from 'fs';
import path from 'path';
import os from 'os';
import { LogicalTree, LogicalTreeError, storageError } from '../term/logical-tree/data_structure.js';
import { Result, ok, err } from 'neverthrow';

// 固定ファイル名
const TREE_FILENAME = 'logical-tree.json';

export interface Persistence {
  save: (tree: LogicalTree) => Result<string, LogicalTreeError>;
  load: () => Result<LogicalTree | null, LogicalTreeError>;
}

export const createPersistence = (baseDir?: string): Persistence => {
  // 保存ディレクトリを決定
  const directory = baseDir ? path.resolve(baseDir) : path.join(os.tmpdir(), 'mcp-logical-thinking');
  
  // 一時ディレクトリが存在しない場合は作成
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
  
  // ファイルパスの設定
  const filePath = path.join(directory, TREE_FILENAME);
  
  return {
    save: (tree: LogicalTree): Result<string, LogicalTreeError> => {
      try {
        // 内容をJSONに変換して書き込み
        const content = JSON.stringify(tree, null, 2);
        fs.writeFileSync(filePath, content, 'utf-8');
        return ok(filePath);
      } catch (error) {
        return err(storageError(`保存エラー: ${String(error)}`));
      }
    },
    
    load: (): Result<LogicalTree | null, LogicalTreeError> => {
      try {
        // ファイルが存在しない場合はnullを返す
        if (!fs.existsSync(filePath)) {
          return ok(null);
        }
        
        // ファイルを読み込みJSONとして解析
        const content = fs.readFileSync(filePath, 'utf-8');
        const tree = JSON.parse(content) as LogicalTree;
        return ok(tree);
      } catch (error) {
        return err(storageError(`読み込みエラー: ${String(error)}`));
      }
    }
  };
};