# 素材替换指南

这版新增了专门的 **`public/assets-config.js`**。最常换的图片只改这个文件即可；`config.js` 仍保存默认值。通常不需要改 HTML 或 CSS。

## 最简单的用法

1. 把自己的 PNG / GIF / JPG 放到 `public/assets/custom/`。
2. 打开 `public/assets-config.js`。
3. 把对应的 `null` 改成 `/assets/custom/文件名`。
4. 保存并刷新网页。无需重新执行 `npm install`。

例如：

```js
const overrides = {
  desktopBackground: '/assets/custom/clouds.gif',
  site: {
    mediaHeaderLogo: '/assets/custom/dreamstream-logo.gif',
    mediaHeaderBackground: '/assets/custom/stars.gif',
    mediaPageBackground: '/assets/custom/paper.gif',
    chatHeaderLogo: '/assets/custom/chat-logo.gif',
    chatHeaderBackground: '/assets/custom/chat-header.gif',
    chatPageBackground: '/assets/custom/chat-tile.gif',
  },
};
```

## 常用键

| 配置键 | 用途 | 默认显示方式 |
|---|---|---|
| `assets.desktopBackground` | Windows 桌面壁纸 | 居中铺满（cover） |
| `assets.site.mediaHeaderLogo` | 左侧视频网站标题 Logo | 图片替代文字 Logo |
| `assets.site.mediaHeaderBackground` | 左侧网站页眉背景 | cover |
| `assets.site.mediaPageBackground` | 左侧网页正文背景 | 平铺 |
| `assets.site.chatHeaderLogo` | 右侧聊天室标题 Logo | 图片替代文字 Logo |
| `assets.site.chatHeaderBackground` | 右侧聊天室页眉背景 | cover |
| `assets.site.chatPageBackground` | 右侧网页正文背景 | 平铺 |
| `assets.browserToolbar.*` | IE 工具栏按钮图标 | 24×24 |
| `assets.siteIcons.*` | 网站导航小图标 | 16×16 |
| `desktopIcons[].icon` | 桌面图标 | 32×32 |
| `assets.startLogo` | Start 按钮 Windows 标志 | 原始像素尺寸 |

在 `assets-config.js` 中：`null` 表示沿用默认素材；`''` 表示主动清空。`mediaHeaderLogo` / `chatHeaderLogo` 清空后会自动回到文字 Logo。

## 90 年代网页图片建议

- Logo：透明 GIF/PNG，尽量不要直接做成超大高清图。
- 小按钮/Badge：88×31 很有年代感。
- 平铺背景：32×32、64×64、128×128 的小 GIF/PNG 更像当年的网页。
- 像素素材不要用浏览器把 17px 拉成 24px；尽量准备目标尺寸或整数倍，并保留 `image-rendering: pixelated`。

## 4K / UI 大小

在 `config.js`：

```js
display: {
  uiScale: 'auto',
}
```

`auto` 会结合 `devicePixelRatio` 识别 4K + Windows 125%/150%/200% 缩放。若你希望强制 Win98 界面放大一倍，直接写：

```js
uiScale: 2,
```

只建议使用整数 `1 / 2 / 3`，这样像素图和点阵字体的比例最稳定。

## 重置窗口/图标位置

如果把窗口拖乱了，访问一次：

```text
http://localhost:3000/?resetLayout=1
```

它只清除窗口和桌面图标位置，不会清掉昵称等其它设置。
