/**
 * OS-specific file and folder exclusions
 */

import { Platform } from './types';

export const WINDOWS_EXCLUDED_PATHS = [
  'C:\\Windows',
  'C:\\Program Files',
  'C:\\Program Files (x86)',
  'C:\\ProgramData\\Microsoft',
  'C:\\$Recycle.Bin',
  'C:\\System Volume Information',
  'C:\\Recovery',
  'C:\\PerfLogs',
];

export const MACOS_EXCLUDED_PATHS = [
  '/System',
  '/Library',
  '/Applications',
  '/private',
  '/dev',
  '/cores',
  '/.Spotlight-V100',
  '/.Trashes',
  '/.fseventsd',
  '/.DocumentRevisions-V100',
  '/Network',
  '/Volumes',
];

export const LINUX_EXCLUDED_PATHS = [
  '/bin',
  '/boot',
  '/dev',
  '/lib',
  '/lib32',
  '/lib64',
  '/libx32',
  '/proc',
  '/sys',
  '/usr',
  '/var/cache',
  '/var/log',
  '/var/tmp',
  '/snap',
  '/run',
  '/mnt',
  '/media',
  '/lost+found',
];

// File extensions to skip (executables and system files)
export const EXCLUDED_EXTENSIONS = [
  // Executables
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.sys',
  '.drv',
  '.ocx',
  
  // System files
  '.ini',
  '.dat',
  '.tmp',
  '.log',
  '.cache',
  
  // Package files
  '.deb',
  '.rpm',
  '.pkg',
  '.dmg',
  '.iso',
];

/**
 * Get OS-specific excluded paths
 */
export function getExcludedPaths(platform: Platform): string[] {
  switch (platform) {
    case 'windows':
      return WINDOWS_EXCLUDED_PATHS;
    case 'macos':
      return MACOS_EXCLUDED_PATHS;
    case 'linux':
      return LINUX_EXCLUDED_PATHS;
    default:
      return [];
  }
}

/**
 * Check if a path should be excluded
 */
export function shouldExcludePath(
  filePath: string,
  platform: Platform,
  userExcludedFolders: string[] = []
): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
  
  // Check user-defined exclusions
  for (const excluded of userExcludedFolders) {
    const normalizedExcluded = excluded.replace(/\\/g, '/').toLowerCase();
    if (normalizedPath.startsWith(normalizedExcluded)) {
      return true;
    }
  }
  
  // Check OS-specific exclusions
  const osExclusions = getExcludedPaths(platform);
  for (const excluded of osExclusions) {
    const normalizedExcluded = excluded.replace(/\\/g, '/').toLowerCase();
    if (normalizedPath.startsWith(normalizedExcluded)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a file extension should be excluded
 */
export function shouldExcludeExtension(fileName: string): boolean {
  const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  return EXCLUDED_EXTENSIONS.includes(ext);
}

/**
 * Check if a file should be excluded based on name patterns
 */
export function shouldExcludeFile(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  
  // Hidden files (starting with .)
  if (fileName.startsWith('.')) {
    return true;
  }
  
  // System files
  if (lowerName === 'desktop.ini' || lowerName === 'thumbs.db' || lowerName === '.ds_store') {
    return true;
  }
  
  // Check extension
  if (shouldExcludeExtension(fileName)) {
    return true;
  }
  
  return false;
}
