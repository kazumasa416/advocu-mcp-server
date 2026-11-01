#!/usr/bin/env node
/**
 * Post-build check: starts dist/index.js over stdio and checks that the server
 * initializes, lists the expected GDE tools and can read the bundled docs.
 *
 * It uses a dummy ADVOCU_ACCESS_TOKEN and never calls the Advocu API: only
 * initialize, tools/list and get_documentation (a local file read) are sent.
 *
 * Usage: npm run verify:build
 */

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const expectedTools = [
  "submit_gde_content_creation",
  "submit_gde_public_speaking",
  "submit_gde_workshop",
  "submit_gde_mentoring",
  "submit_gde_product_feedback",
  "submit_gde_googler_interaction",
  "submit_gde_story",
  "list_gde_activities",
  "update_gde_activity",
  "list_documentation",
  "get_documentation",
];

const child = spawn(process.execPath, [join(root, "dist", "index.js")], {
  env: {
    PATH: process.env.PATH,
    ADVOCU_ACCESS_TOKEN: "dummy-token-for-verification",
    DOCS_DIR: join(root, "docs"),
  },
  stdio: ["pipe", "pipe", "pipe"],
});

let stderr = "";
child.stderr.on("data", (chunk) => {
  stderr += chunk;
});

let buffer = "";
let nextId = 1;
const pending = new Map();
child.stdout.on("data", (chunk) => {
  buffer += chunk;
  let index = buffer.indexOf("\n");
  while (index >= 0) {
    const line = buffer.slice(0, index);
    buffer = buffer.slice(index + 1);
    if (line.trim()) {
      const message = JSON.parse(line);
      pending.get(message.id)?.(message);
    }
    index = buffer.indexOf("\n");
  }
});

const request = (method, params) =>
  new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  });

const fail = (message) => {
  console.error(`❌ ${message}`);
  if (stderr) console.error(`--- server stderr ---\n${stderr}`);
  child.kill();
  process.exit(1);
};

const timer = setTimeout(() => fail("server did not answer within 15 seconds"), 15000);
child.on("exit", (code) => {
  if (code !== null && code !== 0) fail(`server exited with code ${code}`);
});

const init = await request("initialize", {
  protocolVersion: "2024-11-05",
  capabilities: {},
  clientInfo: { name: "verify-build", version: "1" },
});
if (!init.result) fail(`initialize failed: ${JSON.stringify(init.error)}`);
console.log(`✅ server started: ${init.result.serverInfo?.name} ${init.result.serverInfo?.version ?? ""}`);
child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);

const list = await request("tools/list", {});
const names = (list.result?.tools ?? []).map((tool) => tool.name);
const missing = expectedTools.filter((name) => !names.includes(name));
if (missing.length > 0) fail(`tools/list is missing: ${missing.join(", ")}`);
console.log(`✅ tools/list: ${names.length} tools, including all ${expectedTools.length} expected`);

const doc = await request("tools/call", { name: "get_documentation", arguments: { documentName: "api-reference" } });
const docText = doc.result?.content?.[0]?.text ?? "";
if (doc.error || doc.result?.isError || !docText.includes("Google GDE API")) {
  fail(`get_documentation could not read docs/API.md from DOCS_DIR (${join(root, "docs")})`);
}
console.log("✅ get_documentation: docs/API.md readable");

clearTimeout(timer);
child.kill();
console.log("✅ verification passed (no Advocu API calls were made)");
