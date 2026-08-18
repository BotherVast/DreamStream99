let socket = null;
let reconnectTimer = null;
let status = 'off';
let lastSnapshot = null;
let lastPresence = [];

const DEFAULT_CONFIG = {
  enabled: false,
  serverUrl: 'http://localhost:3000',
  roomId: '',
  nickname: '',
};

async function getConfig() {
  return { ...DEFAULT_CONFIG, ...(await chrome.storage.local.get(DEFAULT_CONFIG)) };
}

function websocketUrl(serverUrl) {
  const url = new URL(serverUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/bridge';
  url.search = '';
  url.hash = '';
  return url.toString();
}

async function connect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = null;
  if (socket) {
    socket.onclose = null;
    socket.close();
    socket = null;
  }

  const config = await getConfig();
  if (!config.enabled || !config.roomId || !config.nickname) {
    setStatus('off');
    return;
  }

  try {
    setStatus('connecting');
    socket = new WebSocket(websocketUrl(config.serverUrl));
    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'join',
        roomId: String(config.roomId).toUpperCase(),
        nickname: config.nickname,
      }));
    };
    socket.onmessage = (event) => handleServerMessage(JSON.parse(event.data));
    socket.onerror = () => setStatus('error');
    socket.onclose = () => {
      socket = null;
      setStatus('offline');
      scheduleReconnect();
    };
  } catch {
    setStatus('error');
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    const config = await getConfig();
    if (config.enabled) connect();
  }, 2500);
}

function setStatus(next) {
  status = next;
  const badge = next === 'online' ? 'ON' : next === 'connecting' ? '…' : next === 'error' ? '!' : '';
  chrome.action.setBadgeText({ text: badge });
  chrome.action.setBadgeBackgroundColor({ color: next === 'online' ? '#55d99b' : '#7c5cff' });
}

async function broadcastToBilibili(message) {
  const tabs = await chrome.tabs.query({ url: 'https://www.bilibili.com/video/*' });
  for (const tab of tabs) {
    if (!tab.id) continue;
    chrome.tabs.sendMessage(tab.id, message).catch(() => {});
  }
}

function handleServerMessage(message) {
  if (message.type === 'joined') {
    lastSnapshot = message.snapshot;
    lastPresence = message.snapshot?.members || [];
    setStatus('online');
    broadcastToBilibili({ type: 'watchTogether:server', payload: message });
  } else if (message.type === 'playback') {
    if (lastSnapshot) lastSnapshot.playback = message.playback;
    broadcastToBilibili({ type: 'watchTogether:server', payload: message });
  } else if (message.type === 'presence') {
    lastPresence = message.members || [];
  } else if (message.type === 'error') {
    setStatus('error');
  }
}

function send(payload) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify(payload));
  return true;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'watchTogether:reconnect') {
    connect();
    sendResponse({ ok: true });
    return;
  }

  if (message?.type === 'watchTogether:command') {
    const ok = send({ type: 'command', command: message.command });
    sendResponse({ ok });
    return;
  }

  if (message?.type === 'watchTogether:contentReady') {
    if (lastSnapshot) {
      sendResponse({ ok: true, status, snapshot: lastSnapshot });
    } else {
      sendResponse({ ok: true, status, snapshot: null });
    }
    return;
  }

  if (message?.type === 'watchTogether:getStatus') {
    sendResponse({ status, memberCount: lastPresence.length });
  }
});

chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === 'local') connect();
});

connect();
