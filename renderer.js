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

// Advanced Features DOM
const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const zoomInBtn = document.getElementById("zoom-in-btn");
const zoomOutBtn = document.getElementById("zoom-out-btn");
const layoutToggleBtn = document.getElementById("layout-toggle-btn");
const renameModalOverlay = document.getElementById("rename-modal-overlay");
const renameForm = document.getElementById("rename-form");
const renameInput = document.getElementById("rename-input");
const renameCancel = document.getElementById("rename-cancel");

// Phase 3 Modal DOM
const sessionSettingsModalOverlay = document.getElementById(
  "session-settings-modal-overlay",
);
const sessionSettingsForm = document.getElementById("session-settings-form");
const proxyInput = document.getElementById("proxy-input");
const uaInput = document.getElementById("ua-input");
const sessionSettingsCancel = document.getElementById(
  "session-settings-cancel",
);

let currentRenameSessionId = null;
let currentSettingsSessionId = null;
const importLoadingOverlay = document.getElementById("import-loading-overlay");

// --- Initialization ---

function init() {
  // Inject Dynamic Favicons for Marketplace Cards
  marketplaceCards.forEach((card) => {
    const url = card.dataset.url;
    const iconContainer = card.querySelector(".card-icon");
    if (url && iconContainer) {
      const faviconUrl = getFaviconUrl(url);
      if (faviconUrl) {
        // Remove the hardcoded gradient background from the container
        iconContainer.style.background = "transparent";

        // Inject the dynamic favicon without enforcing a white background block
        iconContainer.innerHTML = `<img src="${faviconUrl}" width="32" height="32" style="object-fit: contain;" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
          <svg style="display:none;" width="32" height="32" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
          </svg>`;
      }
    }
  });

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
      if (!tab.isRenamedManually) {
        tab.title = title;
      }
      // Parse notification count: "(1) Shopee Seller" -> regex
      const badgeMatch = title.match(/^\((\d+)\)/);
      tab.badgeCount = badgeMatch ? parseInt(badgeMatch[1], 10) : 0;
      updateSidebarTab(tabId);
    }
  });

  window.omniAPI.onFaviconUpdated(({ tabId, favicon }) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) {
      // For Shopee, always try to get the favicon from the URL directly
      // as their dynamic favicon often doesn't reflect the correct one.
      const resolvedFavicon = tab.url.includes("shopee.co.id")
        ? getFaviconUrl(tab.url)
        : favicon;

      if (tab.favicon !== resolvedFavicon) {
        tab.favicon = resolvedFavicon;
        if (tab.sessionId) {
          window.omniAPI.saveSession({
            sessionId: tab.sessionId,
            name: tab.name,
            url: tab.url,
            color: tab.color,
            favicon: resolvedFavicon, // Use the resolved favicon
          });
          loadSessions();
        }
      }
    }
  });

  window.omniAPI.onLoadingStatus(({ tabId, isLoading }) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) {
      tab.isLoading = isLoading;
      updateSidebarTab(tabId);
    }

    // Global Loading Bar logic was removed
  });

  // Zoom controls
  zoomInBtn.addEventListener("click", () => {
    if (activeTabId) window.omniAPI.zoomIn(activeTabId);
  });
  zoomOutBtn.addEventListener("click", () => {
    if (activeTabId) window.omniAPI.zoomOut(activeTabId);
  });

  // Layout toggle
  const currentLayout = localStorage.getItem("omni-layout") || "left";
  if (currentLayout === "top") document.body.classList.add("layout-top");
  window.omniAPI.setLayout(currentLayout);

  layoutToggleBtn.addEventListener("click", () => {
    const isTop = document.body.classList.toggle("layout-top");
    const newLayout = isTop ? "top" : "left";
    localStorage.setItem("omni-layout", newLayout);
    window.omniAPI.setLayout(newLayout);
    reRenderSidebar();
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
    const favicon = getFaviconUrl(url);
    await window.omniAPI.addShortcut({
      name,
      url,
      color: selectedColor,
      favicon,
    });
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

  // --- Keyboard Shortcuts (from main process menu) ---
  window.omniAPI.onShortcutNewTab(() => showDashboard());
  window.omniAPI.onShortcutCloseTab(() => {
    if (activeTabId) closeTab(activeTabId);
  });
  window.omniAPI.onShortcutReload(() => {
    if (activeTabId) window.omniAPI.reload(activeTabId);
  });
  window.omniAPI.onShortcutFocusUrl(() => {
    if (activeTabId) urlInput.focus();
  });
  window.omniAPI.onShortcutGoHome(() => showDashboard());
  window.omniAPI.onShortcutNextTab(() => switchTabByOffset(1));
  window.omniAPI.onShortcutPrevTab(() => switchTabByOffset(-1));
  window.omniAPI.onShortcutSwitchTab((idx) => {
    if (tabs[idx]) setActiveTab(tabs[idx].id);
  });

  // --- Context Menu: Open link in new tab ---
  window.omniAPI.onOpenLinkNewTab(({ url }) => {
    createSessionTab(url, "Link", "#8B5CF6");
  });

  // --- Download Notifications ---
  window.omniAPI.onDownloadStarted(({ id, fileName }) => {
    showDownloadToast(id, `⬇️ Mengunduh: ${fileName}`, 0);
  });
  window.omniAPI.onDownloadProgress(({ id, fileName, percent }) => {
    updateDownloadToast(id, `⬇️ ${fileName} — ${percent}%`, percent);
  });
  window.omniAPI.onDownloadComplete(({ id, fileName }) => {
    updateDownloadToast(id, `✅ Terunduh: ${fileName}`, 100);
    setTimeout(() => removeDownloadToast(id), 4000);
  });
  window.omniAPI.onDownloadFailed(({ id, fileName }) => {
    updateDownloadToast(id, `❌ Gagal: ${fileName}`, 0);
    setTimeout(() => removeDownloadToast(id), 4000);
  });

  // --- Zoom Controls ---
  zoomInBtn.addEventListener("click", () => {
    if (activeTabId) window.omniAPI.zoomIn(activeTabId); // We'll add zoom IPC or handle via input simulation
  });
  zoomOutBtn.addEventListener("click", () => {
    if (activeTabId) window.omniAPI.zoomOut(activeTabId);
  });

  // --- Rename Modal ---
  renameCancel.addEventListener("click", () => {
    renameModalOverlay.classList.add("hidden");
    currentRenameSessionId = null;
  });
  renameModalOverlay.addEventListener("click", (e) => {
    if (e.target === renameModalOverlay) {
      renameModalOverlay.classList.add("hidden");
      currentRenameSessionId = null;
    }
  });

  // --- Session Settings Modal ---
  sessionSettingsCancel.addEventListener("click", () => {
    sessionSettingsModalOverlay.classList.add("hidden");
    currentSettingsSessionId = null;
  });

  sessionSettingsModalOverlay.addEventListener("click", (e) => {
    if (e.target === sessionSettingsModalOverlay) {
      sessionSettingsModalOverlay.classList.add("hidden");
      currentSettingsSessionId = null;
    }
  });

  sessionSettingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (currentSettingsSessionId) {
      await window.omniAPI.updateSessionSettings({
        sessionId: currentSettingsSessionId,
        proxy: proxyInput.value.trim(),
        userAgent: uaInput.value.trim(),
      });
      sessionSettingsModalOverlay.classList.add("hidden");
      currentSettingsSessionId = null;
      loadSessions();
      alert(
        "Pengaturan disimpan. Buka kembali sesi untuk menerapkan perubahan.",
      );
    }
  });

  renameForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (currentRenameSessionId) {
      await window.omniAPI.renameSession({
        sessionId: currentRenameSessionId,
        newName: renameInput.value.trim() || "Tanpa Nama",
      });
      // Also update open tab title if active
      const activeTab = tabs.find(
        (t) => t.sessionId === currentRenameSessionId,
      );
      if (activeTab) {
        activeTab.name = renameInput.value.trim();
        // Update the tab title variable as well so it doesn't get overwritten
        activeTab.title = renameInput.value.trim();
        activeTab.isRenamedManually = true;
        updateSidebarTab(activeTab.id);

        // Ensure the session is saved with the new name and current URL
        await window.omniAPI.saveSession({
          sessionId: activeTab.sessionId,
          name: activeTab.name,
          url: activeTab.url,
          color: activeTab.color,
        });
      }

      renameModalOverlay.classList.add("hidden");
      currentRenameSessionId = null;
      loadSessions();
    }
  });

  // --- Import / Export ---
  exportBtn.addEventListener("click", async () => {
    showDownloadToast("export", "📦 Menyiapkan cadangan penuh...", 30);
    const success = await window.omniAPI.exportData();
    if (success) {
      showDownloadToast("export", "✅ Cadangan disimpan! (.zip)", 100);
    } else {
      showDownloadToast("export", "❌ Gagal mengekspor cadangan.", 0);
    }
    setTimeout(() => removeDownloadToast("export"), 2000);
  });

  importBtn.addEventListener("click", async () => {
    if (
      confirm(
        "Mengimpor data akan menimpa sesi dan pintasan saat ini. Lanjutkan?",
      )
    ) {
      showDownloadToast("import", "📦 Memulihkan data... Mohon tunggu", 50);
      importLoadingOverlay.classList.remove("hidden");
      const success = await window.omniAPI.importData();
      if (success) {
        showDownloadToast(
          "import",
          "✅ Pemulihan Berhasil! Me-restart aplikasi...",
          100,
        );
      } else {
        importLoadingOverlay.classList.add("hidden");
        alert("Gagal mengimpor data. Pastikan file .zip cadangan valid.");
        removeDownloadToast("import");
      }
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
    // Always re-resolve Shopee favicons to ensure we don't use stale seller subdomains
    if (s.url && s.url.includes("shopee.co.id")) {
      faviconUrl = getFaviconUrl(s.url);
    } else if (!faviconUrl && s.url) {
      faviconUrl = getFaviconUrl(s.url);
    }
    const initial = (s.name || "?").charAt(0).toUpperCase();
    const faviconHtml = faviconUrl
      ? `<img class="session-favicon" src="${faviconUrl}" width="24" height="24" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex'">
         <span class="session-initial" style="display:none; background:${s.color || "#8B5CF6"}">${initial}</span>`
      : `<span class="session-initial" style="background:${s.color || "#8B5CF6"}">${initial}</span>`;

    card.innerHTML = `
      <div class="session-color-bar" style="background: ${s.color};"></div>
      <div class="session-info" data-tooltip="${escapeHtml(s.name)}">
        <div class="session-name">
          ${faviconHtml}
          <strong>${escapeHtml(s.name)}</strong>
          ${isOpen ? '<span class="session-live">● Aktif</span>' : ""}
        </div>
        <div class="session-url">${escapeHtml(truncateUrl(s.url))}</div>
      </div>
      <div class="session-actions">
        ${
          isOpen
            ? '<button class="session-btn session-focus" title="Pindah ke tab">Fokus</button>'
            : '<button class="session-btn session-reopen" title="Buka kembali dengan login tersimpan">Buka</button>'
        }
        
        <!-- Advanced Options Dropdown -->
        <div class="dropdown-container">
          <button class="dropdown-btn" title="Opsi Lanjutan">⋮</button>
          <div class="dropdown-menu">
            <button class="dropdown-item session-settings-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              <span>Proxy & User-Agent</span>
            </button>
            <button class="dropdown-item session-duplicate-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              <span>Duplikat Sesi</span>
            </button>
            <button class="dropdown-item session-rename-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              <span>Ubah Nama</span>
            </button>
            <button class="dropdown-item session-clear-btn danger">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12a10 10 0 1 0 20 0 10 10 0 0 0-20 0z"></path><path d="M14.5 14a2.5 2.5 0 0 1-5 0"></path><circle cx="9" cy="10" r="1" fill="currentColor"></circle><circle cx="15" cy="10" r="1" fill="currentColor"></circle><circle cx="12" cy="6" r="1" fill="currentColor"></circle></svg>
              <span>Hapus Cookie</span>
            </button>
            <button class="dropdown-item session-delete-btn danger">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span>Hapus Sesi</span>
            </button>
          </div>
        </div>
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

    // Dropdown toggle
    const dropdownBtn = card.querySelector(".dropdown-btn");
    const dropdownMenu = card.querySelector(".dropdown-menu");
    if (dropdownBtn && dropdownMenu) {
      dropdownBtn.addEventListener("click", (e) => {
        e.stopPropagation();

        const isShowing = dropdownMenu.classList.contains("show");

        // Close all other dropdowns
        document.querySelectorAll(".dropdown-menu").forEach((el) => {
          el.classList.remove("show");
          el.style.top = "";
          el.style.left = "";
          el.style.bottom = "";
        });

        if (!isShowing) {
          dropdownMenu.classList.add("show");

          // Calculate fixed position
          const rect = dropdownBtn.getBoundingClientRect();
          const menuRect = dropdownMenu.getBoundingClientRect();

          let topPosition = rect.bottom + 6;

          // If it goes off the bottom of the screen, show above
          if (topPosition + menuRect.height > window.innerHeight) {
            topPosition = rect.top - menuRect.height - 6;
            dropdownMenu.style.transformOrigin = "bottom right";
          } else {
            dropdownMenu.style.transformOrigin = "top right";
          }

          dropdownMenu.style.top = `${topPosition}px`;

          // Align right edge of menu with right edge of button
          dropdownMenu.style.left = `${rect.right - menuRect.width}px`;
        }
      });
    }

    // Modal Triggers
    const renameBtn = card.querySelector(".session-rename-btn");
    if (renameBtn) {
      renameBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdownMenu.classList.remove("show");
        currentRenameSessionId = s.sessionId;
        renameInput.value = s.name;
        renameModalOverlay.classList.remove("hidden");
        renameInput.focus();
      });
    }

    const settingsBtn = card.querySelector(".session-settings-btn");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdownMenu.classList.remove("show");
        openSessionSettings(s);
      });
    }

    const duplicateBtn = card.querySelector(".session-duplicate-btn");
    if (duplicateBtn) {
      duplicateBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdownMenu.classList.remove("show");
        createSessionTab(s.url, s.name + " (Salinan)", s.color, s.sessionId);
      });
    }

    const clearCookiesBtn = card.querySelector(".session-clear-btn");
    if (clearCookiesBtn) {
      clearCookiesBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        dropdownMenu.classList.remove("show");
        if (
          confirm(
            `Apakah Anda yakin ingin menghapus cookie untuk "${s.name}"?\nAnda akan log keluar!`,
          )
        ) {
          await window.omniAPI.clearSessionData(s.sessionId);
          alert("Cookie berhasil dihapus.");
        }
      });
    }

    // Delete session
    const deleteBtn = card.querySelector(".session-delete-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        dropdownMenu.classList.remove("show");
        if (confirm(`Hapus sesi "${s.name}" secara permanen?`)) {
          await window.omniAPI.removeSession(s.sessionId);
          loadSessions();
        }
      });
    }

    sessionsGrid.appendChild(card);
  });

  // Close dropdowns when clicking outside
  document.addEventListener("click", () => {
    document.querySelectorAll(".dropdown-menu").forEach((el) => {
      el.classList.remove("show");
      el.style.top = "";
      el.style.left = "";
    });
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
    title: name || "Memuat...",
    name: name || "Tab Baru",
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

    let favicon = sc.favicon;
    if (!favicon && sc.url) {
      favicon = getFaviconUrl(sc.url);
    }

    let iconHtml;
    if (favicon) {
      iconHtml = `<img src="${favicon}" width="28" height="28" style="border-radius:4px;" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
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
      <button class="shortcut-delete" title="Hapus pintasan">&times;</button>
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

function getFaviconUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : "https://" + url);

    // Special case for Shopee: any shopee.co.id subdomain should use root domain icon
    if (u.hostname.includes("shopee.co.id")) {
      return `https://www.google.com/s2/favicons?sz=128&domain=shopee.co.id`;
    }

    const parts = u.hostname.split(".");
    let domain = u.hostname;
    if (parts.length > 2) {
      if (
        parts[parts.length - 2] === "co" ||
        parts[parts.length - 2] === "com" ||
        parts[parts.length - 2] === "web"
      ) {
        domain = parts.slice(-3).join(".");
      } else {
        domain = parts.slice(-2).join(".");
      }
    }
    return `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
  } catch (e) {
    return null;
  }
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

// --- Session Settings Modal ---

function openSessionSettings(sessionData) {
  currentSettingsSessionId = sessionData.sessionId;
  proxyInput.value = sessionData.proxy || "";
  uaInput.value = sessionData.userAgent || "";
  sessionSettingsModalOverlay.classList.remove("hidden");
  proxyInput.focus();
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

// --- Sidebar Tab Management with Drag and Drop ---

let draggedTabId = null;

function renderSidebarTab(tab) {
  const el = document.createElement("div");
  el.className = "sidebar-tab";
  el.id = `sidebar-tab-${tab.id}`;
  el.setAttribute("draggable", "true");
  el.dataset.tooltip = tab.name;

  const badgeHtml =
    tab.badgeCount > 0
      ? `<span class="tab-badge">${tab.badgeCount}</span>`
      : "";

  el.innerHTML = `
    <span class="sidebar-tab-dot" style="background-color: ${tab.color};"></span>
    <span class="sidebar-tab-title">${escapeHtml(tab.name)}</span>
    ${badgeHtml}
    <button class="sidebar-tab-close" title="Close tab">&times;</button>
  `;

  el.addEventListener("click", (e) => {
    if (!e.target.classList.contains("sidebar-tab-close")) setActiveTab(tab.id);
  });

  el.querySelector(".sidebar-tab-close").addEventListener("click", (e) => {
    e.stopPropagation();
    closeTab(tab.id);
  });

  // Drag and Drop Logic
  el.addEventListener("dragstart", (e) => {
    draggedTabId = tab.id;
    e.dataTransfer.effectAllowed = "move";
    el.style.opacity = "0.5";
  });

  el.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedTabId !== tab.id) el.classList.add("drag-over");
  });

  el.addEventListener("dragleave", () => {
    el.classList.remove("drag-over");
  });

  el.addEventListener("dragend", () => {
    el.style.opacity = "1";
    document
      .querySelectorAll(".sidebar-tab")
      .forEach((t) => t.classList.remove("drag-over"));
  });

  el.addEventListener("drop", (e) => {
    e.preventDefault();
    el.classList.remove("drag-over");
    if (draggedTabId && draggedTabId !== tab.id) {
      // Reorder in array
      const fromIdx = tabs.findIndex((t) => t.id === draggedTabId);
      const toIdx = tabs.findIndex((t) => t.id === tab.id);

      if (fromIdx !== -1 && toIdx !== -1) {
        const [movedTab] = tabs.splice(fromIdx, 1);
        tabs.splice(toIdx, 0, movedTab);
        reRenderSidebar();
      }
    }
  });

  sidebarTabs.appendChild(el);
}

function reRenderSidebar() {
  sidebarTabs.innerHTML = "";
  tabs.forEach((tab) => renderSidebarTab(tab));
  if (activeTabId) {
    const el = document.getElementById(`sidebar-tab-${activeTabId}`);
    if (el) el.classList.add("active");
  }
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
    el.dataset.tooltip = tab.name;

    // Update Badge
    let badgeEl = el.querySelector(".tab-badge");
    if (tab.badgeCount > 0) {
      if (!badgeEl) {
        badgeEl = document.createElement("span");
        badgeEl.className = "tab-badge";
        // insert before the close button
        el.insertBefore(badgeEl, el.querySelector(".sidebar-tab-close"));
      }
      badgeEl.textContent = tab.badgeCount;
    } else if (badgeEl) {
      badgeEl.remove();
    }
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

// --- Tab Navigation by Offset ---

function switchTabByOffset(offset) {
  if (tabs.length === 0) return;
  const currentIdx = tabs.findIndex((t) => t.id === activeTabId);
  let newIdx = currentIdx + offset;
  if (newIdx < 0) newIdx = tabs.length - 1;
  if (newIdx >= tabs.length) newIdx = 0;
  setActiveTab(tabs[newIdx].id);
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

// --- Download Toast Notifications ---

function getOrCreateToastContainer() {
  let container = document.getElementById("download-toasts");
  if (!container) {
    container = document.createElement("div");
    container.id = "download-toasts";
    document.body.appendChild(container);
  }
  return container;
}

function showDownloadToast(id, message, percent) {
  const container = getOrCreateToastContainer();
  const toast = document.createElement("div");
  toast.className = "download-toast";
  toast.id = `toast-${id}`;
  toast.innerHTML = `
    <div class="toast-header">
      <div class="toast-message">${message}</div>
      <button class="toast-close" title="Tutup">×</button>
    </div>
  `;

  // Add close event
  toast.querySelector(".toast-close").addEventListener("click", (e) => {
    e.stopPropagation();
    removeDownloadToast(id);
  });

  container.appendChild(toast);
  // Trigger animation
  requestAnimationFrame(() => toast.classList.add("visible"));
}

function updateDownloadToast(id, message, percent) {
  const toast = document.getElementById(`toast-${id}`);
  if (toast) {
    toast.querySelector(".toast-message").textContent = message;
  } else {
    showDownloadToast(id, message, percent);
  }
}

function removeDownloadToast(id) {
  const toast = document.getElementById(`toast-${id}`);
  if (toast) {
    toast.classList.remove("visible");
    toast.classList.add("hiding");
    setTimeout(() => toast.remove(), 300);
  }
}

// Boot
document.addEventListener("DOMContentLoaded", init);

// Custom Tooltip Logic
const customTooltip = document.getElementById("custom-tooltip");
if (customTooltip) {
  document.addEventListener("mousemove", (e) => {
    const target = e.target.closest("[data-tooltip]");
    if (target) {
      const titleText = target.dataset.tooltip;
      if (titleText) {
        customTooltip.textContent = titleText;
        customTooltip.classList.add("show");

        const offset = 15;
        let left = e.clientX + offset;
        let top = e.clientY + offset;

        // Bounds checking
        const rect = customTooltip.getBoundingClientRect();
        if (left + rect.width > window.innerWidth) {
          left = e.clientX - rect.width - offset;
        }
        if (top + rect.height > window.innerHeight) {
          top = e.clientY - rect.height - offset;
        }

        customTooltip.style.left = left + "px";
        customTooltip.style.top = top + "px";
      }
    } else {
      customTooltip.classList.remove("show");
    }
  });

  document.addEventListener("mouseleave", () => {
    customTooltip.classList.remove("show");
  });
}
