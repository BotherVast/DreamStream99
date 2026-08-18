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
    videoId: 'M7lc1UVf-VE',
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
    videoId: 'M7lc1UVf-VE',
    position: 12,
    actionId: '00000000-0000-4000-8000-000000000001',
  }, { nickname: 'Alice' }, 5000);
  assert.equal(next.revision, 1);
  assert.equal(next.videoId, 'M7lc1UVf-VE');
  assert.deepEqual(Object.keys(next), [
    'revision', 'videoId', 'paused', 'anchorSeconds', 'anchorServerMs',
    'playbackRate', 'changedBy', 'actionId',
  ]);
  assert.equal(next.anchorSeconds, 12);
  assert.equal(next.paused, true);
  assert.equal(next.changedBy, 'Alice');
});

test('last accepted command gets a higher revision', () => {
  let state = applyPlaybackCommand(createInitialPlayback(), {
    action: 'load', videoId: 'M7lc1UVf-VE', actionId: '00000000-0000-4000-8000-000000000002'
  }, { nickname: 'Alice' }, 1000);
  state = applyPlaybackCommand(state, { action: 'play', position: 20, actionId: '00000000-0000-4000-8000-000000000003' }, { nickname: 'Alice' }, 2000);
  const later = applyPlaybackCommand(state, { action: 'pause', position: 20.2, actionId: '00000000-0000-4000-8000-000000000004' }, { nickname: 'Bob' }, 2010);
  assert.equal(later.revision, 3);
  assert.equal(later.paused, true);
  assert.equal(later.changedBy, 'Bob');
});

test('seek clamps negative positions and preserves pause state', () => {
  let state = applyPlaybackCommand(createInitialPlayback(), {
    action: 'load', videoId: 'M7lc1UVf-VE', actionId: '00000000-0000-4000-8000-000000000005'
  }, { nickname: 'Alice' }, 1000);
  const next = applyPlaybackCommand(state, { action: 'seek', position: -200, actionId: '00000000-0000-4000-8000-000000000006' }, { nickname: 'Bob' }, 2000);
  assert.equal(next.anchorSeconds, 0);
  assert.equal(next.paused, true);
});

test('load rejects malformed YouTube video ids and invalid action ids', () => {
  assert.throws(() => applyPlaybackCommand(createInitialPlayback(), {
    action: 'load', videoId: 'too-short', actionId: '00000000-0000-4000-8000-000000000007'
  }, { nickname: 'Alice' }, 1000), /Invalid video id/);

  assert.throws(() => applyPlaybackCommand(createInitialPlayback(), {
    action: 'load', videoId: 'M7lc1UVf-VE', actionId: 'not-a-uuid'
  }, { nickname: 'Alice' }, 1000), /Invalid action id/);
});

test('end anchors the final position and pauses the room', () => {
  const loaded = applyPlaybackCommand(createInitialPlayback(), {
    action: 'load', videoId: 'M7lc1UVf-VE', actionId: '00000000-0000-4000-8000-000000000008'
  }, { nickname: 'Alice' }, 1000);
  const ended = applyPlaybackCommand(loaded, {
    action: 'end', position: 128.4, actionId: '00000000-0000-4000-8000-000000000009'
  }, { nickname: 'Alice' }, 2000);
  assert.equal(ended.paused, true);
  assert.equal(ended.anchorSeconds, 128.4);
});

test('nickname and chat inputs are bounded and stripped of controls', () => {
  assert.equal(normalizeNickname('  Alice\u0000  '), 'Alice');
  assert.equal(normalizeChat('  hello\u0001 world  '), 'hello world');
  assert.ok(normalizeNickname('a'.repeat(100)).length <= 24);
  assert.ok(normalizeChat('b'.repeat(2000)).length <= 1000);
});
