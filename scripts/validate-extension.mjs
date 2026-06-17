import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(root, "extension/manifest.json");
const popupPath = resolve(root, "extension/popup.html");
const popupScriptPath = resolve(root, "extension/popup.js");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
await readFile(popupPath, "utf8");
const popupScript = await readFile(popupScriptPath, "utf8");

if (manifest.manifest_version !== 3) {
  throw new Error("Extension must use Manifest V3.");
}

if (manifest.action?.default_popup !== "popup.html") {
  throw new Error("Extension action must point at popup.html.");
}

if (manifest.permissions?.length) {
  throw new Error("The mock extension should not request permissions yet.");
}

if (!popupScript.includes("clampDelay") || !popupScript.includes("1000")) {
  throw new Error("Popup script must clamp delay controls to the supported range.");
}

console.log("Extension validation passed.");

