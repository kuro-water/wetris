const MINO_DATA_PATH = "\\mino_data.json";
const CONFIG_PATH = "\\config.json";
console.log("read:mino_data");

/**
 * @param  {number}x 基準ブロックを0とした相対座標
 * @param  y 基準ブロックを0とした相対座標
 */
class Block {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    drawBlock(x: number, y: number, color: string, context: CanvasRenderingContext2D) {
        context.fillStyle = color;
        context.fillRect(
            (this.x + x) * BLOCK_SIZE,
            (this.y + y) * BLOCK_SIZE,
            BLOCK_SIZE,
            BLOCK_SIZE
        );
    }
}

class Mino {
    contextField: CanvasRenderingContext2D;
    contextHold: CanvasRenderingContext2D;
    field: Field;

    //基準ブロックの絶対座標
    x = 5;
    y = 2;
    idxMino: number;
    angle = 0;
    blocks: Block[] = [];
    lastSRS: number;

    constructor(
        contextField: CanvasRenderingContext2D,
        contextHold: CanvasRenderingContext2D,
        field: Field,
        idxMino: number
    ) {
        this.contextField = contextField;
        this.contextHold = contextHold;
        this.idxMino = idxMino;
        this.field = field;
        for (let i = 0; i < 4; i++) {
            this.blocks.push(
                new Block(
                    MINO_POS[this.idxMino][this.angle % 4][i][0],
                    MINO_POS[this.idxMino][this.angle % 4][i][1]
                )
            );
        }
        this.drawMino();
    }

    /**
     * 初期値では現在地をクリア
     */
    clearMino(x = this.x, y = this.y) {
        for (const block of this.blocks) block.drawBlock(x, y, BACKGROUND_COLOR, this.contextField);
    }

    /**
     * 初期値では現在地にデフォルトの色で描画
     */
    drawMino(
        x = this.x,
        y = this.y,
        color = MINO_COLORS[this.idxMino],
        context = this.contextField
    ) {
        for (const block of this.blocks) {
            block.drawBlock(x, y, color, context);
        }
    }

    /**
     * 下まで当たり判定を調べ、ゴーストを描画する
     * 同時に現在地にも描画する
     */
    drawGhostMino() {
        for (let i = 1; ; i++) {
            for (const block of this.blocks) {
                if (this.field.isFilled(this.x + block.x, this.y + block.y + i)) {
                    // ゴーストの描画
                    this.drawMino(
                        this.x,
                        this.y + i - 1,
                        GHOST_COLORS[this.idxMino],
                        this.contextField
                    );
                    // ミノの方が上のレイヤーにいてほしいので再描画
                    this.drawMino();
                    return;
                }
            }
        }
    }

    /**
     * ホールドを描画
     */
    drawHoldMino(contextHold: CanvasRenderingContext2D) {
        contextHold.fillStyle = "whitesmoke";
        contextHold.fillRect(...HOLD_CANVAS_SIZE);
        this.drawMino(1, 1, MINO_COLORS[this.idxMino], contextHold);
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

        // 移動先の検証
        for (const block of this.blocks)
            if (this.field.isFilled(toX + block.x, toY + block.y)) {
                return true;
            }

        this.clearMino();
        this.x = toX;
        this.y = toY;
        this.drawMino();
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
        while (this.angle <= 0) this.angle += 4; // mode4の-1は3ではなく-1と出てしまうため、正数にする

        for (let i = 0; i < 4; i++) {
            // 基本回転
            rotated[0][i] = MINO_POS[this.idxMino][(this.angle + dif) % 4][i][0];
            rotated[1][i] = MINO_POS[this.idxMino][(this.angle + dif) % 4][i][1];
            // console.log("rotating x,y:" + (this.x + rotatedX[i]) + "," + (this.y + rotatedY[i]));
            // console.log("x:" + rotatedX + "y:" + rotatedY);
        }
        if (this.checkRotation(dif, rotated, move)) return true; // 回転不可

        this.clearMino();
        this.angle += dif;
        this.x += move[0];
        this.y += move[1];
        for (let i = 0; i < 4; i++) {
            this.blocks[i].x = rotated[0][i];
            this.blocks[i].y = rotated[1][i];
        }
        this.drawMino();
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
     * ・ミノ固定時のＴミノ4隅のうち、凸側の1つが空いていること。
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

        let x1 = 0,
            x2 = 0,
            y1 = 0,
            y2 = 0;
        if (this.angle % 4 === 0) {
            (x1 = 1), (x2 = -1);
            (y1 = -1), (y2 = -1);
        } else if (this.angle % 4 === 1) {
            (x1 = 1), (x2 = 1);
            (y1 = 1), (y2 = -1);
        } else if (this.angle % 4 === 2) {
            (x1 = 1), (x2 = -1);
            (y1 = 1), (y2 = 1);
        } else if (this.angle % 4 === 3) {
            (x1 = -1), (x2 = -1);
            (y1 = 1), (y2 = -1);
        }
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
 * そのため原則メソッドからアクセスすること
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
        if (x < 0 || 11 < x || y < 0 || 20 < y) return true;
        return !!this.field[y][x]; //number to boolean
    }

    setField(x: number, y: number) {
        if (this.field[y][x]) console.log("もうあるよ");
        this.field[y][x] = 1;
    }

    removeField(x: number, y: number) {
        if (!this.field[y][x]) console.log("もうないよ");
        this.field[y][x] = 0;
    }

    isPerfectClear(): boolean {
        for (let i = 0; i < 20; i++)
            for (let j = 0; j < 11; j++) if (this.field[i][j] !== INIT_FIELD[i][j]) return false;
        return true;
    }

    /**
     * 一列埋まっているラインがあれば消去し、下詰めする
     * @returns 消去したライン数
     */
    deleteLines(): number {
        let count = 0;
        for (let y = 0; y < 20; y++) {
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

class Tetris {
    contextField: CanvasRenderingContext2D;
    contextHold: CanvasRenderingContext2D;
    contextNext: CanvasRenderingContext2D;

    labelScore: HTMLLabelElement;
    labelRen: HTMLLabelElement;

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

    score = 0;
    ren = 0;
    modeTspin = false;
    isBtB = false;

    isMainloop = true; // debug

    constructor() {
        console.log("tetris constructor started.");

        const CANVAS_FIELD = document.getElementById("field_canvas") as HTMLCanvasElement;
        const CANVAS_HOLD = document.getElementById("hold_canvas") as HTMLCanvasElement;
        const CANVAS_NEXT = document.getElementById("next_canvas") as HTMLCanvasElement;

        this.contextField = CANVAS_FIELD.getContext("2d");
        this.contextHold = CANVAS_HOLD.getContext("2d");
        this.contextNext = CANVAS_NEXT.getContext("2d");

        this.clearFieldContext();
        this.clearHoldContext();
        this.clearNextContext();

        this.labelScore = document.getElementById("score_label") as HTMLLabelElement;
        this.labelRen = document.getElementById("ren_label") as HTMLLabelElement;

        this.field = new Field();
        this.latestTime = Date.now();

        this.nextMinos = this.getTurn();
        this.afterNextMinos = this.getTurn();

        this.getConfig();

        this.makeNewMino();
        this.mainloop();
        this.keyListener(this);
        console.log("tetris constructor ended.");
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
        this.contextField.fillStyle = FRAME_COLOR;
        this.contextField.fillRect(0, 0, BLOCK_SIZE, FIELD_CANVAS_SIZE[3]);
        this.contextField.fillRect(
            FIELD_CANVAS_SIZE[2] - BLOCK_SIZE,
            0,
            BLOCK_SIZE,
            FIELD_CANVAS_SIZE[3]
        );
        this.contextField.fillRect(
            0,
            FIELD_CANVAS_SIZE[3] - BLOCK_SIZE,
            FIELD_CANVAS_SIZE[2],
            BLOCK_SIZE
        );
        // 行っているのは以下と同等の操作
        // this.contextField.fillRect(0, 0, 20, 420);
        // this.contextField.fillRect(220, 0, 20, 420);
        // this.contextField.fillRect(0, 400, 220, 20);
    }

    clearHoldContext() {
        this.contextHold.fillStyle = BACKGROUND_COLOR;
        this.contextHold.fillRect(...HOLD_CANVAS_SIZE);
    }

    clearNextContext() {
        this.contextNext.fillStyle = BACKGROUND_COLOR;
        this.contextNext.fillRect(...NEXT_CANVAS_SIZE);
    }

    getConfig = async () => {
        //@ts-ignore
        const config = await window.electronAPI.readJson(CONFIG_PATH);
        // if (config.key_mode == "default") {
        //     this.keyMap = INIT_KEY_MAP;
        // } else if (config.key_mode == "custom") {
        //     this.keyMap = config.key_map;
        // } else {
        //     console.log("error : unknown keymap");
        //     this.keyMap = INIT_KEY_MAP;
        // }
        // console.log(config);
        // console.log(config.key_map);
        // console.log(this.keyMap);
        this.keyMap = config.key_map;
        console.log("read:config");
    };

    mainloop = async () => {
        while (" ω ") {
            await this.sleep(1000);
            console.log("looping");
            if (!this.currentMino) continue; // 接地硬直中に入力されるとcurrentMinoが存在せずTypeErrorとなるため
            // this.moveDown();
            if (this.currentMino.moveMino(0, 1)) {
                this.lockDown();
            } else {
                this.isLocking = false;
            }
            if (!this.isMainloop) return;
        }
    };

    draw() {
        // console.log("i:" + this.field.field.length);
        // console.log("j:" + this.field.field[0].length);
        for (let i = 0; i < 20; i++) {
            // console.log(this.field.field[i])
            for (let j = 1; j < 11; j++) {
                if (this.field.field[i][j]) {
                    this.contextField.fillStyle = PLACED_MINO_COLOR;
                    // this.contextField.fillStyle = BACKGROUND_COLOR;
                    // this.contextField.fillStyle = MINO_COLORS[this.currentMino.idxMino];
                } else {
                    this.contextField.fillStyle = BACKGROUND_COLOR;
                }
                this.contextField.fillRect(j * BLOCK_SIZE, i * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                // console.log("draw:" + i + "," + j)
            }
        }
        this.currentMino.drawGhostMino();
    }

    makeNewMino() {
        if (!this.nextMinos.length) {
            this.nextMinos = this.afterNextMinos;
            this.afterNextMinos = this.getTurn();
        }
        // インスタンスの消去はガベージコレクションが勝手にやってくれる 手動ではできないらしい
        this.currentMino = new Mino(
            this.contextField,
            this.contextHold,
            this.field,
            this.nextMinos.pop() as number
        );
        // console.log(this.nextMinos);
        // console.log(this.afterNextMinos);
        this.draw();
        this.drawNext();
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
                blocks.push(new Block(MINO_POS[idxMino][0][j][0], MINO_POS[idxMino][0][j][1]));
                blocks[j].drawBlock(1, 1 + i * 4, MINO_COLORS[idxMino], this.contextNext);
            }
        }
        // console.log("---------- end draw next ----------")
    }

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
        this.makeNewMino();
        this.draw();
        this.labelScore.innerText = String("score:" + this.score);
        this.labelRen.innerText = String("ren:" + this.ren);
    };

    /**
     * 基礎得点 ： line*100 + 10*(ren+2)^2+60
     * T-spin   ： line*1000
     * Tetris   ： +2000
     * BtB      ： 1.5 * (基礎得点+T-spin+Tetris)
     * PC       ： +4000
     */
    addScore(lines: number, ren: number, modeTspin: number, isBtB: boolean) {
        let score = 0;

        // 適当にいい感じの二次関数 0renで0, 1renで100, 20renで4800くらい
        score += 10 * (ren + 2) * (ren + 2) - 40;

        // このタイミングで整数にしないと（多分）情報落ちで計算がおかしくなる
        score = Math.floor(score);

        if (lines === 4) {
            // console.log("Tetris");
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

    rotate(angle = 1) {
        if (this.currentMino.rotateMino(angle)) {
            // console.log("cannot move!");
        } else {
            this.draw();
            this.isLocking = false;
        }
    }

    moveLeft() {
        if (this.currentMino.moveMino(-1, 0)) {
            // console.log("cannot move!");
        } else {
            this.draw();
            this.isLocking = false;
        }
    }

    moveRight() {
        if (this.currentMino.moveMino(1, 0)) {
            // console.log("cannot move!");
        } else {
            this.draw();
            this.isLocking = false;
        }
    }

    moveDown(): boolean {
        // 下へ動かせなければ接地
        if (this.currentMino.moveMino(0, 1)) {
            this.lockDown();
            return true;
        } else {
            this.isLocking = false;
            this.score += 1;
            this.labelScore.innerText = String("score:" + this.score);
            return false;
        }
    }

    hardDrop() {
        // 接地まで下へ動かす
        while (!this.moveDown());
        this.score += 10;
        this.set();
    }

    hold() {
        if (this.holdMino !== undefined) this.nextMinos.push(this.holdMino);
        this.holdMino = this.currentMino.idxMino;
        this.currentMino.drawHoldMino(this.contextHold);
        this.makeNewMino();
    }

    onButtonPrint() {
        for (let i = 0; i < 21; i++) console.log(mainTetris.field.field[i]);
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
            let random = getRandomInt(0, 6 - i);
            turn.push(idxArr[random]);
            idxArr.splice(random, 1);
        }
        return turn;
    }

    keyListener(this_: Tetris) {
        document.onkeydown = async (event) => {
            // console.log("down:" + event.code);
            if (this_.isKeyDown[event.code]) return;

            this_.isKeyDown[event.code] = true;
            this_.keyEvent(event);
            await this.sleep(DAS);

            if (!this_.isKeyDown[event.code]) return;

            if (this_.idInterval[event.code] != undefined) return;

            this_.idInterval[event.code] = setInterval(() => {
                this_.keyEvent(event);
            }, ARR); // 33ms毎にループ実行する、非同期
        };

        document.onkeyup = (event) => {
            clearInterval(this_.idInterval[event.code]); // 変数はただのIDであり、clearしないと止まらない
            this_.idInterval[event.code] = null;
            this_.isKeyDown[event.code] = false;
            // console.log("up:" + event.code);
        };
    }

    keyEvent(event: KeyboardEvent) {
        if (!this.isKeyDown[event.code]) {
            // たまにキーを離しても入力されっぱなしになることがある。
            // ガチで原因も対処法もわからん。
            // 対話実行でthis.idIntervalの中身を見ても全部nullなのに。
            // clearIntervalが上手くいってないんかね　発生条件すらわからんのでお手上げ

            // ここでclearすればよくね？→だめだった。clear発動してるしエラー吐かないのに直らない

            // for (let id of this.idInterval[event.code]) {
            //     clearInterval(id);
            // }
            // id全部保存しといてclearしまくれば？
            // →上手くいってはいるけど動作が不安定な気がする。重いのかclearが間に合ってなくて複数入力されてるっぽい感じ

            // 直った！！！ setIntervalする前に、既にsetされてたらreturnすればいい。
            // ということはつまり、連打か何かで二重にkeyDownイベントが起きていた？
            // console.logでは二重じゃなかったんだけどなあ。わからん

            console.log("なんで長押しされてるんだエラー");
            // clearInterval(this.idInterval[event.code]);
            // return;
        }
        if (!this.currentMino) return; // 接地硬直中に入力されるとcurrentMinoが存在せずTypeErrorとなるため
        // if (keymode) {
        //     if (event.code === "KeyA") this.moveLeft();
        //     if (event.code === "KeyD") this.moveRight();
        //     if (event.code === "KeyW") this.hardDrop();
        //     if (event.code === "KeyS") this.moveDown();
        //     if (event.code === "ArrowLeft") this.rotate(-1);
        //     if (event.code === "ArrowRight") this.rotate();
        //     if (event.code === "ArrowUp") this.hold();
        // } else {
        //     if (event.code === "ArrowLeft") this.moveLeft();
        //     if (event.code === "ArrowRight") this.moveRight();
        //     if (event.code === "Space") this.hardDrop();
        //     if (event.code === "ArrowDown") this.moveDown();
        //     if (event.code === "ShiftLeft") this.rotate(-1);
        //     if (event.code === "ControlRight") this.rotate();
        //     if (event.code === "KeyZ") this.rotate(-1);
        //     if (event.code === "KeyX") this.rotate();
        //     if (event.code === "KeyC") this.hold();
        // }

        if (event.code === this.keyMap.moveLeft) this.moveLeft();
        if (event.code === this.keyMap.moveRight) this.moveRight();
        if (event.code === this.keyMap.hardDrop) this.hardDrop();
        if (event.code === this.keyMap.moveDown) this.moveDown();
        if (event.code === this.keyMap.rotateLeft) this.rotate(-1);
        if (event.code === this.keyMap.rotateRight) this.rotate();
        if (event.code === this.keyMap.hold) this.hold();
    }
}

let mainTetris = new Tetris();

function debug() {
    var keymode = 1;
    function useArrow() {
        keymode = 0;
    }
    function useWASD() {
        keymode = 1;
    }
    const PRINT_BUTTON = document.getElementById("button_print") as HTMLButtonElement;
    const USE_ARROW_BUTTON = document.getElementById("button_use_arrow") as HTMLButtonElement;
    const USE_WASD_BUTTON = document.getElementById("button_use_WASD") as HTMLButtonElement;
    PRINT_BUTTON.addEventListener("click", mainTetris.onButtonPrint);
    USE_ARROW_BUTTON.addEventListener("click", useArrow);
    USE_WASD_BUTTON.addEventListener("click", useWASD);
}
debug();

//test