import { execFileSync } from "node:child_process";

const forbiddenPatterns = [
  /^dist\//,
  /^release\//,
  /\.zip$/,
  /\.crx$/,
  /\.pem$/,
  /\.(mov|mp4|webm|mkv)$/i
];

const trackedFiles = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

const forbiddenFiles = trackedFiles.filter((file) =>
  forbiddenPatterns.some((pattern) => pattern.test(file))
);

if (forbiddenFiles.length > 0) {
  throw new Error(
    `Generated or sensitive files are tracked:\n${forbiddenFiles.join("\n")}`
  );
}

console.log("Source policy check passed.");

