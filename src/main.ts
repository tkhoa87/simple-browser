import path from "node:path";

import { app, BrowserView, BrowserWindow, ipcMain, powerSaveBlocker } from "electron";
import { findFreePorts } from "find-free-ports";
import { parseArgs } from "node:util";


app.name = "Browser";


app.commandLine.appendSwitch("disable-renderer-backgrounding");

app.commandLine.appendSwitch("force_high_performance_gpu");

let remoteDebuggingPort = process.env.REMOTE_DEBUGGING_PORT;
if (!remoteDebuggingPort) {
  const [port] = await findFreePorts(1, { startPort: 9222 });
  if (!port) {
    throw new Error("Failed to find a free port for remote debugging");
  }
  remoteDebuggingPort = port.toString();
}

app.commandLine.appendSwitch("remote-debugging-port", remoteDebuggingPort);


const args = process.argv.slice(2);

const initialUrl = args.pop() || `http://localhost:${remoteDebuggingPort}/json/version`;

for (const arg of args) {
  app.commandLine.appendSwitch(arg);
}

type NavState = {
  url: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
};

function normalizeNavigationTarget(raw: string): string {
  const input = raw.trim();
  if (!input) return "about:blank";

  // Allow internal Electron/Chromium schemes.
  if (/^(about|file|chrome|devtools|view-source):/i.test(input)) return input;

  // If it already looks like a URL, accept it as-is.
  try {
    // eslint-disable-next-line no-new
    new URL(input);
    return input;
  } catch {
    // continue
  }

  // If it looks like a host/path, default to https://
  if (/^[\w.-]+\.[a-z]{2,}([/:].*)?$/i.test(input)) {
    return `https://${input}`;
  }

  // Otherwise treat as a search query.
  return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
}

function navbarHtml() {
  // "shadcn/ui"-styled (tokens + component-ish classes) without a Tailwind build step.
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <title>Browser Navbar</title>
    <style>
      :root {
        /* Light: subtle neutral like a native toolbar */
        --background: 220 13% 96%;
        --foreground: 220 10% 12%;
        --muted: 220 10% 92%;
        --muted-foreground: 220 6% 40%;
        --border: 220 10% 86%;
        --input: 220 10% 88%;
        --primary: 220 10% 12%;
        --primary-foreground: 0 0% 98%;
        --ring: 220 10% 55%;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          /* Dark: match the screenshot's neutral dark toolbar */
          --background: 220 9% 16%;
          --foreground: 0 0% 86%;
          --muted: 220 8% 22%;
          --muted-foreground: 220 6% 62%;
          --border: 220 8% 26%;
          --input: 220 8% 26%;
          --primary: 0 0% 86%;
          --primary-foreground: 220 10% 12%;
          --ring: 220 7% 65%;
        }
      }
      * { box-sizing: border-box; }
      html, body { height: 100%; }
      body {
        margin: 0;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
        background: hsl(var(--background));
        color: hsl(var(--foreground));
      }
      .bar {
        height: 44px;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 8px;
        border-bottom: 0;
        background: hsl(var(--background));
        box-shadow: inset 0 -1px 0 hsla(var(--border) / 0.65);
      }
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 30px;
        min-width: 30px;
        padding: 0 8px;
        border-radius: 8px;
        border: 0;
        background: transparent;
        color: hsl(var(--foreground));
        font-size: 14px;
        line-height: 1;
        cursor: pointer;
        user-select: none;
      }
      .btn:hover { background: hsl(var(--muted)); }
      .btn:active { transform: translateY(0.5px); }
      .btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .btn.primary {
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
      }
      .btn.primary:hover { filter: brightness(1.05); }
      .input {
        height: 30px;
        flex: 1 1 auto;
        padding: 0 10px;
        border-radius: 8px;
        border: 1px solid hsl(var(--input));
        background: hsla(var(--muted) / 0.35);
        color: hsl(var(--foreground));
        font-size: 14px;
        outline: none;
      }
      .input:focus {
        border-color: hsl(var(--ring));
        box-shadow: 0 0 0 3px hsla(var(--ring) / 0.25);
      }
      .hint {
        font-size: 12px;
        color: hsl(var(--muted-foreground));
        padding-left: 2px;
      }
      .icon { width: 16px; height: 16px; display: inline-block; }
      .icon svg { width: 16px; height: 16px; display: block; }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
      }
    </style>
  </head>
  <body>
    <div class="bar">
      <button id="back" class="btn" title="Back" aria-label="Back">
        <span class="icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 18l-6-6 6-6"></path>
          </svg>
        </span>
      </button>
      <button id="forward" class="btn" title="Forward" aria-label="Forward">
        <span class="icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18l6-6-6-6"></path>
          </svg>
        </span>
      </button>
      <button id="reload" class="btn" title="Reload" aria-label="Reload">
        <span class="icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-3-6.7"></path>
            <path d="M21 3v7h-7"></path>
          </svg>
        </span>
      </button>
      <button id="stop" class="btn" title="Stop" aria-label="Stop">
        <span class="icon">✕</span>
      </button>

      <form id="form" style="display:flex; flex: 1 1 auto;">
        <input id="url" class="input" placeholder="Search or enter URL" spellcheck="false" />
      </form>
    </div>
    <div class="hint" id="status"></div>
    <script>
      const back = document.getElementById("back");
      const forward = document.getElementById("forward");
      const reload = document.getElementById("reload");
      const stop = document.getElementById("stop");
      const form = document.getElementById("form");
      const url = document.getElementById("url");
      const status = document.getElementById("status");

      // Select-all behavior like a real browser address bar:
      // - First click focuses + selects all
      // - Subsequent clicks allow normal caret placement / partial selection
      let selectAllOnNextFocus = false;
      url.addEventListener("mousedown", () => {
        if (document.activeElement !== url) {
          selectAllOnNextFocus = true;
        }
      });
      url.addEventListener("focus", () => {
        if (selectAllOnNextFocus) {
          url.select();
        }
      });
      url.addEventListener("mouseup", (e) => {
        if (selectAllOnNextFocus) {
          // Prevent the mouseup from clearing the selection and placing the caret.
          e.preventDefault();
          selectAllOnNextFocus = false;
        }
      });

      function setLoading(isLoading) {
        status.textContent = isLoading ? "Loading…" : "";
      }

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const raw = url.value || "";
        if (!window.nav) return;
        await window.nav.navigate(raw);
        url.select();
      });

      back.addEventListener("click", () => window.nav?.back());
      forward.addEventListener("click", () => window.nav?.forward());
      reload.addEventListener("click", () => window.nav?.reload());
      stop.addEventListener("click", () => window.nav?.stop());

      // Keep input in sync with real navigation.
      window.nav?.onUpdate((state) => {
        const isFocused = document.activeElement === url;
        const selStart = url.selectionStart ?? -1;
        const selEnd = url.selectionEnd ?? -1;
        const isAllSelected = isFocused && selStart === 0 && selEnd === url.value.length;
        if (!isFocused || isAllSelected) {
          url.value = state.url || "";
          if (isAllSelected) url.select();
        }
        back.disabled = !state.canGoBack;
        forward.disabled = !state.canGoForward;
        setLoading(!!state.isLoading);
      });
    </script>
  </body>
</html>`;
}

function canGoBackFor(wc: Electron.WebContents): boolean {
  // Electron v39+: use navigationHistory
  const nh = (wc as unknown as { navigationHistory?: { canGoBack: () => boolean } }).navigationHistory;
  if (nh?.canGoBack) return nh.canGoBack();
  // Back-compat
  return (wc as unknown as { canGoBack?: () => boolean }).canGoBack?.() ?? false;
}

function canGoForwardFor(wc: Electron.WebContents): boolean {
  // Electron v39+: use navigationHistory
  const nh = (wc as unknown as { navigationHistory?: { canGoForward: () => boolean } }).navigationHistory;
  if (nh?.canGoForward) return nh.canGoForward();
  // Back-compat
  return (wc as unknown as { canGoForward?: () => boolean }).canGoForward?.() ?? false;
}

function createWindow() {

  const window = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(import.meta.dirname, "preload.js"),
      nodeIntegration: true,
      backgroundThrottling: false,
    },
  });

  window.maximize();

  if (process.env.NODE_ENV !== "production") {
    window.webContents.openDevTools();
  }

  // The BrowserWindow becomes a simple container; content is rendered via BrowserViews.
  window.loadURL("about:blank");

  const uiView = new BrowserView({
    webPreferences: {
      preload: path.join(import.meta.dirname, "ui-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  const contentView = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  window.addBrowserView(uiView);
  window.addBrowserView(contentView);

  const NAVBAR_HEIGHT = 44;
  const layout = () => {
    const bounds = window.getContentBounds();
    uiView.setBounds({ x: 0, y: 0, width: bounds.width, height: NAVBAR_HEIGHT });
    contentView.setBounds({
      x: 0,
      y: NAVBAR_HEIGHT,
      width: bounds.width,
      height: Math.max(0, bounds.height - NAVBAR_HEIGHT),
    });
  };

  uiView.setAutoResize({ width: true });
  contentView.setAutoResize({ width: true, height: true });
  window.on("resize", layout);
  window.on("enter-full-screen", layout);
  window.on("leave-full-screen", layout);
  layout();

  uiView.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(navbarHtml())}`);
  contentView.webContents.loadURL(initialUrl);

  let isLoading = false;
  const sendNavState = () => {
    const state: NavState = {
      url: contentView.webContents.getURL() || "",
      canGoBack: canGoBackFor(contentView.webContents),
      canGoForward: canGoForwardFor(contentView.webContents),
      isLoading,
    };
    uiView.webContents.send("nav:update", state);
  };

  contentView.webContents.on("did-start-loading", () => {
    isLoading = true;
    sendNavState();
  });
  contentView.webContents.on("did-stop-loading", () => {
    isLoading = false;
    sendNavState();
  });
  contentView.webContents.on("did-navigate", sendNavState);
  contentView.webContents.on("did-navigate-in-page", sendNavState);
  contentView.webContents.on("page-title-updated", sendNavState);

  // Initial state once UI is ready.
  uiView.webContents.on("did-finish-load", sendNavState);

  // Crash recovery: reload the affected view.
  contentView.webContents.on("render-process-gone", (_event, details) => {
    if (details.reason === "crashed" || details.reason === "oom") {
      contentView.webContents.reload();
      return;
    }
    console.error(
      "[Electron]",
      "render-process-gone",
      "exitCode",
      details.exitCode,
      "reason",
      details.reason,
    );
  });

  // IPC handlers: navbar -> content view
  // (Scoped to this window; if you add multi-window later, move this wiring elsewhere.)
  ipcMain.removeHandler("nav:navigate");
  ipcMain.handle("nav:navigate", async (_event, raw: string) => {
    const target = normalizeNavigationTarget(raw);
    await contentView.webContents.loadURL(target);
    sendNavState();
  });

  ipcMain.removeAllListeners("nav:back");
  ipcMain.on("nav:back", () => {
    if (canGoBackFor(contentView.webContents)) contentView.webContents.goBack();
    sendNavState();
  });

  ipcMain.removeAllListeners("nav:forward");
  ipcMain.on("nav:forward", () => {
    if (canGoForwardFor(contentView.webContents)) contentView.webContents.goForward();
    sendNavState();
  });

  ipcMain.removeAllListeners("nav:reload");
  ipcMain.on("nav:reload", () => {
    contentView.webContents.reload();
    sendNavState();
  });

  ipcMain.removeAllListeners("nav:stop");
  ipcMain.on("nav:stop", () => {
    contentView.webContents.stop();
    sendNavState();
  });

  return window;
}


const powerSaveBlockerID = powerSaveBlocker.start("prevent-display-sleep");


app.whenReady().then(() => {


  // Windows
  createWindow();


  // App Events
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });


});


app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    powerSaveBlocker.stop(powerSaveBlockerID);
    app.quit();
  }
});
