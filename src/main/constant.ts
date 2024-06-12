export enum MINO_IDX {
    I_MINO = 0,
    T_MINO = 1,
    O_MINO = 2,
    L_MINO = 3,
    J_MINO = 4,
    S_MINO = 5,
    Z_MINO = 6,
}

export const EMPTY_ROW = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1];
export const FULL_ROW = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

export const INIT_FIELD = [
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
// xを増やすと右、yを増やすと下になる
// 0が空白、1が壁または設置済みミノ
// 内部座標では0,0が左上、11,40が右下
// 描画上でミノが動かせる範囲は1,20が左上、10,39が右下
// 内部座標にDRAW_FIELD_TOP, DRAW_FIELD_LEFTを足すと描画上の座標になる
export const DRAW_FIELD_TOP = 20;
export const DRAW_FIELD_HEIGHT = 20;
export const DRAW_FIELD_WITDH = 10;
export const DRAW_FIELD_LEFT = 1;

// 参考：https://tetris.wiki/Super_Rotation_System
// 画像を見ながら座標をベタ打ちした。こうでないとSRSの動作が難しい
// How Guideline move Really Works
// prettier-ignore
export const MINO_POS:position[][][] = [
    [ // I
        [{x: -1, y: 0}, {x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}],
        [{x: 1, y: -1}, {x: 1, y: 0}, {x: 1, y: 1}, {x: 1, y: 2}],
        [{x: -1, y: 1}, {x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1}],
        [{x: 0, y: -1}, {x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}],
    ],
    [ // T
        [{x: 0, y: -1}, {x: -1, y: 0}, {x: 0, y: 0}, {x: 1, y: 0}],
        [{x: 0, y: -1}, {x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: 1}],
        [{x: -1, y: 0}, {x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: 1}],
        [{x: 0, y: -1}, {x: -1, y: 0}, {x: 0, y: 0}, {x: 0, y: 1}],
    ],
    [ // O
        [{x: 0, y: -1}, {x: 1, y: -1}, {x: 0, y: 0}, {x: 1, y: 0}],
        [{x: 1, y: -1}, {x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: -1}],
        [{x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: -1}, {x: 1, y: -1}],
        [{x: 1, y: 0}, {x: 0, y: -1}, {x: 1, y: -1}, {x: 0, y: 0}],
    ],
    [ // L
        [{x: 1, y: -1}, {x: -1, y: 0}, {x: 0, y: 0}, {x: 1, y: 0}],
        [{x: 0, y: -1}, {x: 0, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}],
        [{x: -1, y: 0}, {x: 0, y: 0}, {x: 1, y: 0}, {x: -1, y: 1}],
        [{x: -1, y: -1}, {x: 0, y: -1}, {x: 0, y: 0}, {x: 0, y: 1}],
    ],
    [ // J
        [{x: -1, y: -1}, {x: -1, y: 0}, {x: 0, y: 0}, {x: 1, y: 0}],
        [{x: 0, y: -1}, {x: 1, y: -1}, {x: 0, y: 0}, {x: 0, y: 1}],
        [{x: -1, y: 0}, {x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: 1}],
        [{x: 0, y: -1}, {x: 0, y: 0}, {x: -1, y: 1}, {x: 0, y: 1}],
    ],
    [ // S
        [{x: 0, y: -1}, {x: 1, y: -1}, {x: -1, y: 0}, {x: 0, y: 0}],
        [{x: 0, y: -1}, {x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: 1}],
        [{x: 0, y: 0}, {x: 1, y: 0}, {x: -1, y: 1}, {x: 0, y: 1}],
        [{x: -1, y: -1}, {x: -1, y: 0}, {x: 0, y: 0}, {x: 0, y: 1}],
    ],
    [ // Z
        [{x: -1, y: -1}, {x: 0, y: -1}, {x: 0, y: 0}, {x: 1, y: 0}],
        [{x: 1, y: -1}, {x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: 1}],
        [{x: -1, y: 0}, {x: 0, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}],
        [{x: 0, y: -1}, {x: -1, y: 0}, {x: 0, y: 0}, {x: -1, y: 1}],
    ],
];

// prettier-ignore
export const SRS_TLJSZ:position[][][] = [
    [
        [],
        [{x: -1, y: 0}, {x: -1, y: -1}, {x: 0, y: 2}, {x: -1, y: 2}],
        [],
        [{x: 1, y: 0}, {x: 1, y: -1}, {x: 0, y: 2}, {x: 1, y: 2}],
    ],
    [
        [{x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: -2}, {x: 1, y: -2}],
        [],
        [{x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: -2}, {x: 1, y: -2}],
        [],
    ],
    [
        [],
        [{x: -1, y: 0}, {x: -1, y: -1}, {x: 0, y: 2}, {x: -1, y: 2}],
        [],
        [{x: 1, y: 0}, {x: 1, y: -1}, {x: 0, y: 2}, {x: 1, y: 2}],
    ],
    [
        [{x: -1, y: 0}, {x: -1, y: 1}, {x: 0, y: -2}, {x: -1, y: -2}],
        [],
        [{x: -1, y: 0}, {x: -1, y: 1}, {x: 0, y: -2}, {x: -1, y: -2}],
        [],
    ],
];
// prettier-ignore
export const SRS_I:position[][][] = [
    [
        [],
        [{x: -2, y: 0}, {x: 1, y: 0}, {x: -2, y: 1}, {x: 1, y: -2}],
        [],
        [{x: -1, y: 0}, {x: 2, y: 0}, {x: -1, y: -2}, {x: 2, y: 1}],
    ],
    [
        [{x: 2, y: 0}, {x: -1, y: 0}, {x: 2, y: -1}, {x: -1, y: 2}],
        [],
        [{x: -1, y: 0}, {x: 2, y: 0}, {x: -1, y: -2}, {x: 2, y: 1}],
        [],
    ],
    [
        [],
        [{x: 1, y: 0}, {x: -2, y: 0}, {x: 1, y: 2}, {x: -2, y: -1}],
        [],
        [{x: 2, y: 0}, {x: -1, y: 0}, {x: 2, y: -1}, {x: -1, y: 2}],
    ],
    [
        [{x: 1, y: 0}, {x: -2, y: 0}, {x: 1, y: 2}, {x: -2, y: -1}],
        [],
        [{x: -2, y: 0}, {x: 1, y: 0}, {x: -2, y: 1}, {x: 1, y: -2}],
        [],
    ],
];

export const MINO_COLORS = [
    "#0F9BD7",
    "#AF298A",
    "#E39F02",
    "#E35B02",
    "#2141C6",
    "#59B101",
    "#D70F37",
];
export const GHOST_COLORS = [
    "#074D6B",
    "#571445",
    "#714F01",
    "#712D01",
    "#102063",
    "#2C5800",
    "#6B071B",
];

export const FRAME_COLOR = "black";
export const PLACED_MINO_COLOR = "gray";
export const BACKGROUND_COLOR = "whitesmoke";

export const BLOCK_SIZE = 20;
export const HOLD_CANVAS_SIZE = [0, 0, 80, 80];
export const FIELD_CANVAS_SIZE = [0, 0, 240, 420];
export const NEXT_CANVAS_SIZE = [0, 0, 80, 420];

// 単位はすべてms
export const _f = 1000 / 60; // 60fpsにおける1フレーム 16.6666...ミリ秒
export const DAS = Math.floor(10 * _f); // 166ms
export const ARR = Math.floor(2 * _f); // 33ms
export const LOCK_DOWN_DELAY = 500; // 接地猶予時間
export const SET_DELAY = 20; // 接地硬直
export const DEL_DELAY = 100; // ライン消去時の硬直

export const KSKS_LIMIT = 12;
