import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = resolve(root, "extension");
const outputDir = resolve(root, "dist/chrome");

await rm(outputDir, { force: true, recursive: true });
await mkdir(outputDir, { recursive: true });
await cp(sourceDir, outputDir, {
  recursive: true,
  filter: (source) => !source.endsWith(".map")
});

console.log(`Built Chrome extension in ${outputDir}`);

