declare class electronAPI {
    static getInitConfig(): Promise<Config>;
    static getConfig(): Promise<Config>;
    static saveConfig(data: Config): Promise<void>;
}

declare class wetris {
    static start(): Promise<number>;
    static startCpu(idx: number): null;
    static stop(idx: number): null;
    static moveLeft(idx: number): null;
    static moveRight(idx: number): null;
    static hardDrop(idx: number): null;
    static softDrop(idx: number): null;
    static rotateLeft(idx: number): null;
    static rotateRight(idx: number): null;
    static hold(idx: number): null;
    static getField(idx: number): Promise<number[][]>;
}

type KeyMap = {
    moveLeft: string;
    moveRight: string;
    softDrop: string;
    hardDrop: string;
    rotateLeft: string;
    rotateRight: string;
    hold: string;
};
type Config = {
    keyMode: string;
    keyMap: KeyMap;
};

type position = {
    x: number;
    y: number;
};
type blocks = position[]; // [[x, y], [x, y], ...]
// [position, position, position, position]
// としたほうが強制力は上がるが、
// a = []として後でpushする方法が使えなくなる
