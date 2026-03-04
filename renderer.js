// State
let tabs = [];
let activeTabId = null;
let tabCounter = 0;
let selectedColor = "#EE4D2D";

const MARKETPLACE_COLORS = {
  "Shopee Seller": "#EE4D2D",
  "Tokopedia Seller": "#42B549",
  "TikTok Shop": "#333333",
  "Lazada Seller": "#0F146D",
  "Blibli Seller": "#0095DA",
  "Bukalapak Seller": "#E31E52",
  "Shopify Admin": "#96BF48",
  default: "#8B5CF6",
};

// DOM
const sidebarTabs = document.getElementById("sidebar-tabs");
const addTabBtn = document.getElementById("add-tab-btn");
const urlForm = document.getElementById("url-form");
const urlInput = document.getElementById("url-input");
const navBack = document.getElementById("nav-back");
const navForward = document.getElementById("nav-forward");
const navReload = document.getElementById("nav-reload");
const navHome = document.getElementById("nav-home");
const navBar = document.getElementById("navigation-bar");
const dashboard = document.getElementById("dashboard");
const marketplaceCards = document.querySelectorAll(
  ".marketplace-card:not(.marketplace-card-open)",
);
const openUrlCard = document.getElementById("open-url-card");

// Shortcuts DOM
const userShortcutsGrid = document.getElementById("user-shortcuts-grid");
const userShortcutsEmpty = document.getElementById("user-shortcuts-empty");
const addShortcutBtn = document.getElementById("add-shortcut-btn");
const modalOverlay = document.getElementById("modal-overlay");
const shortcutForm = document.getElementById("shortcut-form");
const modalCancel = document.getElementById("modal-cancel");
const shortcutNameInput = document.getElementById("shortcut-name");
const shortcutUrlInput = document.getElementById("shortcut-url");
const colorOptions = document.querySelectorAll(".color-option");
const customColorInput = document.getElementById("custom-color-input");

// URL Modal DOM
const urlModalOverlay = document.getElementById("url-modal-overlay");
const urlModalForm = document.getElementById("url-modal-form");
const urlModalInput = document.getElementById("url-modal-input");
const urlModalCancel = document.getElementById("url-modal-cancel");

// Sessions DOM
const sessionsGrid = document.getElementById("sessions-grid");
const sessionsEmpty = document.getElementById("sessions-empty");

// Theme DOM
const themeCheckbox = document.getElementById("theme-checkbox");

// --- Initialization ---

function init() {
  // Marketplace cards → create tab with session
  marketplaceCards.forEach((card) => {
    card.addEventListener("click", () => {
      const url = card.dataset.url;
      const name = card.dataset.name;
      createSessionTab(
        url,
        name,
        MARKETPLACE_COLORS[name] || MARKETPLACE_COLORS.default,
      );
    });
  });

  // "Open URL" card → show URL modal
  openUrlCard.addEventListener("click", () => openUrlModal());

  // Add Tab → go to dashboard
  addTabBtn.addEventListener("click", () => showDashboard());
  navHome.addEventListener("click", () => showDashboard());

  // URL form submit (nav bar)
  urlForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (activeTabId) {
      let url = urlInput.value.trim();
      if (url) {
        if (!url.includes(".") || url.includes(" "))
          url = "https://www.google.com/search?q=" + encodeURIComponent(url);
        window.omniAPI.navigate({ tabId: activeTabId, url });
      }
    }
  });

  // Nav buttons
  navBack.addEventListener(
    "click",
    () => activeTabId && window.omniAPI.goBack(activeTabId),
  );
  navForward.addEventListener(
    "click",
    () => activeTabId && window.omniAPI.goForward(activeTabId),
  );
  navReload.addEventListener(
    "click",
    () => activeTabId && window.omniAPI.reload(activeTabId),
  );

  // IPC listeners
  window.omniAPI.onUrlUpdated(({ tabId, url }) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) {
      tab.url = url;
      if (tabId === activeTabId) urlInput.value = url;
      // Auto-save session URL
      if (tab.sessionId) {
        window.omniAPI.saveSession({
          sessionId: tab.sessionId,
          name: tab.name,
          url,
          color: tab.color,
        });
      }
    }
  });

  window.omniAPI.onTitleUpdated(({ tabId, title }) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) {
      tab.title = title;
      updateSidebarTab(tabId);
    }
  });

  window.omniAPI.onLoadingStatus(({ tabId, isLoading }) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) {
      tab.isLoading = isLoading;
      updateSidebarTab(tabId);
    }
  });

  // Platform
  window.omniAPI.onPlatformInfo(({ platform }) => {
    if (platform === "darwin")
      document.getElementById("sidebar").classList.add("platform-mac");
  });

  // Theme
  initTheme();
  themeCheckbox.addEventListener("change", () => {
    const newTheme = themeCheckbox.checked ? "dark" : "light";
    applyTheme(newTheme);
    window.omniAPI.setTheme(newTheme);
  });

  // --- Shortcut Modal ---
  addShortcutBtn.addEventListener("click", () => openShortcutModal());
  modalCancel.addEventListener("click", () => closeShortcutModal());
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeShortcutModal();
  });

  colorOptions.forEach((btn) => {
    btn.addEventListener("click", () => {
      colorOptions.forEach((b) => b.classList.remove("selected"));
      document
        .querySelector(".custom-color-wrapper")
        .classList.remove("selected");
      btn.classList.add("selected");
      selectedColor = btn.dataset.color;
    });
  });

  customColorInput.addEventListener("input", () => {
    colorOptions.forEach((b) => b.classList.remove("selected"));
    document.querySelector(".custom-color-wrapper").classList.add("selected");
    selectedColor = customColorInput.value;
  });

  colorOptions[0].classList.add("selected");
  selectedColor = colorOptions[0].dataset.color;

  shortcutForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = shortcutNameInput.value.trim();
    const url = shortcutUrlInput.value.trim();
    if (!name || !url) return;
    await window.omniAPI.addShortcut({ name, url, color: selectedColor });
    closeShortcutModal();
    loadUserShortcuts();
  });

  // --- URL Modal ---
  urlModalCancel.addEventListener("click", () => closeUrlModal());
  urlModalOverlay.addEventListener("click", (e) => {
    if (e.target === urlModalOverlay) closeUrlModal();
  });
  urlModalForm.addEventListener("submit", (e) => {
    e.preventDefault();
    let url = urlModalInput.value.trim();
    if (url) {
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;
      createSessionTab(url, "Custom", "#8B5CF6");
      closeUrlModal();
    }
  });

  // Load data
  loadSessions();
  loadUserShortcuts();
}

// --- Sessions ---

async function loadSessions() {
  const sessions = await window.omniAPI.getSessions();
  renderSessions(sessions);
}

function renderSessions(sessions) {
  sessionsGrid.innerHTML = "";
  if (sessions.length === 0) {
    sessionsEmpty.style.display = "block";
    sessionsGrid.style.display = "none";
    return;
  }
  sessionsEmpty.style.display = "none";
  sessionsGrid.style.display = "grid";

  // Sort by lastUsed descending
  sessions.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));

  sessions.forEach((s) => {
    const card = document.createElement("div");
    card.className = "session-card";

    const isOpen = tabs.some((t) => t.sessionId === s.sessionId);

    let faviconUrl = s.favicon;
    if (!faviconUrl && s.url) {
      try {
        const u = new URL(
          s.url.startsWith("http") ? s.url : "https://" + s.url,
        );
        faviconUrl = `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=128`;
      } catch (e) {}
    }
    const initial = (s.name || "?").charAt(0).toUpperCase();
    const faviconHtml = faviconUrl
      ? `<img class="session-favicon" src="${faviconUrl}" width="24" height="24" onerror="this.outerHTML='<span class=session-initial style=background:${encodeURIComponent(s.color || "#8B5CF6")}>${initial}</span>'">`
      : `<span class="session-initial" style="background:${s.color || "#8B5CF6"}">${initial}</span>`;

    card.innerHTML = `
      <div class="session-color-bar" style="background: ${s.color};"></div>
      <div class="session-info">
        <div class="session-name">
          ${faviconHtml}
          <strong>${escapeHtml(s.name)}</strong>
          ${isOpen ? '<span class="session-live">● Active</span>' : ""}
        </div>
        <div class="session-url">${escapeHtml(truncateUrl(s.url))}</div>
      </div>
      <div class="session-actions">
        ${
          isOpen
            ? '<button class="session-btn session-focus" title="Switch to tab">Focus</button>'
            : '<button class="session-btn session-reopen" title="Reopen with saved login">Reopen</button>'
        }
        <button class="session-btn session-delete" title="Delete session & clear data">✕</button>
      </div>
    `;

    // Focus on open tab
    const focusBtn = card.querySelector(".session-focus");
    if (focusBtn) {
      focusBtn.addEventListener("click", () => {
        const tab = tabs.find((t) => t.sessionId === s.sessionId);
        if (tab) setActiveTab(tab.id);
      });
    }

    // Reopen closed session
    const reopenBtn = card.querySelector(".session-reopen");
    if (reopenBtn) {
      reopenBtn.addEventListener("click", () => {
        createSessionTab(s.url, s.name, s.color, s.sessionId);
      });
    }

    // Delete session
    card
      .querySelector(".session-delete")
      .addEventListener("click", async (e) => {
        e.stopPropagation();
        await window.omniAPI.removeSession(s.sessionId);
        loadSessions();
      });

    sessionsGrid.appendChild(card);
  });
}

function truncateUrl(url) {
  if (url && url.length > 50) return url.substring(0, 50) + "...";
  return url || "";
}

// --- Create a tab with persistent session ---

async function createSessionTab(url, name, color, existingSessionId) {
  tabCounter++;
  const newTabId = `t${tabCounter}`;
  const sessionId = existingSessionId || `ses_${Date.now()}_${tabCounter}`;

  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  const newTab = {
    id: newTabId,
    url,
    title: name || "Loading...",
    name: name || "New Tab",
    isLoading: true,
    color: color || MARKETPLACE_COLORS.default,
    sessionId,
  };

  tabs.push(newTab);
  renderSidebarTab(newTab);

  // Create the view with sessionId for stable partition
  await window.omniAPI.createTab({ tabId: newTabId, url, sessionId });

  // Save session
  await window.omniAPI.saveSession({
    sessionId,
    name: newTab.name,
    url,
    color: newTab.color,
  });

  setActiveTab(newTabId);
  loadSessions(); // Refresh sessions panel
}

// --- User Shortcuts ---

async function loadUserShortcuts() {
  const shortcuts = await window.omniAPI.getShortcuts();
  renderUserShortcuts(shortcuts);
}

function renderUserShortcuts(shortcuts) {
  userShortcutsGrid.innerHTML = "";
  if (shortcuts.length === 0) {
    userShortcutsEmpty.style.display = "block";
    userShortcutsGrid.style.display = "none";
    return;
  }
  userShortcutsEmpty.style.display = "none";
  userShortcutsGrid.style.display = "grid";

  shortcuts.forEach((sc) => {
    const card = document.createElement("div");
    card.className = "marketplace-card user-shortcut-card";

    let iconHtml;
    if (sc.favicon) {
      iconHtml = `<img src="${sc.favicon}" width="28" height="28" style="border-radius:4px;" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>`;
    } else {
      iconHtml = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>`;
    }

    card.innerHTML = `
      <div class="card-icon" style="background: ${sc.color};">
        ${iconHtml}
      </div>
      <div class="card-info">
        <h3>${escapeHtml(sc.name)}</h3>
        <span>${escapeHtml(sc.url)}</span>
      </div>
      <button class="shortcut-delete" title="Remove shortcut">&times;</button>
    `;

    card.addEventListener("click", (e) => {
      if (!e.target.classList.contains("shortcut-delete")) {
        createSessionTab(sc.url, sc.name, sc.color);
      }
    });

    card
      .querySelector(".shortcut-delete")
      .addEventListener("click", async (e) => {
        e.stopPropagation();
        await window.omniAPI.removeShortcut(sc.id);
        loadUserShortcuts();
      });

    userShortcutsGrid.appendChild(card);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

// --- Shortcut Modal ---

function openShortcutModal() {
  shortcutNameInput.value = "";
  shortcutUrlInput.value = "";
  colorOptions.forEach((b) => b.classList.remove("selected"));
  document.querySelector(".custom-color-wrapper").classList.remove("selected");
  colorOptions[0].classList.add("selected");
  selectedColor = colorOptions[0].dataset.color;
  customColorInput.value = "#6366f1";
  modalOverlay.classList.remove("hidden");
  shortcutNameInput.focus();
}

function closeShortcutModal() {
  modalOverlay.classList.add("hidden");
}

// --- URL Modal ---

function openUrlModal() {
  urlModalInput.value = "";
  urlModalOverlay.classList.remove("hidden");
  setTimeout(() => urlModalInput.focus(), 100);
}

function closeUrlModal() {
  urlModalOverlay.classList.add("hidden");
}

// --- Dashboard ---

function showDashboard() {
  document
    .querySelectorAll(".sidebar-tab")
    .forEach((el) => el.classList.remove("active"));
  activeTabId = null;
  dashboard.classList.remove("hidden");
  navBar.classList.add("hidden");
  window.omniAPI.switchTab("__none__");
  loadSessions();
  loadUserShortcuts();
}

function hideDashboard() {
  dashboard.classList.add("hidden");
  navBar.classList.remove("hidden");
}

// --- Sidebar Tab Management ---

function renderSidebarTab(tab) {
  const el = document.createElement("div");
  el.className = "sidebar-tab";
  el.id = `sidebar-tab-${tab.id}`;
  el.innerHTML = `
    <span class="sidebar-tab-dot" style="background-color: ${tab.color};"></span>
    <span class="sidebar-tab-title">${tab.name}</span>
    <button class="sidebar-tab-close" title="Close tab">&times;</button>
  `;
  el.addEventListener("click", (e) => {
    if (!e.target.classList.contains("sidebar-tab-close")) setActiveTab(tab.id);
  });
  el.querySelector(".sidebar-tab-close").addEventListener("click", (e) => {
    e.stopPropagation();
    closeTab(tab.id);
  });
  sidebarTabs.appendChild(el);
}

function updateSidebarTab(tabId) {
  const tab = tabs.find((t) => t.id === tabId);
  if (!tab) return;
  const el = document.getElementById(`sidebar-tab-${tabId}`);
  if (el) {
    const titleEl = el.querySelector(".sidebar-tab-title");
    let displayTitle = tab.title || tab.name;
    if (tab.isLoading) displayTitle = "⏳ " + displayTitle;
    titleEl.textContent = displayTitle;
  }
}

async function setActiveTab(tabId) {
  activeTabId = tabId;
  hideDashboard();
  document
    .querySelectorAll(".sidebar-tab")
    .forEach((el) => el.classList.remove("active"));
  const activeEl = document.getElementById(`sidebar-tab-${tabId}`);
  if (activeEl) {
    activeEl.classList.add("active");
    activeEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  const tab = tabs.find((t) => t.id === tabId);
  if (tab) urlInput.value = tab.url;
  await window.omniAPI.switchTab(tabId);
}

async function closeTab(tabId) {
  const index = tabs.findIndex((t) => t.id === tabId);
  if (index === -1) return;
  tabs.splice(index, 1);
  const tabEl = document.getElementById(`sidebar-tab-${tabId}`);
  if (tabEl) tabEl.remove();
  await window.omniAPI.closeTab(tabId);
  if (activeTabId === tabId) {
    if (tabs.length > 0) {
      const nextTab = tabs[Math.max(0, index - 1)];
      setActiveTab(nextTab.id);
    } else {
      showDashboard();
    }
  }
}

// --- Theme ---

async function initTheme() {
  const savedTheme = await window.omniAPI.getTheme();
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeCheckbox.checked = theme === "dark";
}

// Boot
document.addEventListener("DOMContentLoaded", init);
