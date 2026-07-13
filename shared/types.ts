export type Platform = 'windows' | 'macos' | 'linux';

export type Page = 'auth' | 'home' | 'scan' | 'settings';
export type ScanStatus =
  | 'idle'
  | 'scanning'
  | 'paused'
  | 'review'
  | 'complete'
  | 'completed'
  | 'uploading'
  | 'upload-paused'
  | 'upload-complete'
  | 'failed'
  | 'error'
  | 'cancelled';

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'completed' | 'failed';

export interface AgentConfig {
  apiUrl: string;
  token: string | null;
  deviceId: string | null;
  deviceName: string;
  userId: string | null;
  caseId: string | null;
}

export interface ScanOptions {
  folders: string[];
  caseId?: string;
  caseName?: string;
  maxDepth?: number;
  minRelevance?: number;
  context?: {
    opponentName?: string;
    clientName?: string;
    keywords?: string[];
    startDate?: string;
    endDate?: string;
  };
}

export interface ScannedFile {
  id: string;
  path: string;
  name: string;
  size: number;
  extension: string;
  modified: Date;
  relevanceScore: number;
  uploadStatus: UploadStatus;
  uploadError?: string;
}

export interface ScanSession {
  scanId: string;
  startedAt: Date;
  folders: string[];
  status: ScanStatus;
  scanned: number;
  found: number;
  uploaded: number;
  failed: number;
  currentFile: string | null;
  files: ScannedFile[];
}

export interface UploadOptions {
  scanId: string;
  caseId: string;
  token?: string;
  apiUrl?: string;
}

// IPC channel constants — single source of truth
export const IPC = {
  CONFIG_GET:      'config:get',
  CONFIG_SET:      'config:set',
  SYSTEM_INFO:     'system:info',
  APP_VERSION:     'app:version',
  FOLDER_SELECT:   'folder:select',
  SCAN_START:      'scan:start',
  SCAN_STOP:       'scan:stop',
  SCAN_PAUSE:      'scan:pause',
  SCAN_RESUME:     'scan:resume',
  SCAN_PROGRESS:   'scan:progress',
  SCAN_FILES_GET:  'scan:files:get',
  UPLOAD_START:    'upload:start',
  UPLOAD_PAUSE:    'upload:pause',
  UPLOAD_RESUME:   'upload:resume',
  UPLOAD_PROGRESS: 'upload:progress',
  UPDATE_CHECK:    'update:check',
  OPEN_EXTERNAL:   'open:external',
  SCAN_OPEN_PANEL: 'scan:open-panel',
  DB_GET:          'db:get',
  DB_SET:          'db:set',
  DB_DELETE:       'db:delete',
} as const;

// Backward-compatible exports used by the Electron process.
export const IPC_CHANNELS = IPC;

export interface ScanConfig {
  caseId: string;
  caseName: string;
  autoUpload: boolean;
  folders: string[];
  excludedFolders: string[];
}

export interface FileItem {
  id: string;
  path: string;
  name: string;
  size: number;
  mimeType: string;
  modifiedAt: Date;
  uploadStatus: UploadStatus;
  uploadProgress: number;
  errorMessage?: string;
}

export interface ScanProgress {
  scanId: string;
  status: ScanStatus;
  totalFiles: number;
  scannedFiles: number;
  uploadedFiles: number;
  failedFiles: number;
  totalSize: number;
  uploadedSize: number;
  currentFile: string | null;
  errorMessage?: string;
}