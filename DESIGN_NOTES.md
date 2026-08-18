# Design notes / references

这版把界面分成三层，避免“现代网站套 Win98 皮肤”的感觉：

1. **Windows 98 桌面 / IE 外壳**：标题栏、任务栏、地址栏、IE 工具栏、桌面图标、窗口拖动/缩放。
2. **1998–2000 网页本体**：三栏 Portal、蓝色下划线链接、88×31 badge、访客计数器、小字号页脚、独立聊天室。
3. **真实功能**：YouTube、房间同步、聊天。

## 主要参考

- 98.css — https://github.com/jdan/98.css
- 1j01/os-gui — https://github.com/1j01/os-gui
- Windows Icon Archive — https://github.com/limehawk/windows-icon-archive
- Windows 98 Module 2 — The Internet — https://www.tech2u.com.au/training/tech2u/win98_2/internet.html
- oldweb.today — https://github.com/oldweb-today/oldweb-today
- Windows 98 Web Edition — https://github.com/azayrahmad/win98-web
- Web Design Museum 1999 gallery — https://www.webdesignmuseum.org/gallery/year-1999

整体页面布局和站点品牌是原创的；参考资料用于研究年代特征、比例、密度和交互。

## 字体策略

不再使用 Canvas 截图/放大系统字体。

- UI / 正文：拉丁字符使用 98.css 仓库中的 Pixelated MS Sans Serif，中文回退到文泉驿点阵宋体，基础字号为 12px。
- Logo / 大标题：沿用同一本地点阵字体栈，通过字号和字重建立层级。
- 4K 时不是把字体单独改成一个随意的大字号，而是把整个逻辑 Win98 桌面按 2× 整数比例显示，从而保持控件、像素图标和字体之间的比例。

## HiDPI

`public/js/desktop.js` 建立一个逻辑分辨率桌面。自动模式同时参考：

- `window.innerWidth / innerHeight`（CSS 像素）
- `devicePixelRatio`
- 估算的物理像素视口

这样 3840×2160 屏幕在 Windows 150% / 200% 缩放时不会因为 CSS 视口变小而误判成普通 1080p。

## Window manager

两个主浏览器窗口都是同一个轻量窗口管理器管理的真实 DOM 窗口：

- title bar drag
- 八方向 resize
- focus / z-index
- minimize
- maximize / restore
- close / reopen
- taskbar integration
- localStorage layout persistence

行为参考了 os-gui 一类 Win9x Web GUI 项目，但窗口管理代码是本项目自己的实现。

## 图像素材策略

- IE 工具栏小图：来自 Windows 98 / IE 历史界面截图的小尺寸裁切，用于个人复刻。
- Win98 系统图标：优先通过 Windows icon archives 的外部 URL 引用，并保留本地 fallback。
- 历史 GeoCities / 88×31 图像版权来源很杂，因此没有批量打包第三方旧网页素材。
- 用户自己的 Logo、GIF、背景统一放到 `public/assets/custom/`，路径集中在 `public/config.js`。
