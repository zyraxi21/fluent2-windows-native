"use strict";

const obsidian = require("obsidian");
const { Plugin, PluginSettingTab, Setting, Notice } = obsidian;
const { execFile } = require("child_process");

function isChineseLocale() {
  try {
    if (typeof obsidian.getLanguage === "function") {
      const lang = String(obsidian.getLanguage() || "").toLowerCase();
      if (lang) return lang.startsWith("zh");
    }
  } catch (_) {}
  try {
    const stored = String(window.localStorage.getItem("language") || "").toLowerCase();
    if (stored) return stored.startsWith("zh");
  } catch (_) {}
  try {
    if (window.moment && typeof window.moment.locale === "function") {
      const loc = String(window.moment.locale() || "").toLowerCase();
      if (loc) return loc.startsWith("zh");
    }
  } catch (_) {}
  return false;
}

const I18N = {
  zh: {
    cmdRefresh: "立即同步 Windows 11 材质与系统主题色",
    cmdCycle: "切换 Windows 11 窗口材质（Mica / Mica Alt / Acrylic / 关闭）",
    noticeMaterialSwitched: (m) => `Fluent 2 窗口材质已切换为：${m}`,
    noticeSynced: (m, ok, accent) =>
      `Fluent 2 Windows Native 已同步\n材质：${m}（${ok ? "已生效" : "接口不可用"}）\n系统主题色：${accent}`,
    notRead: "未读取",
    statusWindows: (ok, source) =>
      `Windows 桌面环境；Mica API：${ok ? "可用" : "不可用"}；主题色来源：${source || "未同步"}`,
    statusNonWindows: "当前非 Windows 系统，原生特性已自动休眠。",
    statusName: "运行状态",
    syncNow: "立即同步",
    materialName: "Windows 11 窗口材质（Backdrop Material）",
    materialDesc:
      "直接调用 Electron 原生 BrowserWindow.setBackgroundMaterial() API。建议在「设置 → 界面 → 窗口边框样式」保持「隐藏（默认）」。",
    matMica: "Mica（标准 Windows 11 云母，推荐）",
    matTabbed: "Mica Alt / Tabbed（层次更强，记事本同款）",
    matAcrylic: "Acrylic（实时毛玻璃亚克力）",
    matNone: "关闭原生窗口材质",
    popoutName: "同步为弹窗与独立设置窗口启用云母材质",
    popoutDesc:
      "开启后，Obsidian 1.15+ 的独立「设置」窗口与弹出笔记窗口也会一并套用原生 Windows 11 云母材质。",
    accentName: "自动同步 Windows 11 系统个性化主题色",
    accentDesc:
      "直接读取 Windows 11 注册表 AccentPalette 完整 7 阶色板（浅色自动使用 Dark1/Dark2，深色自动使用 Light2/Light3），与 Windows 11 设置完全一致。",
    paletteName: "当前读取到的 Windows 11 7 阶主题色板",
    paletteDesc: (p) => `浅色主色（Dark1）：${p.dark1}；基础色：${p.base}；深色主色（Light2）：${p.light2}`,
    swatchLight2: "Light2（深色主色）",
    swatchDark1: "Dark1（浅色主色）",
    swatchTitle: (k, hex) => `${k}：${hex}`,
    coreAccentName: "同时覆盖 Obsidian 原生强调色变量（--accent-h/s/l）",
    coreAccentDesc:
      "开启后，第三方插件与所有依赖 Obsidian 原生强调色的界面元素也会自动跟随 Windows 11 系统主题色。",
    focusName: "切换回窗口时自动检测系统主题色变化",
    focusDesc: "更改 Windows 壁纸或个性化主题色后，切回 Obsidian 立即生效。",
    pollName: "后台自动轮询间隔（秒）",
    pollDesc: "设为 0 仅在启动、切回窗口或手动执行命令时同步（默认 15 秒）。"
  },
  en: {
    cmdRefresh: "Refresh Windows 11 Mica and Accent Color",
    cmdCycle: "Cycle Windows 11 Window Material (Mica / Mica Alt / Acrylic / Off)",
    noticeMaterialSwitched: (m) => `Fluent 2 window material switched to: ${m}`,
    noticeSynced: (m, ok, accent) =>
      `Fluent 2 Windows Native synced\nMaterial: ${m} (${ok ? "active" : "API unavailable"})\nSystem accent: ${accent}`,
    notRead: "Unavailable",
    statusWindows: (ok, source) =>
      `Windows desktop; Mica API: ${ok ? "Available" : "Unavailable"}; Accent source: ${source || "Not synced"}`,
    statusNonWindows: "Non-Windows platform detected. Native features are idle.",
    statusName: "Status",
    syncNow: "Sync now",
    materialName: "Windows 11 Window Material (Backdrop Material)",
    materialDesc:
      "Calls Electron's native BrowserWindow.setBackgroundMaterial() API directly. Keep Settings → Interface → Window frame style set to Hidden (default).",
    matMica: "Mica (Standard Windows 11 Mica, recommended)",
    matTabbed: "Mica Alt / Tabbed (Stronger depth, Notepad style)",
    matAcrylic: "Acrylic (Real-time frosted glass)",
    matNone: "Off (Disable native window material)",
    popoutName: "Apply Mica to Pop-out & Standalone Settings Windows",
    popoutDesc:
      "Applies native Windows 11 backdrop material to Obsidian 1.15+ standalone Settings windows and pop-out note windows as well.",
    accentName: "Sync Windows 11 Personalization Accent Color",
    accentDesc:
      "Reads the full 7-shade AccentPalette directly from the Windows Registry (Dark1/Dark2 for Light mode, Light2/Light3 for Dark mode), matching Windows 11 Settings.",
    paletteName: "Detected Windows 11 7-Shade Accent Palette",
    paletteDesc: (p) => `Light primary (Dark1): ${p.dark1}; Base: ${p.base}; Dark primary (Light2): ${p.light2}`,
    swatchLight2: "Light2 (Dark primary)",
    swatchDark1: "Dark1 (Light primary)",
    swatchTitle: (k, hex) => `${k}: ${hex}`,
    coreAccentName: "Override Obsidian Core Accent Variables (--accent-h/s/l)",
    coreAccentDesc:
      "Updates Obsidian's core accent variables so community plugins and built-in UI controls also follow your Windows 11 system accent color.",
    focusName: "Check System Accent on Window Focus",
    focusDesc: "Automatically updates Obsidian when you return to the window after changing your Windows wallpaper or accent color.",
    pollName: "Background Polling Interval (Seconds)",
    pollDesc: "Set to 0 to sync only on startup, window focus, or manual command (default: 15)."
  }
};

function getStrings() {
  return isChineseLocale() ? I18N.zh : I18N.en;
}

const DEFAULT_SETTINGS = {
  material: "mica", // "mica" | "tabbed" | "acrylic" | "none"
  applyToPopoutWindows: true,
  syncSystemAccent: true,
  syncObsidianCoreAccent: true,
  autoRefreshOnFocus: true,
  pollIntervalSeconds: 15
};

function getElectronRemote() {
  try {
    if (window.electron && window.electron.remote) {
      return window.electron.remote;
    }
  } catch (_) {}
  try {
    const electronRemote = require("@electron/remote");
    if (electronRemote) return electronRemote;
  } catch (_) {}
  try {
    const electron = require("electron");
    if (electron && electron.remote) return electron.remote;
  } catch (_) {}
  return null;
}

function clampByte(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function rgbToHex(r, g, b) {
  return (
    "#" +
    [clampByte(r), clampByte(g), clampByte(b)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "").trim();
  if (clean.length !== 6) return { r: 15, g: 108, b: 189 };
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
}

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function contrastTextForHex(hex) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58 ? "#141414" : "#ffffff";
}

function mixHex(hex, targetHex, ratio) {
  const a = hexToRgb(hex);
  const b = hexToRgb(targetHex);
  return rgbToHex(
    a.r + (b.r - a.r) * ratio,
    a.g + (b.g - a.g) * ratio,
    a.b + (b.b - a.b) * ratio
  );
}

function synthesizePaletteFromBase(baseHex) {
  return {
    light3: mixHex(baseHex, "#ffffff", 0.52),
    light2: mixHex(baseHex, "#ffffff", 0.34),
    light1: mixHex(baseHex, "#ffffff", 0.16),
    base: baseHex,
    dark1: mixHex(baseHex, "#000000", 0.14),
    dark2: mixHex(baseHex, "#000000", 0.32),
    dark3: mixHex(baseHex, "#000000", 0.52),
    source: "fallback"
  };
}

function queryReg(keyPath, valueName) {
  return new Promise((resolve) => {
    execFile(
      "reg.exe",
      ["query", keyPath, "/v", valueName],
      { windowsHide: true, timeout: 3000 },
      (err, stdout) => {
        if (err || !stdout) {
          resolve(null);
          return;
        }
        resolve(stdout);
      }
    );
  });
}

async function readWindowsAccentPalette() {
  // Primary source: Windows 11 Explorer AccentPalette (32-byte REG_BINARY: 7 shades in RRGGBBAA)
  const paletteOut = await queryReg(
    "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent",
    "AccentPalette"
  );
  if (paletteOut) {
    const match = paletteOut.match(/AccentPalette\s+REG_BINARY\s+([0-9A-Fa-f]{56,64})/);
    if (match && match[1]) {
      const hex = match[1];
      const slot = (idx) => {
        const offset = idx * 8;
        const r = hex.slice(offset, offset + 2);
        const g = hex.slice(offset + 2, offset + 4);
        const b = hex.slice(offset + 4, offset + 6);
        return ("#" + r + g + b).toLowerCase();
      };
      return {
        light3: slot(0),
        light2: slot(1),
        light1: slot(2),
        base: slot(3),
        dark1: slot(4),
        dark2: slot(5),
        dark3: slot(6),
        source: "Windows Registry AccentPalette"
      };
    }
  }

  // Secondary source: DWM AccentColor DWORD (AABBGGRR)
  const dwmOut = await queryReg("HKCU\\Software\\Microsoft\\Windows\\DWM", "AccentColor");
  if (dwmOut) {
    const match = dwmOut.match(/AccentColor\s+REG_DWORD\s+0x([0-9A-Fa-f]{6,8})/);
    if (match && match[1]) {
      const padded = match[1].padStart(8, "0");
      const b = padded.slice(2, 4);
      const g = padded.slice(4, 6);
      const r = padded.slice(6, 8);
      const p = synthesizePaletteFromBase(("#" + r + g + b).toLowerCase());
      p.source = "Windows DWM AccentColor";
      return p;
    }
  }

  // Tertiary fallback: Electron systemPreferences.getAccentColor() (RRGGBBAA)
  const remote = getElectronRemote();
  if (remote && remote.systemPreferences && typeof remote.systemPreferences.getAccentColor === "function") {
    try {
      const raw = remote.systemPreferences.getAccentColor();
      if (raw && raw.length >= 6) {
        const p = synthesizePaletteFromBase("#" + raw.slice(0, 6).toLowerCase());
        p.source = "Electron systemPreferences";
        return p;
      }
    } catch (_) {}
  }

  return null;
}

class Fluent2WindowsNativePlugin extends Plugin {
  async onload() {
    this.isWindows = typeof process !== "undefined" && process.platform === "win32";
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.lastPalette = null;
    this.lastPaletteSignature = "";
    this.remote = getElectronRemote();
    this.appliedWindowIds = new Set();
    this._onBrowserWindowCreated = null;
    this._onWindowFocus = null;
    this._pollTimer = null;

    this.addSettingTab(new Fluent2WindowsNativeSettingTab(this.app, this));

    const tr = getStrings();

    this.addCommand({
      id: "refresh-windows-native",
      name: tr.cmdRefresh,
      callback: () => this.refreshAll(true)
    });

    this.addCommand({
      id: "cycle-material",
      name: tr.cmdCycle,
      callback: async () => {
        const order = ["mica", "tabbed", "acrylic", "none"];
        const idx = order.indexOf(this.settings.material);
        this.settings.material = order[(idx + 1) % order.length];
        await this.saveSettings();
        new Notice(getStrings().noticeMaterialSwitched(this.settings.material.toUpperCase()));
      }
    });

    if (!this.isWindows) {
      return;
    }

    this.app.workspace.onLayoutReady(() => {
      this.refreshAll(false);
    });

    // Re-apply core HSL accent when user switches Light / Dark mode
    this.registerEvent(
      this.app.workspace.on("css-change", () => {
        if (this.settings.syncSystemAccent && this.lastPalette) {
          this.applyDomStateToDocument(document, false);
          this.syncCssIntoAllBrowserWindows();
        }
      })
    );

    // Apply to Obsidian pop-out note windows
    this.registerEvent(
      this.app.workspace.on("window-open", (workspaceWindow, winObj) => {
        setTimeout(() => {
          this.applyMaterialToAllWindows();
          if (winObj && winObj.document) {
            this.applyDomStateToDocument(winObj.document, true);
          }
        }, 80);
      })
    );

    // Apply to Obsidian 1.15+ standalone Settings windows and any other Electron BrowserWindows
    if (this.remote && this.remote.app && typeof this.remote.app.on === "function") {
      this._onBrowserWindowCreated = (_event, bw) => {
        setTimeout(() => {
          this.applyMaterialToBrowserWindow(bw, true);
          this.syncCssIntoAllBrowserWindows();
        }, 120);
      };
      this.remote.app.on("browser-window-created", this._onBrowserWindowCreated);
    }

    this._onWindowFocus = () => {
      if (this.settings.autoRefreshOnFocus && this.settings.syncSystemAccent) {
        this.syncWindowsAccent(false);
      }
      if (this.settings.material !== "none") {
        this.applyMaterialToAllWindows();
      }
    };
    window.addEventListener("focus", this._onWindowFocus);

    this.setupPolling();
  }

  setupPolling() {
    if (this._pollTimer) {
      window.clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
    const sec = Number(this.settings.pollIntervalSeconds) || 0;
    if (this.isWindows && sec >= 3) {
      this._pollTimer = window.setInterval(() => {
        if (this.settings.syncSystemAccent) {
          this.syncWindowsAccent(false);
        }
      }, sec * 1000);
    }
  }

  getAllBrowserWindows() {
    if (!this.remote || !this.remote.BrowserWindow) return [];
    try {
      return this.remote.BrowserWindow.getAllWindows() || [];
    } catch (_) {
      return [];
    }
  }

  getMainBrowserWindow() {
    if (!this.remote) return null;
    try {
      return this.remote.getCurrentWindow();
    } catch (_) {
      return null;
    }
  }

  applyMaterialToBrowserWindow(bw, isSecondary) {
    if (!bw || bw.isDestroyed()) return false;
    const mat = this.settings.material;
    const shouldApply =
      mat !== "none" && (!isSecondary || this.settings.applyToPopoutWindows);

    try {
      if (typeof bw.setBackgroundMaterial === "function") {
        if (shouldApply) {
          try {
            bw.setBackgroundColor("#00000000");
          } catch (_) {}
          bw.setBackgroundMaterial(mat);
          this.appliedWindowIds.add(bw.id);
        } else {
          bw.setBackgroundMaterial("none");
          this.appliedWindowIds.delete(bw.id);
        }
        return true;
      }
    } catch (err) {
      console.warn("[Fluent 2 Windows Native] setBackgroundMaterial failed:", err);
    }
    return false;
  }

  applyMaterialToAllWindows() {
    if (!this.isWindows) return false;
    const mainWin = this.getMainBrowserWindow();
    const allWins = this.getAllBrowserWindows();
    let anySupported = false;

    if (allWins.length > 0) {
      for (const bw of allWins) {
        const isSecondary = mainWin ? bw.id !== mainWin.id : false;
        if (this.applyMaterialToBrowserWindow(bw, isSecondary)) {
          anySupported = true;
        }
      }
    } else if (mainWin) {
      anySupported = this.applyMaterialToBrowserWindow(mainWin, false);
    }

    this.applyDomStateToDocument(document, false);
    this.syncCssIntoAllBrowserWindows();
    return anySupported;
  }

  buildPaletteCssPayload() {
    if (!this.settings.syncSystemAccent || !this.lastPalette) {
      return null;
    }
    const p = this.lastPalette;
    const onLight = contrastTextForHex(p.dark1);
    const onDark = contrastTextForHex(p.light2);
    const dark1Rgb = hexToRgb(p.dark1);
    const light2Rgb = hexToRgb(p.light2);
    const lightHsl = rgbToHsl(dark1Rgb.r, dark1Rgb.g, dark1Rgb.b);
    const darkHsl = rgbToHsl(light2Rgb.r, light2Rgb.g, light2Rgb.b);

    return {
      vars: {
        "--f2-win-accent-light3": p.light3,
        "--f2-win-accent-light2": p.light2,
        "--f2-win-accent-light1": p.light1,
        "--f2-win-accent-base": p.base,
        "--f2-win-accent-dark1": p.dark1,
        "--f2-win-accent-dark2": p.dark2,
        "--f2-win-accent-dark3": p.dark3,
        "--f2-win-on-accent-light": onLight,
        "--f2-win-on-accent-dark": onDark
      },
      lightHsl,
      darkHsl,
      syncCore: !!this.settings.syncObsidianCoreAccent
    };
  }

  applyDomStateToDocument(doc, isSecondary) {
    if (!doc || !doc.body || !doc.documentElement) return;
    const body = doc.body;
    const root = doc.documentElement;
    const matActive =
      this.settings.material !== "none" &&
      (!isSecondary || this.settings.applyToPopoutWindows);

    body.classList.toggle("is-translucent", matActive);
    if (isSecondary) {
      body.classList.toggle("fluent2-popout-mica", matActive);
    }

    const payload = this.buildPaletteCssPayload();
    if (payload) {
      body.classList.add("fluent2-win-accent-synced");
      for (const [k, v] of Object.entries(payload.vars)) {
        root.style.setProperty(k, v);
      }
      if (payload.syncCore) {
        const isDark = body.classList.contains("theme-dark");
        const hsl = isDark ? payload.darkHsl : payload.lightHsl;
        root.style.setProperty("--accent-h", String(hsl.h));
        root.style.setProperty("--accent-s", hsl.s + "%");
        root.style.setProperty("--accent-l", hsl.l + "%");
      } else {
        root.style.removeProperty("--accent-h");
        root.style.removeProperty("--accent-s");
        root.style.removeProperty("--accent-l");
      }
    } else {
      body.classList.remove("fluent2-win-accent-synced");
      [
        "--f2-win-accent-light3",
        "--f2-win-accent-light2",
        "--f2-win-accent-light1",
        "--f2-win-accent-base",
        "--f2-win-accent-dark1",
        "--f2-win-accent-dark2",
        "--f2-win-accent-dark3",
        "--f2-win-on-accent-light",
        "--f2-win-on-accent-dark",
        "--accent-h",
        "--accent-s",
        "--accent-l"
      ].forEach((prop) => root.style.removeProperty(prop));
    }
  }

  syncCssIntoAllBrowserWindows() {
    const mainWin = this.getMainBrowserWindow();
    const allWins = this.getAllBrowserWindows();
    const payload = this.buildPaletteCssPayload();
    const matActiveSecondary =
      this.settings.material !== "none" && this.settings.applyToPopoutWindows;

    for (const bw of allWins) {
      if (!bw || bw.isDestroyed()) continue;
      if (mainWin && bw.id === mainWin.id) continue;
      if (!bw.webContents || bw.webContents.isDestroyed()) continue;

      const script = `
        (function() {
          if (!document || !document.body || !document.documentElement) return;
          var body = document.body;
          var root = document.documentElement;
          body.classList.toggle("is-translucent", ${JSON.stringify(matActiveSecondary)});
          body.classList.toggle("fluent2-popout-mica", ${JSON.stringify(matActiveSecondary)});
          var payload = ${JSON.stringify(payload)};
          if (payload) {
            body.classList.add("fluent2-win-accent-synced");
            Object.keys(payload.vars).forEach(function(k) {
              root.style.setProperty(k, payload.vars[k]);
            });
            if (payload.syncCore) {
              var hsl = body.classList.contains("theme-dark") ? payload.darkHsl : payload.lightHsl;
              root.style.setProperty("--accent-h", String(hsl.h));
              root.style.setProperty("--accent-s", hsl.s + "%");
              root.style.setProperty("--accent-l", hsl.l + "%");
            } else {
              root.style.removeProperty("--accent-h");
              root.style.removeProperty("--accent-s");
              root.style.removeProperty("--accent-l");
            }
          } else {
            body.classList.remove("fluent2-win-accent-synced");
            [
              "--f2-win-accent-light3","--f2-win-accent-light2","--f2-win-accent-light1",
              "--f2-win-accent-base","--f2-win-accent-dark1","--f2-win-accent-dark2",
              "--f2-win-accent-dark3","--f2-win-on-accent-light","--f2-win-on-accent-dark",
              "--accent-h","--accent-s","--accent-l"
            ].forEach(function(p) { root.style.removeProperty(p); });
          }
        })();
      `;
      try {
        bw.webContents.executeJavaScript(script).catch(() => {});
      } catch (_) {}
    }
  }

  async syncWindowsAccent(forceApply) {
    if (!this.isWindows) return;
    if (!this.settings.syncSystemAccent) {
      this.lastPaletteSignature = "";
      this.applyDomStateToDocument(document, false);
      this.syncCssIntoAllBrowserWindows();
      return;
    }

    const palette = await readWindowsAccentPalette();
    if (!palette) return;

    const sig = [
      palette.light3,
      palette.light2,
      palette.light1,
      palette.base,
      palette.dark1,
      palette.dark2,
      palette.dark3,
      this.settings.syncObsidianCoreAccent
    ].join("|");

    if (forceApply || sig !== this.lastPaletteSignature) {
      this.lastPalette = palette;
      this.lastPaletteSignature = sig;
      this.applyDomStateToDocument(document, false);
      this.syncCssIntoAllBrowserWindows();
    }
  }

  async refreshAll(showNotice) {
    await this.syncWindowsAccent(true);
    const matOk = this.applyMaterialToAllWindows();
    if (showNotice) {
      const tr = getStrings();
      const accentText = this.lastPalette ? this.lastPalette.dark1 : tr.notRead;
      new Notice(
        tr.noticeSynced(this.settings.material.toUpperCase(), matOk, accentText)
      );
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.setupPolling();
    await this.refreshAll(false);
  }

  onunload() {
    if (this._pollTimer) {
      window.clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
    if (this._onWindowFocus) {
      window.removeEventListener("focus", this._onWindowFocus);
      this._onWindowFocus = null;
    }
    if (
      this._onBrowserWindowCreated &&
      this.remote &&
      this.remote.app &&
      typeof this.remote.app.removeListener === "function"
    ) {
      try {
        this.remote.app.removeListener(
          "browser-window-created",
          this._onBrowserWindowCreated
        );
      } catch (_) {}
      this._onBrowserWindowCreated = null;
    }

    this.settings.material = "none";
    this.settings.syncSystemAccent = false;
    this.applyMaterialToAllWindows();
  }
}

class Fluent2WindowsNativeSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    const tr = getStrings();

    new Setting(containerEl).setName("Fluent 2 Windows Native").setHeading();

    const mainWin = this.plugin.getMainBrowserWindow();
    const hasMaterialApi = !!(
      mainWin && typeof mainWin.setBackgroundMaterial === "function"
    );
    const statusText = this.plugin.isWindows
      ? tr.statusWindows(
          hasMaterialApi,
          this.plugin.lastPalette ? this.plugin.lastPalette.source : ""
        )
      : tr.statusNonWindows;

    new Setting(containerEl)
      .setName(tr.statusName)
      .setDesc(statusText)
      .addButton((btn) =>
        btn
          .setButtonText(tr.syncNow)
          .setCta()
          .onClick(async () => {
            await this.plugin.refreshAll(true);
            this.display();
          })
      );

    new Setting(containerEl)
      .setName(tr.materialName)
      .setDesc(tr.materialDesc)
      .addDropdown((dd) =>
        dd
          .addOption("mica", tr.matMica)
          .addOption("tabbed", tr.matTabbed)
          .addOption("acrylic", tr.matAcrylic)
          .addOption("none", tr.matNone)
          .setValue(this.plugin.settings.material)
          .onChange(async (value) => {
            this.plugin.settings.material = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(tr.popoutName)
      .setDesc(tr.popoutDesc)
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.applyToPopoutWindows)
          .onChange(async (value) => {
            this.plugin.settings.applyToPopoutWindows = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(tr.accentName)
      .setDesc(tr.accentDesc)
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.syncSystemAccent)
          .onChange(async (value) => {
            this.plugin.settings.syncSystemAccent = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (this.plugin.lastPalette && this.plugin.settings.syncSystemAccent) {
      const p = this.plugin.lastPalette;
      const previewSetting = new Setting(containerEl)
        .setName(tr.paletteName)
        .setDesc(tr.paletteDesc(p));

      const row = previewSetting.controlEl.createDiv({ cls: "f2-native-swatch-row" });
      [
        { key: "Light3", hex: p.light3 },
        { key: tr.swatchLight2, hex: p.light2, primary: true },
        { key: "Light1", hex: p.light1 },
        { key: "Base", hex: p.base },
        { key: tr.swatchDark1, hex: p.dark1, primary: true },
        { key: "Dark2", hex: p.dark2 },
        { key: "Dark3", hex: p.dark3 }
      ].forEach((item) => {
        const dot = row.createDiv({
          cls: "f2-native-swatch" + (item.primary ? " is-primary" : "")
        });
        dot.style.backgroundColor = item.hex;
        dot.setAttribute("aria-label", tr.swatchTitle(item.key, item.hex));
        dot.setAttribute("title", tr.swatchTitle(item.key, item.hex));
      });
    }

    new Setting(containerEl)
      .setName(tr.coreAccentName)
      .setDesc(tr.coreAccentDesc)
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.syncObsidianCoreAccent)
          .onChange(async (value) => {
            this.plugin.settings.syncObsidianCoreAccent = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(tr.focusName)
      .setDesc(tr.focusDesc)
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoRefreshOnFocus)
          .onChange(async (value) => {
            this.plugin.settings.autoRefreshOnFocus = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(tr.pollName)
      .setDesc(tr.pollDesc)
      .addText((text) =>
        text
          .setPlaceholder("15")
          .setValue(String(this.plugin.settings.pollIntervalSeconds))
          .onChange(async (value) => {
            const num = Math.max(0, parseInt(value, 10) || 0);
            this.plugin.settings.pollIntervalSeconds = num;
            await this.plugin.saveSettings();
          })
      );
  }
}

module.exports = Fluent2WindowsNativePlugin;
