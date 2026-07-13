/**
 * Shared types between main and renderer processes
 */

export type Platform = 'windows' | 'macos' | 'linux';

export type ScanStatus = 'idle' | 'scanning' | 'uploading' | 'review' | 'completed' | 'failed' | 'cancelled';

export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed' | 'skipped';

export interface AgentConfig {
  apiUrl: string;
  token: string | null;
  deviceId: string | null;
  deviceName: string;
  userId: string | null;
}

export interface ScanConfig {
  caseId: string;
  caseName: string;
  autoUpload: boolean;
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
  currentFile?: string;
  errorMessage?: string;
}

export interface Case {
  id: string;
  clientName: string;
  caseType: string;
  urgency: string;
  status: string;
  createdAt: Date;
}

// IPC Channel names
export const IPC_CHANNELS = {
  // Authentication
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_STATUS: 'auth:status',
  
  // Configuration
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
  
  // Cases
  CASES_LIST: 'cases:list',
  
  // Scanning
  SCAN_START: 'scan:start',
  SCAN_STOP: 'scan:stop',
  SCAN_PAUSE: 'scan:pause',
  SCAN_RESUME: 'scan:resume',
  SCAN_PROGRESS: 'scan:progress',
  SCAN_FILES_GET: 'scan:files:get',
  
  // Upload
  UPLOAD_START: 'upload:start',
  UPLOAD_PAUSE: 'upload:pause',
  UPLOAD_RESUME: 'upload:resume',
  
  // Folders
  FOLDER_SELECT: 'folder:select',
  FOLDER_EXCLUDE: 'folder:exclude',
  
  // System
  SYSTEM_INFO: 'system:info',
  APP_VERSION: 'app:version',
} as const;
