# Watch Together — Windows 98 / Retro Web 版

一个用于朋友同步观看 YouTube / Bilibili、实时聊天的个人项目。界面模拟 Windows 98 桌面：左侧是 90 年代在线视频站，右侧是独立聊天室网页。

## 启动

如果你已经有旧版的 `node_modules`，可以保留它并覆盖新版文件。否则：

```powershell
npm install
npm test
npm start
```

打开：

```text
http://localhost:3000
```

## 这版主要变化

- 中文改为 **文泉驿点阵宋体 12px**；英文改为 98.css 使用的 **Pixelated MS Sans Serif**。两种都直接作为设计好的点阵/像素字形使用，不再用 Canvas 把系统字体截图放大。
- 字体通过 `config.js` 中的 URL 加载，项目 ZIP **不内置字体文件**。
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
  fontFamily: '"WT MS Sans Pixel", "WT WQY Bitmap Song", sans-serif',
},
```

默认中文字体来源是 AmusementClub 的 WenQuanYi-Bitmap-Song-TTF 项目中的 12×12 TTF 转换版；英文来源是 98.css 仓库内的 Pixelated MS Sans Serif WOFF。

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

## Bilibili 扩展

扩展仍位于 `extension/`。Chrome/Edge → Extensions → Developer mode → Load unpacked → 选择 `extension` 文件夹。

## 测试

```powershell
npm test
npm run check
```

## 第三方来源

详见 `THIRD_PARTY_NOTICES.md`。
