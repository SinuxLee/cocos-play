import {
    _decorator, Color, Component, Graphics, UITransform,
    log, v3, Vec3, Camera, find, EventTouch, Vec2,Node
} from 'cc';
const { ccclass, property } = _decorator;

/**
 * 瓦片
 */
class Tile {
    public static width = 64 * 2;
    public static height = 32 * 2;

    public static halfWidth = this.width / 2
    public static halfHeight = this.height / 2

    private _row = 0;
    private _col = 0;
    private _x = 0;
    private _y = 0;
    private _gl: Graphics = null

    public set row(val: number) {
        this._row = val
    }

    public set col(val: number) {
        this._col = val
    }

    public set x(val: number) {
        this._x = val
    }

    public set y(val: number) {
        this._y = val
    }

    constructor(gl: Graphics) {
        this._gl = gl
        this._x = this._y = 0; // 上方顶点的像素坐标
        this._row = this._col = 0; // 逻辑坐标
    }

    // 中心位置的坐标
    getCenterPos() {
        return { x: this._x, y: this._y + Tile.halfHeight }
    }

    drawText(txt: string) {
        let { x, y } = this.getCenterPos()
        // this.ctx.fillText(txt, x -= (3 * txt.length), y += 4);
    }

    drawPos() {
        this.drawText(`${this._row},${this._col}`)
    }

    fillTile(color: Color) {
        const center = this.getCenterPos() // 此为新原点
        const delta = [
            { x: 0, y: -1 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
        ]

        const len = delta.length

        for (let i = 0; i < len; i++) {
            const { x, y } = delta[i]
            this._gl.lineTo(center.x + x * Tile.halfWidth - x, center.y + y * Tile.halfHeight - y);
        }
        this._gl.close()

        this._gl.lineWidth = 1
        this._gl.strokeColor = color
        this._gl.stroke()

        this._gl.fillColor = color;
        this._gl.fill()
    }
}

/**
 * 地图相机为 透视相机可以调整视距
 * UI相机为 正交相机，需要设置 clear_flag
 */

@ccclass('Game')
export class Game extends Component {
    private _camera: Camera = null;
    private _uiTransform: UITransform = null;
    private _gl: Graphics = null;

    private _tiles: Tile[][] = []
    private _xOffset = 0;
    private _yOffset = 0;
    private _gridWidth = 0;
    private _gridHeight = 0;
    private _gridRow = 0; // 网格的行数
    private _gridCol = 0; // 网格的列数

    onLoad() {
        this._camera = find('Canvas/Camera').getComponent(Camera)
        this._uiTransform = this.node.addComponent(UITransform)
        this._uiTransform.setContentSize(1000, 1000)

        this._gl = this.node.addComponent(Graphics)
        this._gl.lineWidth = 2
        // const { width, height } = this._uiTransform

        // 设置白色背景
        // this._gl.strokeColor = Color.GRAY
        // this._gl.rect(-width / 2, -height / 2, width, height)
        // this._gl.fillColor = Color.WHITE
        // this._gl.fill()
        // this._gl.stroke()

        // 平面坐标
        // this._gl.strokeColor = Color.BLACK
        // this._gl.lineWidth = 5

        // this._gl.moveTo(-width / 2, 0)
        // this._gl.lineTo(width / 2, 0)
        // this._gl.stroke()

        // this._gl.moveTo(0, height / 2)
        // this._gl.lineTo(0, -height / 2)
        // this._gl.stroke()

        this._gridWidth = this._uiTransform.width
        this._gridHeight = this._uiTransform.height

        this._gridRow = Math.floor(this._gridHeight / Tile.height * 2)
        this._gridCol = Math.floor(this._gridWidth / Tile.width * 4)
    }

    start() {
        const rowCount = Math.floor(this._gridRow / 2)
        const colCount = Math.floor(this._gridCol / 2)
        this.drawIsomecticGrid(-colCount, colCount, -rowCount, rowCount)

        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove,this)
    }

    onTouchMove(event: EventTouch) {
        if (event.getTouches().length > 1) return; // 多指触摸时不移动相机

        const delta = event.getDelta().multiplyScalar(0.3); // 获取触摸位移
        const relPos = this._camera.node.position.subtract(v3(delta.x, delta.y,0))
        this._camera.node.setPosition(relPos);
        // log(`game x=${relPos.x}, y=${relPos.y}`)
    }

    drawIsomecticGrid(minCol = 0, maxCol = this._gridRow, minRow = 0, maxRow = this._gridRow) {
        this._gl.lineWidth = 2
        let beginX = (minCol - minRow) * Tile.halfWidth + this._xOffset;
        let beginY = (minCol + minRow) * Tile.halfHeight + this._yOffset;
        let endX = (maxCol - minRow) * Tile.halfWidth + this._xOffset;
        let endY = (maxCol + minRow) * Tile.halfHeight + this._yOffset;

        // 绘制行线, 起始(beginX,beginY)是地图上方的像素点，起始(endX,endY)是地图右方的像素点
        for (let i = minRow; i <= maxRow; i++) {
            if (i % 4 === 0) this._gl.strokeColor = Color.GRAY;
            else this._gl.strokeColor = Color.RED;

            // log(`[${beginX}, ${beginY}] -> [${endX}, ${endY}]`)
            this._gl.moveTo(beginX, beginY);
            this._gl.lineTo(endX, endY);
            this._gl.stroke();

            if (i < maxRow) {
                const arr: Tile[] = []
                this._tiles.push(arr)

                for (let j = minRow; j < maxRow; j++) {
                    const tile = new Tile(this._gl)
                    tile.x = beginX + Tile.halfWidth * j
                    tile.y = beginY + Tile.halfHeight * j
                    tile.row = i
                    tile.col = j
                    arr.push(tile)
                }
            }

            beginX -= Tile.halfWidth;
            endX -= Tile.halfWidth;
            beginY += Tile.halfHeight;
            endY += Tile.halfHeight;
        }

        beginX = (minCol - maxRow) * Tile.halfWidth + this._xOffset;
        beginY = (minCol + maxRow) * Tile.halfHeight + this._yOffset;
        endX = (minCol - minRow) * Tile.halfWidth + this._xOffset;
        endY = (minCol + minRow) * Tile.halfHeight + this._yOffset;

        // 绘制列线, 起始(beginX,beginY)是地图左方的像素点，起始(endX,endY)是地图上方的像素点
        for (let i = minCol; i <= maxCol; i++) {
            if (i % 4 === 0) this._gl.strokeColor = Color.GRAY;
            else this._gl.strokeColor = Color.RED;

            this._gl.moveTo(beginX, beginY);
            this._gl.lineTo(endX, endY);
            this._gl.stroke();

            // 坐标按照 宽高的半长移动
            beginX += Tile.halfWidth;
            endX += Tile.halfWidth;

            beginY += Tile.halfHeight;
            endY += Tile.halfHeight;
        }
    }
}

