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
const fs = require("fs");

let mainWindow;
let uiView;
let tray;
let views = {};
let activeTabId = null;
let isQuitting = false;

const isMac = process.platform === "darwin";
const SIDEBAR_WIDTH = 220;
const NAV_HEIGHT = 48;
const iconPath = path.join(__dirname, "assets", "icon", "icon.png");

function createWindow() {
  mainWindow = new BaseWindow({
    width: 1280,
    height: 800,
    title: "OmniToko",
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
    if (activeTabId && views[activeTabId]) {
      views[activeTabId].setBounds({
        x: SIDEBAR_WIDTH,
        y: NAV_HEIGHT,
        width: width - SIDEBAR_WIDTH,
        height: height - NAV_HEIGHT,
      });
    }
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
      label: "Show OmniToko",
      click: () => {
        if (mainWindow) mainWindow.show();
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setToolTip("OmniToko");
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
      label: "File",
      submenu: [
        {
          label: "New Tab",
          accelerator: "CmdOrCtrl+T",
          click: () => sendToUI("shortcut-new-tab"),
        },
        {
          label: "Close Tab",
          accelerator: "CmdOrCtrl+W",
          click: () => sendToUI("shortcut-close-tab"),
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
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
      label: "View",
      submenu: [
        {
          label: "Reload Tab",
          accelerator: "CmdOrCtrl+R",
          click: () => sendToUI("shortcut-reload"),
        },
        { type: "separator" },
        {
          label: "Zoom In",
          accelerator: "CmdOrCtrl+Plus",
          click: () => zoomActiveTab(0.1),
        },
        {
          label: "Zoom Out",
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
          label: "Focus URL Bar",
          accelerator: "CmdOrCtrl+L",
          click: () => sendToUI("shortcut-focus-url"),
        },
        {
          label: "Go to Dashboard",
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
          label: "Next Tab",
          accelerator: "CmdOrCtrl+Shift+]",
          click: () => sendToUI("shortcut-next-tab"),
        },
        {
          label: "Previous Tab",
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
      label: "Window",
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

  // --- Download Manager: Attach to each session ---
  setupDownloadHandler(ses);

  const view = new WebContentsView({
    webPreferences: {
      session: ses,
      nodeIntegration: false,
      contextIsolation: true,
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
  views[tabId].setBounds({
    x: SIDEBAR_WIDTH,
    y: NAV_HEIGHT,
    width: width - SIDEBAR_WIDTH,
    height: height - NAV_HEIGHT,
  });
  activeTabId = tabId;
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

// --- Context Menu ---

function setupContextMenu(webContents, tabId) {
  webContents.on("context-menu", (event, params) => {
    const menuItems = [];

    // Link actions
    if (params.linkURL) {
      menuItems.push({
        label: "Open Link in New Tab",
        click: () => {
          sendToUI("open-link-new-tab", { url: params.linkURL });
        },
      });
      menuItems.push({
        label: "Copy Link Address",
        click: () => {
          require("electron").clipboard.writeText(params.linkURL);
        },
      });
      menuItems.push({ type: "separator" });
    }

    // Image actions
    if (params.mediaType === "image") {
      menuItems.push({
        label: "Copy Image",
        click: () => webContents.copyImageAt(params.x, params.y),
      });
      menuItems.push({
        label: "Copy Image Address",
        click: () => {
          require("electron").clipboard.writeText(params.srcURL);
        },
      });
      menuItems.push({
        label: "Save Image As...",
        click: () => webContents.downloadURL(params.srcURL),
      });
      menuItems.push({ type: "separator" });
    }

    // Text selection actions
    if (params.selectionText) {
      menuItems.push({
        label: "Cut",
        role: "cut",
        enabled: params.editFlags.canCut,
      });
      menuItems.push({ label: "Copy", role: "copy" });
    }

    // Editable field actions
    if (params.isEditable) {
      if (!params.selectionText) {
        menuItems.push({
          label: "Cut",
          role: "cut",
          enabled: params.editFlags.canCut,
        });
        menuItems.push({
          label: "Copy",
          role: "copy",
          enabled: params.editFlags.canCopy,
        });
      }
      menuItems.push({ label: "Paste", role: "paste" });
      menuItems.push({ label: "Select All", role: "selectAll" });
    }

    // General actions
    if (
      !params.linkURL &&
      !params.selectionText &&
      params.mediaType === "none" &&
      !params.isEditable
    ) {
      menuItems.push({
        label: "Back",
        enabled: webContents.canGoBack(),
        click: () => webContents.goBack(),
      });
      menuItems.push({
        label: "Forward",
        enabled: webContents.canGoForward(),
        click: () => webContents.goForward(),
      });
      menuItems.push({
        label: "Reload",
        click: () => webContents.reload(),
      });
      menuItems.push({ type: "separator" });
      menuItems.push({ label: "Select All", role: "selectAll" });
    }

    // Always show Copy if there's text selected
    if (menuItems.length === 0) {
      menuItems.push({
        label: "Back",
        enabled: webContents.canGoBack(),
        click: () => webContents.goBack(),
      });
      menuItems.push({
        label: "Forward",
        enabled: webContents.canGoForward(),
        click: () => webContents.goForward(),
      });
      menuItems.push({ label: "Reload", click: () => webContents.reload() });
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
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "Export OmniToko Data",
    defaultPath: "omnitoko_backup.json",
    filters: [{ name: "JSON", extensions: ["json"] }],
  });

  if (!filePath) return false;

  const data = {
    shortcuts: readJSON(shortcutsPath(), []),
    sessions: readJSON(sessionsPath(), []),
    preferences: readJSON(prefsPath(), {}),
  };

  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    return false;
  }
});

ipcMain.handle("import-data", async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: "Import OmniToko Data",
    filters: [{ name: "JSON", extensions: ["json"] }],
    properties: ["openFile"],
  });

  if (!filePaths || filePaths.length === 0) return false;

  try {
    const data = JSON.parse(fs.readFileSync(filePaths[0], "utf-8"));
    if (data.shortcuts) writeJSON(shortcutsPath(), data.shortcuts);
    if (data.sessions) writeJSON(sessionsPath(), data.sessions);
    if (data.preferences) writeJSON(prefsPath(), data.preferences);
    return true;
  } catch (e) {
    return false;
  }
});
