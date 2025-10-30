import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";

import { App, contextBridge, Dialog, ipcRenderer, Shell } from "electron";


const electronBridge = {
};


export type ElectronBridge = typeof electronBridge;


contextBridge.exposeInMainWorld("electronBridge", electronBridge);
