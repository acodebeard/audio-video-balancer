# Release Plan

The repository is source-authoritative. Built ZIPs are not committed.

## Local Package

```sh
npm ci
npm run package
```

Output:

```text
release/audio-video-balancer-chrome.zip
```

## Tagged Release

Releases are created by pushing a semver-style tag:

```sh
git tag v0.1.0
git push origin v0.1.0
```

The release workflow checks the source, packages the Chrome extension, and
attaches `audio-video-balancer-chrome.zip` to the GitHub Release.

## Chrome Web Store

Chrome Web Store publishing is intentionally out of scope for the first MVP.
The initial install path is GitHub Release ZIP plus Developer Mode loading.

