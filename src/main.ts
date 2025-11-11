import path from "node:path";
import net from "node:net";

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
  
  window.loadURL(`http://localhost:${remoteDebuggingPort}/json/version`);

  window.webContents.on("render-process-gone", (_event, details) => {
    if (
      details.reason === "crashed" ||
      details.reason === "oom"
    ) {
      window.webContents.reload();
      return;
    }
    console.error("[Electron]", "render-process-gone", "exitCode", details.exitCode, "reason", details.reason);
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
