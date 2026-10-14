import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const PORT = 3199;
const base = `http://127.0.0.1:${PORT}`;
let child;

async function waitForServer() {
  for (let i = 0; i < 40; i += 1) {
    try { const response = await fetch(`${base}/api/health`); if (response.ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error("Test serweri wagtynda başlamady.");
}

test.before(async () => {
  child = spawn(process.execPath, ["main.js"], { cwd: process.cwd(), env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
  await waitForServer();
});
test.after(() => child?.kill());

test("health endpoint identifies SanlyControl", async () => {
  const response = await fetch(`${base}/api/health`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.product, "SanlyControl");
  assert.equal(body.status, "ok");
});

test("teacher login and seeded curriculum work", async () => {
  const login = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "admin", password: "admin" }) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  const bootstrap = await fetch(`${base}/api/bootstrap`, { headers: { cookie } });
  assert.equal(bootstrap.status, 200);
  const data = await bootstrap.json();
  assert.equal(data.subjects.length, 5);
  assert.equal(data.lessons.length, 5);
  assert.equal(data.assessments.reduce((sum, item) => sum + item.question_count, 0), 50);
});
