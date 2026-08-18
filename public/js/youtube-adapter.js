let apiPromise = null;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === 'function') previousReady();
      resolve(window.YT);
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => reject(new Error('YouTube IFrame API 加载失败'));
    document.head.appendChild(script);
  });

  return apiPromise;
}

export class YouTubeAdapter {
  constructor(hostElement, callbacks = {}) {
    this.hostElement = hostElement;
    this.callbacks = callbacks;
    this.player = null;
    this.ready = false;
    this.mediaId = null;
    this.suppressUntil = 0;
    this.creationPromise = null;
  }

  async ensurePlayer() {
    if (this.player && this.ready) return this.player;
    if (this.creationPromise) return this.creationPromise;

    this.creationPromise = (async () => {
      const YT = await loadYouTubeApi();
      await new Promise((resolve, reject) => {
        this.player = new YT.Player(this.hostElement, {
          width: '100%',
          height: '100%',
          playerVars: {
            controls: 0,
            disablekb: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              this.ready = true;
              resolve();
            },
            onStateChange: (event) => this.handleStateChange(event),
            onPlaybackRateChange: () => this.handleRateChange(),
            onAutoplayBlocked: () => this.callbacks.onAutoplayBlocked?.(),
            onError: (event) => this.callbacks.onError?.(event.data),
          },
        });
        setTimeout(() => {
          if (!this.ready) reject(new Error('YouTube 播放器初始化超时'));
        }, 12000);
      });
      return this.player;
    })();

    return this.creationPromise;
  }

  isSuppressed() {
    return Date.now() < this.suppressUntil;
  }

  suppress(ms = 1100) {
    this.suppressUntil = Math.max(this.suppressUntil, Date.now() + ms);
  }

  handleStateChange(event) {
    if (this.isSuppressed() || !this.player) return;
    const YT = window.YT;
    if (event.data === YT.PlayerState.PLAYING) {
      this.callbacks.onPlay?.(this.getCurrentTime());
    } else if (event.data === YT.PlayerState.PAUSED) {
      this.callbacks.onPause?.(this.getCurrentTime());
    }
  }

  handleRateChange() {
    if (this.isSuppressed() || !this.player) return;
    this.callbacks.onRateChange?.(this.getPlaybackRate(), this.getCurrentTime());
  }

  async load(mediaId, position = 0) {
    await this.ensurePlayer();
    this.suppress(1400);
    this.mediaId = mediaId;
    this.player.cueVideoById({ videoId: mediaId, startSeconds: Math.max(0, position) });
  }

  async apply(playback, targetSeconds) {
    await this.ensurePlayer();
    this.suppress(1200);

    if (this.mediaId !== playback.mediaId) {
      await this.load(playback.mediaId, targetSeconds);
    } else {
      const drift = Math.abs(this.getCurrentTime() - targetSeconds);
      if (drift > (playback.paused ? 0.35 : 0.9)) {
        this.player.seekTo(Math.max(0, targetSeconds), true);
      }
    }

    const currentRate = this.getPlaybackRate();
    if (Math.abs(currentRate - playback.playbackRate) > 0.001) {
      this.player.setPlaybackRate(playback.playbackRate);
    }

    if (playback.paused) this.player.pauseVideo();
    else this.player.playVideo();
  }

  correctDrift(targetSeconds, paused) {
    if (!this.player || !this.ready || this.isSuppressed()) return;
    const drift = this.getCurrentTime() - targetSeconds;
    const threshold = paused ? 0.4 : 1.15;
    if (Math.abs(drift) > threshold) {
      this.suppress(700);
      this.player.seekTo(Math.max(0, targetSeconds), true);
    }
  }

  getCurrentTime() {
    const value = this.player?.getCurrentTime?.();
    return Number.isFinite(value) ? value : 0;
  }

  getDuration() {
    const value = this.player?.getDuration?.();
    return Number.isFinite(value) ? value : 0;
  }

  getPlaybackRate() {
    const value = this.player?.getPlaybackRate?.();
    return Number.isFinite(value) ? value : 1;
  }

  getVideoTitle() {
    const data = this.player?.getVideoData?.();
    return data?.title || '';
  }

  destroy() {
    this.player?.destroy?.();
    this.player = null;
    this.ready = false;
    this.mediaId = null;
    this.creationPromise = null;
  }
}
