import path from "node:path";

import { app, BrowserWindow, dialog, ipcMain, powerSaveBlocker, shell } from "electron";

import packageJSON from "../package.json";


app.name = "Browser";


app.commandLine.appendSwitch("disable-renderer-backgrounding");

app.commandLine.appendSwitch("force_high_performance_gpu");

// app.commandLine.appendSwitch("ignore-connections-limit", [
//   `localhost:${process.env.PORT || 3001}`,
// ].join(","));

if (process.env.NODE_ENV !== "production") {
  app.commandLine.appendSwitch("remote-debugging-port", "9222");
}


function createWindow() {

  const window = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      backgroundThrottling: false,
    },
  });

  window.maximize();

  if (!app.isPackaged) {
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


  // Menu
  // setUpApplicationMenu();


  // Windows
  createWindow();


  // IPC Events
  ipcMain.handle("app.getPath", (_event, ...args: Parameters<typeof app.getPath>) => app.getPath(...args));
  ipcMain.handle("app.getVersion", (_event, ...args: Parameters<typeof app.getVersion>) => app.getVersion(...args));
  ipcMain.handle("app.getPackageVersion", () => packageJSON.version);
  ipcMain.handle("dialog.showMessageBox", (_event, ...args: Parameters<typeof dialog.showMessageBox>) => dialog.showMessageBox(...args));
  ipcMain.handle("dialog.showErrorBox", (_event, ...args: Parameters<typeof dialog.showErrorBox>) => dialog.showErrorBox(...args));
  ipcMain.handle("dialog.showOpenDialog", (_event, ...args: Parameters<typeof dialog.showOpenDialog>) => dialog.showOpenDialog(...args));
  ipcMain.handle("dialog.showSaveDialog", (_event, ...args: Parameters<typeof dialog.showSaveDialog>) => dialog.showSaveDialog(...args));
  ipcMain.handle("shell.openPath", (_event, ...args: Parameters<typeof shell.openPath>) => shell.openPath(...args));


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
