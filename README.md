# 🏪 OmniToko

**Multi-session e-commerce store manager** — manage all your online store logins from one desktop app, without conflicts.

Built with [Electron.js](https://www.electronjs.org/).

---

## ✨ Features

### 🔐 Session Isolation

Each tab runs in a **completely isolated session** using Electron's `session.fromPartition()`. Login to Shopee on Tab 1, Tokopedia on Tab 2, and they will never interfere with each other — no more switching browsers!

### 🏠 Dashboard

A branded home page with quick-access marketplace shortcuts:

- **Shopee** Seller Center
- **Tokopedia** Seller Dashboard
- **TikTok Shop** Seller Center
- **Lazada** Seller Center
- **Blibli** Seller Center
- **Bukalapak** Seller Center
- **Shopify** Admin Panel
- **Open URL** — open any website

### 💾 Persistent Sessions

Login sessions are **saved and persist** across tab close/reopen:

- Sessions are stored with stable partition names
- Close a tab, reopen later — **you're still logged in!**
- View all active sessions on the dashboard with **Reopen** / **Focus** / **Delete** controls
- Session data (cookies, storage) is preserved in Electron's userData

### ⭐ Custom Shortcuts

Add your own marketplace or store shortcuts:

- Name, URL, and custom color picker
- Auto-fetches **favicon** from the website
- Saved persistently — available every time you open the app
- Delete with one click

### 🌗 Dark / Light Mode

Toggle between dark and light themes:

- Beautiful dark mode with gradient accents (default)
- Clean light mode for daytime use
- Preference is **saved persistently**

### 🖥️ Cross-Platform

Built with platform-aware UI:

- **macOS**: Hidden title bar with traffic light buttons, proper safe area padding
- **Windows/Linux**: Standard title bar, no unnecessary padding

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Install & Run (Development)

```bash
# Clone or download the project
cd OmniToko

# Install dependencies
npm install

# Run the app
npm start
```

---

## 📦 Building for Distribution

OmniToko uses [electron-builder](https://www.electron.build/) to package the app for all platforms.

### Install build dependencies

```bash
npm install
```

### Build for macOS

```bash
npm run build:mac
```

**Output:** `dist/OmniToko-x.x.x.dmg` and `dist/OmniToko-x.x.x-mac.zip`

> **Note:** Building for macOS requires a Mac. For distribution via the App Store or notarization, you'll need an Apple Developer certificate. For local/personal use, the unsigned build works fine.

### Build for Windows

```bash
npm run build:win
```

**Output:** `dist/OmniToko Setup x.x.x.exe` (installer) and `dist/OmniToko x.x.x.exe` (portable)

> **Note:** You can build Windows apps from macOS/Linux using Wine, or natively on Windows. The NSIS installer allows users to choose the installation directory.

### Build for Linux

```bash
npm run build:linux
```

**Output:** `dist/OmniToko-x.x.x.AppImage` and `dist/omnitoko_x.x.x_amd64.deb`

> **Note:** AppImage works on most Linux distributions without installation. The `.deb` package is for Debian/Ubuntu-based systems.

### Build for all platforms

```bash
npm run build
```

---

## 🗂️ Project Structure

```
OmniToko/
├── main.js          # Main process — window creation, IPC, session management
├── preload.js       # Preload script — secure bridge between main and renderer
├── renderer.js      # Renderer process — UI logic, dashboard, tab management
├── index.html       # App layout — sidebar, dashboard, modals
├── styles.css       # Styling — dark/light themes, responsive design
├── package.json     # Project config & build settings
└── README.md        # This file
```

### Data Storage

User data is stored in Electron's `userData` directory:

| File               | Contents                                    |
| ------------------ | ------------------------------------------- |
| `shortcuts.json`   | Custom marketplace shortcuts                |
| `sessions.json`    | Saved login sessions (partition references) |
| `preferences.json` | Theme preference                            |

**Location:**

- **macOS:** `~/Library/Application Support/OmniToko/`
- **Windows:** `%APPDATA%/OmniToko/`
- **Linux:** `~/.config/OmniToko/`

---

## 🛠️ Tech Stack

| Technology                       | Purpose                          |
| -------------------------------- | -------------------------------- |
| **Electron v40**                 | Desktop app framework            |
| **BaseWindow + WebContentsView** | Modern Electron window/view APIs |
| **session.fromPartition()**      | Per-tab session isolation        |
| **Google Favicon API**           | Auto-fetch website icons         |
| **CSS Variables**                | Dark/Light theme switching       |
| **electron-builder**             | Cross-platform packaging         |

---

## 📝 License

ISC
