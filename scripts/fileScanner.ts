import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Stats } from 'fs';
import Store from 'electron-store';
import { UploadManager } from './uploadManager';
import * as mime from 'mime-types';

export interface ScanOptions {
  folders: string[];
  excludeFolders?: string[];
  fileTypes?: string[]; // e.g., ['pdf', 'jpg', 'png', 'mp4']
  caseId: string;
}

export interface ScanProgress {
  status: 'idle' | 'scanning' | 'paused' | 'completed' | 'cancelled';
  totalFiles: number;
  scannedFiles: number;
  foundFiles: number;
  currentFolder: string;
}

export interface
