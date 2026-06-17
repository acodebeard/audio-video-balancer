# Audio Video Balancer

Audio Video Balancer is a planned Chrome extension for delaying the current
tab's audio when audio is ahead of video.

The first target use case is live video where the audio leads the picture by a
noticeable amount, such as a sports stream with commentary roughly 200 ms ahead.

## Status

This repository currently contains the project baseline, visual popup mock, CI,
release packaging, and planning documents. The tab audio delay pipeline is not
implemented yet.

## Planned MVP

- Capture the active tab's audio after the user clicks the extension.
- Replay the tab audio through Web Audio.
- Apply a user-controlled delay from 0 ms to 1000 ms.
- Move the delay in 5 ms increments.
- Keep the adjustment scoped to the whole tab.
- Package installable Chrome extension ZIPs from tagged releases.

## Visual Mock

Open the static popup mock in a browser:

```sh
xdg-open docs/mockups/popup-mock.html
```

The extension popup source currently mirrors the mock and can be loaded as an
unpacked extension for layout review.

## Build From Source

Requirements:

- Node.js 22 or newer
- npm

Install dependencies:

```sh
npm ci
```

Run checks:

```sh
npm run check
```

Build the Chrome extension directory:

```sh
npm run build
```

Create an installable ZIP:

```sh
npm run package
```

The package is written to `release/audio-video-balancer-chrome.zip`.

## Install A Local Build

1. Run `npm run package`.
2. Unzip `release/audio-video-balancer-chrome.zip`.
3. Open `chrome://extensions`.
4. Enable Developer Mode.
5. Click **Load unpacked** and select the unzipped extension directory.

This process will become more direct once release ZIPs are published from
tagged builds.

## Security

Please see [SECURITY.md](SECURITY.md).

