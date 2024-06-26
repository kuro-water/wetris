const Wetris = require("./Wetris.class");
type Wetris = typeof Wetris;
const Mino = require("./Mino.class");
type Mino = typeof Mino;
const Field = require("./Field.class");
type Field = typeof Field;

import { MINO_IDX, DRAW_FIELD_TOP, ARR } from "./constant";

import { success, error, warning, task, debug, info } from "./messageUtil";

type FieldData = { field: Field; pos: position; idxMino: MINO_IDX; angle: number };

/**
 * 評価基準値を求めた後のデータを格納する
 * hole: 埋まっている穴の数
 * lidBlock: 下穴を埋めているブロックの数
 * height: 一番高い(内部的な値としては一番小さい)ブロックのy座標
 * requiedIMinoCount: 縦に3つ以上空いた穴の数 = 必要なIミノの数
 */
type FieldInfo = {
    fieldData: FieldData;
    hole: number;
    lidBlock: number;
    height: number;
    requiedIMinoCount: number;
};

type FieldScore = { fieldData: FieldData; score: number };

class Cpu {
    mainWetris: Wetris;
    trialWetris: Wetris;

    constructor(wetris: Wetris) {
        this.mainWetris = wetris;
        this.trialWetris = new Wetris(null);
        this.trialWetris.isMainloopActive = false;
        this.main();
    }

    async main() {
        while (true) {
            const bestField = await this.getBestField(
                this.mainWetris.currentMino.idxMino,
                this.mainWetris.field
            );

            // bestField.fieldData.field.printField();
            // debug(`hole: ${bestField.hole}`);
            // debug(`height: ${bestField.height}`);
            // debug(`requiedIMinoCount: ${bestField.requiedIMinoCount}`);

            await this.moveMinoToMatchField(this.mainWetris, bestField.fieldData);
        }
    }

    async moveMinoToMatchField(wetris: Wetris, fieldData: FieldData) {
        while (wetris.currentMino.angle % 4 !== fieldData.angle % 4) {
            wetris.rotateRight();
            await wetris.sleep(ARR);
        }
        while (wetris.currentMino.x !== fieldData.pos.x) {
            const dif = fieldData.pos.x - wetris.currentMino.x;
            const wasMoved = dif < 0 ? await wetris.moveLeft() : await wetris.moveRight();
            if (!wasMoved) {
                error("CPU: failed to move!");
            }
            await wetris.sleep(ARR);
        }
        await wetris.hardDrop();
    }

    async getBestField(idxMino: MINO_IDX, field: Field): Promise<FieldScore> {
        // 一手で積めるフィールドを全探索し、そのフィールドの評価を行う
        const fieldDataList = await this.getAllFieldPattern(idxMino, field);
        const fieldInfoList = await Promise.all(
            fieldDataList.map((fieldData) => this.getFieldInfo(fieldData))
        );
        const fieldScoreList = await Promise.all(
            fieldInfoList.map((fieldInfo) => this.culcFieldScore(fieldInfo))
        );

        // 評価値が最大のフィールドを返す
        const maxScore = fieldScoreList.reduce((max, b) => Math.max(max, b.score), -Infinity);
        return fieldScoreList.filter((item) => item.score === maxScore)[0];
    }

    async getAllFieldPattern(idxMino: MINO_IDX, field: Field): Promise<FieldData[]> {
        let fieldDataList: FieldData[] = [];
        for (let angle = 0; angle < 4; angle++) {
            // 左から順に、移動可能な全てのx座標における一番下に接地した場合を調べる
            for (let movement = 0; ; movement++) {
                this.trialWetris = new Wetris(null);
                this.trialWetris.isMainloopActive = false;
                this.trialWetris.currentMino.idxMino = idxMino;
                for (let i = 0; i < angle; i++) {
                    this.trialWetris.currentMino.rotateMino();
                }
                // ミノもfield: Fieldを持ってる。field.field: number[][]を書き換えると、ミノのfieldも書き換わる
                this.trialWetris.field.field = field.clone().field;
                // あるいは両方書き換える
                // this.trialWetris.field = field.clone();
                // this.trialWetris.currentMino.field = this.trialWetris.field;

                while (this.trialWetris.currentMino.moveMino({ x: -1, y: 0 }));
                if (!this.trialWetris.currentMino.moveMino({ x: movement, y: 0 })) {
                    // これ以上右に動かせない
                    break;
                }
                while (this.trialWetris.currentMino.moveMino({ x: 0, y: 1 }));
                const pos = {
                    x: this.trialWetris.currentMino.x,
                    y: this.trialWetris.currentMino.y,
                };
                await this.trialWetris.set();

                const feldData: FieldData = {
                    field: this.trialWetris.field.clone(),
                    pos: pos,
                    idxMino: idxMino,
                    angle: angle,
                };
                fieldDataList.push(feldData);

                // // debug
                // this.trialWetris.field.printField();
                // this.getFieldInfo(feldData).then((fieldScore) => {
                //     debug(`hole: ${fieldScore.hole}`);
                //     debug(`height: ${fieldScore.height}`);
                //     debug(`requiedIMinoCount: ${fieldScore.requiedIMinoCount}`);
                //     debug(`pos: (${fieldScore.fieldData.pos.x}, ${fieldScore.fieldData.pos.y})`);
                // });
            }
        }
        return fieldDataList;
    }

    async getFieldInfo(fieldData: FieldData): Promise<FieldInfo> {
        let hole = 0;
        let lidBlock = 0;
        let requiedIMinoCount = 0;
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
                requiedIMinoCount++;
            }
        }
        // fieldData.field.printField();
        // debug(`requiedIMinoCount: ${requiedIMinoCount}`);
        return {
            fieldData: fieldData,
            hole: hole,
            lidBlock: lidBlock,
            height: maxHeight,
            requiedIMinoCount: requiedIMinoCount,
        };
    }

    async culcFieldScore(fieldInfo: FieldInfo): Promise<FieldScore> {
        let score = 0;

        score -= fieldInfo.hole * 8;
        score += fieldInfo.height;
        score -= fieldInfo.requiedIMinoCount * 2;
        score += fieldInfo.fieldData.pos.y;

        // 死にそうな高さは基本置かない
        if (fieldInfo.height - DRAW_FIELD_TOP < 5) {
            info("Too high!");
            score *= 0 < score ? 0.01 : 100;
        }

        return { fieldData: fieldInfo.fieldData, score: score };
    }
}

module.exports = Cpu;
