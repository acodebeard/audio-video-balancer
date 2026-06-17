# Local Testing Plan

The MVP needs tests that prove the audio pipeline works, not only that the
popup UI renders.

## Controlled Sync Fixture

Run the controlled fixture locally:

```bash
npm run serve:fixture
```

Open `http://localhost:4173` in Chrome. If port `4173` is already in use, run
with `PORT=4174 npm run serve:fixture` and open that port instead.

Manual test flow:

1. Click Start Loop.
2. Choose the 200 ms audio lead.
3. Capture the fixture tab with the extension.
4. Set the extension delay to 200 ms.
5. Confirm the beep and flash line up.
6. Reset delay to 0 ms and confirm the beep leads again.
7. Repeat with 100 ms and 300 ms selected in the fixture and matching extension
   delays.

Use wired audio when judging exact sync. Bluetooth output can add device-level
latency that makes the comparison less reliable.

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
