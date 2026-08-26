const { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } = require("electron");
type IpcMainInvokeEvent = typeof IpcMainInvokeEvent;
const path = require("path");
const Store = require("electron-store");
const store = new Store();
import * as initConfig from "./initConfig.json";
import { info } from "./messageUtil";
import { handleWetris } from "./wetris";
import { Api } from "./Api";

// console.dir(store.store, { depth: null });

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
    app.quit();
}

const CONFIG_KEY = "config";
if (!store.has(CONFIG_KEY)) store.set(CONFIG_KEY, initConfig);

ipcMain.handle("getInitConfig", async (_event: IpcMainInvokeEvent): Promise<Config> => {
    return initConfig;
});

ipcMain.handle("getConfig", async (_event: IpcMainInvokeEvent): Promise<Config> => {
    const data: Config = store.get(CONFIG_KEY);
    info(`got ${CONFIG_KEY} : ${JSON.stringify(data)}`);
    return data;
});

ipcMain.handle("saveConfig", async (_event: IpcMainInvokeEvent, data: Config): Promise<void> => {
    store.set(CONFIG_KEY, data);
    // info(`saved ${CONFIG_KEY} : ${JSON.stringify(data)}`);
});

handleWetris();

let mainWindow: typeof BrowserWindow;

const createWindow = () => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        // width: 512,
        // height: 768,
        width: 1280,
        height: 720,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            // devTools: false //デバッグツールを開かない
        },
    });

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));

    // Open the DevTools.
    mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it"s common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    // On OS X it"s common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and import them here.

const api = new Api(() => mainWindow);
api.start(3001);
