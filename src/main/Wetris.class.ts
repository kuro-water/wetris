const { IpcMainInvokeEvent } = require("electron");

const Field = require("./Field.class");
type Field = typeof Field;
const Mino = require("./Mino.class");
type Mino = typeof Mino;

import {
    MINO_POS,
    MINO_COLORS,
    LOCK_DOWN_DELAY,
    SET_DELAY,
    DEL_DELAY,
    KSKS_LIMIT,
    MINO_IDX,
} from "./constant";

import { success, error, warning, task, debug, info } from "./messageUtil";

export class Wetris {
    sender: typeof IpcMainInvokeEvent.sender;

    currentMino: Mino;
    nextMinos: MINO_IDX[] = [];
    afterNextMinos: MINO_IDX[] = [];
    holdMino: MINO_IDX;

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
    modeTspin = 0;
    isBtB = false;

    isMainloopActive: boolean;

    lines = 0; // debug

    constructor(sender: typeof IpcMainInvokeEvent.sender) {
        this.sender = sender;
        task("wetris constructor started.");

        this.clearFieldContext();
        this.clearHoldContext();
        this.clearNextContext();

        this.field = new Field();
        this.latestTime = Date.now();

        this.nextMinos = this.getTurn();
        this.afterNextMinos = this.getTurn();

        this.makeNewMino();
        this.mainloop();
        this.isMainloopActive = true;

        task("wetris constructor ended.");
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
        if (this.sender === null) return;
        this.sender.send("clearFieldContext");
    }

    clearHoldContext() {
        if (this.sender === null) return;
        this.sender.send("clearHoldContext");
    }

    clearNextContext() {
        if (this.sender === null) return;
        this.sender.send("clearNextContext");
    }

    getConfig = async () => {
        const config = await electronAPI.getConfig();
        this.keyMap = config.keyMap;
        task("read:config");
    };

    mainloop = async () => {
        while (" ω ") {
            await this.sleep(1000);
            if (!this.isMainloopActive) continue;
            // info("mainloop");
            // this.sender.send("test", "mainloop");
            if (!this.currentMino) {
                // 接地硬直中はcurrentMinoが存在せずTypeErrorとなる
                continue;
            }
            if (this.currentMino.moveMino({ x: 0, y: 1 })) {
                this.isLocking = false;
                this.countKSKS = 0;
            } else {
                this.lockDown();
            }
        }
    };

    drawField() {
        if (this.sender === null) return;
        this.sender.send("drawField", this.field.field);
        this.currentMino.drawGhostMino();
        this.currentMino.drawMino();
    }

    makeNewMino = async () => {
        if (!this.nextMinos.length) {
            // ネクストが空なら生成
            this.nextMinos = this.afterNextMinos;
            this.afterNextMinos = this.getTurn();
        }

        this.currentMino = new Mino(this.field, this.nextMinos.pop() as MINO_IDX, this.sender);

        if (this.currentMino.isGameOver) {
            this.drawField();
            this.currentMino.drawMino();
            this.currentMino = null;
            this.isMainloopActive = false;
            return;
        }
        // info(this.nextMinos);
        // info(this.afterNextMinos);
        this.drawField();
        this.drawNext();
    };

    getTurn(): MINO_IDX[] {
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
        // info(turn);
        return turn;
    }

    drawNext() {
        if (this.sender === null) return;
        // info("---------- draw next ----------")
        this.clearNextContext();
        // ネクスト配列のコピーを作り、popで取り出す
        let nextMinos = [...this.nextMinos];
        let afterNextMinos = [...this.afterNextMinos];
        const NUM_OF_NEXT = 5;
        for (let i = 0; i < NUM_OF_NEXT; i++) {
            if (!nextMinos.length) {
                nextMinos = afterNextMinos;
                // info("入れ替えた");
            }
            // info(nextMinos);
            // info(afterNextMinos);
            // info("");
            let idxMino = nextMinos.pop() as MINO_IDX;

            for (let j = 0; j < MINO_POS[idxMino][0].length; j++) {
                const block: position = {
                    x: MINO_POS[idxMino][0][j].x,
                    y: MINO_POS[idxMino][0][j].y,
                };
                this.sender.send(
                    "drawNextBlock",
                    { x: 1 + block.x, y: 1 + i * 4 + block.y },
                    MINO_COLORS[idxMino]
                );
            }
        }
        // info("---------- end draw next ----------")
    }

    /**
     * カサカサの処理
     * @return true:接地した false:接地していない
     */
    checkKSKS(): boolean {
        // 空中にいるなら何もしない
        if (this.currentMino.y !== this.currentMino.getGhostY()) {
            return false;
        }

        // まだカサカサできる
        if (this.countKSKS < KSKS_LIMIT) {
            // debug("plus");
            // this.countKSKS += 1;
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
        // debug(`${delay}`);
        if (LOCK_DOWN_DELAY < delay) {
            this.set();
            this.isLocking = false;
        }
    }

    set = async () => {
        let lines;

        // debug
        if (this.currentMino.idxMino === MINO_IDX.T_MINO) debug(this.currentMino.lastSRS);

        // 接地硬直中操作不能にする
        let settingMino = this.currentMino;
        this.currentMino = null;
        // debug("lock");

        settingMino.setMino();
        // info("modeTspin:" + this.modeTspin);
        lines = this.field.clearLines();
        // info("l:", this.lines);
        this.lines += lines;
        if (lines) {
            this.ren += 1;
            // 今回がTspinかどうか、前回がTspinかどうかの4パターン存在する。いい感じにした
            if (this.isBtB) {
                this.isBtB = !!this.modeTspin || lines === 4;
                this.addScore(lines, this.ren, this.modeTspin, this.isBtB);
            } else {
                this.addScore(lines, this.ren, this.modeTspin, this.isBtB);
                this.isBtB = !!this.modeTspin || lines === 4;
            }
            if (this.sender !== null) await this.sleep(DEL_DELAY);
        } else {
            this.ren = -1;
            if (this.sender !== null) await this.sleep(SET_DELAY);
        }
        // debug("release")
        // this.draw();
        await this.makeNewMino();
        this.isUsedHold = false;
        let ren = this.ren;
        if (ren < 0) ren = 0;
        if (this.sender === null) return;
        this.sender.send("setLabelScore", String("score:" + this.score));
        this.sender.send("setLabelRen", String("ren:" + ren));
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
            info("Wetris");
            score += 2000;
        } else if (modeTspin === 1) {
            info("T-spin");
            score += 1000 * lines;
        } else if (modeTspin === 2) {
            info("T-spin mini");
            score += 500 * lines;
        } else {
            // default
            score += 100 * lines;
        }

        info("btb:" + isBtB);
        if (isBtB) {
            score *= 1.5;
            score = Math.floor(score);
            info("BtB!");
        }

        if (this.field.isPerfectClear()) {
            info("ぱふぇ");
            score += 4000;
        }
        info("+" + score);
        this.score += score;
    }

    move(dif: position): boolean {
        // 接地硬直中に入力されるとcurrentMinoが存在せずTypeErrorとなるため
        if (!this.currentMino) return false;

        if (this.checkKSKS()) return false;
        if (this.currentMino.moveMino(dif)) {
            this.isLocking = false;
            this.modeTspin = 0;
            this.countKSKS += 1;
            return true;
        }
        return false;
    }

    moveLeft(): boolean {
        return this.move({ x: -1, y: 0 });
    }

    moveRight(): boolean {
        return this.move({ x: 1, y: 0 });
    }

    rotate(angle: number): boolean {
        // 接地硬直中に入力されるとcurrentMinoが存在せずTypeErrorとなるため
        if (!this.currentMino) return false;

        if (this.checkKSKS()) return false;
        if (this.currentMino.rotateMino(angle)) {
            this.isLocking = false;
            this.modeTspin = this.currentMino.getModeTspin();
            this.countKSKS += 1;
            return true;
        }
        return false;
    }

    rotateLeft(): boolean {
        return this.rotate(-1);
    }

    rotateRight(): boolean {
        return this.rotate(1);
    }

    /**
     *
     * @returns true:接地した false:接地していない
     */
    softDrop(): boolean {
        // 接地硬直中に入力されるとcurrentMinoが存在せずTypeErrorとなるため
        if (!this.currentMino) return true;

        // 下へ動かせなければ接地
        if (this.currentMino.moveMino({ x: 0, y: 1 })) {
            this.isLocking = false;
            this.countKSKS = 0;
            this.score += 1;
            if (this.sender.send !== null)
                this.sender.send("setLabelScore", String("score:" + this.score));
            return false;
        } else {
            this.lockDown();
            return true;
        }
    }

    hardDrop = async () => {
        // 接地硬直中に入力されるとcurrentMinoが存在せずTypeErrorとなるため
        if (!this.currentMino) return;

        this.score += this.currentMino.getGhostY() - this.currentMino.y;
        this.score += 10;

        // ゴーストのy座標まで移動(接地)
        this.currentMino.moveMino({ x: 0, y: this.currentMino.getGhostY() - this.currentMino.y });

        await this.set();
    };

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
        // info("hold");
    }
}

module.exports = Wetris;
