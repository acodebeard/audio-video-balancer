import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mockPath = resolve(root, "docs/mockups/popup-mock.html");
const mock = await readFile(mockPath, "utf8");

const requiredSnippets = [
  "Audio Delay",
  "Audio delay",
  "Current tab",
  ">Off<",
  "controls-disabled",
  "disabled",
  "step=\"5\"",
  "200",
  "Audio delay applies to this tab only."
];

for (const snippet of requiredSnippets) {
  if (!mock.includes(snippet)) {
    throw new Error(`Popup mock is missing expected content: ${snippet}`);
  }
}

for (const forbiddenSnippet of ["Baseball stream - Live", ">Start<", ">Stop<"]) {
  if (mock.includes(forbiddenSnippet)) {
    throw new Error(`Popup mock still contains unclear placeholder text: ${forbiddenSnippet}`);
  }
}

console.log("Popup mock check passed.");
