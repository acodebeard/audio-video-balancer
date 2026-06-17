import {
  MAX_DELAY_MS,
  MESSAGE_TARGETS,
  MESSAGE_TYPES,
  normalizeDelay
} from "./messages.js";

let audioContext = null;
let stream = null;
let sourceNode = null;
let delayNode = null;
let pipelineState = {
  status: "idle",
  tabId: null,
  delayMs: 200,
  error: null
};

function getPipelineState() {
  return {
    ...pipelineState,
    delayMs: normalizeDelay(pipelineState.delayMs),
    audioContextState: audioContext?.state ?? "closed"
  };
}

function setPipelineState(nextState) {
  pipelineState = {
    ...pipelineState,
    ...nextState,
    delayMs: normalizeDelay(nextState.delayMs ?? pipelineState.delayMs)
  };

  return getPipelineState();
}

function disconnectNode(node) {
  if (!node) {
    return;
  }

  try {
    node.disconnect();
  } catch {
    // The node may already be disconnected.
  }
}

async function stopPipeline() {
  disconnectNode(sourceNode);
  disconnectNode(delayNode);

  sourceNode = null;
  delayNode = null;

  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  if (audioContext) {
    await audioContext.close();
    audioContext = null;
  }

  setPipelineState({
    status: "idle",
    tabId: null,
    error: null
  });

  return { ok: true };
}

function setDelay(delayMs) {
  const nextDelayMs = normalizeDelay(delayMs);
  setPipelineState({ delayMs: nextDelayMs, error: null });

  if (delayNode && audioContext) {
    delayNode.delayTime.setValueAtTime(
      nextDelayMs / 1000,
      audioContext.currentTime
    );
  }

  return { ok: true, delayMs: nextDelayMs };
}

async function startPipeline({ streamId, tabId, delayMs }) {
  await stopPipeline();
  setPipelineState({ status: "starting", delayMs, error: null });

  try {
    audioContext = new AudioContext();
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId
        }
      },
      video: false
    });

    sourceNode = audioContext.createMediaStreamSource(stream);
    delayNode = audioContext.createDelay(MAX_DELAY_MS / 1000);
    setDelay(delayMs);

    sourceNode.connect(delayNode);
    delayNode.connect(audioContext.destination);

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    setPipelineState({
      status: "capturing",
      tabId: Number.isInteger(tabId) ? tabId : null,
      delayMs,
      error: null
    });
  } catch (error) {
    await stopPipeline();
    setPipelineState({
      status: "error",
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }

  return { ok: true };
}

async function handleOffscreenMessage(message) {
  switch (message.type) {
    case MESSAGE_TYPES.OFFSCREEN_GET_STATE:
      return { ok: true, state: getPipelineState() };
    case MESSAGE_TYPES.OFFSCREEN_START:
      return startPipeline(message);
    case MESSAGE_TYPES.OFFSCREEN_STOP:
      return stopPipeline();
    case MESSAGE_TYPES.OFFSCREEN_SET_DELAY:
      return setDelay(message.delayMs);
    default:
      return { ok: false };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== MESSAGE_TARGETS.OFFSCREEN) {
    return false;
  }

  handleOffscreenMessage(message).then(
    (response) => sendResponse(response),
    (error) => {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  );

  return true;
});
