import { Angle } from "./Angle";
import { ARR, DRAW_FIELD_TOP, MINO_IDX, sleep } from "./constant";
import { FieldCore } from "./FieldCore";

import { error, info } from "./messageUtil";
import { WetrisCore } from "./WetrisCore";
import { WetrisSender } from "./WetrisSender";

type FieldData = { field: FieldCore; pos: Position; idxMino: MINO_IDX; angle: Angle };

/**
 * 評価基準値を求めた後のデータを格納する
 * hole: 埋まっている穴の数
 * lidBlock: 下穴を埋めているブロックの数
 * height: 一番高い(内部的な値としては一番小さい)ブロックのy座標
 * requiredIMinoCount: 縦に3つ以上空いた穴の数 = 必要なIミノの数
 */
type FieldInfo = {
    fieldData: FieldData;
    hole: number;
    lidBlock: number;
    height: number;
    requiredIMinoCount: number;
};

type FieldScore = { fieldData: FieldData; score: number };

export class Cpu {
    private readonly mainWetris: WetrisSender;
    private trialWetris: WetrisCore;

    constructor(wetris: WetrisSender) {
        this.mainWetris = wetris;
        this.trialWetris = new WetrisCore();
        this.trialWetris.isMainloopActive = false;
        this.main();
    }

    private async main() {
        while (true) {
            // フィールドの評価値を求める
            const bestField = await this.getBestField(
                this.mainWetris.currentMino.idxMino,
                this.mainWetris.field,
            );
            const holdMino =
                this.mainWetris.idxHoldMino === undefined
                    ? this.mainWetris.nextMinos[this.mainWetris.nextMinos.length - 1]
                    : this.mainWetris.idxHoldMino;
            const bestFieldUsedHold = await this.getBestField(holdMino, this.mainWetris.field);

            // ゲーム終了時には終了
            if (!this.mainWetris.isMainloopActive) break;

            // 動かす
            if (bestFieldUsedHold.score < bestField.score) {
                // bestField.fieldData.field.printField();
                await this.moveMinoToMatchField(this.mainWetris, bestField.fieldData);
            } else {
                // debug("I wanna hold");
                // bestFieldUsedHold.fieldData.field.printField();
                this.mainWetris.hold();
                await this.moveMinoToMatchField(this.mainWetris, bestFieldUsedHold.fieldData);
            }
        }
    }

    private async moveMinoToMatchField(wetris: WetrisSender, fieldData: FieldData) {
        while (wetris.currentMino.angle.angle !== fieldData.angle.angle % 4) {
            if (Math.abs(fieldData.angle.angle - fieldData.angle.angle) === 3) {
                // 左回転の方が速い
                wetris.rotateLeft();
            } else {
                wetris.rotateRight();
            }
            await sleep(ARR);
        }
        while (wetris.currentMino.pos.x !== fieldData.pos.x) {
            const dif = fieldData.pos.x - wetris.currentMino.pos.x;
            const wasMoved = dif < 0 ? wetris.moveLeft() : wetris.moveRight();
            if (!wasMoved) {
                error("CPU: failed to move!");
            }
            await sleep(ARR);
        }
        await wetris.hardDrop();
    }

    private async getBestField(idxMino: MINO_IDX, field: FieldCore): Promise<FieldScore> {
        // 一手で積めるフィールドを全探索し、そのフィールドの評価を行う
        const fieldDataList = await this.getAllFieldPattern(idxMino, field);
        const fieldInfoList = await Promise.all(
            fieldDataList.map((fieldData) => this.getFieldInfo(fieldData)),
        );
        const fieldScoreList = await Promise.all(
            fieldInfoList.map((fieldInfo) => this.calcFieldScore(fieldInfo)),
        );

        // 評価値が最大のフィールドを返す
        const maxScore = fieldScoreList.reduce((max, b) => Math.max(max, b.score), -Infinity);
        return fieldScoreList.filter((item) => item.score === maxScore)[0];
    }

    private async getAllFieldPattern(idxMino: MINO_IDX, field: FieldCore): Promise<FieldData[]> {
        let fieldDataList: FieldData[] = [];
        for (let i = 0; i < 4; i++) {
            const angle = new Angle(i);
            // 左から順に、移動可能な全てのx座標における一番下に接地した場合を調べる
            for (let movement = 0; ; movement++) {
                this.trialWetris = new WetrisCore();
                this.trialWetris.isMainloopActive = false;
                this.trialWetris.currentMino.idxMino = idxMino;
                for (let j = 0; j < angle.angle; j++) {
                    this.trialWetris.rotateRight();
                }
                // ミノもfield: Fieldを持ってる。field.field: number[][]を書き換えると、ミノのfieldも書き換わる
                this.trialWetris.field.field = field.clone().field;
                // あるいは両方書き換える
                // this.trialWetris.field = field.clone();
                // this.trialWetris.currentMino.field = this.trialWetris.field;

                while (this.trialWetris.moveLeft()) {}
                if (!this.trialWetris.move({ x: movement, y: 0 })) {
                    // これ以上右に動かせない
                    break;
                }
                while (this.trialWetris.softDrop()) {}
                const pos = this.trialWetris.currentMino.pos;
                await this.trialWetris.set();

                const fieldData: FieldData = {
                    field: this.trialWetris.field.clone(),
                    pos: pos,
                    idxMino: idxMino,
                    angle: angle,
                };
                fieldDataList.push(fieldData);

                // // debug
                // this.trialWetris.field.printField();
                // this.getFieldInfo(fieldData).then((fieldScore) => {
                //     debug(`hole: ${fieldScore.hole}`);
                //     debug(`height: ${fieldScore.height}`);
                //     debug(`requiredIMinoCount: ${fieldScore.requiredIMinoCount}`);
                //     debug(`pos: (${fieldScore.fieldData.pos.x}, ${fieldScore.fieldData.pos.y})`);
                // });
            }
        }
        return fieldDataList;
    }

    private async getFieldInfo(fieldData: FieldData): Promise<FieldInfo> {
        let hole = 0;
        let lidBlock = 0;
        let requiredIMinoCount = 0;
        let maxHeight = fieldData.field.field.length - 1;
        // 全てのx座標について順に確かめていく
        for (let x = 1; x < fieldData.field.field[0].length - 1; x++) {
            let y: number;

            // 上の方の空白は読み飛ばす
            for (y = 0; ; y++) {
                if (fieldData.field.isFilled({ x: x, y: y })) {
                    break;
                }
            }

            // 一番高いブロックのy座標を記録
            // 値として小さい方がy座標としては高いことに注意
            if (y < maxHeight) {
                maxHeight = y;
            }

            // 埋まっている穴の数を数える
            for (; y < fieldData.field.field.length; y++) {
                if (!fieldData.field.isFilled({ x: x, y: y })) {
                    hole++;
                }
            }

            // 下穴を埋めているブロックを数える
            for (y = fieldData.field.field.length - 1; 0 <= y; y--) {
                if (!fieldData.field.isFilled({ x: x, y: y })) {
                    break;
                }
            }
            for (; 0 <= y; y--) {
                if (fieldData.field.isFilled({ x: x, y: y })) {
                    lidBlock++;
                }
            }

            // 縦に3つ以上空いた穴の数を数える
            // 1 0 1
            // 1 0 1
            // 1 0 1
            // 1 1 1
            // みたいなもの。
            let trenchCount = 0;
            // 左右どちらかにブロックがある座標まで読み飛ばす
            for (y = 0; ; y++) {
                if (
                    fieldData.field.isFilled({ x: x - 1, y: y }) &&
                    fieldData.field.isFilled({ x: x + 1, y: y })
                ) {
                    break;
                }
            }
            // カウント
            for (; y < fieldData.field.field.length; y++) {
                // debug(
                //     `x: ${x}, y: ${y}, ${
                //         fieldData.field.isFilled({ x: x - 1, y: y }) &&
                //         !fieldData.field.isFilled({ x: x, y: y }) &&
                //         fieldData.field.isFilled({ x: x + 1, y: y })
                //     }`
                // );
                if (
                    fieldData.field.isFilled({ x: x - 1, y: y }) &&
                    !fieldData.field.isFilled({ x: x, y: y }) &&
                    fieldData.field.isFilled({ x: x + 1, y: y })
                ) {
                    trenchCount++;
                } else {
                    break;
                }
            }
            if (trenchCount >= 3) {
                requiredIMinoCount++;
            }
        }
        // fieldData.field.printField();
        // debug(`requiredIMinoCount: ${requiredIMinoCount}`);
        return {
            fieldData: fieldData,
            hole: hole,
            lidBlock: lidBlock,
            height: maxHeight,
            requiredIMinoCount: requiredIMinoCount,
        };
    }

    private async calcFieldScore(fieldInfo: FieldInfo): Promise<FieldScore> {
        let score = 0;

        score -= fieldInfo.hole * 8;
        score += fieldInfo.height;
        score -= fieldInfo.requiredIMinoCount * 2;
        score += fieldInfo.fieldData.pos.y;

        // 死にそうな高さは基本置かない
        if (fieldInfo.height - DRAW_FIELD_TOP < 5) {
            info("Too high!");
            score *= 0 < score ? 0.01 : 100;
        }

        return { fieldData: fieldInfo.fieldData, score: score };
    }
}

// module.exports = Cpu;
