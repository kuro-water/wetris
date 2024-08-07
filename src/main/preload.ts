const { contextBridge, ipcRenderer, IpcMainInvokeEvent } = require("electron");

contextBridge.exposeInMainWorld("ipcRenderer", {
    on: (channel: string, func: any) => {
        ipcRenderer.on(channel, (event: typeof IpcMainInvokeEvent, ...args: any[]) =>
            func(...args)
        );
    },
});

contextBridge.exposeInMainWorld("wetris", {
    start: (idx: number) => ipcRenderer.invoke("start", idx),
    startCpu: (idx: number) => ipcRenderer.invoke("startCpu", idx),
    stop: (idx: number) => ipcRenderer.invoke("stop", idx),
    moveLeft: (idx: number) => ipcRenderer.invoke("moveLeft", idx),
    moveRight: (idx: number) => ipcRenderer.invoke("moveRight", idx),
    softDrop: (idx: number) => ipcRenderer.invoke("softDrop", idx),
    hardDrop: (idx: number) => ipcRenderer.invoke("hardDrop", idx),
    rotateLeft: (idx: number) => ipcRenderer.invoke("rotateLeft", idx),
    rotateRight: (idx: number) => ipcRenderer.invoke("rotateRight", idx),
    hold: (idx: number) => ipcRenderer.invoke("hold", idx),
});

contextBridge.exposeInMainWorld("electronAPI", {
    getInitConfig: () => ipcRenderer.invoke("getInitConfig"),
    getConfig: (jsonPath: string) => ipcRenderer.invoke("getConfig", jsonPath),
    saveConfig: (jsonPath: string, data: any) => ipcRenderer.invoke("saveConfig", jsonPath, data),
});

const INIT_FIELD = [
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];
contextBridge.exposeInMainWorld("INIT_FIELD", INIT_FIELD);
// xを増やすと右、yを増やすと下になる
// 0が空白、1が壁または設置済みミノ
// 内部座標では0,0が左上、11,40が右下
// 描画上でミノが動かせる範囲は1,20が左上、10,39が右下
// 内部座標にDRAW_FIELD_TOP, DRAW_FIELD_LEFTを足すと描画上の座標になる
const DRAW_FIELD_TOP = 20;
contextBridge.exposeInMainWorld("DRAW_FIELD_TOP", DRAW_FIELD_TOP);
const DRAW_FIELD_HEIGHT = 20;
contextBridge.exposeInMainWorld("DRAW_FIELD_HEIGHT", DRAW_FIELD_HEIGHT);
const DRAW_FIELD_WIDTH = 10;
contextBridge.exposeInMainWorld("DRAW_FIELD_WIDTH", DRAW_FIELD_WIDTH);
const DRAW_FIELD_LEFT = 1;
contextBridge.exposeInMainWorld("DRAW_FIELD_LEFT", DRAW_FIELD_LEFT);

const MINO_COLORS = ["#0F9BD7", "#AF298A", "#E39F02", "#E35B02", "#2141C6", "#59B101", "#D70F37"];
contextBridge.exposeInMainWorld("MINO_COLORS", MINO_COLORS);
const GHOST_COLORS = ["#074D6B", "#571445", "#714F01", "#712D01", "#102063", "#2C5800", "#6B071B"];
contextBridge.exposeInMainWorld("GHOST_COLORS", GHOST_COLORS);

const FRAME_COLOR = "black";
contextBridge.exposeInMainWorld("FRAME_COLOR", FRAME_COLOR);
const PLACED_MINO_COLOR = "gray";
contextBridge.exposeInMainWorld("PLACED_MINO_COLOR", PLACED_MINO_COLOR);
const BACKGROUND_COLOR = "whitesmoke";
contextBridge.exposeInMainWorld("BACKGROUND_COLOR", BACKGROUND_COLOR);

const BLOCK_SIZE = 20;
contextBridge.exposeInMainWorld("BLOCK_SIZE", BLOCK_SIZE);
const HOLD_CANVAS_SIZE = [0, 0, 80, 80];
contextBridge.exposeInMainWorld("HOLD_CANVAS_SIZE", HOLD_CANVAS_SIZE);
const FIELD_CANVAS_SIZE = [0, 0, 240, 420];
contextBridge.exposeInMainWorld("FIELD_CANVAS_SIZE", FIELD_CANVAS_SIZE);
const NEXT_CANVAS_SIZE = [0, 0, 80, 420];
contextBridge.exposeInMainWorld("NEXT_CANVAS_SIZE", NEXT_CANVAS_SIZE);

// 単位はすべてms
const _f = 1000 / 60; // 60fpsにおける1フレーム 16.6666...ミリ秒
const DAS = Math.floor(10 * _f); // 166ms
contextBridge.exposeInMainWorld("DAS", DAS);
const ARR = Math.floor(2 * _f); // 33ms
contextBridge.exposeInMainWorld("ARR", ARR);
const LOCK_DOWN_DELAY = 500; // 接地猶予時間
contextBridge.exposeInMainWorld("LOCK_DOWN_DELAY", LOCK_DOWN_DELAY);
const SET_DELAY = 20; // 接地硬直
contextBridge.exposeInMainWorld("SET_DELAY", SET_DELAY);
const DEL_DELAY = 100; // ライン消去時の硬直
contextBridge.exposeInMainWorld("DEL_DELAY", DEL_DELAY);
