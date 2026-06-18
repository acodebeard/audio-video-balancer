import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(root, "extension/manifest.json");
const popupPath = resolve(root, "extension/popup.html");
const popupScriptPath = resolve(root, "extension/popup.js");
const backgroundScriptPath = resolve(root, "extension/background.js");
const offscreenPath = resolve(root, "extension/offscreen.html");
const offscreenScriptPath = resolve(root, "extension/offscreen.js");
const messagesPath = resolve(root, "extension/messages.js");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const popup = await readFile(popupPath, "utf8");
const popupScript = await readFile(popupScriptPath, "utf8");
const backgroundScript = await readFile(backgroundScriptPath, "utf8");
const offscreen = await readFile(offscreenPath, "utf8");
const offscreenScript = await readFile(offscreenScriptPath, "utf8");
await readFile(messagesPath, "utf8");

if (manifest.manifest_version !== 3) {
  throw new Error("Extension must use Manifest V3.");
}

if (manifest.action?.default_popup !== "popup.html") {
  throw new Error("Extension action must point at popup.html.");
}

if (manifest.minimum_chrome_version !== "116") {
  throw new Error("Extension must require Chrome 116 or newer.");
}

const requiredPermissions = ["activeTab", "offscreen", "storage", "tabCapture"];
const permissions = new Set(manifest.permissions ?? []);

for (const permission of requiredPermissions) {
  if (!permissions.has(permission)) {
    throw new Error(`Extension manifest is missing ${permission} permission.`);
  }
}

if (manifest.background?.service_worker !== "background.js") {
  throw new Error("Extension must use background.js as its service worker.");
}

if (manifest.background?.type !== "module") {
  throw new Error("Extension background service worker must be a module.");
}

if (!popup.includes('src="./popup.js"') || !popup.includes('type="module"')) {
  throw new Error("Popup HTML must load popup.js as a module script.");
}

for (const requiredPopupText of ["Audio delay", "Current tab", ">Off<", "controls-disabled", "disabled"]) {
  if (!popup.includes(requiredPopupText)) {
    throw new Error(`Popup HTML is missing clearer audio delay state text: ${requiredPopupText}`);
  }
}

for (const forbiddenPopupText of ["Baseball stream - Live", ">Start<", ">Stop<"]) {
  if (popup.includes(forbiddenPopupText)) {
    throw new Error(`Popup HTML still contains unclear placeholder text: ${forbiddenPopupText}`);
  }
}

for (const requiredPopupScriptText of ["\"On\"", "\"Off\"", "Turn audio delay on", "Turn audio delay off"]) {
  if (!popupScript.includes(requiredPopupScriptText)) {
    throw new Error(`popup.js is missing clearer audio delay state text: ${requiredPopupScriptText}`);
  }
}

for (const requiredPopupScriptText of ["delayControls", "delaySections", "controlsDisabled"]) {
  if (!popupScript.includes(requiredPopupScriptText)) {
    throw new Error(`popup.js must toggle disabled delay controls: ${requiredPopupScriptText}`);
  }
}

if (!offscreen.includes('src="./offscreen.js"') || !offscreen.includes('type="module"')) {
  throw new Error("Offscreen HTML must load offscreen.js as a module script.");
}

const scriptChecks = [
  ["popup.js", popupScript, "./messages.js", "MESSAGE_TARGETS"],
  ["background.js", backgroundScript, "./messages.js", "MESSAGE_TARGETS"],
  ["offscreen.js", offscreenScript, "./messages.js", "MESSAGE_TARGETS"]
];

for (const [name, script, importPath, messageTarget] of scriptChecks) {
  if (!script.includes(importPath) || !script.includes(messageTarget)) {
    throw new Error(`${name} must use the shared message helper.`);
  }
}

for (const reason of ["AUDIO_PLAYBACK", "USER_MEDIA"]) {
  if (!backgroundScript.includes(reason)) {
    throw new Error(`background.js must create the offscreen document with ${reason}.`);
  }
}

for (const snippet of ["creatingOffscreenDocument", "chrome.storage.session", "OFFSCREEN_GET_STATE"]) {
  if (!backgroundScript.includes(snippet)) {
    throw new Error(`background.js must include service worker recovery support: ${snippet}.`);
  }
}

if (!offscreenScript.includes("OFFSCREEN_GET_STATE")) {
  throw new Error("offscreen.js must report live audio state.");
}

console.log("Extension validation passed.");
