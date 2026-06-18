import {
  MESSAGE_TARGETS,
  MESSAGE_TYPES,
  normalizeDelay
} from "./messages.js";

const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";
const STATE_STORAGE_KEY = "audioVideoBalancerState";
const DEFAULT_STATE = Object.freeze({
  status: "idle",
  tabId: null,
  delayMs: 200,
  error: null
});

let creatingOffscreenDocument = null;
let activeState = { ...DEFAULT_STATE };

function toErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function normalizeState(state = {}) {
  return {
    status: state.status ?? DEFAULT_STATE.status,
    tabId: Number.isInteger(state.tabId) ? state.tabId : null,
    delayMs: normalizeDelay(state.delayMs ?? DEFAULT_STATE.delayMs),
    error: state.error ?? null
  };
}

function getState() {
  return normalizeState(activeState);
}

async function persistState() {
  await chrome.storage.session.set({
    [STATE_STORAGE_KEY]: getState()
  });
}

async function loadStoredState() {
  const stored = await chrome.storage.session.get(STATE_STORAGE_KEY);
  activeState = normalizeState(stored[STATE_STORAGE_KEY] ?? activeState);
  return getState();
}

async function setState(nextState) {
  activeState = normalizeState({
    ...activeState,
    ...nextState
  });
  await persistState();
  return getState();
}

async function hasOffscreenDocument() {
  if (typeof chrome.offscreen.hasDocument === "function") {
    return chrome.offscreen.hasDocument();
  }

  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
  });

  return contexts.length > 0;
}

async function ensureOffscreenDocument() {
  if (await hasOffscreenDocument()) {
    return;
  }

  if (!creatingOffscreenDocument) {
    creatingOffscreenDocument = chrome.offscreen
      .createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        reasons: ["AUDIO_PLAYBACK", "USER_MEDIA"],
        justification: "Replay captured tab audio with a user-selected delay."
      })
      .finally(() => {
        creatingOffscreenDocument = null;
      });
  }

  await creatingOffscreenDocument;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab?.id) {
    throw new Error("No active tab is available for capture.");
  }

  return tab;
}

async function sendOffscreenMessage(type, payload = {}) {
  const response = await chrome.runtime.sendMessage({
    target: MESSAGE_TARGETS.OFFSCREEN,
    type,
    ...payload
  });

  if (response?.ok === false) {
    throw new Error(response.error ?? "Offscreen audio operation failed.");
  }

  return response;
}

async function readLiveOffscreenState() {
  if (!(await hasOffscreenDocument())) {
    return null;
  }

  const response = await sendOffscreenMessage(MESSAGE_TYPES.OFFSCREEN_GET_STATE);
  return response?.state ? normalizeState(response.state) : null;
}

async function refreshState() {
  await loadStoredState();

  const liveState = await readLiveOffscreenState();
  if (liveState) {
    return setState({
      ...activeState,
      ...liveState
    });
  }

  if (activeState.status === "capturing" || activeState.status === "starting") {
    return setState({
      status: "idle",
      tabId: null,
      error: null
    });
  }

  return getState();
}

async function startCapture() {
  await loadStoredState();
  const delayMs = normalizeDelay(activeState.delayMs);
  await setState({ status: "starting", delayMs, error: null });

  try {
    await ensureOffscreenDocument();
    const tab = await getActiveTab();
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id
    });

    await sendOffscreenMessage(MESSAGE_TYPES.OFFSCREEN_START, {
      streamId,
      tabId: tab.id,
      delayMs
    });

    return await setState({
      status: "capturing",
      tabId: tab.id,
      delayMs,
      error: null
    });
  } catch (error) {
    return await setState({
      status: "error",
      tabId: null,
      error: toErrorMessage(error)
    });
  }
}

async function stopCapture() {
  try {
    await refreshState();

    if (await hasOffscreenDocument()) {
      await sendOffscreenMessage(MESSAGE_TYPES.OFFSCREEN_STOP);
      await chrome.offscreen.closeDocument();
    }

    return await setState({
      status: "idle",
      tabId: null,
      error: null
    });
  } catch (error) {
    return await setState({
      status: "error",
      tabId: null,
      error: toErrorMessage(error)
    });
  }
}

async function setDelay(delayMs) {
  await refreshState();
  const nextDelayMs = normalizeDelay(Number(delayMs));
  await setState({ delayMs: nextDelayMs, error: null });

  try {
    if (activeState.status === "capturing" && (await hasOffscreenDocument())) {
      await sendOffscreenMessage(MESSAGE_TYPES.OFFSCREEN_SET_DELAY, {
        delayMs: nextDelayMs
      });
    }

    return getState();
  } catch (error) {
    return await setState({
      status: "error",
      error: toErrorMessage(error)
    });
  }
}

async function handleBackgroundMessage(message) {
  switch (message.type) {
    case MESSAGE_TYPES.GET_STATE:
      return refreshState();
    case MESSAGE_TYPES.START_CAPTURE:
      return startCapture();
    case MESSAGE_TYPES.STOP_CAPTURE:
      return stopCapture();
    case MESSAGE_TYPES.SET_DELAY:
      return setDelay(message.delayMs);
    default:
      return getState();
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== MESSAGE_TARGETS.BACKGROUND) {
    return false;
  }

  handleBackgroundMessage(message).then(
    (state) => sendResponse(state),
    (error) => {
      setState({
        status: "error",
        error: toErrorMessage(error)
      }).then((state) => {
        sendResponse(state);
      });
    }
  );

  return true;
});
