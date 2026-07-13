import { _decorator, CCFloat, Component, renderer, Sprite, v2 } from 'cc';
const { ccclass, property, requireComponent } = _decorator;

@ccclass('BgScrollShader')
@requireComponent(Sprite)
export class BgScrollShader extends Component {
    @property({type: CCFloat, displayName: 'X 向滚动速度'})
    private scrollSpeed: number = 0.5; // UV 滚动速度

    private sprite: Sprite = null!; // 对应的图片一定不要动态合图(Packable)
    private offsetX: number = 0;
    private _mat: renderer.MaterialInstance | null = null;

    start() {
        this.sprite = this.getComponent(Sprite);

        // 一定要改实例，而不是共享的材质信息
        if (!this._mat) this._mat = this.sprite.getMaterialInstance(0);
    }

    update(deltaTime: number) {
        if (!this.sprite || !this._mat) return;

        this.offsetX += this.scrollSpeed * deltaTime;
        this.offsetX %= 1; // 只取小数部分，防止浮点数精度问题

        // console.log(`offsetX = ${this.offsetX}`)

        // 获取材质实例并修改 offset
        this._mat.setProperty('offset', v2(this.offsetX, 0));
    }
}