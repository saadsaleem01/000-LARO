export const isElectron = (): boolean =>
  typeof window !== 'undefined' && typeof (window as any).electronAPI !== 'undefined';

export function getElectronAPI() {
  if (isElectron()) return (window as any).electronAPI;
  return {
    getConfig:          () => Promise.resolve({ apiUrl: 'http://localhost:3000', token: null, deviceId: null, deviceName: 'browser', userId: null }),
    setConfig:          (c: any) => Promise.resolve(c),
    getSystemInfo:      () => Promise.resolve({ platform: 'browser', hostname: 'browser', username: 'browser', homeDir: '/', version: '0.0.0' }),
    getAppVersion:      () => Promise.resolve('0.0.0'),
    openExternal:       (url: string) => { window.open(url, '_blank'); return Promise.resolve(); },
    selectFolder:       () => Promise.resolve(null),
    startScan:          () => Promise.resolve({ scanId: '' }),
    stopScan:           () => Promise.resolve({ success: true }),
    pauseScan:          () => Promise.resolve({ success: true }),
    resumeScan:         () => Promise.resolve({ success: true }),
    getScanFiles:       () => Promise.resolve({ files: [] }),
    startUpload:        () => Promise.resolve({ success: true }),
    pauseUpload:        () => Promise.resolve({ success: true }),
    resumeUpload:       () => Promise.resolve({ success: true }),
    checkForUpdates:    () => Promise.resolve({ currentVersion: '0.0.0', updateAvailable: false }),
    onScanProgress:     () => () => {},
    onUploadProgress:   () => () => {},
    removeAllListeners: () => {},
  };
}
