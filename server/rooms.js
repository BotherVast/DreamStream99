import crypto from 'node:crypto';
import { createInitialPlayback } from './room-state.js';

export const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_RECENT_ACTION_IDS = 256;

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function createRoomRecord({ id, ownerToken, guestToken, now = Date.now() }) {
  return {
    id,
    ownerTokenHash: hashToken(ownerToken),
    guestTokenHash: hashToken(guestToken),
    permissions: {
      guestControl: false,
      guestChat: true,
    },
    playback: createInitialPlayback(),
    members: new Map(),
    messages: [],
    recentActionIds: new Map(),
    createdAt: now,
    lastActive: now,
    expiresAt: now + ROOM_TTL_MS,
  };
}

export function authenticateRoomToken(room, token) {
  if (!room || typeof token !== 'string' || token.length < 20 || token.length > 128) return null;
  const candidate = Buffer.from(hashToken(token), 'hex');
  const ownerHash = Buffer.from(room.ownerTokenHash, 'hex');
  const guestHash = Buffer.from(room.guestTokenHash, 'hex');
  if (crypto.timingSafeEqual(candidate, ownerHash)) return 'owner';
  if (crypto.timingSafeEqual(candidate, guestHash)) return 'guest';
  return null;
}

export function canControl(room, role) {
  return role === 'owner' || (role === 'guest' && room.permissions.guestControl);
}

export function canChat(room, role) {
  return role === 'owner' || (role === 'guest' && room.permissions.guestChat);
}

export function touchRoom(room, now = Date.now()) {
  room.lastActive = now;
  room.expiresAt = now + ROOM_TTL_MS;
}

export function getActionRevision(room, actionId) {
  return room.recentActionIds.get(actionId);
}

export function rememberAction(room, actionId, revision) {
  room.recentActionIds.set(actionId, revision);
  while (room.recentActionIds.size > MAX_RECENT_ACTION_IDS) {
    room.recentActionIds.delete(room.recentActionIds.keys().next().value);
  }
}
