type ScanProgress = {
  status: string;
  scanId?: string;
  totalFiles?: number;
  scannedFiles?: number;
  uploadedFiles?: number;
  failedFiles?: number;
  totalSize?: number;
  uploadedSize?: number;
  currentFile?: string;
  errorMessage?: string;
};

type AppConfig = {
  apiUrl: string;
  token: string | null;
  deviceId: string | null;
  userId: string | null;
  deviceName: string;
};

type ElectronApi = {
  getConfig: () => Promise<AppConfig>;
  setConfig: (partial: Partial<AppConfig>) => Promise<AppConfig>;
  getSystemInfo: () => Promise<{ platform: string; hostname: string; username: string }>;
  getAppVersion: () => Promise<string>;
  selectFolder: () => Promise<string>;
  startScan: (payload: unknown) => Promise<unknown>;
  onScanProgress: (cb: (progress: ScanProgress) => void) => void;
  removeAllListeners: (_event: string) => void;
  getScanFiles: (_scanId: string) => Promise<{ files: Array<{ id: string; name: string; size: number }> }>;
  pauseScan: () => Promise<void>;
  pauseUpload: () => Promise<void>;
  resumeScan: () => Promise<void>;
  resumeUpload: () => Promise<void>;
  stopScan: () => Promise<void>;
  startUpload: (_scanId: string) => Promise<void>;
};

const defaultConfig: AppConfig = {
  apiUrl: "http://localhost:3000",
  token: null,
  deviceId: null,
  userId: null,
  deviceName: "Web Client",
};

const shim: ElectronApi = {
  getConfig: async () => defaultConfig,
  setConfig: async (partial) => ({ ...defaultConfig, ...partial }),
  getSystemInfo: async () => ({
    platform: "web",
    hostname: "browser",
    username: "user",
  }),
  getAppVersion: async () => "web-migration",
  selectFolder: async () => "",
  startScan: async () => ({}),
  onScanProgress: (cb) => cb({ status: "idle" }),
  removeAllListeners: () => undefined,
  getScanFiles: async () => ({ files: [] }),
  pauseScan: async () => undefined,
  pauseUpload: async () => undefined,
  resumeScan: async () => undefined,
  resumeUpload: async () => undefined,
  stopScan: async () => undefined,
  startUpload: async () => undefined,
};

export function getElectronApi(): ElectronApi {
  if (typeof window !== "undefined" && (window as any).electronAPI) {
    return (window as any).electronAPI as ElectronApi;
  }

  return shim;
}
