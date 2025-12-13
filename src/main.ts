import path from "node:path";

import { app, BrowserWindow, powerSaveBlocker } from "electron";
import { findFreePorts } from "find-free-ports";


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
