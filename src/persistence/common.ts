import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Id } from '../common/id.js';

export type SnapshotId = Id<'SnapshotId'>;

export const asSnapshotId = (id: string): SnapshotId => id as SnapshotId;

export const ensureDirectoryExists = (dirPath: string): boolean => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch (error) {
    return false;
  }
};

export const calculateObjectHash = <T>(object: T, length: number = 8): string => {
  return crypto.createHash('md5')
    .update(JSON.stringify(object))
    .digest('hex')
    .substring(0, length);
};

export const formatTimestampForFilename = (timestamp: string): string => 
  timestamp.replace(/[:.]/g, '-');

export const listFiles = (
  dirPath: string, 
  filterPattern?: RegExp, 
  sorted: boolean = true,
  reverse: boolean = false
): string[] => {
  try {
    if (!fs.existsSync(dirPath)) {
      return [];
    }
    
    let files = fs.readdirSync(dirPath);
    
    if (filterPattern) {
      files = files.filter(file => filterPattern.test(file));
    }
    
    if (sorted) {
      files = files.sort();
      
      if (reverse) {
        files = files.reverse();
      }
    }
    
    return files;
  } catch (error) {
    return [];
  }
};