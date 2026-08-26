import { KSKS_LIMIT, LOCK_DOWN_DELAY, MINO_IDX, sleep } from "./constant";
import { FieldCore } from "./FieldCore";

import { info } from "./messageUtil";
import { MinoCore } from "./MinoCore";

export class WetrisCore {
    public currentMino: MinoCore;
    public nextMinos: MINO_IDX[] = [];
    public afterNextMinos: MINO_IDX[] = [];
    public idxHoldMino: MINO_IDX;

    public field: FieldCore;

    protected isLocking = false;
    private latestTime: number;

    protected delDelay = 0;
    protected setDelay = 0;

    protected isUsedHold = false;
    protected countKSKS = 0;

    protected score = 0;
    protected ren = 0;
    // 0: not Tspin 1:Tspin, 2:Tspin mini
    protected modeTspin = 0;
    protected isBtB = false;

    public isMainloopActive: boolean;

    totalLines = 0; // debug

    protected start(autoStart = true) {
        this.makeNewMino();
        if (autoStart) {
            this.callMainloop();
            this.isMainloopActive = true;
        }
    }

    constructor(autoStart = true) {
        // task("wetris constructor started.");
        this.field = new FieldCore();
        this.latestTime = Date.now();
        this.start(autoStart);

        // task("wetris constructor ended.");
    }

    private async callMainloop() {
        while (" ω ") {
            await sleep(1000);
            if (!this.isMainloopActive) {
                return;
            }
            await this.mainloop();
        }
    }

    protected async mainloop() {
        // this.field.printField();
        // debug("main loop");
        if (!this.currentMino) {
            // 接地硬直中はcurrentMinoが存在せずTypeErrorとなる
            return;
        }
        if (this.move({ x: 0, y: 1 })) {
            this.isLocking = false;
            this.countKSKS = 0;
        } else {
            this.lockDown();
        }
    }

    protected gameOver() {
        this.currentMino = null;
        this.isMainloopActive = false;
        info("game over");
    }

    public move(dif: Position): boolean {
        // 接地硬直中に入力されるとcurrentMinoが存在せずTypeErrorとなるため
        if (!this.currentMino) return false;

        if (this.checkKSKS()) return false;
        if (this.currentMino.moveMino(dif)) {
            this.isLocking = false;
            this.modeTspin = 0;
            this.countKSKS += 1;
            // debug("moved");
            return true;
        }
        return false;
    }

    public moveLeft(): boolean {
        return this.move({ x: -1, y: 0 });
    }

    public moveRight(): boolean {
        return this.move({ x: 1, y: 0 });
    }

    public rotate(angle: number): boolean {
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

    public rotateLeft(): boolean {
        return this.rotate(-1);
    }

    public rotateRight(): boolean {
        return this.rotate(1);
    }

    /**
     *
     * @returns true:移動できた false:移動できなかった（接地された可能性がある）
     */
    public softDrop(): boolean {
        // 接地硬直中に入力されるとcurrentMinoが存在せずTypeErrorとなるため
        if (!this.currentMino) return true;

        // 下へ動かせなければ接地
        if (this.move({ x: 0, y: 1 })) {
            this.isLocking = false;
            this.countKSKS = 0;
            this.score += 1;
            // info("score:" + this.score);
            return true;
        } else {
            this.lockDown();
            return false;
        }
    }

    public async hardDrop() {
        // 接地硬直中に入力されるとcurrentMinoが存在せずTypeErrorとなるため
        if (!this.currentMino) return;

        // this.score += this.currentMino.getGhostY() - this.currentMino.pos.y;
        this.score += 10;

        // 接地
        while (this.softDrop()) {}
        await this.set();
    }

    public hold() {
        // 接地硬直中に入力されるとcurrentMinoが存在せずTypeErrorとなるため
        if (!this.currentMino) return;

        if (this.isUsedHold) return;
        this.isUsedHold = true;

        if (this.idxHoldMino !== undefined) {
            this.nextMinos.push(this.idxHoldMino);
        }

        this.idxHoldMino = this.currentMino.idxMino;
        this.makeNewMino();
        // info("hold");
    }

    public async set() {
        if (this.currentMino === null) {
            return;
        }
        let lines;

        // if (this.currentMino.idxMino === MINO_IDX.T_MINO) debug(this.currentMino.lastSRS);

        // 接地硬直中操作不能にする
        let settingMino = this.currentMino;
        this.currentMino = null;
        // debug("lock");

        settingMino.setMino();
        // info("set");
        // info("modeTspin:" + this.modeTspin);
        lines = this.field.clearLines();
        // info("l:", this.lines);
        this.totalLines += lines;
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
            // Delayが0でもsleepしてしまうと止まってしまう
            if (this.delDelay) await sleep(this.delDelay);
        } else {
            this.ren = -1;
            if (this.setDelay) await sleep(this.setDelay);
        }
        // debug("release")
        this.makeNewMino();
        this.isUsedHold = false;
    }

    protected makeNewMino() {
        if (!this.nextMinos.length) {
            // ネクストが空なら生成
            if (!this.afterNextMinos.length) {
                this.afterNextMinos = this.getTurn();
            }
            this.nextMinos = this.afterNextMinos;
            this.afterNextMinos = this.getTurn();
        }

        this.currentMino = new MinoCore(this.field, this.nextMinos.pop());

        if (this.currentMino.isGameOver) {
            this.gameOver();
        }
        // info(this.nextMinos);
        // info(this.afterNextMinos);
    }

    private getTurn(): MINO_IDX[] {
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

    /**
     * カサカサの処理
     * @return true:接地した false:接地していない
     */
    private checkKSKS(): boolean {
        // 空中にいるなら何もしない
        if (this.currentMino.pos.y !== this.currentMino.getGhostY()) {
            return false;
        }

        // まだカサカサできる
        if (this.countKSKS < KSKS_LIMIT) {
            // debug("plus");
            return false;
        }

        this.set();
        this.countKSKS = 0;
        return true;
    }

    /**
     * 接地硬直の処理
     */
    protected lockDown() {
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

    /**
     * 基礎得点 ： line*100 + 10*(ren+2)^2+60
     * T-spin   ： line*1000
     * Wetris   ： +2000
     * BtB      ： 1.5 * (基礎得点+T-spin+Wetris)
     * PC       ： +4000
     */
    protected addScore(lines: number, ren: number, modeTspin: number, isBtB: boolean) {
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

        // info("btb:" + isBtB);
        if (isBtB) {
            score *= 1.5;
            score = Math.floor(score);
            // info("BtB!");
        }

        if (this.field.isPerfectClear()) {
            // info("ぱふぇ");
            score += 4000;
        }
        // info("+" + score);
        this.score += score;
    }
}
