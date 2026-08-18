import assert from 'node:assert/strict';
import test from 'node:test';
import { DemoRoomClient, SocketIoRoomClient, createRoomClient } from '../public/js/room-client.js';

test('createRoomClient defaults to the static demo transport', () => {
  assert.ok(createRoomClient() instanceof DemoRoomClient);
  assert.ok(createRoomClient({ mode: 'socketio' }) instanceof SocketIoRoomClient);
});

test('demo client joins with simulated members and messages', async () => {
  const client = new DemoRoomClient();
  const result = await client.join({ roomId: 'DEMO99', nickname: 'Tester' });

  assert.equal(result.ok, true);
  assert.equal(result.role, 'owner');
  assert.equal(result.snapshot.roomId, 'DEMO99');
  assert.equal(result.snapshot.members.at(-1).nickname, 'Tester');
  assert.ok(result.snapshot.messages.length >= 3);
});

test('demo playback and chat commands emit UI-compatible events', async () => {
  const client = new DemoRoomClient();
  await client.join({ roomId: 'DEMO99', nickname: 'Tester' });

  let playbackEvent;
  let chatEvent;
  client.onPlayback((payload) => { playbackEvent = payload; });
  client.onChat((payload) => { chatEvent = payload; });

  const playbackResult = await client.sendPlayback({
    action: 'load',
    actionId: 'test-action',
    videoId: 'dQw4w9WgXcQ',
    position: 12,
  });
  const chatResult = await client.sendChat({ body: 'hello from pages' });

  assert.equal(playbackResult.ok, true);
  assert.equal(playbackEvent.playback.videoId, 'dQw4w9WgXcQ');
  assert.equal(playbackEvent.playback.anchorSeconds, 12);
  assert.equal(chatResult.ok, true);
  assert.equal(chatEvent.body, 'hello from pages');
});
