let video = null;
let playback = null;
let serverOffsetMs = 0;
let suppressUntil = 0;
let observer = null;

function currentBvid() {
  return location.href.match(/BV[A-Za-z0-9]{8,20}/)?.[0] || null;
}

function currentPage() {
  const url = new URL(location.href);
  return Math.max(1, Number(url.searchParams.get('p') || 1) || 1);
}

function expectedPosition(state) {
  if (!state) return 0;
  if (state.paused) return Math.max(0, state.anchorSeconds || 0);
  const serverNow = Date.now() + serverOffsetMs;
  const elapsed = Math.max(0, serverNow - state.anchorServerMs) / 1000;
  return Math.max(0, (state.anchorSeconds || 0) + elapsed * (state.playbackRate || 1));
}

function isSuppressed() {
  return Date.now() < suppressUntil;
}

function suppress(ms = 1000) {
  suppressUntil = Math.max(suppressUntil, Date.now() + ms);
}

function sendCommand(action, extra = {}) {
  if (!video || isSuppressed()) return;
  chrome.runtime.sendMessage({
    type: 'watchTogether:command',
    command: {
      action,
      actionId: crypto.randomUUID(),
      position: Number.isFinite(extra.position) ? extra.position : video.currentTime,
      ...extra,
    },
  }).catch(() => {});
}

function attachVideo(nextVideo) {
  if (video === nextVideo) return;
  video = nextVideo;

  video.addEventListener('play', () => sendCommand('play'));
  video.addEventListener('pause', () => sendCommand('pause'));
  video.addEventListener('seeked', () => sendCommand('seek'));
  video.addEventListener('ratechange', () => sendCommand('rate', { rate: video.playbackRate }));

  if (playback) applyPlayback(playback);
}

function findVideo() {
  const candidate = document.querySelector('video');
  if (candidate) attachVideo(candidate);
}

async function applyPlayback(state) {
  playback = state;
  if (!state || state.provider !== 'bilibili' || !state.mediaId) return;

  const targetBvid = state.mediaId;
  const targetPage = state.page || 1;
  if (currentBvid() !== targetBvid || currentPage() !== targetPage) {
    const url = new URL(`https://www.bilibili.com/video/${targetBvid}/`);
    if (targetPage > 1) url.searchParams.set('p', String(targetPage));
    url.searchParams.set('t', String(Math.floor(expectedPosition(state))));
    location.href = url.toString();
    return;
  }

  if (!video) {
    findVideo();
    if (!video) return;
  }

  suppress(1200);
  const target = expectedPosition(state);
  if (Math.abs(video.currentTime - target) > (state.paused ? 0.35 : 0.8)) {
    video.currentTime = target;
  }
  if (Math.abs(video.playbackRate - state.playbackRate) > 0.001) {
    video.playbackRate = state.playbackRate;
  }

  if (state.paused) {
    video.pause();
  } else {
    video.play().catch(() => {});
  }
}

function handleServerPayload(message) {
  if (message.type === 'joined') {
    const snapshot = message.snapshot;
    if (snapshot?.serverTime) serverOffsetMs = snapshot.serverTime - Date.now();
    if (snapshot?.playback) applyPlayback(snapshot.playback);
  } else if (message.type === 'playback') {
    if (message.serverTime) {
      const rough = message.serverTime - Date.now();
      serverOffsetMs = serverOffsetMs * 0.8 + rough * 0.2;
    }
    applyPlayback(message.playback);
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'watchTogether:server') handleServerPayload(message.payload);
});

chrome.runtime.sendMessage({ type: 'watchTogether:contentReady' }).then((response) => {
  if (response?.snapshot?.playback) {
    if (response.snapshot.serverTime) serverOffsetMs = response.snapshot.serverTime - Date.now();
    applyPlayback(response.snapshot.playback);
  }
}).catch(() => {});

observer = new MutationObserver(findVideo);
observer.observe(document.documentElement, { childList: true, subtree: true });
findVideo();

setInterval(() => {
  if (!video || !playback || playback.provider !== 'bilibili' || playback.paused || isSuppressed()) return;
  const target = expectedPosition(playback);
  if (Math.abs(video.currentTime - target) > 1.1) {
    suppress(650);
    video.currentTime = target;
  }
}, 2000);
