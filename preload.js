const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("omniAPI", {
  // Tabs
  createTab: (data) => ipcRenderer.invoke("create-tab", data),
  switchTab: (tabId) => ipcRenderer.invoke("switch-tab", tabId),
  closeTab: (tabId) => ipcRenderer.invoke("close-tab", tabId),

  // Shortcuts
  getShortcuts: () => ipcRenderer.invoke("get-shortcuts"),
  addShortcut: (data) => ipcRenderer.invoke("add-shortcut", data),
  removeShortcut: (id) => ipcRenderer.invoke("remove-shortcut", id),

  // Sessions
  getSessions: () => ipcRenderer.invoke("get-sessions"),
  saveSession: (data) => ipcRenderer.invoke("save-session", data),
  removeSession: (id) => ipcRenderer.invoke("remove-session", id),
  renameSession: (data) => ipcRenderer.invoke("rename-session", data),
  updateSessionSettings: (data) =>
    ipcRenderer.invoke("update-session-settings", data),
  clearSessionData: (id) => ipcRenderer.invoke("clear-session-data", id),

  // Theme
  getTheme: () => ipcRenderer.invoke("get-theme"),
  setTheme: (theme) => ipcRenderer.invoke("set-theme", theme),

  // Navigation
  navigate: (data) => ipcRenderer.invoke("navigate", data),
  goBack: (tabId) => ipcRenderer.invoke("go-back", tabId),
  goForward: (tabId) => ipcRenderer.invoke("go-forward", tabId),
  reload: (tabId) => ipcRenderer.invoke("reload", tabId),
  zoomIn: (tabId) => ipcRenderer.invoke("zoom-in", tabId),
  zoomOut: (tabId) => ipcRenderer.invoke("zoom-out", tabId),

  // Layout Controls
  setLayout: (layout) => ipcRenderer.invoke("set-layout", layout),

  // Listeners — Tab events
  onUrlUpdated: (cb) => ipcRenderer.on("url-updated", (e, d) => cb(d)),
  onTitleUpdated: (cb) => ipcRenderer.on("title-updated", (e, d) => cb(d)),
  onLoadingStatus: (cb) => ipcRenderer.on("loading-status", (e, d) => cb(d)),
  onPlatformInfo: (cb) => ipcRenderer.on("platform-info", (e, d) => cb(d)),

  // Listeners — Keyboard shortcuts
  onShortcutNewTab: (cb) => ipcRenderer.on("shortcut-new-tab", () => cb()),
  onShortcutCloseTab: (cb) => ipcRenderer.on("shortcut-close-tab", () => cb()),
  onShortcutReload: (cb) => ipcRenderer.on("shortcut-reload", () => cb()),
  onShortcutFocusUrl: (cb) => ipcRenderer.on("shortcut-focus-url", () => cb()),
  onShortcutGoHome: (cb) => ipcRenderer.on("shortcut-go-home", () => cb()),
  onShortcutNextTab: (cb) => ipcRenderer.on("shortcut-next-tab", () => cb()),
  onShortcutPrevTab: (cb) => ipcRenderer.on("shortcut-prev-tab", () => cb()),
  onShortcutSwitchTab: (cb) =>
    ipcRenderer.on("shortcut-switch-tab", (e, idx) => cb(idx)),

  // Listeners — Context menu
  onOpenLinkNewTab: (cb) =>
    ipcRenderer.on("open-link-new-tab", (e, d) => cb(d)),

  // Listeners — Downloads
  onDownloadStarted: (cb) =>
    ipcRenderer.on("download-started", (e, d) => cb(d)),
  onDownloadProgress: (cb) =>
    ipcRenderer.on("download-progress", (e, d) => cb(d)),
  onDownloadComplete: (cb) =>
    ipcRenderer.on("download-complete", (e, d) => cb(d)),
  onDownloadFailed: (cb) => ipcRenderer.on("download-failed", (e, d) => cb(d)),
});
