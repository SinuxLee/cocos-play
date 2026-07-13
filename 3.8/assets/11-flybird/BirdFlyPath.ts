import { _decorator, Component } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('BirdFlyPath')
export class BirdFlyPath extends Component {
    @property({ tooltip: '水平飞行速度(单位/秒)' })
    speed: number = 100;

    @property({ tooltip: '上下摆动振幅' })
    amplitude: number = 30;

    @property({ tooltip: '摆动频率,越大扇动越快' })
    frequency: number = 2;

    @property({ tooltip: '是否根据运动方向自动倾斜' })
    autoTilt: boolean = true;

    private _time: number = 0;
    private _startY: number = 0;
    private _dir: number = 1; // 1: 向右, -1: 向左

    onLoad() {
        this._startY = this.node.position.y;
    }

    update(dt: number) {
        this._time += dt;

        // 水平方向匀速移动
        const dx = this.speed * this._dir * dt;

        // 垂直方向叠加正弦波,模拟振翅上下起伏
        const y = this._startY + Math.sin(this._time * this.frequency) * this.amplitude;

        const pos = this.node.position;
        this.node.setPosition(pos.x + dx, y, pos.z);

        if (this.autoTilt) {
            // 用当前弧线切线方向估算倾斜角(cos 是 sin 的导数)
            const slope = Math.cos(this._time * this.frequency) * this.amplitude * this.frequency;
            const angle = Math.atan2(slope, this.speed * this._dir) * 180 / Math.PI;
            this.node.setRotationFromEuler(0, 0, angle * 0.5); // *0.5 让倾斜柔和一点
        }
    }

    // 到达边界时反向,配合场景边界调用
    turnAround() {
        this._dir *= -1;
    }
}