import { WetrisCore } from "./WetrisCore";
import { FieldCore } from "./FieldCore";
import { MinoCore } from "./MinoCore";
import { Angle } from "./Angle";
import { ARR, DRAW_FIELD_TOP, MINO_IDX, sleep } from "./constant";
4;
import { info } from "./messageUtil";

enum Action {
    Left,
    Right,
    RotateLeft,
    RotateRight,
    SoftDrop,
    HardDrop,
    Hold,
}

type Candidate = { field: Field; actions: Action[] };

export class AiWetrisCore extends WetrisCore {
    allActionSequences: Action[][];

    constructor() {
        super(false);
        this.makeNewMino();
        this.allActionSequences = this.generateActionSequences();
    }

    /**
     * 現在の状態から可能な操作列を列挙
     * initAngle 4通り
     * × movement 11通り
     * × rotationSequence 15通り
     * = 660通り
     */
    private generateActionSequences(): Action[][] {
        const sequences: Action[][] = [];
        const rotationSequences = this.generateRotationSequences();
        // 全回転方向について調べる
        for (let initAngle = 0; initAngle < 4; initAngle++) {
            // 左から順に、移動可能な全てのx座標について調べる
            for (let movement = -5; movement < 6; movement++) {
                // ソフドロ後3回まで回転を検証する
                for (const rotationSequence of rotationSequences) {
                    const actions: Action[] = [];

                    for (let k = 0; k < initAngle; k++) {
                        actions.push(Action.RotateRight);
                    }

                    for (let k = 0; k < Math.abs(movement); k++) {
                        if (movement < 0) {
                            actions.push(Action.Left);
                        } else {
                            actions.push(Action.Right);
                        }
                    }

                    actions.push(Action.SoftDrop);

                    // 左右の回転を組み合わせた操作列
                    actions.push(...rotationSequence);

                    actions.push(Action.HardDrop);

                    sequences.push(actions);
                }
            }
        }

        return sequences;
    }

    /**
     * 接地後、SRS検証のために回転を3回まで検証する操作列を生成
     * 1 + 2 + 4 + 8 = 15通り
     * []
     * [L]
     * [R]
     * [L, L]
     * [L, R]
     * [R, L]
     * [R, R]
     * [L, L, L]
     * [L, L, R]
     * [L, R, L]
     * [L, R, R]
     * [R, L, L]
     * [R, L, R]
     * [R, R, L]
     * [R, R, R]
     */
    private generateRotationSequences(): Action[][] {
        const sequences: Action[][] = [[]];

        const generate = (current: Action[]) => {
            if (current.length === 3) {
                return;
            }

            for (const action of [Action.RotateLeft, Action.RotateRight]) {
                const next = [...current, action];

                sequences.push(next);
                generate(next);
            }
        };

        generate([]);

        return sequences;
    }

    public executeActions(actions: Action[]) {
        for (const action of actions) {
            if (action === Action.Left) {
                this.moveLeft();
            } else if (action === Action.Right) {
                this.moveRight();
            } else if (action === Action.RotateLeft) {
                this.rotateLeft();
            } else if (action === Action.RotateRight) {
                this.rotateRight();
            } else if (action === Action.SoftDrop) {
                while (this.softDrop());
            } else if (action === Action.HardDrop) {
                this.hardDrop();
            } else if (action === Action.Hold) {
                this.hold();
            }
        }
    }

    /**
     * 現在の状態から可能な配置を列挙
     * @returns
     */
    public getCandidates(): Candidate[] {
        const candidates = new Map<string, Candidate>();
        for (const actions of this.allActionSequences) {
            // コピーを作り操作列を実行
            const trialWetris = new AiWetrisCore();
            trialWetris.field = this.field.clone();
            trialWetris.currentMino = new MinoCore(trialWetris.field, this.currentMino.idxMino);
            trialWetris.executeActions(actions);

            // 盤面をmapのキーにする
            const field = trialWetris.field.field;
            const key = JSON.stringify(field);

            // 既存の候補よりも操作列が短ければ更新
            const existing = candidates.get(key);
            if (existing === undefined || actions.length < existing.actions.length) {
                candidates.set(key, { field, actions });
                info("update");
            }
        }
        return [...candidates.values()];
    }
}
