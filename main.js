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
    if (window.moment && typeof window.moment.locale === "function") {
      const loc = String(window.moment.locale() || "").toLowerCase();
      if (loc) return loc.startsWith("zh");
    }
  } catch (_) {}
  try {
    const htmlLang = String(document.documentElement?.lang || "").toLowerCase();
    if (htmlLang) return htmlLang.startsWith("zh");
  } catch (_) {}
  return false;
}

const I18N = {
  zh: {
    cmdRefresh: "立即同步窗口材质与系统主题色",
    cmdCycle: "切换窗口材质（云母 / 深层云母 / 亚克力 / 关闭）",
    noticeMaterialSwitched: (m) => `窗口材质已切换为：${m}`,
    noticeSynced: (m, ok, accent) =>
      `已同步系统外观\n窗口材质：${m}（${ok ? "已生效" : "不可用"}）\n系统主题色：${accent}`,
    notRead: "未读取",
    statusWindows: (ok, synced) =>
      `云母材质：${ok ? "可用" : "不可用"}；系统主题色：${synced ? "已同步" : "未同步"}`,
    statusNonWindows: "当前不是 Windows 系统，原生功能已停用。",
    statusName: "当前状态",
    syncNow: "立即同步",
    materialName: "窗口背景材质",
    materialDesc: "需在「设置 → 界面 → 窗口边框样式」中保持「隐藏」。",
    matMica: "云母（推荐）",
    matTabbed: "深层云母（记事本风格）",
    matAcrylic: "亚克力（半透毛玻璃）",
    matNone: "关闭",
    popoutName: "应用到设置与弹出窗口",
    popoutDesc: "让独立设置窗口和弹出笔记窗口也启用相同材质。",
    accentName: "跟随系统主题色",
    accentDesc: "自动同步 Windows 个性化设置中的系统主题色。",
    paletteName: "系统主题色预览",
    paletteDesc: (p) => `浅色界面用色：${p.dark1}（偏深更清晰）；深色界面用色：${p.light2}（偏亮更醒目）`,
    swatchLabels: ["最亮色", "深色界面用色", "亮阶色", "系统基准色", "浅色界面用色", "暗阶色", "最暗色"],
    swatchTitle: (k, hex) => `${k}：${hex}`,
    coreAccentName: "同步到全局与其他插件",
    coreAccentDesc: "让 Obsidian 自带控件和其他第三方插件也使用系统主题色。",
    focusName: "切回窗口时自动刷新",
    focusDesc: "修改系统壁纸或主题色后，切回 Obsidian 自动生效。",
    pollName: "后台检查间隔（秒）",
    pollDesc: "填 0 则关闭定时检查，仅在启动或切回窗口时刷新。"
  },
  en: {
    cmdRefresh: "Sync Window Material and System Accent",
    cmdCycle: "Cycle Window Material (Mica / Mica Alt / Acrylic / Off)",
    noticeMaterialSwitched: (m) => `Window material switched to: ${m}`,
    noticeSynced: (m, ok, accent) =>
      `Windows appearance synced\nMaterial: ${m} (${ok ? "active" : "unavailable"})\nSystem accent: ${accent}`,
    notRead: "Unavailable",
    statusWindows: (ok, synced) =>
      `Mica: ${ok ? "Available" : "Unavailable"}; System accent: ${synced ? "Synced" : "Not synced"}`,
    statusNonWindows: "Non-Windows platform. Native features are idle.",
    statusName: "Status",
    syncNow: "Sync",
    materialName: "Window Backdrop Material",
    materialDesc: "Keep Settings → Interface → Window frame style set to Hidden.",
    matMica: "Mica (Recommended)",
    matTabbed: "Mica Alt (Notepad style)",
    matAcrylic: "Acrylic (Frosted glass)",
    matNone: "Off",
    popoutName: "Apply to Settings & Pop-out Windows",
    popoutDesc: "Enables the same backdrop material on standalone Settings and pop-out windows.",
    accentName: "Follow System Accent Color",
    accentDesc: "Automatically syncs your Windows Personalization accent color.",
    paletteName: "System Accent Palette",
    paletteDesc: (p) => `Light UI: ${p.dark1} (darker for contrast); Dark UI: ${p.light2} (lighter for contrast)`,
    swatchLabels: ["Lightest", "Dark UI accent", "Light", "Base", "Light UI accent", "Dark", "Darkest"],
    swatchTitle: (k, hex) => `${k}: ${hex}`,
    coreAccentName: "Apply to All Plugins & Core UI",
    coreAccentDesc: "Applies your Windows accent color to built-in controls and other plugins.",
    focusName: "Refresh on Window Focus",
    focusDesc: "Updates automatically when returning to Obsidian after changing your wallpaper or accent.",
    pollName: "Auto-Check Interval (Seconds)",
    pollDesc: "Set to 0 to check only on startup or window focus."
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
      ? tr.statusWindows(hasMaterialApi, !!this.plugin.lastPalette)
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
      const labels = tr.swatchLabels;
      [
        { key: labels[0], hex: p.light3 },
        { key: labels[1], hex: p.light2, primary: true },
        { key: labels[2], hex: p.light1 },
        { key: labels[3], hex: p.base },
        { key: labels[4], hex: p.dark1, primary: true },
        { key: labels[5], hex: p.dark2 },
        { key: labels[6], hex: p.dark3 }
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
