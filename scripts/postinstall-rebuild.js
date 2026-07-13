/**
 * Run electron-rebuild only when Electron and better-sqlite3 are installed (desktop build).
 */
const { existsSync } = require("fs");
const { join } = require("path");
const { execSync } = require("child_process");

const root = join(__dirname, "..");
const electron = join(root, "node_modules", "electron");
const sqlite = join(root, "node_modules", "better-sqlite3");

if (existsSync(electron) && existsSync(sqlite)) {
  try {
    execSync("npx @electron/rebuild -f -w better-sqlite3", {
      cwd: root,
      stdio: "inherit",
    });
  } catch (e) {
    console.warn("[postinstall] electron-rebuild failed (optional for server-only dev):", e.message);
  }
}
