/**
 * Electron preload script
 * Exposes safe IPC methods to the renderer process
 */

import { contextBridge, ipcRenderer } from 'electron';
const IPC_CHANNELS = {
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
  SYSTEM_INFO: 'system:info',
  APP_VERSION: 'app:version',
  FOLDER_SELECT: 'folder:select',
  SCAN_START: 'scan:start',
  SCAN_STOP: 'scan:stop',
  SCAN_PAUSE: 'scan:pause',
  SCAN_RESUME: 'scan:resume',
  SCAN_PROGRESS: 'scan:progress',
  SCAN_FILES_GET: 'scan:files:get',
  UPLOAD_START: 'upload:start',
  UPLOAD_PAUSE: 'upload:pause',
  UPLOAD_RESUME: 'upload:resume',
  UPLOAD_PROGRESS: 'upload:progress',
  UPDATE_CHECK: 'update:check',
  OPEN_EXTERNAL: 'open:external',
};

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Configuration
  getConfig: () => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_GET),
  setConfig: (config: any) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_SET, config),
  
  // System info
  getSystemInfo: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_INFO),
  getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_VERSION),
  
  // Folder selection
  selectFolder: () => ipcRenderer.invoke(IPC_CHANNELS.FOLDER_SELECT),
  
  // Scanning
  startScan: (config: any) => ipcRenderer.invoke(IPC_CHANNELS.SCAN_START, config),
  stopScan: () => ipcRenderer.invoke(IPC_CHANNELS.SCAN_STOP),
  pauseScan: () => ipcRenderer.invoke(IPC_CHANNELS.SCAN_PAUSE),
  resumeScan: () => ipcRenderer.invoke(IPC_CHANNELS.SCAN_RESUME),
  getScanFiles: (scanId: string) => ipcRenderer.invoke(IPC_CHANNELS.SCAN_FILES_GET, scanId),
  
  // Upload
  startUpload: (scanId: string) => ipcRenderer.invoke(IPC_CHANNELS.UPLOAD_START, scanId),
  pauseUpload: () => ipcRenderer.invoke(IPC_CHANNELS.UPLOAD_PAUSE),
  resumeUpload: () => ipcRenderer.invoke(IPC_CHANNELS.UPLOAD_RESUME),
  
  // Event listeners
  onScanProgress(callback: (progress: any) => void) {
    ipcRenderer.on(IPC_CHANNELS.SCAN_PROGRESS, (_: any, progress: any) => callback(progress));
  },
  
  // Remove event listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },

  checkForUpdates: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CHECK),

  // Open scan panel — added to electronAPI
  openScanPanel: () => ipcRenderer.invoke('scan:open-panel'),

  // Phase 007: per-install desktop agent token (replaces the "local-default" constant)
  getAgentToken: () => ipcRenderer.invoke('agent:token'),
});

// TypeScript declaration for window.electronAPI
declare global {
  interface Window {
    electronAPI: {
      getConfig: () => Promise<any>;
      setConfig: (config: any) => Promise<any>;
      getSystemInfo: () => Promise<any>;
      getAppVersion: () => Promise<string>;
      selectFolder: () => Promise<string[] | null>;
      startScan: (config: any) => Promise<{ scanId: string }>;
      stopScan: () => Promise<{ success: boolean }>;
      pauseScan: () => Promise<{ success: boolean }>;
      resumeScan: () => Promise<{ success: boolean }>;
      getScanFiles: (scanId: string) => Promise<{ files: any[] }>;
      startUpload: (scanId: string) => Promise<{ success: boolean }>;
      pauseUpload: () => Promise<{ success: boolean }>;
      resumeUpload: () => Promise<{ success: boolean }>;
      onScanProgress: (callback: (progress: any) => void) => void;
      removeAllListeners: (channel: string) => void;
      checkForUpdates: () => Promise<{ currentVersion: string; updateAvailable: boolean }>;
      openScanPanel: () => Promise<void>;
      getAgentToken: () => Promise<string | null>;
    };
  }
}
