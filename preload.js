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

  // Theme
  getTheme: () => ipcRenderer.invoke("get-theme"),
  setTheme: (theme) => ipcRenderer.invoke("set-theme", theme),

  // Navigation
  navigate: (data) => ipcRenderer.invoke("navigate", data),
  goBack: (tabId) => ipcRenderer.invoke("go-back", tabId),
  goForward: (tabId) => ipcRenderer.invoke("go-forward", tabId),
  reload: (tabId) => ipcRenderer.invoke("reload", tabId),

  // Listeners
  onUrlUpdated: (cb) => ipcRenderer.on("url-updated", (e, d) => cb(d)),
  onTitleUpdated: (cb) => ipcRenderer.on("title-updated", (e, d) => cb(d)),
  onLoadingStatus: (cb) => ipcRenderer.on("loading-status", (e, d) => cb(d)),
  onPlatformInfo: (cb) => ipcRenderer.on("platform-info", (e, d) => cb(d)),
});
