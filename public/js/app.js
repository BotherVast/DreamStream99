import { YouTubeAdapter } from './youtube-adapter.js';

const $ = (selector) => document.querySelector(selector);
const socket = window.io({ transports: ['websocket', 'polling'] });

const config = window.WT_CONFIG;
if (!config?.copy || !config?.theme) {
  throw new Error('WT_CONFIG is missing. Check /public/config.js');
}
const copy = config.copy;
const CAPTURE_FONT_FAMILY = config.theme?.fontFamily || 'Tahoma, "Segoe UI", "PingFang SC", "Microsoft YaHei", Arial, sans-serif';

function t(key, values = {}) {
  const template = copy[key];
  if (typeof template !== 'string') throw new Error(`Missing copy key: ${key}`);
  return template.replace(/\{(\w+)\}/g, (_match, name) => String(values[name] ?? ''));
}

function applyConfiguredCopy() {
  document.title = config.siteName;
  document.documentElement.style.setProperty('--desktop', config.theme.desktop);
  document.documentElement.style.setProperty('--title', config.theme.titleBar);
  document.documentElement.style.setProperty('--title-active', config.theme.titleBarActive);
  if (config.theme.fontFamily) document.documentElement.style.setProperty('--ui-font', config.theme.fontFamily);
  if (config.theme.displayFontFamily) document.documentElement.style.setProperty('--display-font', config.theme.displayFontFamily);

  for (const element of document.querySelectorAll('[data-copy]')) {
    element.textContent = t(element.dataset.copy);
  }
  for (const element of document.querySelectorAll('[data-site-name]')) {
    element.textContent = config.siteName;
  }
  for (const element of document.querySelectorAll('[data-config-oldweb]')) {
    const value = config.oldWeb?.[element.dataset.configOldweb];
    if (typeof value === 'string') element.textContent = value;
  }
  for (const element of document.querySelectorAll('[data-placeholder]')) {
    element.placeholder = t(element.dataset.placeholder);
  }
  const readPath = (root, path) => String(path || '').split('.').reduce((value, key) => value?.[key], root);

  for (const element of document.querySelectorAll('[data-asset]')) {
    const value = readPath(config.assets, element.dataset.asset);
    const optional = element.dataset.assetOptional === 'true';
    if (typeof value === 'string' && value) {
      element.src = value;
      if (optional) element.hidden = false;
      if (element.dataset.assetToggleParent) element.parentElement?.classList.add(element.dataset.assetToggleParent);
    } else if (optional) {
      element.hidden = true;
      if (element.dataset.assetToggleParent) element.parentElement?.classList.remove(element.dataset.assetToggleParent);
    }
    const fallback = element.dataset.fallback;
    if (fallback) element.addEventListener('error', () => { if (!element.src.endsWith(fallback)) element.src = fallback; }, { once: true });
  }

  for (const element of document.querySelectorAll('[data-bg-asset]')) {
    const value = readPath(config.assets, element.dataset.bgAsset);
    if (typeof value === 'string' && value) {
      element.style.backgroundImage = `url(${JSON.stringify(value)})`;
      element.classList.add('has-custom-background');
    } else {
      element.style.removeProperty('background-image');
      element.classList.remove('has-custom-background');
    }
  }

  document.querySelector('#copyInviteButton')?.setAttribute('title', t('copyInvite'));
  document.querySelector('#backButton')?.setAttribute('aria-label', t('ariaBack'));
  document.querySelector('#forwardButton')?.setAttribute('aria-label', t('ariaForward'));
  document.querySelector('#fullscreenButton')?.setAttribute('aria-label', t('ariaFullscreen'));
}

applyConfiguredCopy();

const els = {
  roomLabel: $('#roomLabel'),
  joinRoomLabel: $('#joinRoomLabel'),
  syncStatus: $('#syncStatus'),
  copyInviteButton: $('#copyInviteButton'),
  joinDialog: $('#joinDialog'),
  joinForm: $('#joinForm'),
  nicknameInput: $('#nicknameInput'),
  sourceInput: $('#sourceInput'),
  loadButton: $('#loadButton'),
  emptyPlayer: $('#emptyPlayer'),
  youtubeSurface: $('#youtubeSurface'),
  youtubeHost: $('#youtubeHost'),
  providerBadge: $('#providerBadge'),
  playButton: $('#playButton'),
  backButton: $('#backButton'),
  forwardButton: $('#forwardButton'),
  currentTime: $('#currentTime'),
  durationTime: $('#durationTime'),
  seekRange: $('#seekRange'),
  rateSelect: $('#rateSelect'),
  fullscreenButton: $('#fullscreenButton'),
  playerStage: $('#playerStage'),
  members: $('#members'),
  memberCount: $('#memberCount'),
  messages: $('#messages'),
  chatForm: $('#chatForm'),
  chatInput: $('#chatInput'),
  sendButton: $('#sendButton'),
  toast: $('#toast'),
  taskbarClock: $('#taskbarClock'),
  trayLed: $('#trayLed'),
  mediaStatusField: $('#mediaStatusField'),
  watcherCountMirror: $('#watcherCountMirror'),
  chatRoomMirror: $('#chatRoomMirror'),
  mediaAddress: $('#mediaAddress'),
  chatAddress: $('#chatAddress'),
};

const roomId = getOrCreateRoomId();
els.roomLabel.textContent = roomId;
els.joinRoomLabel.textContent = roomId;
if (els.chatRoomMirror) els.chatRoomMirror.textContent = roomId;
if (els.mediaAddress) els.mediaAddress.textContent = `http://www.pixelstream99.local/watch.php?room=${roomId.toLowerCase()}`;
if (els.chatAddress) els.chatAddress.textContent = `http://www.dialuplounge.local/room/${roomId.toLowerCase()}.shtml`;
els.nicknameInput.value = localStorage.getItem('watchTogether.nickname') || '';

let activeNickname = '';
let joined = false;
let clientId = null;
let playback = null;
let appliedRevision = -1;
let serverOffsetMs = 0;
let draggingSeek = false;
let reconnecting = false;
let toastTimer = null;
let messageHistory = [];
const mediaMetadataCache = new Map();

const youtube = new YouTubeAdapter(els.youtubeHost, {
  onPlay: (position) => sendPlayback('play', { position }),
  onPause: (position) => sendPlayback('pause', { position }),
  onRateChange: (rate, position) => sendPlayback('rate', { rate, position }),
  onAutoplayBlocked: () => toast(t('toastAutoplayBlocked')),
  onError: (code) => toast(t('toastYoutubeError', { code })),
});

function getOrCreateRoomId() {
  const url = new URL(window.location.href);
  let code = (url.searchParams.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  if (code.length < 4) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    code = [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
    url.searchParams.set('room', code);
    history.replaceState(null, '', url);
  }
  return code;
}

function setConnectionState(label, state) {
  els.syncStatus.textContent = label;
  els.syncStatus.dataset.state = state;
  els.mediaStatusField.textContent = label;
  els.trayLed.classList.toggle('online', state === 'online');
}

function updatePlayVisual(paused) {
  els.playButton.dataset.icon = paused ? 'play' : 'pause';
  els.playButton.setAttribute('aria-label', paused ? t('ariaPlay') : t('ariaPause'));
}

function joinRoom(nickname, { silent = false } = {}) {
  const clean = nickname.trim().slice(0, 24);
  if (!clean) return;
  activeNickname = clean;
  localStorage.setItem('watchTogether.nickname', clean);
  setConnectionState(t('statusJoining'), 'syncing');

  socket.emit('room:join', { roomId, nickname: clean }, (response) => {
    if (!response?.ok) {
      setConnectionState(t('statusJoinFailed'), 'offline');
      toast(response?.error || t('toastJoinFailed'));
      return;
    }
    clientId = response.clientId;
    joined = true;
    reconnecting = false;
    setConnectionState(t('statusOnline'), 'online');
    enableChat(true);
    applySnapshot(response.snapshot);
    if (!silent && els.joinDialog.open) els.joinDialog.close();
    measureClockOffset();
  });
}

function applySnapshot(snapshot) {
  if (!snapshot) return;
  serverOffsetMs = snapshot.serverTime - Date.now();
  renderMembers(snapshot.members || []);
  messageHistory = Array.isArray(snapshot.messages) ? [...snapshot.messages] : [];
  renderMessageHistory(messageHistory);
  applyPlaybackState({ playback: snapshot.playback, serverTime: snapshot.serverTime }, true);
}

socket.on('connect', () => {
  if (activeNickname && (joined || reconnecting)) {
    reconnecting = true;
    joinRoom(activeNickname, { silent: true });
  } else if (!joined) {
    setConnectionState(t('statusWaiting'), 'offline');
  }
});

socket.on('disconnect', () => {
  if (activeNickname) reconnecting = true;
  joined = false;
  setConnectionState(t('statusReconnecting'), 'syncing');
  enableChat(false);
});

socket.on('presence:update', renderMembers);
socket.on('playback:state', (payload) => applyPlaybackState(payload, false));
socket.on('chat:message', (message) => appendMessage(message, true));

async function applyPlaybackState(payload, force = false) {
  const incoming = payload?.playback;
  if (!incoming) return;
  if (!force && incoming.revision <= appliedRevision) return;

  if (Number.isFinite(payload.serverTime)) {
    const roughOffset = payload.serverTime - Date.now();
    serverOffsetMs = serverOffsetMs * 0.85 + roughOffset * 0.15;
  }

  playback = incoming;
  appliedRevision = incoming.revision;
  updateControlsEnabled(Boolean(incoming.mediaId));

  if (!incoming.mediaId || !incoming.provider) {
    showProvider(null);
    return;
  }

  const target = expectedPosition(incoming);
  if (incoming.provider !== 'youtube') {
    showProvider(null);
    toast(t('toastUnsupportedProvider'));
    return;
  }

  showProvider('youtube');
  els.rateSelect.value = String(incoming.playbackRate || 1);
  updatePlayVisual(incoming.paused);
  warmMediaMetadata(incoming).catch(() => {});

  try {
    await youtube.apply(incoming, target);
  } catch (error) {
    toast(error.message || t('toastSyncFailed'));
  }
}

function showProvider(provider) {
  const hasProvider = provider === 'youtube';
  els.emptyPlayer.classList.toggle('is-hidden', hasProvider);
  els.youtubeSurface.classList.toggle('is-hidden', !hasProvider);
  els.providerBadge.classList.toggle('is-hidden', !hasProvider);

  if (hasProvider) els.providerBadge.textContent = t('providerYouTube');

  els.rateSelect.disabled = !joined || !hasProvider;
  els.seekRange.disabled = !joined || !hasProvider;
}

function updateControlsEnabled(enabled) {
  const disabled = !joined || !enabled;
  els.playButton.disabled = disabled;
  els.backButton.disabled = disabled;
  els.forwardButton.disabled = disabled;
  els.rateSelect.disabled = disabled;
  els.seekRange.disabled = disabled;
}

function expectedPosition(state = playback) {
  if (!state?.mediaId) return 0;
  if (state.paused) return Math.max(0, state.anchorSeconds || 0);
  const nowServer = Date.now() + serverOffsetMs;
  const elapsed = Math.max(0, nowServer - state.anchorServerMs) / 1000;
  return Math.max(0, (state.anchorSeconds || 0) + elapsed * (state.playbackRate || 1));
}

function actualOrExpectedPosition() {
  const current = youtube.getCurrentTime();
  if (current > 0 || expectedPosition() < 1) return current;
  return expectedPosition();
}

function sendPlayback(action, extra = {}) {
  if (!joined) return toast(t('toastJoinFirst'));
  if (action !== 'load' && !playback?.mediaId) return;

  const command = {
    action,
    actionId: crypto.randomUUID(),
    ...extra,
  };
  if (action !== 'load' && !Number.isFinite(command.position)) {
    command.position = actualOrExpectedPosition();
  }

  socket.emit('playback:command', command, (response) => {
    if (!response?.ok) toast(response?.error || t('toastCommandFailed'));
  });
}

function parseMediaInput(raw) {
  const value = raw.trim();
  if (!value) throw new Error(t('toastPasteLink'));

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(t('toastInvalidLink'));
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (host === 'youtu.be') {
    const mediaId = url.pathname.split('/').filter(Boolean)[0];
    if (!isYouTubeId(mediaId)) throw new Error(t('toastYoutubeMissingId'));
    return { provider: 'youtube', mediaId, position: parseStartTime(url) };
  }

  const isYouTubeHost = host === 'youtube.com' || host.endsWith('.youtube.com');
  const isYouTubeNoCookieHost = host === 'youtube-nocookie.com' || host.endsWith('.youtube-nocookie.com');
  if (isYouTubeHost || isYouTubeNoCookieHost) {
    const parts = url.pathname.split('/').filter(Boolean);
    let mediaId = url.searchParams.get('v');
    if (!mediaId && ['shorts', 'embed', 'live'].includes(parts[0])) mediaId = parts[1];
    if (!isYouTubeId(mediaId)) throw new Error(t('toastYoutubeMissingId'));
    return { provider: 'youtube', mediaId, position: parseStartTime(url) };
  }

  throw new Error(t('toastUnsupportedProvider'));
}

function isYouTubeId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{11}$/.test(value);
}

function parseStartTime(url) {
  const raw = url.searchParams.get('t') || url.searchParams.get('start') || '0';
  return parseTimeValue(raw);
}

function parseTimeValue(raw) {
  if (typeof raw === 'number') return Math.max(0, raw);
  const text = String(raw || '').trim().toLowerCase();
  if (!text) return 0;
  if (/^\d+(\.\d+)?$/.test(text)) return Math.max(0, Number(text));
  if (/^\d{1,3}:\d{1,2}(?::\d{1,2})?$/.test(text)) {
    const parts = text.split(':').map(Number);
    return parts.reduce((sum, part) => sum * 60 + part, 0);
  }
  const h = Number(text.match(/(\d+)h/)?.[1] || 0);
  const m = Number(text.match(/(\d+)m/)?.[1] || 0);
  const s = Number(text.match(/(\d+)s/)?.[1] || 0);
  const total = h * 3600 + m * 60 + s;
  if (total > 0) return total;
  throw new Error(t('toastInvalidTime'));
}

function formatTime(value) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

function renderMembers(members) {
  els.members.replaceChildren();
  els.memberCount.textContent = String(members.length);
  if (els.watcherCountMirror) els.watcherCountMirror.textContent = String(members.length);
  for (const member of members) {
    const chip = document.createElement('div');
    chip.className = 'member-chip';
    const avatar = document.createElement('span');
    avatar.className = 'member-avatar';
    avatar.textContent = (member.nickname || '?').slice(0, 1).toUpperCase();
    const name = document.createElement('span');
    name.textContent = member.nickname + (member.clientId === clientId ? t('youSuffix') : '');
    chip.append(avatar, name);
    els.members.append(chip);
  }
}

function renderMessageHistory(messages) {
  messageHistory = [];
  els.messages.replaceChildren();
  if (!messages.length) {
    const empty = document.createElement('div');
    empty.className = 'system-message';
    empty.textContent = t('chatEmpty');
    els.messages.append(empty);
    return;
  }
  for (const message of messages) appendMessage(message, false);
  els.messages.scrollTop = els.messages.scrollHeight;
}

function appendMessage(message, shouldScroll) {
  if (message) {
    messageHistory.push(message);
    if (messageHistory.length > 200) messageHistory = messageHistory.slice(-200);
  }
  els.messages.querySelector('.system-message')?.remove();
  const item = document.createElement('div');
  item.className = 'message';
  const meta = document.createElement('span');
  meta.className = 'message-meta';
  const time = document.createElement('span');
  time.className = 'message-time';
  time.textContent = new Date(message.serverTime || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const name = document.createElement('span');
  name.className = 'message-name';
  name.textContent = `<${message.nickname || 'Guest'}>`;
  const body = document.createElement('span');
  body.className = 'message-body';
  body.textContent = message.body || '';
  meta.append(time, name);
  item.append(meta, body);
  els.messages.append(item);
  if (shouldScroll) els.messages.scrollTop = els.messages.scrollHeight;
}


async function warmMediaMetadata(state = playback) {
  if (state?.provider !== 'youtube' || !state.mediaId) return null;
  const cacheKey = `${state.provider}:${state.mediaId}`;
  if (mediaMetadataCache.has(cacheKey)) return mediaMetadataCache.get(cacheKey);

  const title = youtube.getVideoTitle?.() || state.mediaId;

  const meta = { provider: state.provider, mediaId: state.mediaId, title };
  mediaMetadataCache.set(cacheKey, meta);
  return meta;
}

function sanitizeFilenamePart(value, fallback = 'untitled') {
  const cleaned = String(value || '')
    .replace(/[\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+$/, '');
  return (cleaned || fallback).slice(0, 80);
}

function formatTimestampForFilename(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}-${String(m).padStart(2, '0')}-${String(s).padStart(2, '0')}`;
}

function hashColor(text) {
  let hash = 0;
  for (const ch of String(text || '')) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  const palette = ['#008000', '#0000CC', '#990099', '#CC0000', '#008080', '#A05A00'];
  return palette[Math.abs(hash) % palette.length];
}

function wrapCanvasText(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !line) line = test;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function drawWindowShell(ctx, x, y, width, height, title) {
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, width - 1, 1);
  ctx.fillRect(x, y, 1, height - 1);
  ctx.fillStyle = '#404040';
  ctx.fillRect(x + width - 1, y, 1, height);
  ctx.fillRect(x, y + height - 1, width, 1);
  ctx.fillStyle = '#808080';
  ctx.fillRect(x + width - 2, y + 1, 1, height - 1);
  ctx.fillRect(x + 1, y + height - 2, width - 1, 1);

  ctx.fillStyle = '#000080';
  ctx.fillRect(x + 3, y + 3, width - 6, 18);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 11px ${CAPTURE_FONT_FAMILY}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(title, x + 10, y + 12);

  const bx = x + width - 17;
  for (let i = 0; i < 3; i += 1) {
    const ox = bx - i * 16;
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(ox, y + 5, 14, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ox, y + 5, 13, 1);
    ctx.fillRect(ox, y + 5, 1, 11);
    ctx.fillStyle = '#404040';
    ctx.fillRect(ox + 13, y + 5, 1, 12);
    ctx.fillRect(ox, y + 16, 14, 1);
  }

  return { x: x + 6, y: y + 24, width: width - 12, height: height - 30 };
}

function fitRect(srcW, srcH, dstW, dstH) {
  const scale = Math.min(dstW / srcW, dstH / srcH);
  const width = srcW * scale;
  const height = srcH * scale;
  return { x: (dstW - width) / 2, y: (dstH - height) / 2, width, height };
}

async function captureVideoSurfaceCanvas() {
  const target = els.youtubeSurface;
  if (playback?.provider !== 'youtube' || !playback.mediaId) throw new Error(t('toastCaptureNeedVideo'));
  if (!navigator.mediaDevices?.getDisplayMedia) throw new Error(t('toastCaptureFailed'));

  toast(t('toastCapturePickTab'));
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: 'browser', preferCurrentTab: true, selfBrowserSurface: 'include' },
    audio: false,
  });

  try {
    const track = stream.getVideoTracks()[0];
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    await new Promise((resolve) => setTimeout(resolve, 180));

    const rect = target.getBoundingClientRect();
    const scaleX = video.videoWidth / window.innerWidth;
    const scaleY = video.videoHeight / window.innerHeight;
    const sx = Math.max(0, Math.floor(rect.left * scaleX));
    const sy = Math.max(0, Math.floor(rect.top * scaleY));
    const sw = Math.max(1, Math.min(video.videoWidth - sx, Math.round(rect.width * scaleX)));
    const sh = Math.max(1, Math.min(video.videoHeight - sy, Math.round(rect.height * scaleY)));

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    video.pause();
    video.srcObject = null;
    return canvas;
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

function buildChatCaptureCanvas(messages, roomCode) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const inner = drawWindowShell(ctx, 0, 0, 256, 1024, `${config.oldWeb?.chatBrand || 'Dial-Up Lounge'} - Chat Log`);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(inner.x, inner.y, inner.width, inner.height);

  ctx.fillStyle = '#efefef';
  ctx.fillRect(inner.x, inner.y, inner.width, 38);
  ctx.fillStyle = '#0022aa';
  ctx.font = `bold 12px ${CAPTURE_FONT_FAMILY}`;
  ctx.fillText(config.oldWeb?.chatBrand || 'Dial-Up Lounge', inner.x + 8, inner.y + 14);
  ctx.fillStyle = '#990000';
  ctx.font = `11px ${CAPTURE_FONT_FAMILY}`;
  ctx.fillText(config.oldWeb?.chatTagline || 'THE CHAT SPOT!', inner.x + 8, inner.y + 28);

  ctx.fillStyle = '#000000';
  ctx.font = `11px ${CAPTURE_FONT_FAMILY}`;
  ctx.fillText(`Room: ${roomCode}`, inner.x + 8, inner.y + 52);
  ctx.fillText('Recent chat (15)', inner.x + 8, inner.y + 66);

  const messageTop = inner.y + 76;
  const messageBottom = inner.y + inner.height - 28;
  let y = messageTop;
  const usableWidth = inner.width - 12;

  ctx.save();
  ctx.beginPath();
  ctx.rect(inner.x + 4, messageTop - 4, inner.width - 8, messageBottom - messageTop + 8);
  ctx.clip();

  const recent = messages.slice(-15);
  for (const message of recent) {
    const time = new Date(message.serverTime || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const name = `<${message.nickname || 'Guest'}>`;
    ctx.font = `11px ${CAPTURE_FONT_FAMILY}`;
    ctx.fillStyle = '#666666';
    ctx.fillText(time, inner.x + 8, y);
    y += 14;
    ctx.fillStyle = hashColor(message.nickname || 'Guest');
    ctx.fillText(name, inner.x + 8, y);
    y += 14;
    ctx.fillStyle = '#000000';
    for (const line of wrapCanvasText(ctx, message.body || '', usableWidth - 8)) {
      ctx.fillText(line, inner.x + 12, y);
      y += 13;
      if (y > messageBottom) break;
    }
    y += 8;
    if (y > messageBottom) break;
  }
  ctx.restore();

  ctx.fillStyle = '#efefef';
  ctx.fillRect(inner.x + 4, canvas.height - 62, inner.width - 8, 22);
  ctx.strokeStyle = '#808080';
  ctx.strokeRect(inner.x + 4.5, canvas.height - 61.5, inner.width - 9, 21);
  ctx.fillStyle = '#777777';
  ctx.fillRect(inner.x + inner.width - 54, canvas.height - 36, 44, 20);
  ctx.fillStyle = '#000000';
  ctx.font = `11px ${CAPTURE_FONT_FAMILY}`;
  ctx.fillText('Send', inner.x + inner.width - 44, canvas.height - 22);
  return canvas;
}

function buildCombinedCapture(frameCanvas, chatCanvas, title, seconds) {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#008080';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const left = drawWindowShell(ctx, 0, 0, 1024, 1024, `${config.oldWeb?.mediaBrand || 'PixelStream 99'} - ${title}`);
  ctx.fillStyle = '#000000';
  ctx.fillRect(left.x, left.y, left.width, left.height);
  const fitted = fitRect(frameCanvas.width, frameCanvas.height, left.width, left.height - 28);
  ctx.drawImage(frameCanvas, left.x + fitted.x, left.y + fitted.y, fitted.width, fitted.height);
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(left.x, 1024 - 26, left.width, 18);
  ctx.fillStyle = '#000000';
  ctx.font = `11px ${CAPTURE_FONT_FAMILY}`;
  ctx.fillText(`stream98 capture  |  ${title}`, left.x + 6, 1024 - 14);
  ctx.fillText(`timestamp ${formatTime(seconds)}  |  ${playback?.mediaId || ''}`, left.x + 500, 1024 - 14);

  ctx.drawImage(chatCanvas, 1024, 0);
  return canvas;
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('blob-failed')), 'image/png');
  });
}

async function downloadStream98Capture() {
  if (!playback?.mediaId) throw new Error(t('toastCaptureNeedVideo'));
  toast(t('toastCapturePreparing'));
  const frameCanvas = await captureVideoSurfaceCanvas();
  const meta = await warmMediaMetadata(playback) || { title: playback.mediaId, mediaId: playback.mediaId };
  const seconds = actualOrExpectedPosition();
  const chatCanvas = buildChatCaptureCanvas(messageHistory, roomId);
  const combined = buildCombinedCapture(frameCanvas, chatCanvas, meta.title || playback.mediaId, seconds);
  const filename = `stream98_${sanitizeFilenamePart(meta.title || playback.mediaId)}_${formatTimestampForFilename(seconds)}_${sanitizeFilenamePart(playback.mediaId, 'video')}.png`;
  const blob = await canvasToBlob(combined);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast(t('toastCaptureReady'));
}

function enableChat(enabled) {
  els.chatInput.disabled = !enabled;
  els.sendButton.disabled = !enabled;
}

async function measureClockOffset() {
  if (!socket.connected || !joined) return;
  const t0 = Date.now();
  socket.emit('time:ping', { clientTime: t0 }, (payload) => {
    const t1 = Date.now();
    if (!payload?.serverTime) return;
    const estimate = payload.serverTime - (t0 + t1) / 2;
    serverOffsetMs = serverOffsetMs * 0.65 + estimate * 0.35;
  });
}

function toast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add('show');
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2600);
}

els.joinForm.addEventListener('submit', (event) => {
  event.preventDefault();
  joinRoom(els.nicknameInput.value);
});

els.copyInviteButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    toast(t('toastInviteCopied'));
  } catch {
    toast(t('toastCopyFailed'));
  }
});

els.loadButton.addEventListener('click', () => {
  try {
    const media = parseMediaInput(els.sourceInput.value);
    sendPlayback('load', media);
  } catch (error) {
    toast(error.message);
  }
});

els.sourceInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') els.loadButton.click();
});

els.playButton.addEventListener('click', () => {
  const position = actualOrExpectedPosition();
  sendPlayback(playback?.paused ? 'play' : 'pause', { position });
});

els.backButton.addEventListener('click', () => {
  sendPlayback('seek', { position: Math.max(0, actualOrExpectedPosition() - 10) });
});

els.forwardButton.addEventListener('click', () => {
  sendPlayback('seek', { position: actualOrExpectedPosition() + 10 });
});

els.seekRange.addEventListener('pointerdown', () => { draggingSeek = true; });
els.seekRange.addEventListener('input', () => {
  if (draggingSeek) els.currentTime.textContent = formatTime(Number(els.seekRange.value));
});
els.seekRange.addEventListener('change', () => {
  const position = Number(els.seekRange.value);
  draggingSeek = false;
  sendPlayback('seek', { position });
});
els.seekRange.addEventListener('pointercancel', () => { draggingSeek = false; });

els.rateSelect.addEventListener('change', () => {
  sendPlayback('rate', { rate: Number(els.rateSelect.value), position: actualOrExpectedPosition() });
});

els.fullscreenButton.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await els.playerStage.requestFullscreen();
  } catch {
    toast(t('toastFullscreenFailed'));
  }
});

els.chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const body = els.chatInput.value.trim();
  if (!body || !joined) return;
  socket.emit('chat:send', { body }, (response) => {
    if (!response?.ok) toast(response?.error || t('toastSendFailed'));
  });
  els.chatInput.value = '';
});

els.chatInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    els.chatForm.requestSubmit();
  }
});

window.addEventListener('wt:desktop-action', async (event) => {
  if (event.detail?.action !== 'capture-stream98') return;
  try {
    await downloadStream98Capture();
  } catch (error) {
    if (error?.name === 'NotAllowedError' || error?.name === 'AbortError') toast(t('toastCaptureCanceled'));
    else toast(error?.message || t('toastCaptureFailed'));
  }
});

function updateTaskbarClock() {
  els.taskbarClock.textContent = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

updateTaskbarClock();
setInterval(updateTaskbarClock, 1000);

setInterval(() => {
  if (!playback?.mediaId) return;
  const target = expectedPosition();
  let shown = target;
  let duration = 0;

  if (playback.provider === 'youtube') {
    const current = youtube.getCurrentTime();
    if (current > 0 || target < 1) shown = current;
    duration = youtube.getDuration();
    if (!draggingSeek && duration > 0) {
      els.seekRange.max = String(duration);
      els.seekRange.value = String(Math.min(duration, shown));
      els.durationTime.textContent = formatTime(duration);
    }
  }

  if (!draggingSeek) els.currentTime.textContent = formatTime(shown);
  updatePlayVisual(playback.paused);
}, 250);

setInterval(() => {
  if (playback?.provider !== 'youtube' || !playback.mediaId) return;
  youtube.correctDrift(expectedPosition(), playback.paused);
}, 2000);

setInterval(measureClockOffset, 15000);


$('#joinDialogClose')?.addEventListener('click', () => {
  if (els.joinDialog.open) els.joinDialog.close();
});

if (typeof els.joinDialog.showModal === 'function') {
  els.joinDialog.showModal();
} else {
  els.joinDialog.setAttribute('open', '');
}
