import assert from 'node:assert/strict';
import test from 'node:test';
import { createYouTubePlayerVars, getYouTubePosterSources, YouTubeAdapter } from '../public/js/youtube-adapter.js';

test('YouTube player vars disable the supported native controls', () => {
  assert.deepEqual(createYouTubePlayerVars('http://localhost:3000'), {
    autoplay: 0,
    controls: 0,
    disablekb: 1,
    fs: 0,
    iv_load_policy: 3,
    playsinline: 1,
    rel: 0,
    origin: 'http://localhost:3000',
  });
});

test('YouTube poster sources use an encoded video id and stable fallback', () => {
  assert.deepEqual(getYouTubePosterSources('M7lc1UVf-VE'), {
    primary: 'https://i.ytimg.com/vi/M7lc1UVf-VE/maxresdefault.jpg',
    fallback: 'https://i.ytimg.com/vi/M7lc1UVf-VE/hqdefault.jpg',
  });
});

test('player state changes drive the custom poster instead of native paused UI', () => {
  const originalWindow = globalThis.window;
  const presentations = [];
  let pauses = 0;
  try {
    globalThis.window = {
      YT: {
        PlayerState: {
          ENDED: 0,
          PLAYING: 1,
          PAUSED: 2,
          BUFFERING: 3,
          CUED: 5,
        },
      },
    };
    const adapter = new YouTubeAdapter({ replaceChildren() {} }, {
      onPresentationChange: ({ state }) => presentations.push(state),
      onPause: () => { pauses += 1; },
    });
    adapter.player = {
      getCurrentTime: () => 12,
      getDuration: () => 30,
    };
    adapter.videoId = 'M7lc1UVf-VE';

    adapter.handleStateChange({ data: window.YT.PlayerState.PAUSED });
    assert.equal(presentations.at(-1), 'paused');
    assert.equal(pauses, 1);

    adapter.shouldBePlaying = true;
    adapter.handleStateChange({ data: window.YT.PlayerState.BUFFERING });
    assert.equal(presentations.at(-1), 'loading');
    assert.equal(pauses, 1);

    adapter.handleStateChange({ data: window.YT.PlayerState.PLAYING });
    assert.equal(presentations.at(-1), 'playing');
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});
