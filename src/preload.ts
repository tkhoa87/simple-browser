import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";

import { App, contextBridge, Dialog, ipcRenderer, Shell } from "electron";


const electronBridge = {


  // Node
  process: process,

  fs: {
    ...fs,
    ...fsPromises,
  },

  os: os,


  // Electron
  app: {
    getPath: (...args: Parameters<App["getPath"]>): Promise<ReturnType<App["getPath"]>> => ipcRenderer.invoke("app.getPath", ...args),
    getVersion: (...args: Parameters<App["getVersion"]>): Promise<ReturnType<App["getVersion"]>> => ipcRenderer.invoke("app.getVersion", ...args),
    getPackageVersion: (): Promise<string> => ipcRenderer.invoke("app.getPackageVersion"),
  },

  dialog: {
    showMessageBox: (...args: Parameters<Dialog["showMessageBox"]>): Promise<ReturnType<Dialog["showMessageBox"]>> => ipcRenderer.invoke("dialog.showMessageBox", ...args),
    showErrorBox: (...args: Parameters<Dialog["showErrorBox"]>): Promise<ReturnType<Dialog["showErrorBox"]>> => ipcRenderer.invoke("dialog.showErrorBox", ...args),
    showOpenDialog: (...args: Parameters<Dialog["showOpenDialog"]>): Promise<ReturnType<Dialog["showOpenDialog"]>> => ipcRenderer.invoke("dialog.showOpenDialog", ...args),
    showSaveDialog: (...args: Parameters<Dialog["showSaveDialog"]>): Promise<ReturnType<Dialog["showSaveDialog"]>> => ipcRenderer.invoke("dialog.showSaveDialog", ...args),
  },

  shell: {
    openPath: (...args: Parameters<Shell["openPath"]>): Promise<ReturnType<Shell["openPath"]>> => ipcRenderer.invoke("shell.openPath", ...args),
  },


};


export type ElectronBridge = typeof electronBridge;


contextBridge.exposeInMainWorld("electronBridge", electronBridge);
