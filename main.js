const {
  app,
  BaseWindow,
  WebContentsView,
  ipcMain,
  session,
} = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;
let uiView;
let views = {};
let activeTabId = null;

const isMac = process.platform === "darwin";
const SIDEBAR_WIDTH = 220;
const NAV_HEIGHT = 48;

function createWindow() {
  mainWindow = new BaseWindow({
    width: 1280,
    height: 800,
    title: "OmniToko",
    titleBarStyle: isMac ? "hiddenInset" : "default",
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

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (!mainWindow) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// --- Tab Management ---

ipcMain.handle("create-tab", (event, { tabId, url, sessionId }) => {
  const partitionName = sessionId || `tab-${tabId}`;
  const ses = session.fromPartition(`persist:${partitionName}`);

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

// --- Sessions (persist login state) ---

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
