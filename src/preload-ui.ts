import { contextBridge, ipcRenderer } from "electron";

export type NavState = {
  url: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
};

const nav = {
  navigate(raw: string) {
    return ipcRenderer.invoke("nav:navigate", raw);
  },
  back() {
    ipcRenderer.send("nav:back");
  },
  forward() {
    ipcRenderer.send("nav:forward");
  },
  reload() {
    ipcRenderer.send("nav:reload");
  },
  stop() {
    ipcRenderer.send("nav:stop");
  },
  onUpdate(cb: (state: NavState) => void) {
    const listener = (_event: Electron.IpcRendererEvent, state: NavState) => cb(state);
    ipcRenderer.on("nav:update", listener);
    return () => ipcRenderer.off("nav:update", listener);
  },
};

export type NavBridge = typeof nav;

contextBridge.exposeInMainWorld("nav", nav);

const ui = {
  toggleDevTools() {
    ipcRenderer.send("ui:toggleDevTools");
  },
  onDevToolsState(cb: (isOpen: boolean) => void) {
    const listener = (_event: Electron.IpcRendererEvent, isOpen: boolean) => cb(isOpen);
    ipcRenderer.on("ui:devtools-state", listener);
    return () => ipcRenderer.off("ui:devtools-state", listener);
  },
};

export type UiBridge = typeof ui;

contextBridge.exposeInMainWorld("ui", ui);
