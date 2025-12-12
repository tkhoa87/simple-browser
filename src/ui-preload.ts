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
