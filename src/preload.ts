import { contextBridge } from "electron";


const electronBridge = {
};


export type ElectronBridge = typeof electronBridge;


contextBridge.exposeInMainWorld("electronBridge", electronBridge);
