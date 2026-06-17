# Local Testing Plan

The MVP needs tests that prove the audio pipeline works, not only that the
popup UI renders.

## Controlled Sync Fixture

Create a local HTML fixture that plays a short beep before a visual flash by a
known offset, starting with 200 ms.

Manual test flow:

1. Open the fixture in Chrome.
2. Start the extension for that tab.
3. Set audio delay to 200 ms.
4. Confirm the beep and flash line up.
5. Reset delay to 0 ms and confirm the beep leads again.

## Browser Cases

Manual cases for the first prototype:

- Local sync fixture.
- YouTube or another normal HTML5 video tab.
- A live stream tab.
- Fullscreen video.
- Page reload while capture is active.
- Closing the captured tab.
- Wired audio output and Bluetooth audio output.

## Diagnostics

The development UI should expose enough state to debug capture failures:

- Capture state.
- Current tab id.
- Delay in milliseconds.
- `AudioContext` state.
- Last Chrome or Web Audio error message.

