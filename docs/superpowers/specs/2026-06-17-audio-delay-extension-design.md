# Audio Delay Chrome Extension Design

## Goal

Build a Chrome extension that lets a user delay the current tab's audio when
audio is ahead of video. The motivating case is a live baseball stream where
audio leads video by roughly 200 ms.

## MVP Scope

- Chrome first.
- Audio-delay only.
- Whole-tab adjustment.
- User gesture required to start capture.
- Delay range: 0 ms to 1000 ms.
- Slider increment: 5 ms.
- Release ZIPs are produced from source by CI.

## Out Of Scope

- Making audio earlier when audio is late.
- Delaying video.
- Per-site automation.
- Chrome Web Store publishing.
- Cross-browser support.

## Architecture

The extension will use Manifest V3. The user clicks the extension action to
start work for the active tab. A popup controls the delay, while an offscreen
document owns the long-lived audio graph. The service worker coordinates tab
state and messages.

Planned audio graph:

```text
tabCapture MediaStream
  -> MediaStreamAudioSourceNode
  -> DelayNode
  -> AudioContext destination
```

Chrome stops playing the original tab audio while the tab is captured, so the
extension must route the captured audio back to the output device.

## UI

The popup focuses on one task:

- Start or stop capture for the current tab.
- Show the active tab state.
- Show the current delay value.
- Adjust delay with a slider using 5 ms steps.
- Nudge delay down or up by 5 ms.
- Reset delay to 0 ms.
- Offer common presets.

The first visual mock lives at `docs/mockups/popup-mock.html`.

## Testing

The first prototype will include a local sync fixture that plays a beep before
a visual flash by a known offset, starting with 200 ms. The manual acceptance
test is that setting a 200 ms delay makes the beep and flash line up.

Manual cases also include normal HTML5 video, a live stream, fullscreen,
reload, tab close, wired output, and Bluetooth output.

## Packaging

The repository commits source, scripts, lockfiles, docs, and tests. It does not
commit built ZIPs or generated build output. CI builds and packages the Chrome
extension. Tagged releases attach an installable ZIP.

## Open Risks

- Some DRM or protected streams may block tab audio capture.
- Bluetooth output latency may complicate perceived sync.
- Chrome offscreen document behavior needs early prototype validation.

