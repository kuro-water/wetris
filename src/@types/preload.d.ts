declare var electronAPI: any;
declare var ipcRenderer: any;

// declare function wetris(
//     canvasField: HTMLCanvasElement,
//     canvasHold: HTMLCanvasElement,
//     canvasNext: HTMLCanvasElement,
//     labelScore: HTMLLabelElement,
//     labelRen: HTMLLabelElement
// ): void;
declare function start(): number;

declare class wetris {
    static start(): Promise<number>;
    static moveLeft(idx: number): null;
    static moveRight(idx: number): null;
    static hardDrop(idx: number): null;
    static softDrop(idx: number): null;
    static rotateLeft(idx: number): null;
    static rotateRight(idx: number): null;
    static hold(idx: number): null;
}

// interface Window {
//     wetris: {
//         create: () => number;
//     };
// }
// interface wetris {
//     create: () => number;
// }

// declare const I_MINO: number;
// declare const T_MINO: number;
// declare const O_MINO: number;
// declare const L_MINO: number;
// declare const J_MINO: number;
// declare const S_MINO: number;
// declare const Z_MINO: number;

// declare const INIT_FIELD: number[][];
// declare const DRAW_FIELD_TOP = 20;
// declare const DRAW_FIELD_HEIGHT = 20;
// declare const DRAW_FIELD_WITDH = 10;
// declare const DRAW_FIELD_LEFT = 1;

// declare const MINO_POS: number[][][][];

// declare const MINO_COLORS: string[];
// declare const GHOST_COLORS: string[];

// declare const SRS_TLJSZ: number[][][][];
// declare const SRS_I: number[][][][];

// declare const DAS: number;
// declare const ARR: number;
// declare const LOCK_DOWN_DELAY: number;
// declare const SET_DELAY: number;
// declare const DEL_DELAY: number;

// declare const INIT_KEY_MAP: {
//     moveLeft: string;
//     moveRight: string;
//     hardDrop: string;
//     softDrop: string;
//     rotateLeft: string;
//     rotateRight: string;
//     hold: string;
// };

// declare const BLOCK_SIZE: number;

// declare const HOLD_CANVAS_SIZE: [number, number, number, number];
// declare const FIELD_CANVAS_SIZE: [number, number, number, number];
// declare const NEXT_CANVAS_SIZE: [number, number, number, number];

// declare const FRAME_COLOR: string;
// declare const PLACED_MINO_COLOR: string;
// declare const BACKGROUND_COLOR: string;

// declare const CONFIG_PATH: string;

// declare const KSKS_LIMIT: number;
