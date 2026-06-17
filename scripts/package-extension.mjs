import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ZipArchive } from "archiver";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = resolve(root, "dist/chrome");
const releaseDir = resolve(root, "release");
const outputPath = resolve(releaseDir, "audio-video-balancer-chrome.zip");

await mkdir(releaseDir, { recursive: true });

const output = createWriteStream(outputPath);
const archive = new ZipArchive({ zlib: { level: 9 } });

const done = new Promise((resolvePromise, rejectPromise) => {
  output.on("close", resolvePromise);
  archive.on("warning", rejectPromise);
  archive.on("error", rejectPromise);
});

archive.pipe(output);
archive.directory(sourceDir, false);
await archive.finalize();
await done;

console.log(`Packaged Chrome extension at ${outputPath}`);
