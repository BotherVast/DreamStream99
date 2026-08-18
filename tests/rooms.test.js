import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_RECENT_ACTION_IDS,
  ROOM_TTL_MS,
  authenticateRoomToken,
  canChat,
  canControl,
  createRoomRecord,
  getActionRevision,
  rememberAction,
  touchRoom,
} from '../server/rooms.js';

function roomFixture() {
  return createRoomRecord({
    id: 'ABCD23',
    ownerToken: 'owner-token-with-enough-entropy',
    guestToken: 'guest-token-with-enough-entropy',
    now: 1000,
  });
}

test('room records store token hashes and authenticate roles', () => {
  const room = roomFixture();
  assert.equal('ownerToken' in room, false);
  assert.equal('guestToken' in room, false);
  assert.equal(authenticateRoomToken(room, 'owner-token-with-enough-entropy'), 'owner');
  assert.equal(authenticateRoomToken(room, 'guest-token-with-enough-entropy'), 'guest');
  assert.equal(authenticateRoomToken(room, 'wrong-token-with-enough-entropy'), null);
});

test('guest permissions default to chat-only and can be changed', () => {
  const room = roomFixture();
  assert.equal(canControl(room, 'owner'), true);
  assert.equal(canControl(room, 'guest'), false);
  assert.equal(canChat(room, 'guest'), true);
  room.permissions.guestControl = true;
  room.permissions.guestChat = false;
  assert.equal(canControl(room, 'guest'), true);
  assert.equal(canChat(room, 'guest'), false);
});

test('recent action ids are capped and preserve revision lookup', () => {
  const room = roomFixture();
  for (let index = 0; index <= MAX_RECENT_ACTION_IDS; index += 1) {
    rememberAction(room, `action-${index}`, index);
  }
  assert.equal(room.recentActionIds.size, MAX_RECENT_ACTION_IDS);
  assert.equal(getActionRevision(room, 'action-0'), undefined);
  assert.equal(getActionRevision(room, `action-${MAX_RECENT_ACTION_IDS}`), MAX_RECENT_ACTION_IDS);
});

test('touching a room advances its sliding expiration', () => {
  const room = roomFixture();
  touchRoom(room, 5000);
  assert.equal(room.lastActive, 5000);
  assert.equal(room.expiresAt, 5000 + ROOM_TTL_MS);
});
