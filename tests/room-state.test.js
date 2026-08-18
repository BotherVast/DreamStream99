import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPlaybackCommand,
  createInitialPlayback,
  expectedPosition,
  normalizeChat,
  normalizeNickname,
} from '../server/room-state.js';

test('expectedPosition advances from the server anchor while playing', () => {
  const state = {
    ...createInitialPlayback(),
    provider: 'youtube',
    mediaId: 'M7lc1UVf-VE',
    paused: false,
    anchorSeconds: 10,
    anchorServerMs: 1000,
    playbackRate: 1.5,
  };
  assert.equal(expectedPosition(state, 3000), 13);
});

test('load initializes media and increments revision', () => {
  const next = applyPlaybackCommand(createInitialPlayback(), {
    action: 'load',
    provider: 'youtube',
    mediaId: 'M7lc1UVf-VE',
    position: 12,
    actionId: 'a1',
  }, { nickname: 'Alice' }, 5000);
  assert.equal(next.revision, 1);
  assert.equal(next.provider, 'youtube');
  assert.equal(next.mediaId, 'M7lc1UVf-VE');
  assert.equal(next.anchorSeconds, 12);
  assert.equal(next.paused, true);
  assert.equal(next.changedBy, 'Alice');
});

test('last accepted command gets a higher revision', () => {
  let state = applyPlaybackCommand(createInitialPlayback(), {
    action: 'load', provider: 'youtube', mediaId: 'M7lc1UVf-VE'
  }, { nickname: 'Alice' }, 1000);
  state = applyPlaybackCommand(state, { action: 'play', position: 20 }, { nickname: 'Alice' }, 2000);
  const later = applyPlaybackCommand(state, { action: 'pause', position: 20.2 }, { nickname: 'Bob' }, 2010);
  assert.equal(later.revision, 3);
  assert.equal(later.paused, true);
  assert.equal(later.changedBy, 'Bob');
});

test('seek clamps negative positions and preserves pause state', () => {
  let state = applyPlaybackCommand(createInitialPlayback(), {
    action: 'load', provider: 'youtube', mediaId: 'M7lc1UVf-VE'
  }, { nickname: 'Alice' }, 1000);
  const next = applyPlaybackCommand(state, { action: 'seek', position: -200 }, { nickname: 'Bob' }, 2000);
  assert.equal(next.anchorSeconds, 0);
  assert.equal(next.paused, true);
});

test('load rejects non-YouTube providers and malformed video ids', () => {
  assert.throws(() => applyPlaybackCommand(createInitialPlayback(), {
    action: 'load', provider: 'other', mediaId: 'BV1xx411c7mD'
  }, { nickname: 'Alice' }, 1000), /Unsupported provider/);

  assert.throws(() => applyPlaybackCommand(createInitialPlayback(), {
    action: 'load', provider: 'youtube', mediaId: 'too-short'
  }, { nickname: 'Alice' }, 1000), /Invalid media id/);
});

test('nickname and chat inputs are bounded and stripped of controls', () => {
  assert.equal(normalizeNickname('  Alice\u0000  '), 'Alice');
  assert.equal(normalizeChat('  hello\u0001 world  '), 'hello world');
  assert.ok(normalizeNickname('a'.repeat(100)).length <= 24);
  assert.ok(normalizeChat('b'.repeat(2000)).length <= 1000);
});
