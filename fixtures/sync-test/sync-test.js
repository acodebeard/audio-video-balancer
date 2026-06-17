const LOOP_INTERVAL_MS = 1600;
const BEEP_DURATION_SECONDS = 0.08;
const FLASH_DURATION_MS = 160;

let audioContext;
let loopTimerId;
let flashTimerId;
let clearFlashTimerId;
let loopRunning = false;
let activeOscillator;
let leadSelect;
let startButton;
let stopButton;
let flashTarget;
let loopStatus;

function getAudioContext() {
  audioContext ??= new AudioContext();
  return audioContext;
}

function getLeadMs() {
  return Number.parseInt(leadSelect.value, 10);
}

function playBeep(context) {
  const oscillator = new OscillatorNode(context, {
    frequency: 880,
    type: "sine"
  });
  const gain = new GainNode(context, { gain: 0.0001 });
  const now = context.currentTime;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + BEEP_DURATION_SECONDS);

  oscillator.connect(gain).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + BEEP_DURATION_SECONDS);
  activeOscillator = oscillator;

  oscillator.addEventListener(
    "ended",
    () => {
      oscillator.disconnect();
      gain.disconnect();
      if (activeOscillator === oscillator) {
        activeOscillator = undefined;
      }
    },
    { once: true }
  );
}

function flash() {
  flashTarget.classList.add("active");
  clearTimeout(clearFlashTimerId);
  clearFlashTimerId = setTimeout(() => {
    flashTarget.classList.remove("active");
  }, FLASH_DURATION_MS);
}

function runLoopCycle() {
  if (!loopRunning) {
    return;
  }

  const context = getAudioContext();
  const leadMs = getLeadMs();

  playBeep(context);
  flashTimerId = setTimeout(flash, leadMs);
  loopTimerId = setTimeout(runLoopCycle, LOOP_INTERVAL_MS);
}

async function startLoop() {
  if (loopRunning) {
    return;
  }

  const context = getAudioContext();
  await context.resume();

  loopRunning = true;
  startButton.disabled = true;
  stopButton.disabled = false;
  loopStatus.textContent = "Running";
  runLoopCycle();
}

function stopLoop() {
  loopRunning = false;
  clearTimeout(loopTimerId);
  clearTimeout(flashTimerId);
  clearTimeout(clearFlashTimerId);
  flashTarget.classList.remove("active");

  if (activeOscillator) {
    activeOscillator.stop();
    activeOscillator = undefined;
  }

  startButton.disabled = false;
  stopButton.disabled = true;
  loopStatus.textContent = "Stopped";
}

function initFixture() {
  leadSelect = document.querySelector("#lead-ms");
  startButton = document.querySelector("#start-loop");
  stopButton = document.querySelector("#stop-loop");
  flashTarget = document.querySelector("#flash-target");
  loopStatus = document.querySelector("#loop-status");

  startButton.addEventListener("click", () => {
    void startLoop();
  });
  stopButton.addEventListener("click", stopLoop);
}

if (typeof document !== "undefined") {
  initFixture();
}
