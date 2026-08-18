# Watch Together — Windows 98 / Retro Web 版

一个用于朋友同步观看 YouTube、实时聊天的个人项目。界面模拟 Windows 98 桌面：左侧是 90 年代在线视频站，右侧是独立聊天室网页。

## 本地启动

环境要求：Node.js 20 或更高版本（推荐 Node 20 LTS），以及随 Node 安装的 npm。项目不需要数据库，也没有必须配置的 API Key 或 `.env` 文件。

macOS / Linux 使用 nvm 时，先切换到仓库推荐的 Node 版本：

```bash
nvm install
nvm use
```

安装锁文件中的依赖、执行完整校验并启动：

```bash
npm ci
npm run verify
npm start
```

浏览器打开 <http://localhost:3000>。服务健康检查地址是 <http://localhost:3000/healthz>。

开发时可以使用自动重启模式：

```bash
npm run dev
```

如果 3000 端口被占用，macOS / Linux 可改用：

```bash
PORT=3001 npm start
```

Windows PowerShell 对应写法：

```powershell
$env:PORT=3001; npm start
```

此时请打开 <http://localhost:3001>。界面字体已随项目在本地提供；只有使用 YouTube 播放器时，浏览器才需要访问 YouTube。本地页面、房间同步和聊天服务本身不需要第三方账号。

## 这版主要变化

- 中文改为 **文泉驿点阵宋体 12px**；英文改为 98.css 使用的 **Pixelated MS Sans Serif**。两种都直接作为设计好的点阵/像素字形使用，不再用 Canvas 把系统字体截图放大。
- 字体通过 `config.js` 中的本地 URL 加载，不依赖 CDN。
- 4K / 高 DPI 使用整数倍“虚拟桌面”缩放。`auto` 会结合 `devicePixelRatio` 判断 4K；也可在 `config.js` 强制 `uiScale: 2`。
- 两个浏览器窗口都可以拖动、从八个边/角改变大小。
- 最小化、最大化/还原、关闭按钮都有实际作用；双击标题栏也可最大化/还原。
- 任务栏按钮可以切换/恢复窗口；关闭后可双击桌面的“我的媒体”或“聊天室”图标重新打开。
- 窗口位置、尺寸和桌面图标位置会保存到浏览器。
- IE 工具栏按钮改为从 Windows 98 / IE 历史界面截图提取的小尺寸图像；桌面/系统图标优先引用 Win98 图标档案。
- Logo、网页页眉背景、正文背景、桌面壁纸、工具栏图标等新增独立的 `public/assets-config.js` 快捷覆盖文件。详见 `ASSET_GUIDE.md`。

## 字体设置

`public/config.js`：

```js
fonts: {
  latinRegularUrl: '...',
  latinBoldUrl: '...',
  cjkUrl: '...',
},

theme: {
  fontFamily: 'Tahoma, "Segoe UI", "PingFang SC", "Microsoft YaHei", Arial, sans-serif',
  displayFontFamily: '"WT MS Sans Pixel", "WT WQY Bitmap Song", Tahoma, sans-serif',
},
```

默认 UI 和正文使用系统清晰字体；Pixelated MS Sans Serif 仅用于 Logo、大标题等复古展示文字，文泉驿点阵宋体作为展示字体的中文回退。这样在普通 1× 屏幕上也能读清小字号文字。字体文件位于 `public/assets/fonts/`，来源与许可证见 `THIRD_PARTY_NOTICES.md`。

## 4K

默认：

```js
display: {
  uiScale: 'auto',
}
```

在全屏 4K、即使 Windows 设置 150% 或 200% 缩放时，会依据 CSS 视口 × `devicePixelRatio` 判断并切到 2×。如果自动判断与你的浏览器窗口大小不合适，直接改成：

```js
uiScale: 2,
```

## 窗口操作

- 拖标题栏：移动。
- 拖窗口四边/四角：改变大小。
- `_`：最小化。
- `□`：最大化；最大化后同一按钮变为还原。
- `×`：关闭。
- 双击标题栏：最大化/还原。
- 点击任务栏按钮：激活窗口；再次点击当前活动窗口可最小化。

重置窗口和桌面图标布局：

```text
http://localhost:3000/?resetLayout=1
```

## 美术/文案配置

- 文案：`public/config.js` 的 `copy` / `oldWeb`
- 图片快捷覆盖：`public/assets-config.js`
- 图片默认值 / 桌面图标：`public/config.js` 的 `assets` / `desktopIcons`
- 自己的图片建议放：`public/assets/custom/`
- 详细说明：`ASSET_GUIDE.md`

## 测试

```powershell
npm test
npm run check
```

## 第三方来源

详见 `THIRD_PARTY_NOTICES.md`。
