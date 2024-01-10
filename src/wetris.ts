const { ipcMain, IpcMainInvokeEvent } = require("electron");
const {
    CONFIG_PATH,
    I_MINO,
    T_MINO,
    O_MINO,
    L_MINO,
    J_MINO,
    S_MINO,
    Z_MINO,
    INIT_FIELD,
    DRAW_FIELD_TOP,
    DRAW_FIELD_HEIGHT,
    DRAW_FIELD_WITDH,
    DRAW_FIELD_LEFT,
    MINO_POS,
    MINO_COLORS,
    GHOST_COLORS,
    SRS_TLJSZ,
    SRS_I,
    DAS,
    ARR,
    LOCK_DOWN_DELAY,
    SET_DELAY,
    DEL_DELAY,
    INIT_KEY_MAP,
    BLOCK_SIZE,
    HOLD_CANVAS_SIZE,
    FIELD_CANVAS_SIZE,
    NEXT_CANVAS_SIZE,
    FRAME_COLOR,
    PLACED_MINO_COLOR,
    BACKGROUND_COLOR,
    KSKS_LIMIT,
} = require("./constant");

/**
 * @param  {number}x 基準ブロックを0とした相対座標
 * @param  y 基準ブロックを0とした相対座標
 */
class Block {
    sender: typeof IpcMainInvokeEvent.sender;
    x: number;
    y: number;

    constructor(x: number, y: number, sender: typeof IpcMainInvokeEvent.sender) {
        this.x = x;
        this.y = y;
        this.sender = sender;
    }

    drawBlock(x: number, y: number, color: string) {
        this.sender.send("drawBlock", this.x + x, this.y + y, color);
    }

    drawNextBlock(x: number, y: number, color: string) {
        this.sender.send("drawNextBlock", this.x + x, this.y + y, color);
    }

    drawHoldBlock(color: string) {
        this.sender.send("drawHoldBlock", this.x, this.y, color);
    }

    // drawBlock(x: number, y: number, color: string, context: CanvasRenderingContext2D) {
    //     context.fillStyle = color;
    //     context.fillRect(
    //         (this.x + x) * BLOCK_SIZE,
    //         (this.y + y) * BLOCK_SIZE,
    //         BLOCK_SIZE,
    //         BLOCK_SIZE
    //     );
    // }
}

class Mino {
    sender: typeof IpcMainInvokeEvent.sender;

    field: Field;

    //基準ブロックの絶対座標(内部座標)
    x = 5;
    y = DRAW_FIELD_TOP + 1;
    idxMino: number;
    angle = 0;
    blocks: Block[] = [];
    lastSRS: number;

    constructor(field: Field, idxMino: number, sender: typeof IpcMainInvokeEvent.sender) {
        // console.log("mino constructor start.");
        this.sender = sender;
        this.idxMino = idxMino;
        this.field = field;
        for (let i = 0; i < 4; i++) {
            const x = MINO_POS[this.idxMino][this.angle % 4][i][0] + this.x;
            const y = MINO_POS[this.idxMino][this.angle % 4][i][1] + this.y;
            // console.log(String(x) + "," + String(y));
            if (this.field.isFilled(x, y)) {
                console.log("gameover");
                return;
            }
            this.blocks.push(
                new Block(
                    MINO_POS[this.idxMino][this.angle % 4][i][0],
                    MINO_POS[this.idxMino][this.angle % 4][i][1],
                    this.sender
                )
            );
        }
        this.drawMino();
        // console.log("mino constructor end.");
    }

    clearMino() {
        for (const block of this.blocks) {
            block.drawBlock(this.x, this.y - DRAW_FIELD_TOP, BACKGROUND_COLOR);
        }
    }

    drawMino() {
        for (const block of this.blocks) {
            block.drawBlock(this.x, this.y - DRAW_FIELD_TOP, MINO_COLORS[this.idxMino]);
        }
    }

    getGhostY(x = this.x): number {
        for (let i = 1; INIT_FIELD.length; i++) {
            for (const block of this.blocks) {
                if (this.field.isFilled(x + block.x, this.y + block.y + i)) {
                    return this.y + i - 1; // ぶつかる1つ手前がゴーストの位置
                }
            }
        }
        return -1; // error
    }

    /**
     * ゴーストを描画する
     * 別途現在地にも描画しないと上書きされる
     */
    drawGhostMino() {
        for (const block of this.blocks) {
            block.drawBlock(this.x, this.getGhostY() - DRAW_FIELD_TOP, GHOST_COLORS[this.idxMino]);
        }
    }

    drawHoldMino() {
        // console.log("drawHoldMino");
        this.sender.send("clearHoldContext");
        for (const block of this.blocks) {
            block.drawHoldBlock(MINO_COLORS[this.idxMino]);
        }
    }

    /**
     * ミノを移動させる
     * 座標は 1/BLOCK_SIZE
     * @return {bool} true:移動不可 false:移動済
     */
    moveMino(dx: number, dy: number): boolean {
        let toX: number, toY: number;
        toX = this.x + dx;
        toY = this.y + dy;

        for (const block of this.blocks) {
            // 移動先の検証
            if (this.field.isFilled(toX + block.x, toY + block.y)) {
                return true;
            }
        }

        // 移動前のブロックの座標を格納([[x,y],[x,y],[x,y],[x,y]])
        let blockPos: number[][] = [[], [], [], []];
        for (const [i, block] of this.blocks.entries()) {
            // 移動前の座標を格納しておく
            blockPos[i].push(block.x);
            blockPos[i].push(block.y);
        }
        // console.log("form:" + this.x + "," + this.getGhostY());
        // console.log("to:" + toX + "," + this.getGhostY(toX));
        // ゴーストの再描画
        this.sender.send(
            "moveMino",
            blockPos,
            this.x,
            this.getGhostY() - DRAW_FIELD_TOP,
            BACKGROUND_COLOR,
            toX,
            this.getGhostY(toX) - DRAW_FIELD_TOP,
            GHOST_COLORS[this.idxMino]
        );

        // ミノの再描画
        this.sender.send(
            "moveMino",
            blockPos,
            this.x,
            this.y - DRAW_FIELD_TOP,
            BACKGROUND_COLOR,
            toX,
            toY - DRAW_FIELD_TOP,
            MINO_COLORS[this.idxMino]
        );

        this.x = toX;
        this.y = toY;
        return false;
    }

    /**
     * ミノを回転させる
     * @param dif この値だけ右回転する 負なら左回転
     * @return {bool} true:移動不可 false:移動済
     */
    rotateMino(dif = 1): boolean {
        let rotated = [
            // 回転後の Block.x,y を格納(x[],y[])
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        ];
        let move = [0, 0]; // SRSにより移動する座標(x,y)
        while (this.angle <= 0) {
            // mode4の-1は3ではなく-1と出てしまうため、正の数にする
            this.angle += 4;
        }

        for (let i = 0; i < 4; i++) {
            // 基本回転
            rotated[0][i] = MINO_POS[this.idxMino][(this.angle + dif) % 4][i][0];
            rotated[1][i] = MINO_POS[this.idxMino][(this.angle + dif) % 4][i][1];
            // console.log("rotating x,y:" + (this.x + rotatedX[i]) + "," + (this.y + rotatedY[i]));
            // console.log("x:" + rotatedX + "y:" + rotatedY);
        }
        if (this.checkRotation(dif, rotated, move)) {
            // 回転不可
            return true;
        }

        // 移動前のブロックの座標を格納([[x,y],[x,y],[x,y],[x,y]])
        let preBlockPos: number[][] = [[], [], [], []];
        let postBlockPos: number[][] = [[], [], [], []];
        for (const [i, block] of this.blocks.entries()) {
            // 移動前の座標を格納しておく
            preBlockPos[i].push(block.x);
            preBlockPos[i].push(block.y);
        }
        for (let i = 0; i < 4; i++) {
            postBlockPos[i].push(rotated[0][i]);
            postBlockPos[i].push(rotated[1][i]);
        }

        let prePos = [this.x, this.y, this.getGhostY()];

        // let preMino = new Mino(this.field, this.idxMino, this.sender);
        // for (const [i, block] of this.blocks.entries()) {
        //     // 移動前の座標を格納しておく
        //     preMino.blocks[i].x = block.x;
        //     preMino.blocks[i].y = block.y;
        // }
        // preMino.x = this.x;
        // preMino.y = this.y;
        // preMino.angle = this.angle;
        // preMino.idxMino = this.idxMino;

        this.angle += dif;
        this.x += move[0];
        this.y += move[1];
        for (let i = 0; i < 4; i++) {
            this.blocks[i].x = rotated[0][i];
            this.blocks[i].y = rotated[1][i];
        }

        // console.log("from:" + preMino.blocks[0].x + "," + preMino.blocks[0].y);
        // console.log("to:" + this.blocks[0].x + "," + this.blocks[0].y);

        // ゴーストの再描画
        this.sender.send(
            "rotateMino",
            preBlockPos,
            prePos[0],
            prePos[2] - DRAW_FIELD_TOP,
            BACKGROUND_COLOR,
            postBlockPos,
            this.x,
            this.getGhostY() - DRAW_FIELD_TOP,
            GHOST_COLORS[this.idxMino]
        );

        // for (const block of preBlockPos) {
        //     console.log(block);
        // }
        // console.log("");
        // for (const block of postBlockPos) {
        //     console.log(block);
        // }

        // ミノの再描画
        this.sender.send(
            "rotateMino",
            preBlockPos,
            prePos[0],
            prePos[1] - DRAW_FIELD_TOP,
            BACKGROUND_COLOR,
            postBlockPos,
            this.x,
            this.y - DRAW_FIELD_TOP,
            MINO_COLORS[this.idxMino]
        );

        return false;
    }

    /**
     *  returnが使いたいので別関数に分けた
     * @returns {bool} true:移動不可 false:移動済
     */
    checkRotation(dif: number, rotated: number[][], move: number[]): boolean {
        let wallKickData: number[][][][];

        for (let i = 0; i < 4; i++) {
            // 基本回転の検証
            if (this.field.isFilled(this.x + rotated[0][i], this.y + rotated[1][i])) break;
            if (i === 3) return false;
        }

        if (this.idxMino === O_MINO) return true; // OミノにSRSは存在しない
        if (this.idxMino === I_MINO) wallKickData = SRS_I; // Iミノは独自のSRS判定を使用する
        else wallKickData = SRS_TLJSZ;

        for (let i = 0; i < 4; i++) {
            // SRSの動作
            move[0] = wallKickData[this.angle % 4][(this.angle + dif) % 4][i][0];
            move[1] = wallKickData[this.angle % 4][(this.angle + dif) % 4][i][1];
            // console.log("moved:" + move);
            for (let j = 0; j < 4; j++) {
                // 移動先の検証
                if (
                    this.field.isFilled(
                        this.x + rotated[0][j] + move[0],
                        this.y + rotated[1][j] + move[1]
                    )
                ) {
                    // console.log("braek:" + i);
                    // console.log((this.x + rotated[0][j] + move[0]) + "," + (this.y + rotated[1][j] + move[1]))
                    break;
                }
                if (j === 3) {
                    // console.log("move:" + i);
                    // if (this.idxMino === T_MINO) {
                    //     console.log("T-spin");
                    // }
                    this.lastSRS = i;
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * ミノを接地する。
     * 接地の可不の判定等は無いので注意
     */
    setMino() {
        for (const block of this.blocks) {
            this.field.setField(this.x + block.x, this.y + block.y);
        }
        console.log("set.");
    }

    /**
     * 基準ブロックを中心とした9*9の四隅のうち、三か所以上埋まっているとTspin
     * miniの判定：
     * ・T-Spinの条件を満たしていること。
     * ・SRSのにおける回転補正の4番目(SRS_DATA[3])でないこと。
     * ・ミノ固定時のＴミノ4隅のうち、凸側の2つのうちどちらかが空いていること。
     * 参考：https://tetris-matome.com/judgment/
     * @returns 1:Tspin, 2:Tspin mini
     */
    getModeTspin(): number {
        if (this.idxMino !== T_MINO) return 0;

        let filled_count = 0;
        if (this.field.isFilled(this.x + 1, this.y + 1)) filled_count += 1;
        if (this.field.isFilled(this.x + 1, this.y - 1)) filled_count += 1;
        if (this.field.isFilled(this.x - 1, this.y + 1)) filled_count += 1;
        if (this.field.isFilled(this.x - 1, this.y - 1)) filled_count += 1;
        if (filled_count < 3) return 0;

        if (this.lastSRS === 3) return 1;
        // console.log("miniかも");

        // console.log("angle:" + (this.angle % 4));

        //prettier-ignore
        const TSM_POS = [
            [[1, -1], [-1, -1]],
            [[1, 1], [1, -1]],
            [[1, -1], [1, 1]],
            [[-1, -1], [1, -1]]
        ];
        const [x1, x2] = TSM_POS[this.angle % 4][0];
        const [y1, y2] = TSM_POS[this.angle % 4][1];
        if (!this.field.isFilled(this.x + x1, this.y + y1)) {
            // console.log("(x, y) = (" + (this.x + x1) + ", " + (this.y + y1) + ")");
            return 2;
        }
        if (!this.field.isFilled(this.x + x2, this.y + y2)) {
            // console.log("(x, y) = (" + (this.x + x1) + ", " + (this.y + y2) + ")");
            return 2;
        }

        return 1;
    }
}

/**
 * field配列は[y][x]であることに注意
 * 事故防止のため原則メソッドからアクセスすること
 */
class Field {
    field: number[][];

    constructor() {
        this.field = [];
        for (let i = 0; i < INIT_FIELD.length; i++) {
            this.field[i] = [...INIT_FIELD[i]];
        }
    }

    /**
     * debug
     */
    printField() {
        for (const row of this.field) {
            console.log(row);
        }
    }

    /**
     * 指定した座標の真偽値を返す
     * @returns {boolean} true:すでに存在する
     */
    isFilled(x: number, y: number): boolean {
        // console.log("checking at (%d,%d)", x, y)
        if (x < 0 || 11 < x || y < 0 || this.field.length < y) return true;
        return !!this.field[y][x]; //number to boolean
    }

    setField(x: number, y: number) {
        // if (this.field[y][x]) {
        //     console.log("もうあるよ");
        // }
        this.field[y][x] = 1;
    }

    removeField(x: number, y: number) {
        // if (!this.field[y][x]) {
        //     console.log("もうないよ");
        // }
        this.field[y][x] = 0;
    }

    isPerfectClear(): boolean {
        for (let i = 0; i < this.field.length; i++) {
            for (let j = 0; j < 11; j++) {
                if (this.field[i][j] !== INIT_FIELD[i][j]) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * 一列埋まっているラインがあれば消去し、下詰めする
     * @returns 消去したライン数
     */
    deleteLines(): number {
        let count = 0;
        // 一番下の行は消さない
        for (let y = 0; y < this.field.length - 1; y++) {
            // console.log("checking:" + y)
            // console.log(this.field.field[y]);
            let x: number;
            for (x = 1; x <= 10; x++) {
                // console.log("y,x:" + y + "," + x + ":" + this.field.field[y][x])
                if (!this.isFilled(x, y)) {
                    break;
                }
            }
            // console.log(x)
            if (x == 11) {
                console.log("delete:" + y);
                // deleteだと中身を消すだけでundifinedが残るのでspliceを使う
                // delete this.field.field[y];
                this.field.splice(y, 1);
                this.field.unshift([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
                count++;
            }
        }
        return count;
    }
}

class Wetris {
    sender: typeof IpcMainInvokeEvent.sender;

    currentMino: Mino;
    nextMinos: Number[] = [];
    afterNextMinos: Number[] = [];
    holdMino: Number;

    field: Field;

    isLocking = false;
    latestTime: number;

    readJson: Function;
    // Record<key, value>
    keyMap: Record<string, string> = {};
    idInterval: Record<string, NodeJS.Timeout> = {};
    isKeyDown: Record<string, boolean> = {};
    isUsedHold = false;
    countKSKS = 0;

    score = 0;
    ren = 0;
    modeTspin = false;
    isBtB = false;

    isMainloop = false;

    constructor(sender: typeof IpcMainInvokeEvent.sender) {
        this.sender = sender;
        console.log("wetris constructor started.");

        this.clearFieldContext();
        this.clearHoldContext();
        this.clearNextContext();

        // this.labelScore = labelScore;
        // this.labelRen = labelRen;

        this.field = new Field();
        this.latestTime = Date.now();

        this.nextMinos = this.getTurn();
        this.afterNextMinos = this.getTurn();

        // this.getConfig();

        this.makeNewMino();
        this.mainloop();
        // this.keyListener(this);
        console.log("wetris constructor ended.");
    }

    /**
     *  よくわからんけどスリープできるようになる。Promiseてなんやねん
     * @param waitTime  ms
     * @return Promise
     */
    sleep(waitTime: number) {
        return new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    clearFieldContext() {
        this.sender.send("clearFieldContext");
    }

    clearHoldContext() {
        this.sender.send("clearHoldContext");
    }

    clearNextContext() {
        this.sender.send("clearNextContext");
    }

    getConfig = async () => {
        const config = await window.electronAPI.readJson(CONFIG_PATH);
        // if (config.keyMode == "default") {
        //     this.keyMap = INIT_KEY_MAP;
        // } else if (config.keyMode == "custom") {
        //     this.keyMap = config.keyMap;
        // } else {
        //     console.log("error : unknown keymap");
        //     this.keyMap = INIT_KEY_MAP;
        // }
        // console.log(config);
        // console.log(config.keyMap);
        // console.log(this.keyMap);
        this.keyMap = config.keyMap;
        console.log("read:config");
    };

    mainloop = async () => {
        while (" ω ") {
            if (!this.isMainloop) return;
            await this.sleep(1000);
            // console.log("mainloop");
            // this.sender.send("test", "mainloop");
            if (!this.currentMino) {
                // 接地硬直中はcurrentMinoが存在せずTypeErrorとなる
                continue;
            }
            if (this.currentMino.moveMino(0, 1)) {
                this.lockDown();
            } else {
                this.isLocking = false;
                this.countKSKS = 0;
            }
        }
    };

    draw() {
        this.sender.send("draw", this.field.field);
        this.currentMino.drawGhostMino();
        this.currentMino.drawMino();
    }

    makeNewMino() {
        if (!this.nextMinos.length) {
            // ネクストが空なら生成
            this.nextMinos = this.afterNextMinos;
            this.afterNextMinos = this.getTurn();
        }

        this.currentMino = new Mino(this.field, this.nextMinos.pop() as number, this.sender);

        if (this.currentMino.blocks.length !== 4) {
            // gameover
            this.currentMino = null;
            this.isMainloop = false;
            return;
        }
        // console.log(this.nextMinos);
        // console.log(this.afterNextMinos);
        this.draw();
        this.drawNext();
    }

    getTurn(): number[] {
        const getRandomInt = (min: number, max: number): number => {
            //整数の乱数を生成 https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Math/random
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min) + min);
        };

        //七種一巡を生成
        let idxArr = [...Array(7).keys()]; // 0~6を配列に展開
        let turn: number[] = [];
        for (let i = 0; i < 7; i++) {
            let random = getRandomInt(0, 7 - i);
            turn.push(idxArr[random]);
            idxArr.splice(random, 1);
        }
        // console.log(turn);
        return turn;
    }

    drawNext() {
        // console.log("---------- draw next ----------")
        this.clearNextContext();
        // ネクスト配列のコピーを作り、popで取り出す
        let nextMinos = [...this.nextMinos];
        let afterNextMinos = [...this.afterNextMinos];
        for (let i = 0; i < 5; i++) {
            let blocks: Block[] = [];

            if (!nextMinos.length) {
                nextMinos = afterNextMinos;
                // console.log("入れ替えた");
            }
            // console.log(nextMinos);
            // console.log(afterNextMinos);
            // console.log("");
            let idxMino = nextMinos.pop() as number;

            for (let j = 0; j < 4; j++) {
                blocks.push(
                    new Block(MINO_POS[idxMino][0][j][0], MINO_POS[idxMino][0][j][1], this.sender)
                );
                blocks[j].drawNextBlock(1, 1 + i * 4, MINO_COLORS[idxMino]);
            }
        }
        // console.log("---------- end draw next ----------")
    }

    /**
     * カサカサの処理
     * return true:接地した false:接地していない
     */
    checkKSKS(): boolean {
        console.log("checkKSKS");
        // console.log(this.currentMino.y);
        // console.log(this.currentMino.getGhostY());

        // 空中にいるなら何もしない
        if (this.currentMino.y !== this.currentMino.getGhostY()) {
            return false;
        }

        // まだカサカサできる
        if (this.countKSKS < KSKS_LIMIT) {
            // console.log("plus");
            this.countKSKS += 1;
            return false;
        }

        this.set();
        this.countKSKS = 0;
        return true;
    }

    /**
     * 接地硬直の処理
     */
    lockDown() {
        if (!this.isLocking) {
            this.latestTime = Date.now();
            this.isLocking = true;
            return;
        }
        let delay = Date.now() - this.latestTime;
        // console.log(delay);
        if (LOCK_DOWN_DELAY < delay) {
            this.set();
            this.isLocking = false;
        }
    }

    set = async () => {
        let modeTspin, lines;

        // debug
        if (this.currentMino.idxMino === T_MINO) console.log(this.currentMino.lastSRS);

        // 接地硬直中操作不能にする
        let settingMino = this.currentMino;
        this.currentMino = null;
        // console.log("lock");

        settingMino.setMino();
        modeTspin = settingMino.getModeTspin();
        console.log("modeTspin:" + modeTspin);
        lines = this.field.deleteLines();
        if (lines) {
            this.ren += 1;
            // 今回がTspinかどうか、前回がTspinかどうかの4パターン存在する。いい感じにした
            if (this.isBtB) {
                this.isBtB === !!modeTspin || lines === 4;
                this.addScore(lines, this.ren, modeTspin, this.isBtB);
            } else {
                this.addScore(lines, this.ren, modeTspin, this.isBtB);
                this.isBtB === !!modeTspin || lines === 4;
            }
            await this.sleep(DEL_DELAY);
        } else {
            this.ren = -1;
            await this.sleep(SET_DELAY);
        }
        // console.log("release")
        // this.draw();
        this.makeNewMino();
        this.isUsedHold = false;
        // this.labelScore.innerText = String("score:" + this.score);
        let ren = this.ren;
        if (ren < 0) ren = 0;
        // this.labelRen.innerText = String("ren:" + ren);
    };

    /**
     * 基礎得点 ： line*100 + 10*(ren+2)^2+60
     * T-spin   ： line*1000
     * Wetris   ： +2000
     * BtB      ： 1.5 * (基礎得点+T-spin+Wetris)
     * PC       ： +4000
     */
    addScore(lines: number, ren: number, modeTspin: number, isBtB: boolean) {
        let score = 0;

        // 適当にいい感じの二次関数 0renで0, 1renで100, 20renで4800くらい
        score += 10 * (ren + 2) * (ren + 2) - 40;

        // このタイミング一旦で整数にしないと（多分）情報落ちで計算がおかしくなる
        score = Math.floor(score);

        if (lines === 4) {
            console.log("Wetris");
            score += 2000;
        } else if (modeTspin === 1) {
            console.log("T-spin");
            score += 1000 * lines;
        } else if (modeTspin === 2) {
            console.log("T-spin mini");
            score += 500 * lines;
        } else {
            // default
            score += 100 * lines;
        }

        if (isBtB) {
            score *= 1.5;
            score = Math.floor(score);
            console.log("BtB!");
        }

        if (this.field.isPerfectClear()) {
            console.log("ぱふぇ");
            score += 4000;
        }
        console.log("+" + score);
        this.score += score;
    }

    moveLeft() {
        // 接地硬直中に入力されるとcurrentMinoが存在せずTypeErrorとなるため
        if (!this.currentMino) return;

        if (this.checkKSKS()) return;
        if (this.currentMino.moveMino(-1, 0)) {
            // console.log("cannot move!");
        } else {
            // this.draw();
            // this.currentMino.drawGhostMino();
            // this.currentMino.drawMino();
            this.isLocking = false;
        }
    }

    moveRight() {
        // 接地硬直中に入力されるとcurrentMinoが存在せずTypeErrorとなるため
        if (!this.currentMino) return;

        if (this.checkKSKS()) return;
        if (this.currentMino.moveMino(1, 0)) {
            // console.log("cannot move!");
        } else {
            // this.draw();
            // this.currentMino.drawGhostMino();
            // this.currentMino.drawMino();
            this.isLocking = false;
        }
    }

    rotateLeft() {
        // 接地硬直中に入力されるとcurrentMinoが存在せずTypeErrorとなるため
        if (!this.currentMino) return;

        if (this.checkKSKS()) return;
        if (this.currentMino.rotateMino(-1)) {
            // console.log("cannot move!");
        } else {
            // this.draw();
            this.isLocking = false;
        }
    }

    rotateRight() {
        // 接地硬直中に入力されるとcurrentMinoが存在せずTypeErrorとなるため
        if (!this.currentMino) return;

        if (this.checkKSKS()) return;
        if (this.currentMino.rotateMino(1)) {
            // console.log("cannot move!");
        } else {
            // this.draw();
            this.isLocking = false;
        }
    }

    /**
     *
     * @returns true:接地した false:接地していない
     */
    softDrop(): boolean {
        // 接地硬直中に入力されるとcurrentMinoが存在せずTypeErrorとなるため
        if (!this.currentMino) return true;

        // 下へ動かせなければ接地
        if (this.currentMino.moveMino(0, 1)) {
            this.lockDown();
            return true;
        } else {
            this.isLocking = false;
            this.countKSKS = 0;
            this.score += 1;
            // this.labelScore.innerText = String("score:" + this.score);
            return false;
        }
    }

    hardDrop() {
        // 接地硬直中に入力されるとcurrentMinoが存在せずTypeErrorとなるため
        if (!this.currentMino) return;

        // 接地まで下へ動かす
        while (!this.softDrop());
        this.score += 10;
        this.set();
    }

    hold() {
        // 接地硬直中に入力されるとcurrentMinoが存在せずTypeErrorとなるため
        if (!this.currentMino) return;

        if (this.isUsedHold) return;
        this.isUsedHold = true;

        if (this.holdMino !== undefined) {
            this.nextMinos.push(this.holdMino);
        }

        this.holdMino = this.currentMino.idxMino;
        this.currentMino.drawHoldMino();
        this.makeNewMino();
        console.log("hold");
    }

    // onButtonPrint() {
    //     for (let i = 0; i < mainWetris.field.field.length; i++)
    //         console.log(String(i) + ":" + String(mainWetris.field.field[i]));
    // }

    // keyListener(this_: Wetris) {
    //     document.onkeydown = async (event) => {
    //         // console.log("down:" + event.code);
    //         // 押下中ならreturn
    //         if (this_.isKeyDown[event.code]) return;

    //         this_.isKeyDown[event.code] = true;
    //         this_.keyEvent(event);
    //         await this.sleep(DAS);

    //         // ハードドロップは長押し無効
    //         if (event.code === this.keyMap.hardDrop) return;

    //         // 離されていたらreturn
    //         if (!this_.isKeyDown[event.code]) return;

    //         // 既にsetIntervalが動いていたらreturn
    //         if (this_.idInterval[event.code] != undefined) return;

    //         this_.idInterval[event.code] = setInterval(() => {
    //             this_.keyEvent(event);
    //         }, ARR); // 33ms毎にループ実行する、非同期
    //     };

    //     document.onkeyup = (event) => {
    //         clearInterval(this_.idInterval[event.code]); // 変数はただのIDであり、clearしないと止まらない
    //         this_.idInterval[event.code] = null;
    //         this_.isKeyDown[event.code] = false;
    //         // console.log("up:" + event.code);
    //     };
    // }

    // keyEvent(event: KeyboardEvent) {
    //     if (!this.isKeyDown[event.code]) {
    //         // たまにキーを離しても入力されっぱなしになることがある。
    //         // ガチで原因も対処法もわからん。
    //         // 対話実行でthis.idIntervalの中身を見ても全部nullなのに。
    //         // clearIntervalが上手くいってないんかね　発生条件すらわからんのでお手上げ

    //         // ここでclearすればよくね？→だめだった。clear発動してるしエラー吐かないのに直らない

    //         // for (let id of this.idInterval[event.code]) {
    //         //     clearInterval(id);
    //         // }
    //         // id全部保存しといてclearしまくれば？
    //         // →上手くいってはいるけど動作が不安定な気がする。重いのかclearが間に合ってなくて複数入力されてるっぽい感じ

    //         // 直った！！！ setIntervalする前に、既にsetされてたらreturnすればいい。
    //         // ということはつまり、連打か何かで二重にkeyDownイベントが起きていた？
    //         // console.logでは二重じゃなかったんだけどなあ。わからん

    //         console.log("なんで長押しされてるんだエラー");
    //         // clearInterval(this.idInterval[event.code]);
    //         // return;
    //     }
    //     if (!this.currentMino) return; // 接地硬直中に入力されるとcurrentMinoが存在せずTypeErrorとなるため
    //     // if (keymode) {
    //     //     if (event.code === "KeyA") this.moveLeft();
    //     //     if (event.code === "KeyD") this.moveRight();
    //     //     if (event.code === "KeyW") this.hardDrop();
    //     //     if (event.code === "KeyS") this.softDrop();
    //     //     if (event.code === "ArrowLeft") this.rotate(-1);
    //     //     if (event.code === "ArrowRight") this.rotate();
    //     //     if (event.code === "ArrowUp") this.hold();
    //     // } else {
    //     //     if (event.code === "ArrowLeft") this.moveLeft();
    //     //     if (event.code === "ArrowRight") this.moveRight();
    //     //     if (event.code === "Space") this.hardDrop();
    //     //     if (event.code === "ArrowDown") this.softDrop();
    //     //     if (event.code === "ShiftLeft") this.rotate(-1);
    //     //     if (event.code === "ControlRight") this.rotate();
    //     //     if (event.code === "KeyZ") this.rotate(-1);
    //     //     if (event.code === "KeyX") this.rotate();
    //     //     if (event.code === "KeyC") this.hold();
    //     // }

    //     if (event.code === this.keyMap.moveLeft) this.moveLeft();
    //     if (event.code === this.keyMap.moveRight) this.moveRight();
    //     if (event.code === this.keyMap.hardDrop) this.hardDrop();
    //     if (event.code === this.keyMap.softDrop) this.softDrop();
    //     if (event.code === this.keyMap.rotateLeft) this.rotate(-1);
    //     if (event.code === this.keyMap.rotateRight) this.rotate();
    //     if (event.code === this.keyMap.hold) this.hold();
    // }
}

let listWetris: Wetris[] = [];

function handleWetris() {
    ipcMain.handle("start", (event: typeof IpcMainInvokeEvent): number => {
        console.log("wetris starting...");
        listWetris.push(new Wetris(event.sender));
        // console.log(listWetris);

        // console.log(listWetris.length - 1); // idx
        return listWetris.length - 1; // idx
    });

    ipcMain.handle("moveLeft", (event: typeof IpcMainInvokeEvent, idx: number) => {
        listWetris[idx].moveLeft();
    });

    ipcMain.handle("moveRight", (event: typeof IpcMainInvokeEvent, idx: number) => {
        listWetris[idx].moveRight();
    });

    ipcMain.handle("softDrop", (event: typeof IpcMainInvokeEvent, idx: number) => {
        listWetris[idx].softDrop();
    });

    ipcMain.handle("hardDrop", (event: typeof IpcMainInvokeEvent, idx: number) => {
        listWetris[idx].hardDrop();
    });

    ipcMain.handle("rotateLeft", (event: typeof IpcMainInvokeEvent, idx: number) => {
        listWetris[idx].rotateLeft();
    });

    ipcMain.handle("rotateRight", (event: typeof IpcMainInvokeEvent, idx: number) => {
        listWetris[idx].rotateRight();
    });

    ipcMain.handle("hold", (event: typeof IpcMainInvokeEvent, idx: number) => {
        listWetris[idx].hold();
    });

    ipcMain.handle("stop", (event: typeof IpcMainInvokeEvent, idx: number) => {
        // listWetris[idx].isMainloop = false;
    });
}

module.exports = { handleWetris };