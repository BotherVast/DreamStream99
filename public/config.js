/**
 * DreamStream 99 - 快速配置
 * -------------------------
 * 绝大多数会展示给用户看的文案、90 年代网站信息、桌面图标和基础配色都放在这里。
 * 修改后保存并刷新网页即可，无需重新编译。
 */
window.WT_CONFIG = {
  siteName: 'DreamStream 99',

  /**
   * 字体
   * - 英文 / 拉丁字符：98.css 的 Pixelated MS Sans Serif
   * - 中文：优先使用本机已授权的方正像素12，缺字或未安装时回退到文泉驿点阵宋体 12px
   * - UI、正文和标题统一使用 12px 点阵字体栈
   *
   * 字体默认从项目内加载，避免 CDN 不可用时退回系统字体并破坏布局。
   * 如需更换字体，请同步修改下面 URL 与 /css/fonts.css 中的字体声明。
   */
  fonts: {
    latinRegularUrl: '/assets/fonts/ms_sans_serif.woff',
    latinBoldUrl: '/assets/fonts/ms_sans_serif_bold.woff',
    // 取得 Web 嵌入授权后可填写方正像素12文件路径；留空时只尝试本机已安装字体。
    preferredCjkUrl: '',
    cjkUrl: '/assets/fonts/WenQuanYi-Bitmap-Song-12px.ttf',
  },

  theme: {
    desktop: '#008080',
    titleBar: '#000080',
    titleBarActive: '#000080',
    fontFamily: '"Pixelated MS Sans Serif", "FZ Pixel 12", "WenQuanYi Bitmap Song 12px", "Microsoft YaHei UI", "PingFang SC", "Noto Sans CJK SC", sans-serif',
    displayFontFamily: '"Pixelated MS Sans Serif", "FZ Pixel 12", "WenQuanYi Bitmap Song 12px", "Microsoft YaHei UI", "PingFang SC", "Noto Sans CJK SC", sans-serif',
  },

  /**
   * 4K / 高 DPI：只使用整数倍率缩放整个“虚拟桌面”。
   * auto：大视口自动 2×，普通屏幕 1×；也可以手动写 1 / 2 / 3。
   */
  display: {
    uiScale: 'auto',
    // auto 会同时看 CSS 视口和物理像素。4K + 150%/200% Windows 缩放也能识别。
    autoScale2MinViewportWidth: 1500,
    autoScale2MinViewportHeight: 820,
    autoScale2MinPhysicalWidth: 3200,
    autoScale2MinPhysicalHeight: 1800,
    rememberWindowLayout: true,
    rememberDesktopIcons: true,
  },

  /**
   * 所有容易替换的图片尽量集中在这里。
   * 值可以是项目内路径（推荐 /assets/custom/...）或 https:// URL。
   * 背景留空字符串 = 使用 CSS 默认样式。
   */
  assets: {
    desktopBackground: '',

    // Windows 98 原始系统图标档案（个人项目使用）。
    startLogo: 'https://win98icons.alexmeub.com/icons/png/windows-4.png',
    windowIcon: '/assets/win98/system/ie16.png',

    browserToolbar: {
      back: '/assets/win98/ie-toolbar/back.png',
      forward: '/assets/win98/ie-toolbar/forward.png',
      stop: '/assets/win98/ie-toolbar/stop.png',
      refresh: '/assets/win98/ie-toolbar/refresh.png',
      home: '/assets/win98/ie-toolbar/home.png',
      search: '/assets/win98/ie-toolbar/search.png',
      favorites: '/assets/win98/ie-toolbar/favorites.png',
      history: '/assets/win98/ie-toolbar/history.png',
      channels: '/assets/win98/ie-toolbar/channels.png',
      fullscreen: '/assets/win98/ie-toolbar/fullscreen.png',
      mail: '/assets/win98/ie-toolbar/mail.png',
    },

    site: {
      // 如果 mediaHeaderLogo / chatHeaderLogo 留空，就显示现在的文字 Logo。
      mediaHeaderLogo: '',
      chatHeaderLogo: '',
      mediaHeaderBackground: '',
      chatHeaderBackground: '',
      mediaPageBackground: '',
      chatPageBackground: '',

      badgeResolution: '/assets/retro/badge-resolution.png',
      badgeHtml: '/assets/retro/badge-html.png',
      badgeCool: '/assets/retro/badge-cool.png',
      badgeFriends: '/assets/retro/badge-friends.png',
      featuredIcon: 'https://win98icons.alexmeub.com/icons/png/computer_explorer-3.png',
      chatIcon: 'https://win98icons.alexmeub.com/icons/png/outlook_express-0.png',
    },

    siteIcons: {
      nowPlaying: '/assets/icons/play.png',
      rooms: 'https://win98icons.alexmeub.com/icons/png/network_normal_two_pcs-2.png',
      movies: '/assets/retro/cool.png',
      music: '/assets/retro/speaker.png',
      live: '/assets/retro/star.png',
      favorites: 'https://win98icons.alexmeub.com/icons/png/directory_favorites_small-2.png',
      directory: 'https://win98icons.alexmeub.com/icons/png/directory_open_file_mydocs_small-4.png',
      forum: '/assets/retro/guestbook.png',
      help: 'https://win98icons.alexmeub.com/icons/png/help_book_small-3.png',
    },
  },

  /**
   * 两个主窗口的初始尺寸只作为首次打开的默认值。
   * 真正位置会根据当前桌面尺寸按比例计算，并可拖动/缩放；刷新后记忆。
   */
  windows: {
    media: { minWidth: 500, minHeight: 430, widthRatio: 0.62 },
    chat: { minWidth: 300, minHeight: 390, widthRatio: 0.34 },
  },

  desktopIcons: [
    { id: 'media', label: '我的媒体', icon: 'https://win98icons.alexmeub.com/icons/png/computer_explorer-3.png', fallback: '/assets/retro/computer.png', x: 18, y: 18, openWindow: 'media' },
    { id: 'chat', label: '聊天室', icon: 'https://win98icons.alexmeub.com/icons/png/outlook_express-0.png', fallback: '/assets/retro/chat.png', x: 18, y: 96, openWindow: 'chat' },
    { id: 'guestbook', label: '留言簿', icon: '/assets/retro/guestbook.png', x: 18, y: 174 },
    { id: 'downloads', label: '下载', icon: '/assets/retro/download.png', x: 18, y: 252 },
    { id: 'links', label: '网络链接', icon: 'https://win98icons.alexmeub.com/icons/png/network_normal_two_pcs-2.png', fallback: '/assets/retro/globe.png', x: 18, y: 330 },
    { id: 'mail', label: '邮件', icon: 'https://win98icons.alexmeub.com/icons/png/outlook_express-0.png', fallback: '/assets/retro/mail.png', x: 18, y: 408 },
    { id: 'projects', label: 'Web 项目', icon: 'https://win98icons.alexmeub.com/icons/png/directory_open_file_mydocs_small-4.png', fallback: '/assets/retro/folder.png', x: 18, y: 486 },
    { id: 'capture', label: '截图工具', icon: 'https://win98icons.alexmeub.com/icons/png/camera-0.png', fallback: '/assets/retro/computer.png', x: 18, y: 564, action: 'capture-stream98' },
    { id: 'trash', label: '回收站', icon: 'https://win98icons.alexmeub.com/icons/png/recycle_bin_empty-2.png', fallback: '/assets/retro/recycle.png', x: 0, y: 0, anchor: 'bottom-right' },
  ],

  oldWeb: {
    mediaBrand: 'DreamStream 99',
    mediaTagline: 'WATCH TOGETHER · ANYWHERE ON THE WEB!',
    chatBrand: 'Dial-Up Lounge',
    chatTagline: 'THE CHAT SPOT!',
    copyright: '© 1998-1999 DreamStream 99. All rights reserved.',
    webmaster: 'webmaster@dreamstream99.local',
    lastUpdated: 'Last updated: Aug. 17, 1999',
    visitorNumber: '00487213',
    bestViewed: 'Best viewed at 800×600 · 16-bit color',
    browserHint: 'Internet Explorer 5.0 / Netscape Communicator 4.7',
  },

  copy: {
    // 两个“浏览器窗口”
    mediaTitle: 'DreamStream 99 - Watch Together! - Microsoft Internet Explorer',
    chatTitle: 'Dial-Up Lounge - The Chat Spot! - Microsoft Internet Explorer',
    menuFile: '文件',
    menuEdit: '编辑',
    menuView: '查看',
    menuFavorites: '收藏',
    menuTools: '工具',
    menuHelp: '帮助',
    addressLabel: '地址',
    go: '转到',
    links: '链接',

    // 左侧 90 年代视频站
    mediaNavHome: '首页',
    mediaNavWatch: '一起看',
    mediaNavChannels: '频道',
    mediaNavCommunity: '社区',
    mediaNavDownloads: '下载',
    mediaNavTop: '排行榜',
    mediaNavHelp: '帮助',
    siteNavigation: '站点导航',
    navNowPlaying: '正在播放',
    navWatchRooms: '观影房间',
    navMovies: '电影',
    navMusic: '音乐视频',
    navLive: '直播活动',
    navFavorites: '我的收藏',
    navRoomDirectory: '房间目录',
    navForum: '留言板',
    navFaq: '帮助与 FAQ',
    memberLogin: '会员登录',
    nicknameLabel: '昵称',
    nicknamePlaceholder: '昵称',
    fakePassword: '密码',
    rememberMe: '记住我',
    fakeLogin: '登录!',
    fakeJoin: '立即注册（免费!）',
    nowWatching: '★ NOW WATCHING TOGETHER! ★',
    currentRoom: '当前房间',
    roomLabel: '房间',
    watchingNow: '人正在房间中',
    copyInvite: '邀请朋友!',
    sourceLabel: '视频地址:',
    sourcePlaceholder: 'YouTube 视频地址',
    loadVideo: '打开',
    emptyTitle: 'NO VIDEO LOADED',
    emptyText: 'Paste a video URL below.',
    featuredDownload: 'FEATURED DOWNLOAD',
    featuredName: 'DreamStream Player 2.0',
    featuredCopy: 'Faster. Better. Totally Rad.',
    featuredLink: 'Download Now!',
    topFive: 'TOP 5 THIS WEEK',
    coolStuff: 'COOL STUFF',
    siteStats: 'SITE STATS',
    membersStat: 'Members:',
    roomsStat: 'Rooms Today:',
    videosStat: 'Videos Watched:',
    upNext: 'UP NEXT IN ROOM QUEUE',
    announcements: 'ANNOUNCEMENTS',
    statusDone: '完成',

    // 右侧 90 年代聊天室站
    chatLobby: '大厅',
    chatRooms: '房间',
    chatProfiles: '个人资料',
    chatSearch: '搜索',
    chatRules: '规则',
    chatTopicPrefix: '主题:',
    chatTopic: '今晚看什么？',
    membersTitle: '成员',
    chatWelcome: 'Welcome to Dial-Up Lounge! Be cool & have fun! :-)',
    chatPlaceholder: '输入消息…',
    send: '发送',
    chatEmpty: '*** 房间里还没有消息 ***',
    youSuffix: '（你）',
    onlineLegend: '在线',
    awayLegend: '离开',
    busyLegend: '忙碌',
    moreSmileys: '更多 »',
    changeRoom: '换房间',
    whosHere: '谁在线?',
    ignoreList: '忽略列表',
    myProfile: '我的资料',
    coolLinks: 'COOL LINKS',

    // Join / system
    joinTitle: '连接到观影房间',
    joinButton: '连接',
    taskStart: '开始',
    statusWaiting: '等待连接',
    statusJoining: '正在连接…',
    statusJoinFailed: '连接失败',
    statusOnline: '已连接',
    statusDemo: '演示模式',
    statusReconnecting: '重拨中…',
    youtubeLabel: 'YouTube',
    roleOwner: '房主',
    roleGuest: '访客',
    ownerSuffix: '［房主］',
    guestPermissions: '访客权限',
    allowGuestControl: '允许控制播放',
    allowGuestChat: '允许发送聊天',
    retryPlayer: '重试',
    unmuteAndSync: '📢 点击取消静音并同步',

    ariaPlay: '播放',
    ariaPause: '暂停',
    ariaBack: '后退 10 秒',
    ariaForward: '前进 10 秒',
    ariaFullscreen: '全屏',

    toastAutoplayMuted: '浏览器阻止了有声自动播放，已静音继续同步。',
    toastYoutubeError: 'YouTube 播放器错误：{code}',
    toastJoinFailed: '无法连接到房间。',
    toastRoomCreateFailed: '创建房间失败，请刷新页面重试。',
    toastSyncFailed: '播放器同步失败。',
    toastJoinFirst: '请先连接房间。',
    toastCommandFailed: '同步失败。',
    toastNoControl: '房主没有开放播放控制权限。',
    toastPermissionsFailed: '房间权限更新失败。',
    toastPasteLink: '请粘贴视频链接。',
    toastInvalidLink: '无法识别这个链接。',
    toastYoutubeMissingId: 'YouTube 链接缺少视频 ID。',
    toastUnsupportedLink: '仅支持 YouTube 视频地址。',
    toastInvalidTime: '无法识别时间。',
    toastInviteCopied: '邀请链接已复制。',
    toastCopyFailed: '复制失败。',
    toastCaptureNeedVideo: '请先载入视频，再使用截图工具。',
    toastCapturePickTab: '请在接下来的窗口中选择当前浏览器标签页。',
    toastCapturePreparing: '正在生成 stream98 截图…',
    toastCaptureReady: 'stream98 截图已生成并开始下载。',
    toastCaptureCanceled: '已取消截图。',
    toastCaptureFailed: '截图失败。请确认选择的是当前标签页。',
    toastFullscreenFailed: '无法进入全屏。',
    toastSendFailed: '发送失败。',
    demoModeButton: '演示模式',
    toastDemoMode: '当前为 GitHub Pages 演示模式：播放和聊天只保存在本页。',
  },
};
