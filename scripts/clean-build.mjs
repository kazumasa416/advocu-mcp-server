#!/usr/bin/env node
/**
 * Clean build: removes dist/ and the incremental build record, then runs tsc.
 *
 * tsconfig.json uses "composite": true, so tsc keeps tsconfig.tsbuildinfo.
 * Deleting only dist/ makes the next build emit just the changed files and
 * leaves dist/index.js missing. Removing both forces a full build.
 *
 * Usage: npm run build:clean
 */

import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

for (const target of ["dist", "tsconfig.tsbuildinfo"]) {
  rmSync(join(root, target), { recursive: true, force: true });
  console.log(`removed ${target}`);
}

execSync("npx tsc", { cwd: root, stdio: "inherit" });

if (!existsSync(join(root, "dist", "index.js"))) {
  console.error("❌ dist/index.js was not created");
  process.exit(1);
}
console.log("✅ clean build finished: dist/index.js created");
