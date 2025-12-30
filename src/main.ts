import path from "node:path";
import { execSync } from "node:child_process";

import { app, BrowserWindow, powerSaveBlocker, Menu, ipcMain } from "electron";
import { findFreePorts } from "find-free-ports";


app.name = "Browser";


app.commandLine.appendSwitch("disable-renderer-backgrounding");

app.commandLine.appendSwitch("force_high_performance_gpu");

let mainWindow: BrowserWindow | null = null;

// Parse CLI arguments
const args = process.argv.slice(2);
const chromiumSwitches: Array<[string, string?]> = [];
const portOptions: { remoteDebuggingPort?: string; port?: string; p?: string } = {};
let initialUrl: string | undefined;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  // Handle --key=value format
  if (arg.startsWith("--") && arg.includes("=")) {
    const [key, ...rest] = arg.slice(2).split("=");
    const value = rest.join("=");
    if (key === "remote-debugging-port") {
      portOptions.remoteDebuggingPort = value;
    } else if (key === "port") {
      portOptions.port = value;
    } else {
      chromiumSwitches.push([key, value]);
    }
  }
  // Handle --key value format
  else if (arg.startsWith("--")) {
    const key = arg.slice(2);
    const nextArg = args[i + 1];
    const hasValue = nextArg && !nextArg.startsWith("-");
    if (key === "remote-debugging-port" && hasValue) {
      portOptions.remoteDebuggingPort = args[++i];
    } else if (key === "port" && hasValue) {
      portOptions.port = args[++i];
    } else if (hasValue) {
      chromiumSwitches.push([key, args[++i]]);
    } else {
      chromiumSwitches.push([key]);
    }
  }
  // Handle -p value format
  else if (arg === "-p") {
    portOptions.p = args[++i];
  }
  // Positional argument (URL)
  else if (!arg.startsWith("-")) {
    initialUrl = arg;
  }
}

// Determine remote debugging port (priority: --remote-debugging-port > --port > -p > env)
let remoteDebuggingPort =
  portOptions.remoteDebuggingPort ||
  portOptions.port ||
  portOptions.p ||
  process.env.REMOTE_DEBUGGING_PORT;

if (!remoteDebuggingPort) {
  const [port] = await findFreePorts(1, { startPort: 9222 });
  if (!port) {
    throw new Error("Failed to find a free port for remote debugging");
  }
  remoteDebuggingPort = port.toString();
}

// Kill any existing process on the remote debugging port
try {
  execSync(`lsof -t -i :${remoteDebuggingPort} | xargs kill 2>/dev/null`, { stdio: "ignore" });
} catch {
  // Ignore errors (no process found or lsof not available)
}

app.commandLine.appendSwitch("remote-debugging-port", remoteDebuggingPort);

for (const [key, value] of chromiumSwitches) {
  app.commandLine.appendSwitch(key, value);
}

const urlToLoad = initialUrl ?? `http://localhost:${remoteDebuggingPort}/json/version`;


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

  window.webContents.loadURL(urlToLoad);

  if (process.env.NODE_ENV !== "production") {
    window.webContents.openDevTools();
  }

  mainWindow = window;
  return window;
}


const powerSaveBlockerID = powerSaveBlocker.start("prevent-display-sleep");


app.whenReady().then(() => {


  // Windows
  createWindow();

  // Menu - Add Navigate... to existing File menu
  // Create a function that will be called when the menu item is clicked
  const navigateHandler = async () => {
    if (!mainWindow) return;
    
    // Get current URL and escape it for HTML
    const currentUrl = mainWindow.webContents.getURL();
    const escapedUrl = currentUrl
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Create a simple input dialog using a BrowserWindow
    const inputWindow = new BrowserWindow({
      width: 480,
      height: 220,
      parent: mainWindow,
      modal: true,
      resizable: false,
      frame: false,
      transparent: false,
      backgroundColor: '#09090b',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          :root {
            --background: 222.2 84% 4.9%;
            --foreground: 210 40% 98%;
            --card: 222.2 84% 4.9%;
            --card-foreground: 210 40% 98%;
            --popover: 222.2 84% 4.9%;
            --popover-foreground: 210 40% 98%;
            --primary: 217.2 91.2% 59.8%;
            --primary-foreground: 222.2 47.4% 11.2%;
            --secondary: 217.2 32.6% 17.5%;
            --secondary-foreground: 210 40% 98%;
            --muted: 217.2 32.6% 17.5%;
            --muted-foreground: 215 20.2% 65.1%;
            --accent: 217.2 32.6% 17.5%;
            --accent-foreground: 210 40% 98%;
            --destructive: 0 62.8% 30.6%;
            --destructive-foreground: 210 40% 98%;
            --border: 217.2 32.6% 17.5%;
            --input: 217.2 32.6% 17.5%;
            --ring: 217.2 91.2% 59.8%;
            --radius: 0.25rem;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            background: hsl(var(--background));
            color: hsl(var(--foreground));
            padding: 20px;
            margin: 0;
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            overflow: hidden;
          }
          
          .dialog-content {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
          
          .dialog-header {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          
          .dialog-title {
            font-size: 18px;
            font-weight: 600;
            line-height: 1.2;
            letter-spacing: -0.01em;
            color: hsl(var(--foreground));
          }
          
          .dialog-description {
            font-size: 14px;
            color: hsl(var(--muted-foreground));
            line-height: 1.5;
          }
          
          .input-wrapper {
            position: relative;
            width: 100%;
          }
          
          input {
            width: 100%;
            height: 40px;
            padding: 0 12px;
            font-size: 14px;
            line-height: 1.5;
            color: hsl(var(--foreground));
            background: hsl(var(--background));
            border: 1px solid hsl(var(--input));
            border-radius: calc(var(--radius) - 2px);
            outline: none;
            transition: all 0.2s;
            box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.2);
          }
          
          input::placeholder {
            color: hsl(var(--muted-foreground));
          }
          
          input:hover {
            border-color: hsl(var(--input));
          }
          
          input:focus {
            border-color: hsl(var(--ring));
            box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
          }
          
          .dialog-footer {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            margin-top: 4px;
            padding-bottom: 4px;
          }
          
          button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            white-space: nowrap;
            height: 36px;
            padding: 0 16px;
            font-size: 14px;
            font-weight: 500;
            border-radius: calc(var(--radius) - 2px);
            cursor: pointer;
            transition: all 0.2s;
            outline: none;
            border: none;
            box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.2);
          }
          
          button:focus-visible {
            outline: 2px solid hsl(var(--ring));
            outline-offset: 2px;
          }
          
          .button-secondary {
            background: hsl(var(--secondary));
            color: hsl(var(--secondary-foreground));
          }
          
          .button-secondary:hover {
            background: hsl(var(--secondary) / 0.8);
          }
          
          .button-secondary:active {
            background: hsl(var(--secondary) / 0.9);
          }
          
          .button-primary {
            background: hsl(var(--primary));
            color: hsl(var(--primary-foreground));
          }
          
          .button-primary:hover {
            background: hsl(var(--primary) / 0.9);
          }
          
          .button-primary:active {
            background: hsl(var(--primary) / 0.8);
          }
        </style>
      </head>
      <body>
        <div class="dialog-content">
          <div class="dialog-header">
            <h2 class="dialog-title">Navigate to URL</h2>
            <p class="dialog-description">Enter the URL you want to navigate to.</p>
          </div>
          <div class="input-wrapper">
            <input 
              type="text" 
              id="url" 
              value="${escapedUrl}"
              placeholder="https://example.com" 
              autofocus 
              autocomplete="off"
              spellcheck="false"
            />
          </div>
          <div class="dialog-footer">
            <button class="button-secondary" onclick="cancel()">Cancel</button>
            <button class="button-primary" onclick="submit()">Navigate</button>
          </div>
        </div>
        <script>
          const { ipcRenderer } = require('electron');
          const input = document.getElementById('url');
          
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          });
          
          // Select all text on focus for easy replacement
          input.addEventListener('focus', () => {
            input.select();
          });
          
          function submit() {
            const url = input.value.trim();
            ipcRenderer.send('navigate-to-url', url || null);
          }
          
          function cancel() {
            ipcRenderer.send('navigate-to-url', null);
          }
        </script>
      </body>
      </html>
    `;

    // Set up IPC handler for navigation
    const handler = (event: Electron.IpcMainEvent, url: string | null) => {
      inputWindow.close();
      ipcMain.removeListener('navigate-to-url', handler);
      
      if (url && typeof url === "string" && url.trim()) {
        let urlToNavigate = url.trim();
        // Add protocol if missing
        if (!urlToNavigate.match(/^https?:\/\//i)) {
          urlToNavigate = `http://${urlToNavigate}`;
        }
        mainWindow!.webContents.loadURL(urlToNavigate);
      }
    };
    
    ipcMain.once('navigate-to-url', handler);

    inputWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    inputWindow.setMenuBarVisibility(false);
  };

  const navigateItem: Electron.MenuItemConstructorOptions = {
    label: "Navigate...",
    accelerator: "CmdOrCtrl+L",
    click: navigateHandler,
  };

  // Build menu template - preserve existing menu structure and add Navigate...
  const existingMenu = Menu.getApplicationMenu();
  const template: Electron.MenuItemConstructorOptions[] = [];
  
  if (existingMenu) {
    // Convert existing menu to template
    for (const item of existingMenu.items) {
      const itemTemplate: Electron.MenuItemConstructorOptions = {
        label: item.label,
        role: item.role as Electron.MenuItemConstructorOptions["role"],
      };
      
      if (item.submenu) {
        const submenuItems: Electron.MenuItemConstructorOptions[] = [];
        for (const subItem of item.submenu.items) {
          if (subItem.type === "separator") {
            submenuItems.push({ type: "separator" });
          } else {
            submenuItems.push({
              label: subItem.label,
              role: subItem.role as Electron.MenuItemConstructorOptions["role"],
              accelerator: subItem.accelerator,
              click: subItem.click as Electron.MenuItemConstructorOptions["click"],
            });
          }
        }
        itemTemplate.submenu = submenuItems;
      }
      
      template.push(itemTemplate);
    }
    
    // Check if File menu exists
    const fileMenuIndex = template.findIndex((item) => item.label === "File");
    
    if (fileMenuIndex >= 0 && template[fileMenuIndex].submenu && Array.isArray(template[fileMenuIndex].submenu)) {
      // Add Navigate... to existing File menu at the beginning
      template[fileMenuIndex].submenu.unshift(navigateItem);
    } else {
      // Insert File menu with Navigate... after app menu on macOS, otherwise at start
      const insertIndex = process.platform === "darwin" ? 1 : 0;
      template.splice(insertIndex, 0, {
        label: "File",
        submenu: [navigateItem],
      });
    }
  } else {
    // No existing menu, create one with File > Navigate...
    template.push({
      label: "File",
      submenu: [navigateItem],
    });
  }
  
  // Build and set the menu
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

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
