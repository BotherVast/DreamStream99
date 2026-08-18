const MAX_POSITION_SECONDS = 60 * 60 * 24;
const ALLOWED_RATES = new Set([0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);

export function createInitialPlayback() {
  return {
    revision: 0,
    videoId: null,
    paused: true,
    anchorSeconds: 0,
    anchorServerMs: Date.now(),
    playbackRate: 1,
    changedBy: null,
    actionId: null,
  };
}

export function expectedPosition(state, nowMs = Date.now()) {
  if (!state || state.paused || !state.videoId) return state?.anchorSeconds ?? 0;
  const elapsed = Math.max(0, nowMs - state.anchorServerMs) / 1000;
  return clampPosition(state.anchorSeconds + elapsed * state.playbackRate);
}

export function clampPosition(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(MAX_POSITION_SECONDS, Math.max(0, number));
}

export function sanitizeRate(value) {
  const number = Number(value);
  return ALLOWED_RATES.has(number) ? number : 1;
}

export function applyPlaybackCommand(current, command, actor, nowMs = Date.now()) {
  if (!current) current = createInitialPlayback();

  const next = { ...current };
  const position = clampPosition(command.position ?? expectedPosition(current, nowMs));
  if (!isValidActionId(command.actionId)) throw new Error('Invalid action id');
  const actionId = command.actionId;

  switch (command.action) {
    case 'load': {
      if (!isValidVideoId(command.videoId)) {
        throw new Error('Invalid video id');
      }
      next.videoId = command.videoId;
      next.paused = true;
      next.anchorSeconds = clampPosition(command.position ?? 0);
      next.anchorServerMs = nowMs;
      next.playbackRate = 1;
      break;
    }
    case 'play':
      requireVideo(next);
      next.anchorSeconds = position;
      next.anchorServerMs = nowMs;
      next.paused = false;
      break;
    case 'pause':
      requireVideo(next);
      next.anchorSeconds = position;
      next.anchorServerMs = nowMs;
      next.paused = true;
      break;
    case 'end':
      requireVideo(next);
      next.anchorSeconds = position;
      next.anchorServerMs = nowMs;
      next.paused = true;
      break;
    case 'seek':
      requireVideo(next);
      next.anchorSeconds = position;
      next.anchorServerMs = nowMs;
      if (typeof command.paused === 'boolean') next.paused = command.paused;
      break;
    case 'rate':
      requireVideo(next);
      next.anchorSeconds = position;
      next.anchorServerMs = nowMs;
      next.playbackRate = sanitizeRate(command.rate);
      break;
    default:
      throw new Error('Unknown playback action');
  }

  next.revision = current.revision + 1;
  next.changedBy = actor?.nickname ?? 'Guest';
  next.actionId = actionId;
  return next;
}

export function isValidRoomId(value) {
  return typeof value === 'string' && /^[A-Z0-9]{4,12}$/.test(value);
}

export function normalizeNickname(value) {
  if (typeof value !== 'string') return 'Guest';
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 24);
  return cleaned || 'Guest';
}

export function normalizeChat(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, 1000);
}

function requireVideo(state) {
  if (!state.videoId) throw new Error('No video loaded');
}

function isValidVideoId(videoId) {
  return typeof videoId === 'string' && /^[A-Za-z0-9_-]{11}$/.test(videoId);
}

function isValidActionId(actionId) {
  return typeof actionId === 'string'
    && actionId.length <= 80
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actionId);
}
