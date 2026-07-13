import { Platform } from './types';

export const WINDOWS_EXCLUDED_PATHS = ['C:\\Windows','C:\\Program Files','C:\\Program Files (x86)','C:\\$Recycle.Bin','C:\\System Volume Information'];
export const MACOS_EXCLUDED_PATHS = ['/System','/Library','/Applications','/private','/dev','/cores','/Network','/Volumes'];
export const LINUX_EXCLUDED_PATHS = ['/bin','/boot','/dev','/lib','/proc','/sys','/usr','/var/cache','/snap','/run'];
export const EXCLUDED_EXTENSIONS = ['.exe','.dll','.so','.dylib','.sys','.ini','.dat','.tmp','.log','.cache','.deb','.dmg','.iso'];

export function getExcludedPaths(platform: Platform): string[] {
  switch (platform) {
    case 'windows': return WINDOWS_EXCLUDED_PATHS;
    case 'macos':   return MACOS_EXCLUDED_PATHS;
    case 'linux':   return LINUX_EXCLUDED_PATHS;
    default:        return [];
  }
}

export function shouldExcludePath(filePath: string, platform: Platform, userExcluded: string[] = []): boolean {
  const norm = filePath.replace(/\\/g, '/').toLowerCase();
  for (const ex of [...userExcluded, ...getExcludedPaths(platform)]) {
    if (norm.startsWith(ex.replace(/\\/g, '/').toLowerCase())) return true;
  }
  return false;
}

export function shouldExcludeFile(fileName: string): boolean {
  if (fileName.startsWith('.')) return true;
  if (['desktop.ini','thumbs.db','.ds_store'].includes(fileName.toLowerCase())) return true;
  const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  return EXCLUDED_EXTENSIONS.includes(ext);
}
