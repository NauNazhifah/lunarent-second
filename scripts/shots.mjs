import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CWD = process.cwd();
const OUT = join(CWD, "screenshots");
const PORT = 3000;
const DEBUG_PORT = 9223;

const EDGE_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

const browserPath = EDGE_CANDIDATES.find((p) => existsSync(p));
if (!browserPath) {
  console.error("Browser (Edge/Chrome) tidak ditemukan.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url, ms = 60000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return true;
    } catch {}
    await sleep(400);
  }
  return false;
}

await mkdir(OUT, { recursive: true });

const server = spawn("cmd.exe", ["/c", "npm.cmd", "run", "start"], {
  cwd: CWD,
  stdio: "ignore",
  env: process.env,
});

if (!(await waitFor(`http://127.0.0.1:${PORT}/`))) {
  console.error("Server tidak siap di port 3000");
  spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"]);
  process.exit(1);
}

const profile = join(tmpdir(), `ml-edge-${Date.now()}`);
const browser = spawn(
  browserPath,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1440,900",
    "about:blank",
  ],
  { stdio: "ignore" },
);

let version;
for (let i = 0; i < 40; i++) {
  try {
    version = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json();
    break;
  } catch {
    await sleep(300);
  }
}
if (!version?.webSocketDebuggerUrl) {
  console.error("CDP tidak tersedia");
  process.exit(1);
}

const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});

let seq = 0;
const pending = new Map();
const events = [];

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) rej(new Error(JSON.stringify(msg.error)));
    else res(msg.result);
  } else if (msg.method) {
    events.push(msg);
  }
};

function send(method, params = {}, sessionId) {
  return new Promise((res, rej) => {
    const id = ++seq;
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        rej(new Error(`timeout ${method}`));
      }
    }, 30000);
  });
}

async function waitEvent(method, sessionId, ms = 15000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const i = events.findIndex((e) => e.method === method && e.sessionId === sessionId);
    if (i >= 0) return events.splice(i, 1)[0];
    await sleep(100);
  }
  return null;
}

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });

await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);

async function goto(url) {
  events.length = 0;
  await send("Page.navigate", { url }, sessionId);
  await waitEvent("Page.loadEventFired", sessionId);
  await sleep(700);
}

async function shot(name, width, height) {
  await send(
    "Emulation.setDeviceMetricsOverride",
    { width, height, deviceScaleFactor: 1, mobile: width < 768 },
    sessionId,
  );
  await goto(`http://localhost:${PORT}${name.path}`);
  const { data } = await send("Page.captureScreenshot", { format: "png" }, sessionId);
  const file = join(OUT, `${name.file}.png`);
  await writeFile(file, Buffer.from(data, "base64"));
  console.log("saved", file);
}

await shot({ path: "/", file: "landing-375" }, 375, 812);
await shot({ path: "/", file: "landing-1440" }, 1440, 900);
await shot({ path: "/login", file: "login-375" }, 375, 812);

const loginStatus = await (async () => {
  await goto(`http://localhost:${PORT}/login`);
  const { result } = await send(
    "Runtime.evaluate",
    {
      expression: `fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'demo@mylunalist.test',password:'demo1234'})}).then(r=>r.status)`,
      awaitPromise: true,
    },
    sessionId,
  );
  return result.value;
})();
console.log("login via browser ->", loginStatus);

await shot({ path: "/library", file: "library-375" }, 375, 812);
await shot({ path: "/dashboard", file: "dashboard-375" }, 375, 812);
await shot({ path: "/library", file: "library-1440" }, 1440, 900);
await shot({ path: "/dashboard", file: "dashboard-1440" }, 1440, 900);

ws.close();
spawn("taskkill", ["/PID", String(browser.pid), "/T", "/F"]);
spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"]);
await sleep(800);
await rm(profile, { recursive: true, force: true }).catch(() => {});
console.log("done");
process.exit(0);
