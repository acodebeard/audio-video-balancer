import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mockPath = resolve(root, "docs/mockups/popup-mock.html");
const mock = await readFile(mockPath, "utf8");

const requiredSnippets = [
  "Audio Delay",
  "step=\"5\"",
  "200",
  "Audio is delayed for this tab only."
];

for (const snippet of requiredSnippets) {
  if (!mock.includes(snippet)) {
    throw new Error(`Popup mock is missing expected content: ${snippet}`);
  }
}

console.log("Popup mock check passed.");

