export class BilibiliAdapter {
  constructor(frameElement) {
    this.frameElement = frameElement;
    this.lastSignature = '';
    this.mediaId = null;
    this.page = 1;
  }

  apply(playback, targetSeconds) {
    this.mediaId = playback.mediaId;
    this.page = playback.page || 1;

    const signature = [
      playback.revision,
      playback.mediaId,
      playback.page,
      playback.paused ? 'paused' : 'playing',
      Math.floor(targetSeconds),
    ].join(':');
    if (signature === this.lastSignature) return;
    this.lastSignature = signature;

    const params = new URLSearchParams({
      bvid: playback.mediaId,
      p: String(playback.page || 1),
      t: String(Math.max(0, Math.floor(targetSeconds))),
      autoplay: playback.paused ? '0' : '1',
      danmaku: '1',
      high_quality: '1',
    });
    this.frameElement.src = `https://player.bilibili.com/player.html?${params.toString()}`;
  }

  externalUrl(position = 0) {
    if (!this.mediaId) return 'https://www.bilibili.com/';
    const params = new URLSearchParams({ p: String(this.page || 1), t: String(Math.max(0, Math.floor(position))) });
    return `https://www.bilibili.com/video/${this.mediaId}/?${params.toString()}`;
  }
}
