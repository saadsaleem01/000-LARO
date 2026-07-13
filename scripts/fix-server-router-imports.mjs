/**
 * Rewrites server/routers/*.ts imports:
 * - ./_core/* -> ../_core/*
 * - ./serverModule -> ../serverModule when the target is not another router file in the same folder
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routersDir = path.join(__dirname, "..", "server", "routers");

const routerNames = new Set(
  fs
    .readdirSync(routersDir)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => f.replace(/\.ts$/, ""))
);

function fixFromImports(content) {
  return content.replace(
    /from\s+(['"])(\.\/)([^'"]+)\1/g,
    (_m, quote, _dot, spec) => {
      if (spec.startsWith("_core/")) {
        return `from ${quote}../_core/${spec.slice(6)}${quote}`;
      }
      const base = spec.split("/")[0];
      if (routerNames.has(base)) {
        return `from ${quote}./${spec}${quote}`;
      }
      return `from ${quote}../${spec}${quote}`;
    }
  );
}

function fixDynamicImports(content) {
  return content.replace(
    /import\s*\(\s*(['"])(\.\/)([^'"]+)\1\s*\)/g,
    (_m, quote, _dot, spec) => {
      const base = spec.split("/")[0];
      if (routerNames.has(base)) {
        return `import(${quote}./${spec}${quote})`;
      }
      return `import(${quote}../${spec}${quote})`;
    }
  );
}

for (const file of fs.readdirSync(routersDir)) {
  if (!file.endsWith(".ts")) continue;
  const fp = path.join(routersDir, file);
  const raw = fs.readFileSync(fp, "utf8");
  const next = fixDynamicImports(fixFromImports(raw));
  if (next !== raw) fs.writeFileSync(fp, next);
}

console.log("Patched imports in server/routers/*.ts");
