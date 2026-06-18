import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = resolve(root, "fixtures/sync-test");

const files = {
  html: resolve(fixtureRoot, "index.html"),
  js: resolve(fixtureRoot, "sync-test.js"),
  css: resolve(fixtureRoot, "styles.css")
};

async function readFixtureFile(name, path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`Sync fixture is missing ${name}: ${path}`);
    }

    throw error;
  }
}

function requireSnippet(content, snippet, label) {
  if (!content.includes(snippet)) {
    throw new Error(`Sync fixture is missing expected ${label}: ${snippet}`);
  }
}

const [html, js, css] = await Promise.all([
  readFixtureFile("HTML", files.html),
  readFixtureFile("JavaScript", files.js),
  readFixtureFile("CSS", files.css)
]);

for (const snippet of [
  "Audio Video Balancer Sync Fixture",
  "Start Loop",
  "Stop",
  "value=\"100\"",
  "value=\"200\" selected",
  "value=\"300\"",
  "sync-test.js",
  "styles.css"
]) {
  requireSnippet(html, snippet, "HTML content");
}

for (const snippet of [
  "AudioContext",
  "OscillatorNode",
  "resume()",
  "setTimeout",
  "1600",
  "leadMs",
  "stopLoop"
]) {
  requireSnippet(js, snippet, "JavaScript behavior");
}

for (const snippet of [
  "flash-target",
  "min-height",
  "transition",
  "active"
]) {
  requireSnippet(css, snippet, "CSS flash styling");
}

console.log("Sync fixture check passed.");
