class WetrisRenderer {
    playerList: PlayerInfo[] = [];
    keyMap: KeyMap;

    constructor() {
        console.log("renderer started.");
    }

    /**
     * getElement
     * @description PlayerInfoにHTML要素を格納する
     * @returns void
     * @param playerInfo
     * @param idList
     */
    getElement(playerInfo: PlayerInfo, idList: ElementIdList) {
        playerInfo.canvasField = document.getElementById(idList[0]) as HTMLCanvasElement;
        playerInfo.canvasHold = document.getElementById(idList[1]) as HTMLCanvasElement;
        playerInfo.canvasNext = document.getElementById(idList[2]) as HTMLCanvasElement;
        playerInfo.canvasFieldContext = (
            document.getElementById(idList[0]) as HTMLCanvasElement
        ).getContext("2d") as CanvasRenderingContext2D;
        playerInfo.canvasHoldContext = (
            document.getElementById(idList[1]) as HTMLCanvasElement
        ).getContext("2d") as CanvasRenderingContext2D;
        playerInfo.canvasNextContext = (
            document.getElementById(idList[2]) as HTMLCanvasElement
        ).getContext("2d") as CanvasRenderingContext2D;
        playerInfo.labelScore = document.getElementById(idList[3]) as HTMLLabelElement;
        playerInfo.labelRen = document.getElementById(idList[4]) as HTMLLabelElement;
    }

    async wetrisInit() {
        this.keyMap = (await electronAPI.getConfig()).keyMap;

        window.addEventListener("beforeunload", (_event) => {
            this.playerList.forEach((player) => wetris.stop(player.idx));
        });
    }

    keyInit(player: PlayerInfo) {
        // Record<keycode, value>
        const idInterval: Record<string, NodeJS.Timeout> = {};
        const isKeyDown: Record<string, boolean> = {};

        document.onkeydown = async (event) => {
            // console.log("down:" + event.code);

            // 押下中ならreturn
            if (isKeyDown[event.code]) return;

            // 処理を実行
            isKeyDown[event.code] = true;
            keyEvent(event);
            await new Promise((resolve) => setTimeout(resolve, DAS));

            // ハードドロップは長押しでもループ実行しないのでreturn
            if (event.code === this.keyMap.hardDrop) return;

            // 既に離されていたらreturn
            if (!isKeyDown[event.code]) return;

            // 既にsetIntervalが動いていたらreturn
            if (idInterval[event.code] !== undefined) return;

            // 33ms毎にループ実行する、非同期
            idInterval[event.code] = setInterval(() => {
                keyEvent(event);
            }, ARR);
        };

        document.onkeyup = (event) => {
            // ループを止める
            clearInterval(idInterval[event.code]);
            idInterval[event.code] = undefined;
            isKeyDown[event.code] = false;
            // console.log("up:" + event.code);
        };

        /**
         * keyEvent
         * @description キー入力に対する処理を行う
         * @returns void
         * @param event
         */
        const keyEvent = (event: KeyboardEvent) => {
            // KeyMapと関数の対応
            // KeyMapはconstructorで取得
            const actions = {
                [this.keyMap.moveLeft]: () => wetris.moveLeft(player.idx),
                [this.keyMap.moveRight]: () => wetris.moveRight(player.idx),
                [this.keyMap.softDrop]: () => wetris.softDrop(player.idx),
                [this.keyMap.hardDrop]: () => wetris.hardDrop(player.idx),
                [this.keyMap.rotateLeft]: () => wetris.rotateLeft(player.idx),
                [this.keyMap.rotateRight]: () => wetris.rotateRight(player.idx),
                [this.keyMap.hold]: () => wetris.hold(player.idx),
            };

            const action = actions[event.code];
            if (action) {
                action();
            } else {
                console.log("unknown key");
            }
        };
    }

    drawInit() {
        const gameOver = (idx: number) => {
            this.playerList.forEach((_, i) => {
                if (i !== idx) {
                    wetris.stop(i);
                    setCanvasStr(i, "WIN");
                } else {
                    setCanvasStr(i, "LOSE");
                }
                this.playerList[i].canvasFieldContext = null;
            });
        };

        ipcRenderer.on("gameOver", gameOver);

        const setCanvasStr = (idx: number, str: string) => {
            if (this.playerList[idx] === undefined) {
                throw new Error(
                    `this.playerList[idxWetris] is undefined on setLabelScore\nidx : ${idx}`,
                );
            }
            const canvas = this.playerList[idx].canvasField;
            const context = this.playerList[idx].canvasFieldContext;
            context.textAlign = "center";
            context.font = "50px sans-serif";
            context.fillStyle = "black";
            context.fillText(str, canvas.width / 2, canvas.height / 2);
        };

        ipcRenderer.on("setCanvasStr", setCanvasStr);

        /**
         * @description スコアを反映
         * @param {number} idx
         * @param {string} score
         */
        const setLabelScore = (idx: number, score: string) => {
            if (this.playerList[idx] === undefined) {
                throw new Error(
                    `this.playerList[idxWetris] is undefined on setLabelScore\nidx : ${idx}`,
                );
            }
            this.playerList[idx].labelScore.innerText = score;
        };

        ipcRenderer.on("setLabelScore", setLabelScore);

        /**
         * @description renを反映
         * @param {number} idx
         * @param {string} ren
         */
        const setLabelRen = (idx: number, ren: string) => {
            if (this.playerList[idx] === undefined) {
                throw new Error(
                    `this.playerList[idxWetris] is undefined on setLabelRen\nidx : ${idx}`,
                );
            }
            this.playerList[idx].labelRen.innerText = ren;
        };

        ipcRenderer.on("setLabelRen", setLabelRen);

        /**
         * @description フィールドの描画エリアを初期化
         * @param {number} idx
         */
        const clearFieldContext = (idx: number) => {
            if (this.playerList[idx] === undefined) {
                throw new Error(
                    `this.playerList[idxWetris] is undefined on clearFieldContext\nidx : ${idx}`,
                );
            }
            console.log("clearFieldContext");
            drawField(idx, INIT_FIELD);

            this.playerList[idx].canvasFieldContext.fillStyle = FRAME_COLOR;
            this.playerList[idx].canvasFieldContext.fillRect(
                0,
                0,
                BLOCK_SIZE,
                FIELD_CANVAS_SIZE[3],
            );
            this.playerList[idx].canvasFieldContext.fillRect(
                FIELD_CANVAS_SIZE[2] - BLOCK_SIZE,
                0,
                BLOCK_SIZE,
                FIELD_CANVAS_SIZE[3],
            );
            this.playerList[idx].canvasFieldContext.fillRect(
                0,
                FIELD_CANVAS_SIZE[3] - BLOCK_SIZE,
                FIELD_CANVAS_SIZE[2],
                BLOCK_SIZE,
            );
            // 行っているのは以下と同等の操作
            // this.playerList[idx].canvasFieldContext.fillRect(0, 0, 20, 420);
            // this.playerList[idx].canvasFieldContext.fillRect(220, 0, 20, 420);
            // this.playerList[idx].canvasFieldContext.fillRect(0, 400, 220, 20);
        };

        ipcRenderer.on("clearFieldContext", clearFieldContext);

        /**
         * @description ホールドの描画エリアを初期化
         * @param {number} idx
         */
        const clearHoldContext = (idx: number) => {
            if (this.playerList[idx] === undefined) {
                throw new Error(
                    `this.playerList[idxWetris] is undefined on clearHoldContext\nidx : ${idx}`,
                );
            }
            console.log("clearHoldContext");
            this.playerList[idx].canvasHoldContext.fillStyle = BACKGROUND_COLOR;
            this.playerList[idx].canvasHoldContext.fillRect(
                ...(HOLD_CANVAS_SIZE as [number, number, number, number]),
            );
        };

        ipcRenderer.on("clearHoldContext", clearHoldContext);

        /**
         * @description ネクストの描画エリアを初期化
         * @param {number} idx
         */
        const clearNextContext = (idx: number) => {
            if (this.playerList[idx] === undefined) {
                throw new Error(
                    `this.playerList[idxWetris] is undefined on clearNextContext\nidx : ${idx}`,
                );
            }
            this.playerList[idx].canvasNextContext.fillStyle = BACKGROUND_COLOR;
            this.playerList[idx].canvasNextContext.fillRect(
                ...(NEXT_CANVAS_SIZE as [number, number, number, number]),
            );
        };

        ipcRenderer.on("clearNextContext", clearNextContext);

        /**
         * @description 1ブロック描画
         * @param {number} idx
         * @param {Position} block
         * @param {string} color
         */
        const drawBlock = (idx: number, block: Position, color: string) => {
            if (this.playerList[idx] === undefined) {
                throw new Error(
                    `this.playerList[idxWetris] is undefined on drawBlock\nidx : ${idx}`,
                );
            }
            // console.log("draw block");
            // console.log("x:" + x + ",y:" + y + ",color:" + color);
            this.playerList[idx].canvasFieldContext.fillStyle = color;
            this.playerList[idx].canvasFieldContext.fillRect(
                block.x * BLOCK_SIZE,
                block.y * BLOCK_SIZE,
                BLOCK_SIZE,
                BLOCK_SIZE,
            );
        };

        ipcRenderer.on("drawBlock", drawBlock);

        /**
         * @description ミノを描画
         * @param {number} idx
         * @param {Position} minoPos
         * @param {Position[]} blocks
         * @param {string} color
         */
        const drawMino = (idx: number, minoPos: Position, blocks: Position[], color: string) => {
            if (this.playerList[idx] === undefined) {
                throw new Error(
                    `this.playerList[idxWetris] is undefined on drawMino\nidx : ${idx}`,
                );
            }
            console.log("draw mino");
            for (const block of blocks) {
                drawBlock(idx, { x: minoPos.x + block.x, y: minoPos.y + block.y }, color);
            }
        };

        ipcRenderer.on("drawMino", drawMino);

        /**
         * @description 描画済ミノを消し、新しい座標に描画しなおす
         * メインプロセスから起動するとラグでチカチカするのでこちらで処理
         * @param {number} idx
         * @param {Position[]} preBlockPos
         * @param {Position} preMinoPos
         * @param {Position} preGhostPos
         * @param {Position[]} postBlockPos
         * @param {Position} postMinoPos
         * @param {Position} postGhostPos
         * @param {number} idxMino
         */
        const reDrawMino = (
            idx: number,
            preBlockPos: Position[],
            preMinoPos: Position,
            preGhostPos: Position,
            postBlockPos: Position[],
            postMinoPos: Position,
            postGhostPos: Position,
            idxMino: number,
        ) => {
            if (this.playerList[idx] === undefined) {
                throw new Error(
                    `this.playerList[idxWetris] is undefined on reDrawMino\nidx : ${idx}`,
                );
            }
            console.log("move");
            for (const pos of preBlockPos) {
                drawBlock(
                    idx,
                    { x: preGhostPos.x + pos.x, y: preGhostPos.y + pos.y },
                    BACKGROUND_COLOR,
                );
                drawBlock(
                    idx,
                    { x: preMinoPos.x + pos.x, y: preMinoPos.y + pos.y },
                    BACKGROUND_COLOR,
                );
            }
            for (const pos of postBlockPos) {
                drawBlock(
                    idx,
                    { x: postGhostPos.x + pos.x, y: postGhostPos.y + pos.y },
                    GHOST_COLORS[idxMino],
                );
                drawBlock(
                    idx,
                    { x: postMinoPos.x + pos.x, y: postMinoPos.y + pos.y },
                    MINO_COLORS[idxMino],
                );
            }
        };

        ipcRenderer.on("reDrawMino", reDrawMino);

        /**
         * @description ネクストの描画エリアにミノを描画
         * @param {number} idx
         * @param {Position} block
         * @param {string} color
         */
        const drawNextBlock = (idx: number, block: Position, color: string) => {
            if (this.playerList[idx] === undefined) {
                throw new Error(
                    `this.playerList[idxWetris] is undefined on drawNextBlock\nidx : ${idx}`,
                );
            }
            this.playerList[idx].canvasNextContext.fillStyle = color;
            this.playerList[idx].canvasNextContext.fillRect(
                block.x * BLOCK_SIZE,
                block.y * BLOCK_SIZE,
                BLOCK_SIZE,
                BLOCK_SIZE,
            );
        };

        ipcRenderer.on("drawNextBlock", drawNextBlock);

        /**
         * @description ホールドの描画エリアにミノを描画
         * @param {number} idx
         * @param {Position} block
         * @param {string} color
         */
        const drawHoldBlock = (idx: number, block: Position, color: string) => {
            if (this.playerList[idx] === undefined) {
                throw new Error(
                    `this.playerList[idxWetris] is undefined on drawHoldBlock\nidx : ${idx}`,
                );
            }
            // console.log("draw hold block");
            // console.log("x:" + x + ",y:" + y + ",color:" + color);
            this.playerList[idx].canvasHoldContext.fillStyle = color;
            this.playerList[idx].canvasHoldContext.fillRect(
                (1 + block.x) * BLOCK_SIZE,
                (1 + block.y) * BLOCK_SIZE,
                BLOCK_SIZE,
                BLOCK_SIZE,
            );
        };

        ipcRenderer.on("drawHoldBlock", drawHoldBlock);

        /**
         * @description 指定されたフィールドを描画
         * @param {number} idx
         * @param {number[][]} field
         */
        const drawField = (idx: number, field: number[][]) => {
            if (this.playerList[idx] === undefined) {
                throw new Error(
                    `this.playerList[idxWetris] is undefined on drawField\nidx : ${idx}`,
                );
            }
            console.log("draw field");
            // console.log("i:" + this.field.length);
            // console.log("j:" + this.field[0].length);
            for (let i = DRAW_FIELD_TOP; i < DRAW_FIELD_HEIGHT + DRAW_FIELD_TOP; i++) {
                // console.log(this.field[i])
                for (let j = DRAW_FIELD_LEFT; j < DRAW_FIELD_LEFT + DRAW_FIELD_WIDTH; j++) {
                    if (field[i][j]) {
                        this.playerList[idx].canvasFieldContext.fillStyle = PLACED_MINO_COLOR;
                    } else {
                        this.playerList[idx].canvasFieldContext.fillStyle = BACKGROUND_COLOR;
                    }
                    this.playerList[idx].canvasFieldContext.fillRect(
                        j * BLOCK_SIZE,
                        (i - DRAW_FIELD_TOP) * BLOCK_SIZE,
                        BLOCK_SIZE,
                        BLOCK_SIZE,
                    );
                    // console.log("draw:" + i + "," + j);
                }
            }
        };

        ipcRenderer.on("drawField", drawField);
    }
}

class SoloPlay extends WetrisRenderer {
    player: PlayerInfo = { idx: 0 };
    playerIdList: ElementIdList = [
        "canvasPlayerField",
        "canvasPlayerHold",
        "canvasPlayerNext",
        "labelPlayerScore",
        "labelPlayerRen",
    ];

    // @Override
    constructor() {
        super();
        this.wetrisInit();
        this.keyInit(this.player);
        this.drawInit();
    }

    // @Override
    async wetrisInit() {
        await super.wetrisInit();
        console.log("this is soloPlay.html");

        this.getElement(this.player, this.playerIdList);
        wetris.start(this.player.idx);
        this.playerList[this.player.idx] = this.player;
    }
}

class SoloCpu extends WetrisRenderer {
    cpu: PlayerInfo = { idx: 1 };
    cpuIdList: ElementIdList = [
        "canvasCpuField",
        "canvasCpuHold",
        "canvasCpuNext",
        "labelCpuScore",
        "labelCpuRen",
    ];

    // @Override
    constructor() {
        super();
        this.wetrisInit();
        // this.keyInit();
        this.drawInit();
    }

    // @Override
    async wetrisInit() {
        await super.wetrisInit();
        console.log("this is soloCpu.html");

        this.getElement(this.cpu, this.cpuIdList);
        wetris.start(this.cpu.idx);
        wetris.startCpu(this.cpu.idx);
        this.playerList[this.cpu.idx] = this.cpu;
    }
}

class PlayWithCpu extends WetrisRenderer {
    player: PlayerInfo = { idx: 0 };
    playerIdList: ElementIdList = [
        "canvasPlayerField",
        "canvasPlayerHold",
        "canvasPlayerNext",
        "labelPlayerScore",
        "labelPlayerRen",
    ];

    cpu: PlayerInfo = { idx: 1 };
    cpuIdList: ElementIdList = [
        "canvasCpuField",
        "canvasCpuHold",
        "canvasCpuNext",
        "labelCpuScore",
        "labelCpuRen",
    ];

    // @Override
    constructor() {
        super();
        this.wetrisInit();
        this.keyInit(this.player);
        this.drawInit();
    }

    // @Override
    async wetrisInit() {
        await super.wetrisInit();
        console.log("this is playWithCpu.html");

        this.getElement(this.player, this.playerIdList);
        wetris.start(this.player.idx);
        this.playerList[this.player.idx] = this.player;

        this.getElement(this.cpu, this.cpuIdList);
        wetris.start(this.cpu.idx);
        wetris.startCpu(this.cpu.idx);
        this.playerList[this.cpu.idx] = this.cpu;
    }
}

class SoloAi extends WetrisRenderer {
    ai: PlayerInfo = { idx: 1 };
    aiIdList: ElementIdList = [
        "canvasAiField",
        "canvasAiHold",
        "canvasAiNext",
        "labelAiScore",
        "labelAiRen",
    ];

    // @Override
    constructor() {
        super();
        this.wetrisInit();
        // this.keyInit();
        this.drawInit();
    }

    // @Override
    async wetrisInit() {
        await super.wetrisInit();
        console.log("this is soloAi.html");

        this.getElement(this.ai, this.aiIdList);
        this.playerList[this.ai.idx] = this.ai;
    }
}

const path = window.location.pathname;
if (path.includes("soloPlay.html")) {
    new SoloPlay();
} else if (path.includes("soloCpu.html")) {
    new SoloCpu();
} else if (path.includes("playWithCpu.html")) {
    new PlayWithCpu();
} else if (path.includes("soloAi.html")) {
    new SoloAi();
}
