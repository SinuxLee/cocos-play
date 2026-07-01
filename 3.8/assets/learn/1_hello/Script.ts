import { _decorator, Component, Sprite, Vec4, renderer } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Script')
export class Script extends Component {
    @property(Sprite)
    sprite: Sprite | null = null;

    private _time = 0;
    private _mat: renderer.MaterialInstance | null = null;

    start() {
        // 如果没在 Inspector 手动拖拽，就尝试自动获取同节点上的 Sprite
        if (!this.sprite) {
            this.sprite = this.getComponent(Sprite);
        }

        // 一定要改实例，而不是共享的材质信息
        if (!this._mat) {
            this._mat = this.sprite.getMaterialInstance(0);
        }
    }

    // update(dt: number) {
    //     if (!this.sprite || !this._mat) return;
    //     this._time += dt;

    //     // 读出旧 params，改 y，再写回（别把 x/z/w 覆盖掉）
    //     const p = this._mat.getProperty('params') as Vec4;
    //     if (p === null) {
    //         this._mat.setProperty('params', new Vec4(1, this._time, 1, 0.2));
    //         return
    //     }

    //     p.y = this._time;
    //     this._mat.setProperty('params', p);
    // }


    update(dt: number) {
        if (!this.sprite || !this._mat) return;
        this._time += dt;

        this._mat.setProperty('time', this._time);
    }
}
