import { _decorator, Component, Sprite, Vec4 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Script')
export class Script extends Component {
    @property(Sprite)
    sprite: Sprite | null = null;

    private _time = 0;

    start() {
        // 如果没在 Inspector 手动拖拽，就尝试自动获取同节点上的 Sprite
        if (!this.sprite) {
            this.sprite = this.getComponent(Sprite);
        }
    }

    update(dt: number) {
        if (!this.sprite) return;
        
        // 一定要改实例，而不是共享的材质信息
        const mat = this.sprite.getMaterialInstance(0);
        if (!mat) return;

        this._time += dt;

        // 读出旧 params，改 y，再写回（别把 x/z/w 覆盖掉）
        const p = mat.getProperty('params') as Vec4;
        if (p === null) {
            mat.setProperty('params', new Vec4(1, this._time, 1, 0.2));
            return
        }

        p.y = this._time;
        mat.setProperty('params', p);
    }
}
