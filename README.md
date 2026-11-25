# Fluent 2 Windows Native

[简体中文](#简体中文) | [English](#english)

---

## 简体中文

为 Obsidian 桌面端（Windows 11）提供零依赖的原生系统特性增强，是 [Fluent 2](https://community.obsidian.md/themes/fluent-2) 主题的官方配套插件。

### 核心功能

#### 1. Windows 11 原生窗口背景材质（Mica / Mica Alt / Acrylic）
- 直接调用 Electron 原生 `BrowserWindow.setBackgroundMaterial()` API，支持一键切换以下材质：
  - **Mica**：标准 Windows 11 云母材质，柔和采样桌面壁纸，硬件合成开销极低。
  - **Mica Alt（Tabbed）**：Windows 11 记事本与 Edge 同款层次云母，标签栏与内容区对比更分明。
  - **Acrylic**：实时毛玻璃亚克力材质。
  - **None**：关闭原生窗口材质。
- **支持独立设置窗口与弹出窗口**：监听 Obsidian `window-open` 与 Electron `browser-window-created` 事件，自动为 Obsidian 1.15+ 的独立「设置」窗口及弹出笔记窗口套用云母材质，并注入 `body.is-translucent` 与 `body.fluent2-popout-mica` 状态类。

#### 2. Windows 11 系统个性化 7 阶主题色实时同步
- **绕过 Chromium 限制**：Windows 下 Electron 渲染进程的纯 CSS 系统色 `AccentColor` 通常会回退为默认蓝。本插件直接通过只读 `reg.exe` 查询 `HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Accent` 中的 `AccentPalette`（32 字节 7 阶完整色板），并以 DWM `AccentColor` 与 Electron `systemPreferences.getAccentColor()` 作为逐级回退。
- **严格遵循 WinUI 3 浅色/深色对比规范**：
  - 浅色模式自动映射 `Dark1`（主色）、`Dark2`（悬停）、`Dark3`（按下）。
  - 深色模式自动映射 `Light2`（主色）、`Light3`（悬停）、`Light1`（按下）。
  - 自动依据相对亮度计算强调色上的高对比前景色（黑/白文字）。
- **全局与多窗口同步**：自动将 CSS 变量（`--f2-win-accent-*`、`--f2-win-on-accent-*`）及可选的 Obsidian 原生变量（`--accent-h`、`--accent-s`、`--accent-l`）同步至主窗口、弹出笔记窗口与独立设置窗口；支持切换回窗口自动检测、定时轮询与手动命令同步。

### 环境要求

- **操作系统**：Windows 11 22H2（Build 22621）及以上（非 Windows 平台下插件会自动休眠，不产生副作用）。
- **Obsidian 版本**：桌面端 `1.5.0` 及以上（需包含支持 `setBackgroundMaterial()` 的 Electron 25+ 内核）。
- **窗口边框设置**：建议在 **设置 → 界面 → 窗口边框样式**（Obsidian 1.13 及以上位于「界面」，旧版位于「外观」）保持 **隐藏（默认）**。
- **推荐主题**：搭配 [Fluent 2](https://community.obsidian.md/themes/fluent-2) 主题以获得完整的云母层级与 7 阶主题色联动效果。

### 安装方式

1. **通过社区插件市场安装（推荐）**：在 Obsidian 中进入 **设置 → 第三方插件 → 浏览**，搜索 **Fluent 2 Windows Native** 安装并启用。
2. **手动安装**：将本仓库克隆或下载到 Obsidian 库的 `.obsidian/plugins/fluent-windows-native/` 目录下（文件夹名需与 `manifest.json` 中的 `"id": "fluent-windows-native"` 一致）：
   ```bash
   git clone https://github.com/zyraxi21/fluent2-windows-native.git fluent-windows-native
   ```
   随后打开 **设置 → 第三方插件**，点击刷新图标并启用 **Fluent 2 Windows Native**。

### 使用方法与配置项

- **插件设置页**：
  - **运行状态与「立即同步」**：查看当前 Mica API 可用状态与系统主题色读取来源，支持一键立即刷新。
  - **Windows 11 窗口材质**：在 `Mica`、`Mica Alt / Tabbed`、`Acrylic` 与关闭之间自由切换。
  - **同步为弹窗与独立设置窗口启用云母材质**：控制是否将云母材质延伸至弹出窗口与 Obsidian 1.15+ 独立设置窗口。
  - **自动同步 Windows 11 系统个性化主题色**：开关系统色同步，开启后在设置页直接预览完整 7 阶色块。
  - **同时覆盖 Obsidian 原生强调色变量（`--accent-h/s/l`）**：让第三方插件及其他原生元素同步跟随 Windows 11 系统主题色。
  - **切换回窗口时自动检测** 与 **后台自动轮询间隔（秒）**：更换壁纸或系统主题色后自动刷新（设为 `0` 可关闭定时轮询）。
- **命令面板快捷命令**：
  - `Fluent 2 Windows Native: 立即同步 Windows 11 材质与系统主题色`
  - `Fluent 2 Windows Native: 切换窗口材质`（在 `Mica`、`Tabbed`、`Acrylic`、`None` 之间循环切换）

### 安全与隐私说明

本插件使用 Node.js `child_process.execFile("reg.exe", ["query", ...])` 对 Windows 用户注册表中的主题色键（`HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Accent\AccentPalette` 与 `HKCU\Software\Microsoft\Windows\DWM\AccentColor`）执行**只读查询**，所有参数均为硬编码静态字符串，不启动 Shell、不修改任何系统设置、不发起任何网络请求。

### 注入的 CSS 接口（供主题开发者参考）

- **类名**：`body.is-translucent`、`body.fluent2-popout-mica`（仅次级窗口）、`body.fluent2-win-accent-synced`。
- **CSS 变量**：`--f2-win-accent-light3`、`--f2-win-accent-light2`、`--f2-win-accent-light1`、`--f2-win-accent-base`、`--f2-win-accent-dark1`、`--f2-win-accent-dark2`、`--f2-win-accent-dark3`、`--f2-win-on-accent-light`、`--f2-win-on-accent-dark`。

---

## English

A zero-dependency Windows 11 companion plugin for Obsidian Desktop that brings native **Mica / Mica Alt / Acrylic** window backdrop materials and live **7-shade Windows 11 Personalization accent color** synchronization to Obsidian. Designed for the [Fluent 2](https://community.obsidian.md/themes/fluent-2) theme and compatible with any translucent-ready theme.

### Features

- **Native Windows 11 Window Materials**: Calls Electron's native `BrowserWindow.setBackgroundMaterial()` API to apply **Mica**, **Mica Alt (Tabbed)**, or **Acrylic** to the main window, pop-out note windows, and Obsidian 1.15+ standalone Settings windows.
- **Live 7-Shade Windows 11 Accent Color Sync**: Reads the full 7-shade `AccentPalette` from Windows 11 Personalization (with automatic WinUI 3 Light/Dark contrast mapping: `Dark1–Dark3` in Light mode, `Light1–Light3` in Dark mode) and syncs CSS custom properties across all open windows.
- **Auto-Refresh & Commands**: Automatically detects wallpaper or accent color changes when returning focus to Obsidian or on a configurable polling interval, plus Command Palette actions to refresh or cycle window materials.

### Requirements

- **OS**: Windows 11 22H2 (Build 22621) or later (automatically stays inactive on macOS and Linux).
- **Obsidian**: Desktop `1.5.0` or later.
- **Window Frame**: Recommended **Settings → Interface → Window frame style → Hidden (default)**.

### Installation

1. **Community Plugins (Recommended)**: Open **Settings → Community plugins → Browse**, search for **Fluent 2 Windows Native**, click **Install**, and then **Enable**.
2. **Manual Installation**: Download `main.js`, `manifest.json`, and `styles.css` from the latest GitHub Release (or clone this repository) into `<your-vault>/.obsidian/plugins/fluent-windows-native/`:
   ```bash
   git clone https://github.com/zyraxi21/fluent2-windows-native.git fluent-windows-native
   ```
   Reload Community Plugins in Obsidian settings and toggle **Fluent 2 Windows Native** on.

### Usage

1. Open **Settings → Community plugins → Fluent 2 Windows Native**.
2. Choose your preferred **Window Backdrop Material** (`Mica`, `Mica Alt / Tabbed`, `Acrylic`, or `None`) and optionally enable Mica for pop-out and standalone Settings windows.
3. Keep **Auto-sync Windows 11 Personalization Accent Color** enabled to mirror your live Windows 11 7-shade palette (previewed directly in the settings tab).
4. Use the Command Palette (`Ctrl + P`) anytime to run:
   - **Refresh Windows 11 Mica and Accent Color**
   - **Cycle Windows 11 Material**

### Security & Privacy

This plugin uses `child_process.execFile("reg.exe", ["query", ...])` with hardcoded, read-only arguments solely to read the current user's Windows 11 accent color registry values (`AccentPalette` and `AccentColor`). It never invokes a shell, never writes to the registry or filesystem outside Obsidian plugin settings, and makes zero network requests.

### License

Licensed under [GNU General Public License v3.0](LICENSE).
