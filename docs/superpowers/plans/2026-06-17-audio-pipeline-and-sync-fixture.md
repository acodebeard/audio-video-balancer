# Audio Pipeline And Sync Fixture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the Chrome active-tab audio delay pipeline and add a repeatable local audio/video sync fixture.

**Architecture:** The extension service worker receives popup commands, creates an offscreen document, obtains a tab media stream id, and sends it to the offscreen document. The offscreen document owns the Web Audio graph: `MediaStreamAudioSourceNode -> DelayNode -> AudioContext.destination`. A separate local fixture page emits a visible flash and Web Audio beep with a known lead offset.

**Tech Stack:** Chrome Manifest V3, `chrome.tabCapture`, `chrome.offscreen`, Web Audio, plain JavaScript modules, Node.js built-in test runner, npm scripts.

---

## File Map

- `package.json`: add a `test` script and include it in `check`.
- `scripts/validate-extension.mjs`: validate runtime manifest fields and extension assets.
- `extension/manifest.json`: add `tabCapture`, `offscreen`, and `activeTab` permissions plus service worker/offscreen assets.
- `extension/background.js`: service worker command router and tab/offscreen coordination.
- `extension/offscreen.html`: static offscreen document shell.
- `extension/offscreen.js`: Web Audio capture consumer and delay graph manager.
- `extension/messages.js`: shared message constants and delay validation helpers.
- `extension/popup.js`: send start/stop/delay commands to the service worker.
- `test/messages.test.mjs`: Node tests for delay validation and command shape.
- `fixtures/sync-test/index.html`: local manual sync fixture.
- `fixtures/sync-test/sync-test.js`: fixture timing and controls.
- `fixtures/sync-test/styles.css`: fixture layout.
- `scripts/serve-sync-fixture.mjs`: local static server for the fixture.
- `docs/local-testing.md`: updated manual test procedure.

## Task 0: Test Harness And Validation

**Files:**
- Modify: `package.json`
- Modify: `scripts/validate-extension.mjs`
- Create: `test/messages.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `test/messages.test.mjs`:

```js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clampDelay, isValidDelayStep } from "../extension/messages.js";

describe("delay validation", () => {
  it("clamps delay to the supported 0-1000 ms range", () => {
    assert.equal(clampDelay(-5), 0);
    assert.equal(clampDelay(200), 200);
    assert.equal(clampDelay(1005), 1000);
  });

  it("accepts only 5 ms delay increments", () => {
    assert.equal(isValidDelayStep(200), true);
    assert.equal(isValidDelayStep(205), true);
    assert.equal(isValidDelayStep(203), false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test`

Expected: FAIL because `extension/messages.js` does not exist.

- [ ] **Step 3: Add the shared delay helper**

Create `extension/messages.js`:

```js
export const MESSAGE_TARGETS = Object.freeze({
  BACKGROUND: "background",
  OFFSCREEN: "offscreen",
  POPUP: "popup"
});

export const MESSAGE_TYPES = Object.freeze({
  GET_STATE: "GET_STATE",
  START_CAPTURE: "START_CAPTURE",
  STOP_CAPTURE: "STOP_CAPTURE",
  SET_DELAY: "SET_DELAY",
  OFFSCREEN_START: "OFFSCREEN_START",
  OFFSCREEN_STOP: "OFFSCREEN_STOP",
  OFFSCREEN_SET_DELAY: "OFFSCREEN_SET_DELAY"
});

export const MIN_DELAY_MS = 0;
export const MAX_DELAY_MS = 1000;
export const DELAY_STEP_MS = 5;

export function clampDelay(delayMs) {
  if (!Number.isFinite(delayMs)) {
    return MIN_DELAY_MS;
  }

  return Math.min(MAX_DELAY_MS, Math.max(MIN_DELAY_MS, Math.round(delayMs)));
}

export function isValidDelayStep(delayMs) {
  return Number.isInteger(delayMs) && delayMs % DELAY_STEP_MS === 0;
}

export function normalizeDelay(delayMs) {
  const clamped = clampDelay(delayMs);
  return Math.round(clamped / DELAY_STEP_MS) * DELAY_STEP_MS;
}
```

- [ ] **Step 4: Add the npm test script**

Modify `package.json` scripts:

```json
{
  "scripts": {
    "build": "node scripts/build-extension.mjs",
    "check": "node scripts/check-source-policy.mjs && node scripts/check-mock.mjs && node scripts/validate-extension.mjs && npm test",
    "package": "npm run build && node scripts/package-extension.mjs",
    "test": "node --test"
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`

Expected: PASS with 2 tests.

- [ ] **Step 6: Run repository checks**

Run: `npm run check`

Expected: source policy, mock, extension validation, and tests pass.

## Task 1: Active Tab Audio Delay Pipeline

**Files:**
- Modify: `extension/manifest.json`
- Modify: `extension/popup.js`
- Modify: `scripts/validate-extension.mjs`
- Create: `extension/background.js`
- Create: `extension/offscreen.html`
- Create: `extension/offscreen.js`
- Modify: `test/messages.test.mjs`

- [ ] **Step 1: Extend tests for delay normalization**

Add to `test/messages.test.mjs`:

```js
import { normalizeDelay } from "../extension/messages.js";

it("normalizes arbitrary delay values to the nearest 5 ms step", () => {
  assert.equal(normalizeDelay(202), 200);
  assert.equal(normalizeDelay(203), 205);
  assert.equal(normalizeDelay(1002), 1000);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL until `normalizeDelay` is imported and exported correctly.

- [ ] **Step 3: Update manifest for runtime assets**

Modify `extension/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Audio Video Balancer",
  "description": "Delay the current tab audio when audio is ahead of video.",
  "version": "0.0.0",
  "minimum_chrome_version": "116",
  "permissions": ["activeTab", "offscreen", "tabCapture"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_title": "Audio Video Balancer",
    "default_popup": "popup.html"
  }
}
```

- [ ] **Step 4: Add service worker coordination**

Create `extension/background.js` with:

```js
import { MESSAGE_TARGETS, MESSAGE_TYPES, normalizeDelay } from "./messages.js";

const OFFSCREEN_PATH = "offscreen.html";

let creatingOffscreenDocument;
let activeState = {
  status: "inactive",
  tabId: null,
  delayMs: 0,
  error: ""
};

async function ensureOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_PATH);
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl]
  });

  if (contexts.length > 0) {
    return;
  }

  if (!creatingOffscreenDocument) {
    creatingOffscreenDocument = chrome.offscreen.createDocument({
      url: OFFSCREEN_PATH,
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Play the captured tab audio with an adjustable delay."
    });
  }

  await creatingOffscreenDocument;
  creatingOffscreenDocument = null;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("No active tab is available.");
  }
  return tab;
}

async function sendToOffscreen(message) {
  return chrome.runtime.sendMessage({ ...message, target: MESSAGE_TARGETS.OFFSCREEN });
}

async function startCapture() {
  const tab = await getActiveTab();
  await ensureOffscreenDocument();

  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
  const delayMs = normalizeDelay(activeState.delayMs);

  await sendToOffscreen({
    type: MESSAGE_TYPES.OFFSCREEN_START,
    streamId,
    tabId: tab.id,
    delayMs
  });

  activeState = {
    status: "capturing",
    tabId: tab.id,
    delayMs,
    error: ""
  };

  return activeState;
}

async function stopCapture() {
  await sendToOffscreen({ type: MESSAGE_TYPES.OFFSCREEN_STOP });
  activeState = {
    status: "inactive",
    tabId: null,
    delayMs: activeState.delayMs,
    error: ""
  };
  return activeState;
}

async function setDelay(delayMs) {
  const nextDelay = normalizeDelay(delayMs);
  activeState = { ...activeState, delayMs: nextDelay };

  if (activeState.status === "capturing") {
    await sendToOffscreen({
      type: MESSAGE_TYPES.OFFSCREEN_SET_DELAY,
      delayMs: nextDelay
    });
  }

  return activeState;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.target !== MESSAGE_TARGETS.BACKGROUND) {
    return false;
  }

  (async () => {
    try {
      if (message.type === MESSAGE_TYPES.GET_STATE) {
        sendResponse(activeState);
        return;
      }

      if (message.type === MESSAGE_TYPES.START_CAPTURE) {
        sendResponse(await startCapture());
        return;
      }

      if (message.type === MESSAGE_TYPES.STOP_CAPTURE) {
        sendResponse(await stopCapture());
        return;
      }

      if (message.type === MESSAGE_TYPES.SET_DELAY) {
        sendResponse(await setDelay(message.delayMs));
        return;
      }

      sendResponse({ ...activeState, error: `Unknown message: ${message.type}` });
    } catch (error) {
      activeState = {
        ...activeState,
        status: "error",
        error: error instanceof Error ? error.message : String(error)
      };
      sendResponse(activeState);
    }
  })();

  return true;
});
```

- [ ] **Step 5: Add offscreen audio graph**

Create `extension/offscreen.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Audio Video Balancer Offscreen Audio</title>
  </head>
  <body>
    <script src="./offscreen.js" type="module"></script>
  </body>
</html>
```

Create `extension/offscreen.js`:

```js
import { MESSAGE_TARGETS, MESSAGE_TYPES, MAX_DELAY_MS, normalizeDelay } from "./messages.js";

let audioContext;
let sourceNode;
let delayNode;
let mediaStream;

async function stopGraph() {
  sourceNode?.disconnect();
  delayNode?.disconnect();
  mediaStream?.getTracks().forEach((track) => track.stop());
  sourceNode = null;
  delayNode = null;
  mediaStream = null;
}

async function startGraph({ streamId, delayMs }) {
  await stopGraph();

  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId
      }
    },
    video: false
  });

  audioContext = audioContext ?? new AudioContext();
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  sourceNode = audioContext.createMediaStreamSource(mediaStream);
  delayNode = audioContext.createDelay(MAX_DELAY_MS / 1000);
  delayNode.delayTime.value = normalizeDelay(delayMs) / 1000;

  sourceNode.connect(delayNode);
  delayNode.connect(audioContext.destination);
}

function setDelay(delayMs) {
  if (!delayNode) {
    return;
  }

  delayNode.delayTime.value = normalizeDelay(delayMs) / 1000;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.target !== MESSAGE_TARGETS.OFFSCREEN) {
    return false;
  }

  (async () => {
    if (message.type === MESSAGE_TYPES.OFFSCREEN_START) {
      await startGraph(message);
      sendResponse({ ok: true });
      return;
    }

    if (message.type === MESSAGE_TYPES.OFFSCREEN_STOP) {
      await stopGraph();
      sendResponse({ ok: true });
      return;
    }

    if (message.type === MESSAGE_TYPES.OFFSCREEN_SET_DELAY) {
      setDelay(message.delayMs);
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, error: `Unknown offscreen message: ${message.type}` });
  })().catch((error) => {
    sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  });

  return true;
});
```

- [ ] **Step 6: Wire popup commands**

Modify `extension/popup.js` so slider, presets, reset, and Start button send messages to the background. The popup should still update immediately for local feedback, but runtime state from the background is authoritative.

- [ ] **Step 7: Validate extension assets**

Extend `scripts/validate-extension.mjs` to require:

```js
const requiredPermissions = ["activeTab", "offscreen", "tabCapture"];
for (const permission of requiredPermissions) {
  if (!manifest.permissions?.includes(permission)) {
    throw new Error(`Missing required permission: ${permission}`);
  }
}

if (manifest.background?.service_worker !== "background.js") {
  throw new Error("Extension must declare background.js as the service worker.");
}
```

- [ ] **Step 8: Run checks**

Run: `npm run check && npm run package`

Expected: all checks pass and ZIP includes `background.js`, `messages.js`, `offscreen.html`, and `offscreen.js`.

## Task 2: Controlled Sync Fixture

**Files:**
- Create: `fixtures/sync-test/index.html`
- Create: `fixtures/sync-test/sync-test.js`
- Create: `fixtures/sync-test/styles.css`
- Create: `scripts/serve-sync-fixture.mjs`
- Modify: `package.json`
- Modify: `docs/local-testing.md`

- [ ] **Step 1: Create the fixture UI**

Create `fixtures/sync-test/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Audio Video Balancer Sync Fixture</title>
    <link rel="stylesheet" href="./styles.css">
  </head>
  <body>
    <main class="fixture">
      <header>
        <p class="eyebrow">Manual sync fixture</p>
        <h1>Beep Before Flash</h1>
      </header>
      <section class="stage" aria-live="polite">
        <div id="flash" class="flash" aria-label="Visual flash target"></div>
      </section>
      <section class="controls">
        <label>
          Audio lead
          <select id="lead-ms">
            <option value="100">100 ms</option>
            <option value="200" selected>200 ms</option>
            <option value="300">300 ms</option>
          </select>
        </label>
        <button id="start" type="button">Start Loop</button>
        <button id="stop" type="button">Stop</button>
      </section>
      <p class="note">Set the extension delay to match the selected audio lead. At 200 ms, the beep and flash should line up when the extension delay is 200 ms.</p>
    </main>
    <script src="./sync-test.js" type="module"></script>
  </body>
</html>
```

- [ ] **Step 2: Add fixture behavior**

Create `fixtures/sync-test/sync-test.js`:

```js
const leadSelect = document.querySelector("#lead-ms");
const startButton = document.querySelector("#start");
const stopButton = document.querySelector("#stop");
const flash = document.querySelector("#flash");

const LOOP_INTERVAL_MS = 1600;
const BEEP_DURATION_SECONDS = 0.07;
const BEEP_FREQUENCY_HZ = 880;

let audioContext;
let timerId;

function getAudioContext() {
  audioContext = audioContext ?? new AudioContext();
  return audioContext;
}

function playBeep() {
  const context = getAudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.frequency.value = BEEP_FREQUENCY_HZ;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + BEEP_DURATION_SECONDS);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + BEEP_DURATION_SECONDS);
}

function showFlash() {
  flash.classList.add("active");
  window.setTimeout(() => flash.classList.remove("active"), 140);
}

async function tick() {
  const context = getAudioContext();
  if (context.state === "suspended") {
    await context.resume();
  }

  const leadMs = Number(leadSelect.value);
  playBeep();
  window.setTimeout(showFlash, leadMs);
}

function startLoop() {
  stopLoop();
  tick();
  timerId = window.setInterval(tick, LOOP_INTERVAL_MS);
}

function stopLoop() {
  if (timerId) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

startButton.addEventListener("click", startLoop);
stopButton.addEventListener("click", stopLoop);
```

- [ ] **Step 3: Add fixture styles**

Create `fixtures/sync-test/styles.css` with a neutral page, large flash target, and compact controls. The flash target must change sharply from dark to bright so timing is easy to perceive.

- [ ] **Step 4: Add local server**

Create `scripts/serve-sync-fixture.mjs`:

```js
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve("fixtures/sync-test");
const port = Number(process.env.PORT ?? 4173);

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"]
]);

function resolveRequestPath(url) {
  const pathname = new URL(url, `http://localhost:${port}`).pathname;
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = normalize(join(root, relativePath));

  if (!filePath.startsWith(root)) {
    return null;
  }

  return filePath;
}

const server = createServer(async (request, response) => {
  const filePath = resolveRequestPath(request.url ?? "/");

  if (!filePath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      throw new Error("Not a file");
    }

    response.writeHead(200, {
      "content-type": contentTypes.get(extname(filePath)) ?? "application/octet-stream"
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`Sync fixture: http://localhost:${port}`);
});
```

- [ ] **Step 5: Add npm script**

Modify `package.json`:

```json
{
  "scripts": {
    "serve:fixture": "node scripts/serve-sync-fixture.mjs"
  }
}
```

- [ ] **Step 6: Update local testing docs**

Modify `docs/local-testing.md` so the manual flow says:

```md
Run the fixture:

```sh
npm run serve:fixture
```

Open `http://localhost:4173`, click **Start Loop**, select `200 ms`, start the extension capture for that tab, and set extension delay to `200 ms`.
```

- [ ] **Step 7: Run checks**

Run: `npm run check && npm run package`

Expected: checks and packaging pass.

## Task 3: Integration Review

**Files:**
- Review all files changed by Tasks 0-2.

- [ ] **Step 1: Inspect merged diff**

Run: `git diff main...HEAD`

Expected: changes are limited to the feature branch, with no generated files tracked.

- [ ] **Step 2: Run complete verification**

Run: `npm run check && npm run package`

Expected: all checks pass and the ZIP contains the extension runtime assets.

- [ ] **Step 3: Manually load the extension**

Run: `npm run build`, then load `dist/chrome` in Chrome using `chrome://extensions`.

Expected: Chrome accepts the Manifest V3 extension.

- [ ] **Step 4: Manually test fixture capture**

Run: `npm run serve:fixture`, open `http://localhost:4173`, start the fixture, click the extension, start capture, and set delay to `200 ms`.

Expected: the beep/flash alignment visibly improves at `200 ms` compared with `0 ms`.

