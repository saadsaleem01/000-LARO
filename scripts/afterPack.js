const path = require('path');
const fs = require('fs');

/**
 * afterPack hook for electron-builder.
 * Copies package.json into the laro-docker extraResources folder.
 *
 * We can't list package.json in extraResources directly because
 * electron-builder excludes extraResource files from the ASAR,
 * which breaks Electron's startup sanity check.
 */
exports.default = async function afterPack(context) {
  const resourcesDir = context.packager.getResourcesDir(context.appOutDir);
  const destDir = path.join(resourcesDir, 'laro-docker');

  // Ensure the directory exists (extraResources may have already created it)
  fs.mkdirSync(destDir, { recursive: true });

  // Copy package.json from project root into the Docker resources
  const src = path.join(context.packager.info.projectDir, 'package.json');
  const dest = path.join(destDir, 'package.json');
  fs.copyFileSync(src, dest);

  console.log(`  • afterPack: copied package.json → ${path.relative(context.appOutDir, dest)}`);
};
