/**
 * Runs update_gde_activity over MCP stdio against a local mock of the Advocu
 * API. Uses made-up activities and never calls the real API. Run `npm run build`
 * first. SERVER_ENTRY can point at another build of dist/index.js.
 *
 * If the server cannot start, exits or stops answering, the tests fail with the
 * reason and the server's stderr instead of hanging.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import http from "node:http";
import { dirname, join } from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";

const entry = process.env.SERVER_ENTRY ?? join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "index.js");
const RPC_TIMEOUT_MS = 5000;

const makeActivity = (activityId, type, data) => ({
  type,
  data,
  submissionDate: "2026-01-01T00:00:00Z",
  updatedDate: "2026-01-01T00:00:00Z",
  archiveDate: null,
  activityId,
});

let article;
let patches;
let patchStatus;
let listStatus;
let server;
let child;
let nextId = 1;
let serverFailure;
let serverStderr = "";
let stopping = false;
const waiting = new Map();

const failServer = (reason) => {
  serverFailure ??= new Error(
    `MCP server ${reason}.${serverStderr && `\nServer stderr:\n${serverStderr.slice(-2000)}`}`,
  );
  for (const { reject, timer } of waiting.values()) {
    clearTimeout(timer);
    reject(serverFailure);
  }
  waiting.clear();
};

const filler = Array.from({ length: 100 }, (_, i) => makeActivity(`filler-${i}`, "workshop", { title: "Filler" }));
const secondPage = () => [
  article,
  makeActivity("repo-1", "github-repository", { title: "Repository" }),
  makeActivity("late-1", "workshop", { title: "Second page", metrics: { attendees: 1 } }),
];

const rpc = (method, params) =>
  new Promise((resolve, reject) => {
    if (serverFailure) {
      reject(serverFailure);
      return;
    }
    const id = nextId++;
    const timer = setTimeout(() => {
      waiting.delete(id);
      reject(new Error(`MCP server did not answer ${method} within ${RPC_TIMEOUT_MS} ms.`));
    }, RPC_TIMEOUT_MS);
    waiting.set(id, { resolve, reject, timer });
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  });

const handleServerLine = (line) => {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    failServer(`wrote something other than JSON to stdout: ${line.slice(0, 200)}`);
    return;
  }
  const pending = waiting.get(message.id);
  if (pending) {
    waiting.delete(message.id);
    clearTimeout(pending.timer);
    pending.resolve(message);
  }
};

const call = async (args) => {
  const { result, error } = await rpc("tools/call", { name: "update_gde_activity", arguments: args });
  assert.ok(result, `the tool call returned a protocol error: ${JSON.stringify(error)}`);
  return { isError: result.isError === true, text: result.content[0].text };
};

const preview = async (activityId, data) => {
  const result = await call({ activityId, data });
  assert.equal(result.isError, false, result.text);
  const id = result.text.match(/confirmationId: (\S+)/)?.[1];
  assert.ok(id, "the preview returns a confirmationId");
  return { ...result, id };
};

before(async () => {
  assert.ok(existsSync(entry), `Server build not found at ${entry}. Run npm run build first.`);

  server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://mock");
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      const send = (status, text) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(text);
      };
      if (req.method === "GET" && url.pathname === "/activities") {
        if (listStatus !== 200) {
          send(listStatus, "list failed");
          return;
        }
        const page = Number(url.searchParams.get("page") ?? 0);
        send(200, JSON.stringify({ content: page === 0 ? filler : page === 1 ? secondPage() : [] }));
        return;
      }
      if (req.method === "PATCH") {
        patches.push({ url: req.url, body, authorization: req.headers.authorization });
        send(patchStatus, patchStatus === 200 ? JSON.stringify({ updated: true }) : "patch failed");
        return;
      }
      send(404, "not found");
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  child = spawn(process.execPath, [entry], {
    env: {
      PATH: process.env.PATH,
      ADVOCU_ACCESS_TOKEN: "test-token",
      ADVOCU_API_URL: `http://127.0.0.1:${server.address().port}`,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  child.on("error", (error) => failServer(`could not be started (${error.message})`));
  child.on("exit", (code, signal) => {
    if (!stopping) {
      failServer(`exited early (code ${code}, signal ${signal})`);
    }
  });
  child.stdin.on("error", (error) => failServer(`closed its input (${error.message})`));
  child.stderr.on("data", (chunk) => {
    serverStderr += chunk;
  });
  let buffer = "";
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    for (let end = buffer.indexOf("\n"); end >= 0; end = buffer.indexOf("\n")) {
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 1);
      if (line.trim()) {
        handleServerLine(line);
      }
    }
  });
  await rpc("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "test", version: "0" },
  });
});

after(() => {
  stopping = true;
  for (const { timer } of waiting.values()) {
    clearTimeout(timer);
  }
  child?.kill("SIGKILL");
  server?.closeAllConnections();
  server?.close();
});

beforeEach(() => {
  article = makeActivity("article-1", "content-creation", {
    title: "Old title",
    description: "<p>Old</p>",
    tags: ["AI", "Android"],
    metrics: { readers: 5 },
    private: false,
  });
  patches = [];
  patchStatus = 200;
  listStatus = 200;
});

test("the preview sends nothing and shows the exact request body", async () => {
  const data = { title: "New title", metrics: { readers: 9 }, private: false };
  const { text } = await preview("article-1", data);
  assert.equal(patches.length, 0);
  assert.match(text, /Preview only/);
  assert.ok(text.includes('- title: "Old title" -> "New title"'));
  assert.ok(text.includes("- metrics.readers: 5 -> 9"));
  assert.ok(text.includes(`Request body to send: ${JSON.stringify({ data })}`));
});

test("applying sends the previewed body once", async () => {
  const data = { title: "New title", private: false };
  const { id } = await preview("article-1", data);
  const result = await call({ activityId: "article-1", data, apply: true, confirmationId: id });
  assert.equal(result.isError, false, result.text);
  assert.deepEqual(patches, [
    { url: "/activities/article-1", body: JSON.stringify({ data }), authorization: "Bearer test-token" },
  ]);
});

test("applying without a preview is refused", async () => {
  const result = await call({ activityId: "article-1", data: { title: "New title" }, apply: true });
  assert.equal(result.isError, true);
  assert.equal(patches.length, 0);
});

test("an unknown confirmationId is refused", async () => {
  const result = await call({
    activityId: "article-1",
    data: { title: "New title" },
    apply: true,
    confirmationId: "made-up",
  });
  assert.equal(result.isError, true);
  assert.equal(patches.length, 0);
});

test("a confirmationId works once", async () => {
  const data = { title: "New title" };
  const { id } = await preview("article-1", data);
  await call({ activityId: "article-1", data, apply: true, confirmationId: id });
  const second = await call({ activityId: "article-1", data, apply: true, confirmationId: id });
  assert.equal(second.isError, true);
  assert.equal(patches.length, 1);
});

test("data that differs from the preview is refused", async () => {
  const { id } = await preview("article-1", { title: "New title" });
  const result = await call({
    activityId: "article-1",
    data: { title: "Other title" },
    apply: true,
    confirmationId: id,
  });
  assert.equal(result.isError, true);
  assert.equal(patches.length, 0);
});

test("another activity is refused", async () => {
  const { id } = await preview("article-1", { title: "New title" });
  const result = await call({ activityId: "late-1", data: { title: "New title" }, apply: true, confirmationId: id });
  assert.equal(result.isError, true);
  assert.equal(patches.length, 0);
});

test("object key order does not count as a difference, and the previewed body is sent", async () => {
  const data = { title: "New title", private: true };
  const { id } = await preview("article-1", data);
  const result = await call({
    activityId: "article-1",
    data: { private: true, title: "New title" },
    apply: true,
    confirmationId: id,
  });
  assert.equal(result.isError, false, result.text);
  assert.equal(patches[0].body, JSON.stringify({ data }));
});

test("an activity changed after the preview is refused, and the id is dropped", async () => {
  const data = { title: "New title" };
  const { id } = await preview("article-1", data);
  article.data.description = "<p>Edited in the portal</p>";
  const result = await call({ activityId: "article-1", data, apply: true, confirmationId: id });
  assert.equal(result.isError, true);
  assert.match(result.text, /data\.description/);
  assert.equal(patches.length, 0);

  article.data.description = "<p>Old</p>";
  const retry = await call({ activityId: "article-1", data, apply: true, confirmationId: id });
  assert.equal(retry.isError, true);
  assert.equal(patches.length, 0);
});

test("a change of updatedDate alone is refused", async () => {
  const data = { title: "New title" };
  const { id } = await preview("article-1", data);
  article.updatedDate = "2026-02-02T00:00:00Z";
  const result = await call({ activityId: "article-1", data, apply: true, confirmationId: id });
  assert.equal(result.isError, true);
  assert.match(result.text, /updatedDate/);
  assert.equal(patches.length, 0);
});

test("a failed re-read sends nothing", async () => {
  const data = { title: "New title" };
  const { id } = await preview("article-1", data);
  listStatus = 401;
  const result = await call({ activityId: "article-1", data, apply: true, confirmationId: id });
  assert.equal(result.isError, true);
  assert.equal(patches.length, 0);
});

for (const [name, data] of [
  ["empty metrics", { metrics: {} }],
  ["empty metrics next to another field", { title: "New title", metrics: {} }],
  ["metrics that is not an object", { metrics: 5 }],
  ["null metrics", { title: "New title", metrics: null }],
]) {
  test(`${name} is refused`, async () => {
    const result = await call({ activityId: "article-1", data });
    assert.equal(result.isError, true);
    assert.doesNotMatch(result.text, /confirmationId:/);
    assert.equal(patches.length, 0);
  });
}

test("the update tags description is separate and says the list is replaced", async () => {
  const { result } = await rpc("tools/list", {});
  const update = result.tools.find((tool) => tool.name === "update_gde_activity");
  const draft = result.tools.find((tool) => tool.name === "submit_gde_content_creation");
  const description = update.inputSchema.properties.data.properties.tags.description;
  assert.notEqual(description, draft.inputSchema.properties.tags.description);
  assert.match(description, /Replaces the whole tag list/);
  assert.match(description, /keep the existing tags/);
  assert.doesNotMatch(draft.inputSchema.properties.tags.description, /Replaces/);
});

test("the preview lists the tags an update removes", async () => {
  const { text } = await preview("article-1", { tags: ["AI", "Google Cloud"] });
  assert.ok(text.includes('Tags removed by this update: ["Android"]'));
});

test("values that already match send nothing and return no id", async () => {
  const result = await call({ activityId: "article-1", data: { title: "Old title", metrics: { readers: 5 } } });
  assert.equal(result.isError, false);
  assert.match(result.text, /Nothing was sent/);
  assert.doesNotMatch(result.text, /confirmationId:/);
});

for (const [name, activityId, data, pattern] of [
  ["a field of another type", "article-1", { eventFormat: "Virtual" }, /eventFormat/],
  ["a metric of another type", "article-1", { metrics: { attendees: 3 } }, /metrics\.attendees/],
  ["a field the API cannot update", "article-1", { imageUrl: "https://example.com/a.png" }, /imageUrl/],
  ["a type without updates", "repo-1", { title: "New title" }, /github-repository/],
  ["an unknown activity", "missing", { title: "New title" }, /missing/],
]) {
  test(`${name} is refused`, async () => {
    const result = await call({ activityId, data });
    assert.equal(result.isError, true);
    assert.match(result.text, pattern);
    assert.equal(patches.length, 0);
  });
}

for (const [name, args] of [
  ["no data", { activityId: "article-1" }],
  ["empty data", { activityId: "article-1", data: {} }],
  ["array data", { activityId: "article-1", data: [1] }],
  ["no activityId", { data: { title: "New title" } }],
]) {
  test(`${name} is refused`, async () => {
    const result = await call(args);
    assert.equal(result.isError, true);
    assert.equal(patches.length, 0);
  });
}

test("an activity on a later page is found", async () => {
  const data = { title: "Later title" };
  const { id } = await preview("late-1", data);
  const result = await call({ activityId: "late-1", data, apply: true, confirmationId: id });
  assert.equal(result.isError, false, result.text);
  assert.equal(patches[0].url, "/activities/late-1");
});

test("parallel applies with one confirmationId send one PATCH", async () => {
  const data = { title: "New title" };
  const { id } = await preview("article-1", data);
  const args = { activityId: "article-1", data, apply: true, confirmationId: id };
  const results = await Promise.all([call(args), call(args), call(args)]);
  assert.equal(patches.length, 1);
  assert.equal(results.filter((result) => !result.isError).length, 1);
});

test("a confirmationId is used up even when the re-read fails", async () => {
  const data = { title: "New title" };
  const { id } = await preview("article-1", data);
  listStatus = 500;
  const failed = await call({ activityId: "article-1", data, apply: true, confirmationId: id });
  assert.equal(failed.isError, true);

  listStatus = 200;
  const retry = await call({ activityId: "article-1", data, apply: true, confirmationId: id });
  assert.equal(retry.isError, true);
  assert.equal(patches.length, 0);
});

for (const status of [400, 401, 404, 429, 500]) {
  test(`HTTP ${status} from PATCH is a failed call and needs a new preview`, async () => {
    const data = { title: "New title" };
    const { id } = await preview("article-1", data);
    patchStatus = status;
    const result = await call({ activityId: "article-1", data, apply: true, confirmationId: id });
    assert.equal(result.isError, true);
    assert.equal(patches.length, 1);

    patchStatus = 200;
    const retry = await call({ activityId: "article-1", data, apply: true, confirmationId: id });
    assert.equal(retry.isError, true);
    assert.equal(patches.length, 1);
  });
}
