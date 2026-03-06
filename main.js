const {
  app,
  BaseWindow,
  WebContentsView,
  ipcMain,
  session,
  globalShortcut,
  Menu,
  Tray,
  nativeImage,
  dialog,
} = require("electron");
const path = require("path");
const fs = require("fs-extra");
const archiver = require("archiver");
const extract = require("extract-zip");

let mainWindow;
let uiView;
let tray;
let views = {};
let activeTabId = null;
let isQuitting = false;
let currentLayout = "left"; // Track layout state in main process

const isMac = process.platform === "darwin";
const SIDEBAR_WIDTH = 220;
const NAV_HEIGHT = 48;
const iconPath = path.join(__dirname, "assets", "icon", "icon.png");

// Ensure the app name is correct in the OS (e.g., macOS Dock & Application Menu)
app.setName("OASIS");

function createWindow() {
  mainWindow = new BaseWindow({
    width: 1280,
    height: 800,
    title: "OASIS",
    titleBarStyle: isMac ? "hiddenInset" : "default",
    icon: iconPath,
  });

  uiView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.contentView.addChildView(uiView);
  const { width, height } = mainWindow.getContentBounds();
  uiView.setBounds({ x: 0, y: 0, width, height });
  uiView.webContents.loadFile("index.html");

  uiView.webContents.on("did-finish-load", () => {
    uiView.webContents.send("platform-info", { platform: process.platform });
  });

  mainWindow.on("resize", () => {
    const { width, height } = mainWindow.getContentBounds();
    uiView.setBounds({ x: 0, y: 0, width, height });
    resizeActiveTab();
  });

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // --- Register Keyboard Shortcuts ---
  setupKeyboardShortcuts();

  // --- Application Menu with Shortcuts ---
  setupAppMenu();

  // --- Setup Tray ---
  setupTray();
}

function setupTray() {
  let trayIcon = nativeImage.createFromPath(iconPath);

  // Resize icon to fit system tray (usually 16x16 on Mac/Linux, 32x32 on Windows)
  const iconSize = isMac ? 16 : 32;
  trayIcon = trayIcon.resize({ width: iconSize, height: iconSize });

  tray = new Tray(trayIcon);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Tampilkan OASIS",
      click: () => {
        if (mainWindow) mainWindow.show();
      },
    },
    { type: "separator" },
    {
      label: "Keluar",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setToolTip("OASIS");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    if (mainWindow) mainWindow.show();
  });
}

// --- Keyboard Shortcuts ---

function setupKeyboardShortcuts() {
  // We use the app menu for keyboard shortcuts (Electron best practice)
  // This ensures they work correctly on all platforms
}

function setupAppMenu() {
  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    {
      label: "Berkas",
      submenu: [
        {
          label: "Tab Baru",
          accelerator: "CmdOrCtrl+T",
          click: () => sendToUI("shortcut-new-tab"),
        },
        {
          label: "Tutup Tab",
          accelerator: "CmdOrCtrl+W",
          click: () => sendToUI("shortcut-close-tab"),
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Ubah",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "Tampilan",
      submenu: [
        {
          label: "Muat Ulang Tab",
          accelerator: "CmdOrCtrl+R",
          click: () => sendToUI("shortcut-reload"),
        },
        { type: "separator" },
        {
          label: "Perbesar",
          accelerator: "CmdOrCtrl+Plus",
          click: () => zoomActiveTab(0.1),
        },
        {
          label: "Perkecil",
          accelerator: "CmdOrCtrl+-",
          click: () => zoomActiveTab(-0.1),
        },
        {
          label: "Reset Zoom",
          accelerator: "CmdOrCtrl+0",
          click: () => zoomActiveTab(0, true),
        },
        { type: "separator" },
        {
          label: "Fokus ke Bar URL",
          accelerator: "CmdOrCtrl+L",
          click: () => sendToUI("shortcut-focus-url"),
        },
        {
          label: "Buka Beranda",
          accelerator: "CmdOrCtrl+Shift+H",
          click: () => sendToUI("shortcut-go-home"),
        },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Tab",
      submenu: [
        {
          label: "Tab Berikutnya",
          accelerator: "CmdOrCtrl+Shift+]",
          click: () => sendToUI("shortcut-next-tab"),
        },
        {
          label: "Tab Sebelumnya",
          accelerator: "CmdOrCtrl+Shift+[",
          click: () => sendToUI("shortcut-prev-tab"),
        },
        { type: "separator" },
        ...Array.from({ length: 9 }, (_, i) => ({
          label: `Tab ${i + 1}`,
          accelerator: `CmdOrCtrl+${i + 1}`,
          click: () => sendToUI("shortcut-switch-tab", i),
        })),
      ],
    },
    {
      label: "Jendela",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac ? [{ type: "separator" }, { role: "front" }] : []),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function sendToUI(channel, data) {
  if (uiView && !uiView.webContents.isDestroyed()) {
    uiView.webContents.send(channel, data);
  }
}

function zoomActiveTab(delta, reset = false) {
  if (activeTabId && views[activeTabId]) {
    const wc = views[activeTabId].webContents;
    if (reset) {
      wc.setZoomLevel(0);
    } else {
      wc.setZoomLevel(wc.getZoomLevel() + delta);
    }
  }
}

app.whenReady().then(() => {
  if (isMac) {
    app.dock.setIcon(nativeImage.createFromPath(iconPath));
  }

  app.setAboutPanelOptions({
    applicationName: "OASIS",
    applicationVersion: "1.0.0",
    version: "1.0.0",
    copyright: "© 2026 OASIS (Omnichannel Access System for Integrated Stores)",
    iconPath: iconPath,
  });

  createWindow();
  app.on("activate", () => {
    if (!mainWindow) createWindow();
    else mainWindow.show();
  });
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  // Do nothing, let it run in background/tray
});

// --- Tab Management ---

ipcMain.handle("create-tab", (event, { tabId, url, sessionId }) => {
  const partitionName = sessionId || `tab-${tabId}`;
  const ses = session.fromPartition(`persist:${partitionName}`);

  // Fetch session settings for Proxy and User-Agent
  const allSessions = readJSON(sessionsPath(), []);
  const sessionSettings = allSessions.find((s) => s.sessionId === sessionId);

  if (sessionSettings) {
    // 1. Apply Custom Proxy Mode
    if (sessionSettings.proxy) {
      ses.setProxy({ proxyRules: sessionSettings.proxy });
    } else {
      ses.setProxy({ proxyRules: "direct://" });
    }

    // 2. Apply Custom User Agent
    if (sessionSettings.userAgent) {
      ses.setUserAgent(sessionSettings.userAgent);
    }
  }

  // --- Download Manager: Attach to each session ---
  setupDownloadHandler(ses);

  const view = new WebContentsView({
    webPreferences: {
      session: ses,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      pinchZoom: true,
    },
  });

  views[tabId] = view;
  mainWindow.contentView.addChildView(view);

  const { width, height } = mainWindow.getContentBounds();
  view.setBounds({
    x: SIDEBAR_WIDTH,
    y: NAV_HEIGHT,
    width: width - SIDEBAR_WIDTH,
    height: height - NAV_HEIGHT,
  });

  view.webContents.loadURL(url || "https://google.com");

  // IPC events for URL/title/loading
  view.webContents.on("did-navigate", (e, newUrl) => {
    if (uiView && !uiView.webContents.isDestroyed())
      uiView.webContents.send("url-updated", { tabId, url: newUrl });
  });
  view.webContents.on("did-navigate-in-page", (e, newUrl) => {
    if (uiView && !uiView.webContents.isDestroyed())
      uiView.webContents.send("url-updated", { tabId, url: newUrl });
  });
  view.webContents.on("page-favicon-updated", (e, favicons) => {
    if (favicons && favicons.length > 0) {
      if (uiView && !uiView.webContents.isDestroyed())
        uiView.webContents.send("favicon-updated", {
          tabId,
          favicon: favicons[0],
        });
    }
  });
  view.webContents.on("page-title-updated", (e, title) => {
    if (uiView && !uiView.webContents.isDestroyed())
      uiView.webContents.send("title-updated", { tabId, title });
  });
  view.webContents.on("did-start-loading", () => {
    if (uiView && !uiView.webContents.isDestroyed())
      uiView.webContents.send("loading-status", { tabId, isLoading: true });
  });
  view.webContents.on("did-stop-loading", () => {
    if (uiView && !uiView.webContents.isDestroyed())
      uiView.webContents.send("loading-status", { tabId, isLoading: false });
  });

  // --- Context Menu: Attach to each webview ---
  setupContextMenu(view.webContents, tabId);

  switchTab(tabId);
  return true;
});

function resizeActiveTab() {
  if (!activeTabId || !views[activeTabId]) return;
  const { width, height } = mainWindow.getContentBounds();

  if (currentLayout === "top") {
    // Mac: 96px (sidebar) + 48px (nav) = 144px
    // Windows/Linux: 56px (sidebar) + 48px (nav) = 104px
    const topBarHeight = isMac ? 144 : 104;
    views[activeTabId].setBounds({
      x: 0,
      y: topBarHeight,
      width: width,
      height: height - topBarHeight,
    });
  } else {
    views[activeTabId].setBounds({
      x: SIDEBAR_WIDTH,
      y: NAV_HEIGHT,
      width: width - SIDEBAR_WIDTH,
      height: height - NAV_HEIGHT,
    });
  }
}

function switchTab(tabId) {
  if (tabId === "__none__") {
    for (const [id, view] of Object.entries(views)) {
      view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    }
    activeTabId = null;
    return;
  }
  if (!views[tabId]) return;
  const { width, height } = mainWindow.getContentBounds();
  for (const [id, view] of Object.entries(views)) {
    if (id !== tabId) view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  }

  activeTabId = tabId;
  resizeActiveTab();

  if (uiView && !uiView.webContents.isDestroyed()) {
    const currentUrl = views[tabId].webContents.getURL();
    uiView.webContents.send("url-updated", { tabId, url: currentUrl });
  }
}

ipcMain.handle("switch-tab", (event, tabId) => switchTab(tabId));

ipcMain.handle("close-tab", (event, tabId) => {
  if (views[tabId]) {
    mainWindow.contentView.removeChildView(views[tabId]);
    views[tabId].webContents.close();
    delete views[tabId];
    if (activeTabId === tabId) activeTabId = null;
  }
});

ipcMain.handle("set-layout", (event, layout) => {
  currentLayout = layout;
  // Trigger a resize to apply immediately
  if (mainWindow) {
    mainWindow.emit("resize");
  }
});

// --- Navigation ---

ipcMain.handle("navigate", (event, { tabId, url }) => {
  if (views[tabId]) {
    let finalUrl = url;
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = "https://" + finalUrl;
    views[tabId].webContents.loadURL(finalUrl);
  }
});

ipcMain.handle("go-back", (event, tabId) => {
  if (views[tabId] && views[tabId].webContents.canGoBack())
    views[tabId].webContents.goBack();
});

ipcMain.handle("go-forward", (event, tabId) => {
  if (views[tabId] && views[tabId].webContents.canGoForward())
    views[tabId].webContents.goForward();
});

ipcMain.handle("reload", (event, tabId) => {
  if (views[tabId]) views[tabId].webContents.reload();
});

ipcMain.handle("zoom-in", (event, tabId) => {
  if (views[tabId]) {
    views[tabId].webContents.setZoomLevel(
      views[tabId].webContents.getZoomLevel() + 0.5,
    );
  }
});

ipcMain.handle("zoom-out", (event, tabId) => {
  if (views[tabId]) {
    views[tabId].webContents.setZoomLevel(
      views[tabId].webContents.getZoomLevel() - 0.5,
    );
  }
});

// --- Context Menu ---

function setupContextMenu(webContents, tabId) {
  webContents.on("context-menu", (event, params) => {
    const menuItems = [];

    // Link actions
    if (params.linkURL) {
      menuItems.push({
        label: "Buka Tautan di Tab Baru",
        click: () => {
          sendToUI("open-link-new-tab", { url: params.linkURL });
        },
      });
      menuItems.push({
        label: "Salin Alamat Tautan",
        click: () => {
          require("electron").clipboard.writeText(params.linkURL);
        },
      });
      menuItems.push({ type: "separator" });
    }

    // Image actions
    if (params.mediaType === "image") {
      menuItems.push({
        label: "Salin Gambar",
        click: () => webContents.copyImageAt(params.x, params.y),
      });
      menuItems.push({
        label: "Salin Alamat Gambar",
        click: () => {
          require("electron").clipboard.writeText(params.srcURL);
        },
      });
      menuItems.push({
        label: "Simpan Gambar Sebagai...",
        click: () => webContents.downloadURL(params.srcURL),
      });
      menuItems.push({ type: "separator" });
    }

    // Text selection actions
    if (params.selectionText) {
      menuItems.push({
        label: "Potong",
        role: "cut",
        enabled: params.editFlags.canCut,
      });
      menuItems.push({ label: "Salin", role: "copy" });
    }

    // Editable field actions
    if (params.isEditable) {
      if (!params.selectionText) {
        menuItems.push({
          label: "Potong",
          role: "cut",
          enabled: params.editFlags.canCut,
        });
        menuItems.push({
          label: "Salin",
          role: "copy",
          enabled: params.editFlags.canCopy,
        });
      }
      menuItems.push({ label: "Tempel", role: "paste" });
      menuItems.push({ label: "Pilih Semua", role: "selectAll" });
    }

    // General actions
    if (
      !params.linkURL &&
      !params.selectionText &&
      params.mediaType === "none" &&
      !params.isEditable
    ) {
      menuItems.push({
        label: "Kembali",
        enabled: webContents.canGoBack(),
        click: () => webContents.goBack(),
      });
      menuItems.push({
        label: "Maju",
        enabled: webContents.canGoForward(),
        click: () => webContents.goForward(),
      });
      menuItems.push({
        label: "Muat Ulang",
        click: () => webContents.reload(),
      });
      menuItems.push({ type: "separator" });
      menuItems.push({ label: "Pilih Semua", role: "selectAll" });
    }

    // Always show Copy if there's text selected
    if (menuItems.length === 0) {
      menuItems.push({
        label: "Kembali",
        enabled: webContents.canGoBack(),
        click: () => webContents.goBack(),
      });
      menuItems.push({
        label: "Maju",
        enabled: webContents.canGoForward(),
        click: () => webContents.goForward(),
      });
      menuItems.push({
        label: "Muat Ulang",
        click: () => webContents.reload(),
      });
    }

    const contextMenu = Menu.buildFromTemplate(menuItems);
    contextMenu.popup({ window: mainWindow });
  });
}

// --- Download Manager ---

const activeDownloads = new Map();

function setupDownloadHandler(ses) {
  ses.on("will-download", (event, item, webContents) => {
    const fileName = item.getFilename();
    const totalBytes = item.getTotalBytes();
    const downloadId = `dl_${Date.now()}`;

    // Notify UI about new download
    sendToUI("download-started", {
      id: downloadId,
      fileName,
      totalBytes,
      savePath: item.getSavePath(),
    });

    activeDownloads.set(downloadId, item);

    item.on("updated", (event, state) => {
      if (state === "progressing") {
        const received = item.getReceivedBytes();
        sendToUI("download-progress", {
          id: downloadId,
          fileName,
          receivedBytes: received,
          totalBytes,
          percent:
            totalBytes > 0 ? Math.round((received / totalBytes) * 100) : 0,
        });
      } else if (state === "interrupted") {
        sendToUI("download-failed", { id: downloadId, fileName });
      }
    });

    item.once("done", (event, state) => {
      activeDownloads.delete(downloadId);
      if (state === "completed") {
        sendToUI("download-complete", {
          id: downloadId,
          fileName,
          savePath: item.getSavePath(),
        });
      } else {
        sendToUI("download-failed", { id: downloadId, fileName });
      }
    });
  });
}

// --- Utility ---

function getFaviconUrl(siteUrl) {
  try {
    const urlObj = new URL(
      siteUrl.startsWith("http") ? siteUrl : "https://" + siteUrl,
    );
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`;
  } catch (e) {
    return null;
  }
}

function readJSON(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    return fallback;
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// --- Shortcuts ---

const shortcutsPath = () =>
  path.join(app.getPath("userData"), "shortcuts.json");

ipcMain.handle("get-shortcuts", () => readJSON(shortcutsPath(), []));

ipcMain.handle("add-shortcut", (event, { name, url, color }) => {
  const shortcuts = readJSON(shortcutsPath(), []);
  shortcuts.push({
    id: "sc_" + Date.now(),
    name,
    url,
    color: color || "#8B5CF6",
    favicon: getFaviconUrl(url),
  });
  writeJSON(shortcutsPath(), shortcuts);
  return shortcuts;
});

ipcMain.handle("remove-shortcut", (event, shortcutId) => {
  const shortcuts = readJSON(shortcutsPath(), []).filter(
    (s) => s.id !== shortcutId,
  );
  writeJSON(shortcutsPath(), shortcuts);
  return shortcuts;
});

// --- Sessions ---

const sessionsPath = () => path.join(app.getPath("userData"), "sessions.json");

ipcMain.handle("get-sessions", () => readJSON(sessionsPath(), []));

ipcMain.handle(
  "save-session",
  (event, { sessionId, name, url, color, favicon }) => {
    const sessions = readJSON(sessionsPath(), []);
    const idx = sessions.findIndex((s) => s.sessionId === sessionId);
    const data = {
      sessionId,
      name,
      url,
      color: color || "#8B5CF6",
      favicon: favicon || getFaviconUrl(url),
      lastUsed: Date.now(),
      proxy: idx >= 0 ? sessions[idx].proxy : undefined,
      userAgent: idx >= 0 ? sessions[idx].userAgent : undefined,
    };
    if (idx >= 0) {
      sessions[idx] = { ...sessions[idx], ...data };
    } else {
      sessions.push(data);
    }
    writeJSON(sessionsPath(), sessions);
    return sessions;
  },
);

ipcMain.handle("rename-session", (event, { sessionId, newName }) => {
  const sessions = readJSON(sessionsPath(), []);
  const idx = sessions.findIndex((s) => s.sessionId === sessionId);
  if (idx >= 0) {
    sessions[idx].name = newName;
    writeJSON(sessionsPath(), sessions);
  }
  return sessions;
});

ipcMain.handle(
  "update-session-settings",
  (event, { sessionId, proxy, userAgent }) => {
    const sessions = readJSON(sessionsPath(), []);
    const idx = sessions.findIndex((s) => s.sessionId === sessionId);
    if (idx >= 0) {
      sessions[idx].proxy = proxy;
      sessions[idx].userAgent = userAgent;
      writeJSON(sessionsPath(), sessions);
    }
    return sessions;
  },
);

ipcMain.handle("clear-session-data", async (event, sessionId) => {
  try {
    const ses = session.fromPartition(`persist:${sessionId}`);
    await ses.clearStorageData();
    await ses.clearCache();
    return true;
  } catch (e) {
    console.error("Error clearing session data", e);
    return false;
  }
});

ipcMain.handle("remove-session", (event, sessionId) => {
  const sessions = readJSON(sessionsPath(), []).filter(
    (s) => s.sessionId !== sessionId,
  );
  writeJSON(sessionsPath(), sessions);
  try {
    session.fromPartition(`persist:${sessionId}`).clearStorageData();
  } catch (e) {}
  return sessions;
});

// --- Theme ---

const prefsPath = () => path.join(app.getPath("userData"), "preferences.json");

ipcMain.handle(
  "get-theme",
  () => readJSON(prefsPath(), { theme: "dark" }).theme || "dark",
);

ipcMain.handle("set-theme", (event, theme) => {
  const prefs = readJSON(prefsPath(), {});
  prefs.theme = theme;
  writeJSON(prefsPath(), prefs);
  return theme;
});

// --- Import/Export ---

ipcMain.handle("export-data", async () => {
  const result = await dialog.showSaveDialog({
    title: "Ekspor Cadangan Lengkap OASIS (.zip)",
    defaultPath: path.join(app.getPath("downloads"), "oasis_full_backup.zip"),
    filters: [{ name: "OASIS Backup", extensions: ["zip"] }],
  });

  if (result.canceled || !result.filePath) return false;
  const filePath = result.filePath;
  const userData = app.getPath("userData");

  try {
    const output = fs.createWriteStream(filePath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on("close", () => resolve(true));
      archive.on("error", (err) => {
        console.error("Archive error:", err);
        reject(false);
      });

      archive.pipe(output);

      // Add JSON files
      const files = ["shortcuts.json", "sessions.json", "preferences.json"];
      files.forEach((f) => {
        const src = path.join(userData, f);
        if (fs.existsSync(src)) {
          archive.file(src, { name: f });
        }
      });

      // Add Partitions folder
      const partitionsDir = path.join(userData, "Partitions");
      if (fs.existsSync(partitionsDir)) {
        archive.directory(partitionsDir, "Partitions");
      }

      archive.finalize();
    });
  } catch (e) {
    console.error("Full Export error:", e);
    return false;
  }
});

ipcMain.handle("import-data", async () => {
  const result = await dialog.showOpenDialog({
    title: "Impor Cadangan Lengkap OASIS (.zip)",
    filters: [{ name: "OASIS Backup", extensions: ["zip"] }],
    properties: ["openFile"],
  });

  if (result.canceled || !result.filePaths || result.filePaths.length === 0)
    return false;

  const filePath = result.filePaths[0];
  const userData = app.getPath("userData");

  try {
    // 1. Temporary extraction
    const tempDir = path.join(
      app.getPath("temp"),
      `oasis_import_${Date.now()}`,
    );
    fs.ensureDirSync(tempDir);

    await extract(filePath, { dir: tempDir });

    // 2. Move JSONs (using fs-extra copy)
    const files = ["shortcuts.json", "sessions.json", "preferences.json"];
    files.forEach((f) => {
      const src = path.join(tempDir, f);
      if (fs.existsSync(src)) fs.copySync(src, path.join(userData, f));
    });

    // 3. Move Partitions
    const srcPartitions = path.join(tempDir, "Partitions");
    if (fs.existsSync(srcPartitions)) {
      const destPartitions = path.join(userData, "Partitions");
      fs.ensureDirSync(destPartitions);
      fs.copySync(srcPartitions, destPartitions, { overwrite: true });
    }

    // 4. Cleanup
    fs.removeSync(tempDir);

    // 5. Relaunch app to apply all session data
    setTimeout(() => {
      app.relaunch();
      app.exit(0);
    }, 1000);

    return true;
  } catch (e) {
    console.error("Full Import error:", e);
    return false;
  }
});
