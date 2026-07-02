import { _decorator, Component, Sprite, SpriteFrame } from 'cc';
import { PieceType } from './types';
const { ccclass, property } = _decorator;

// 旋转的方向
export type Rot = 0 | 1 | 2 | 3;

// wall kick 的偏移数据
export type Kick = readonly [number, number];

type Shape4x4 = number[];

export type ShapeStates = [Shape4x4, Shape4x4, Shape4x4, Shape4x4];

function rotateCW4x4(src: Shape4x4): Shape4x4 {
    const size = src.length ** 0.5 | 0;
    const dst = new Array<number>(size * size).fill(0);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            dst[y * size + x] = src[(size - 1 - x) * size + y];
        }
    }
    return dst;
}

function build4States(state0: Shape4x4): Shape4x4[] {
    const s1 = rotateCW4x4(state0);
    const s2 = rotateCW4x4(s1);
    const s3 = rotateCW4x4(s2);
    return [state0, s1, s2, s3];
}

const s = (r0: string, r1: string, r2: string, r3: string): Shape4x4 => {
  const str = r0 + r1 + r2 + r3;
  if (str.length !== 16) throw new Error(`Shape must be 4x4`);
  return [...str].map((c) => (c === '1' ? 1 : 0));
};

/**
 * rot = 0,1,2,3 (顺时针)
 * 说明：
 * - O 四个状态相同（避免视觉漂移）
 * - I 使用常见4x4表示；若你没做 wall kick，旋转时可能有1格“抖动感”
 */
export const PIECE_STATES: Record<PieceType, ShapeStates> = {
  [PieceType.I]: [
    s('0000', '1111', '0000', '0000'),
    s('0010', '0010', '0010', '0010'),
    s('0000', '0000', '1111', '0000'),
    s('0100', '0100', '0100', '0100'),
  ],
  [PieceType.O]: [
    s('0110', '0110', '0000', '0000'),
    s('0110', '0110', '0000', '0000'),
    s('0110', '0110', '0000', '0000'),
    s('0110', '0110', '0000', '0000'),
  ],
  [PieceType.T]: [
    s('0000', '1110', '0100', '0000'),
    s('0100', '1100', '0100', '0000'),
    s('0100', '1110', '0000', '0000'),
    s('0100', '0110', '0100', '0000'),
  ],
  [PieceType.L]: [
    s('0010', '1110', '0000', '0000'),
    s('0100', '0100', '0110', '0000'),
    s('0000', '1110', '1000', '0000'),
    s('1100', '0100', '0100', '0000'),
  ],
  [PieceType.J]: [
    s('1000', '1110', '0000', '0000'),
    s('0110', '0100', '0100', '0000'),
    s('0000', '1110', '0010', '0000'),
    s('0100', '0100', '1100', '0000'),
  ],
  [PieceType.S]: [
    s('0110', '1100', '0000', '0000'),
    s('0100', '0110', '0010', '0000'),
    s('0000', '0110', '1100', '0000'),
    s('1000', '1100', '0100', '0000'),
  ],
  [PieceType.Z]: [
    s('1100', '0110', '0000', '0000'),
    s('0010', '0110', '0100', '0000'),
    s('0000', '1100', '0110', '0000'),
    s('0100', '1100', '1000', '0000'),
  ],
};

@ccclass('Piece')
export class Piece extends Component {
    @property([SpriteFrame])
    public textureList: SpriteFrame[] = [];

    public static readonly PIECE_SIZE = 4;
    public static readonly SHAPE_DATA = [
        [1, 1, 1, 1], // I
        [1, 1, 0, 0, 1, 1], // O
        [1, 1, 1, 0, 0, 1], // T
        [1, 1, 1, 0, 1], // L
        [1, 0, 0, 0, 1, 1, 1], // J
        [0, 1, 1, 0, 0, 0, 1, 1], // S
        [0, 1, 1, 0, 1, 1]  // Z
    ];
    private static readonly SHAPE_COUNT = Piece.SHAPE_DATA.length;
    private static readonly ROTATE_ANGLE = [90, 180, 270, 0];
    private static readonly ROTATE_COUNT = Piece.ROTATE_ANGLE.length;


    private _grid: Sprite[][] = [];
    private _color: number = 0;
    private _shape: number = 0;
    private _rotate: number = 0;

    get color() {
        return this._color
    }

    set color(color: number) {
        this._color = color % this.textureList.length
        this._changeColor()
    }
    get shape() {
        return this._shape
    }

    set shape(shape: number) {
        this._shape = shape % Piece.SHAPE_COUNT
        this._changeShape()
    }

    get rotate() {
        return this._rotate
    }

    set rotate(rotate: number) {
        this._rotate = rotate % Piece.ROTATE_COUNT
        this._changeRotate()
    }

    protected onLoad(): void {
        this.node.children.forEach((child, index) => {
            const sprite = child.getComponent(Sprite)
            if (!sprite || !sprite.node.name.includes('red')) return;


            sprite.node.x -= 120
            sprite.node.y -= 120

            if (index % Piece.PIECE_SIZE == 0) {
                this._grid.push([])
            }

            const row = this._grid[index / Piece.PIECE_SIZE | 0]
            row.push(sprite)
        })


        for (const state in PIECE_STATES) {
            const myState = PIECE_STATES[state as unknown as PieceType]
            const states = build4States([0])
            console.log('states', myState, states)
        }
    }

    start() {
        this.schedule(() => {
            this.color++
            this.shape++
            this.rotate++
        }, 1)
    }

    update(deltaTime: number) {

    }


    protected _changeShape() {
        console.log('change shape', this._shape)

        const shapeData = Piece.SHAPE_DATA[this._shape]
        this._grid.forEach((row, i) => {
            row.forEach((sprite, j) => {
                const idx = i * Piece.PIECE_SIZE + j
                const value = shapeData[idx] ?? 0
                sprite.node.active = value === 1
            })
        })
    }

    protected _changeColor() {
        console.log('change color', this._color)

        this._grid.forEach(row => {
            row.forEach(sprite => {
                sprite.spriteFrame = this.textureList[this._color]
            })
        })
    }

    protected _changeRotate() {
        console.log('rotate', this._rotate)

        const angle = Piece.ROTATE_ANGLE[this._rotate]
        this.node.angle = angle
    }
}


