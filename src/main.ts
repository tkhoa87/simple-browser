import path from "node:path";

import { app, BrowserWindow, powerSaveBlocker } from "electron";


app.name = "Browser";


app.commandLine.appendSwitch("disable-renderer-backgrounding");

app.commandLine.appendSwitch("force_high_performance_gpu");

if (process.env.NODE_ENV !== "production") {
  app.commandLine.appendSwitch("remote-debugging-port", "9222");
}


function createWindow() {

  const window = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      backgroundThrottling: false,
    },
  });

  window.maximize();

  if (process.env.NODE_ENV !== "production") {
    window.webContents.openDevTools();
  }
  
  window.loadURL("about:blank");

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
