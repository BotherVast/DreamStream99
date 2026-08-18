/**
 * 图片素材快捷覆盖
 * ------------------------------------------------------------
 * 这里专门放“你最可能经常换”的图片。
 * - null = 保持 config.js 中的默认素材
 * - '/assets/custom/xxx.gif' = 使用你自己的本地素材
 * - 'https://...' = 使用网络图片
 * - '' = 主动清空该素材（例如 Logo 回退为文字）
 *
 * 修改后保存、刷新即可，不需要重新编译。
 */
const overrides = {
  // 整个 Windows 98 桌面壁纸
  desktopBackground: null,

  // Start / IE 窗口图标
  startLogo: null,
  windowIcon: null,

  // IE 工具栏；默认已经是从历史 Win98/IE 界面截图裁出的本地小图。
  browserToolbar: {
    back: null,
    forward: null,
    stop: null,
    refresh: null,
    home: null,
    search: null,
    favorites: null,
    history: null,
    channels: null,
    fullscreen: null,
    mail: null,
  },

  site: {
    // 这两个 Logo 推荐 GIF/PNG。设好以后会自动隐藏文字 Logo。
    mediaHeaderLogo: null,
    chatHeaderLogo: null,

    // 页眉背景：cover
    mediaHeaderBackground: null,
    chatHeaderBackground: null,

    // 网页正文背景：repeat，适合 32/64/128px 的老式平铺图。
    mediaPageBackground: null,
    chatPageBackground: null,

    badgeResolution: null,
    badgeHtml: null,
    badgeCool: null,
    badgeFriends: null,
    featuredIcon: null,
    chatIcon: null,
  },

  siteIcons: {
    nowPlaying: null,
    rooms: null,
    movies: null,
    music: null,
    live: null,
    favorites: null,
    directory: null,
    forum: null,
    help: null,
  },
};

function mergeNonNull(target, source) {
  for (const [key, value] of Object.entries(source || {})) {
    if (value === null || value === undefined) continue;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) target[key] = {};
      mergeNonNull(target[key], value);
    } else {
      target[key] = value;
    }
  }
}

if (window.WT_CONFIG?.assets) mergeNonNull(window.WT_CONFIG.assets, overrides);
