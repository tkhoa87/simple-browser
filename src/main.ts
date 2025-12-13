import path from "node:path";

import { app, BrowserWindow, ipcMain, powerSaveBlocker, WebContentsView } from "electron";
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
      * {
        box-sizing: border-box; 
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
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
      .nav-buttons {
        display: flex;
        align-items: center;
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
      .url-row {
        display: flex;
        flex: 1 1 auto;
        gap: 6px;
        align-items: center;
        border-radius: 8px;
        overflow: hidden;
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

      <div class="nav-buttons">
        <button id="back" class="btn" title="Back" aria-label="Back">
          <span class="icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left-icon lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          </span>
        </button>
        <button id="forward" class="btn" title="Forward" aria-label="Forward">
          <span class="icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right-icon lucide-arrow-right"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </span>
        </button>
        <button id="reloadStop" class="btn" title="Reload" aria-label="Reload">
          <span class="icon" aria-hidden="true">
            <svg id="reloadStopIcon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-cw-icon lucide-rotate-cw">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
              <path d="M21 3v5h-5"></path>
            </svg>
          </span>
        </button>
      </div>

      <form id="form" class="url-row">
        <input id="url" class="input" placeholder="Search or enter URL" spellcheck="false" />
      </form>

      <button id="devtools" class="btn" type="button" title="Open DevTools" aria-label="Open DevTools">
        <span class="icon" aria-hidden="true">
          <svg id="devtoolsIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <!-- lucide-panel-right-open -->
            <rect width="18" height="18" x="3" y="3" rx="2"></rect>
            <path d="M15 3v18"></path>
            <path d="m10 15-3-3 3-3"></path>
          </svg>
        </span>
      </button>
    </div>
    <div class="hint" id="status"></div>
    <script>
      const back = document.getElementById("back");
      const forward = document.getElementById("forward");
      const reloadStop = document.getElementById("reloadStop");
      const reloadStopIcon = document.getElementById("reloadStopIcon");
      const devtools = document.getElementById("devtools");
      const devtoolsIcon = document.getElementById("devtoolsIcon");
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

      let lastIsLoading = false;
      function setReloadStopButton(isLoading) {
        lastIsLoading = !!isLoading;
        if (!reloadStop) return;
        if (!reloadStopIcon) return;
        if (lastIsLoading) {
          reloadStop.title = "Stop";
          reloadStop.setAttribute("aria-label", "Stop");
          // lucide-x
          reloadStopIcon.setAttribute("class", "lucide lucide-x-icon lucide-x");
          reloadStopIcon.innerHTML = \`
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          \`;
          return;
        }
        reloadStop.title = "Reload";
        reloadStop.setAttribute("aria-label", "Reload");
        // lucide-rotate-cw
        reloadStopIcon.setAttribute("class", "lucide lucide-rotate-cw-icon lucide-rotate-cw");
        reloadStopIcon.innerHTML = \`
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
          <path d="M21 3v5h-5"></path>
        \`;
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
      reloadStop.addEventListener("click", () => {
        if (lastIsLoading) return window.nav?.stop();
        return window.nav?.reload();
      });
      devtools.addEventListener("click", () => {
        window.ui?.toggleDevTools?.();
        url.focus();
      });

      function setDevToolsIcon(isOpen) {
        if (!devtoolsIcon) return;
        if (isOpen) {
          // lucide-panel-right-close (DevTools open -> action is close)
          devtools.title = "Close DevTools";
          devtools.setAttribute("aria-label", "Close DevTools");
          devtoolsIcon.innerHTML = \`
            <rect width="18" height="18" x="3" y="3" rx="2"></rect>
            <path d="M15 3v18"></path>
            <path d="m8 9 3 3-3 3"></path>
          \`;
          return;
        }
        // lucide-panel-right-open (DevTools closed -> action is open)
        devtools.title = "Open DevTools";
        devtools.setAttribute("aria-label", "Open DevTools");
        devtoolsIcon.innerHTML = \`
          <rect width="18" height="18" x="3" y="3" rx="2"></rect>
          <path d="M15 3v18"></path>
          <path d="m10 15-3-3 3-3"></path>
        \`;
      }

      window.ui?.onDevToolsState?.((isOpen) => setDevToolsIcon(!!isOpen));

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
        setReloadStopButton(!!state.isLoading);
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
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
      devTools: true,
    },
  });

  window.maximize();

  window.webContents.loadURL(initialUrl);

  if (process.env.NODE_ENV !== "production") {
    window.webContents.openDevTools();
  }

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
