import { _decorator, Component, Sprite, SpriteFrame } from 'cc';
import { BlockType } from './types';
const { ccclass, property, requireComponent } = _decorator;

@ccclass('Block')
@requireComponent(Sprite)
export default class Block extends Component {
    protected static blockMap = new Map<BlockType, SpriteFrame>();

    private sprite: Sprite = null!;

    private _type: BlockType;
    public set Type(value: BlockType) {
        const sp = Block.blockMap.get(value);
        if (!sp) return;

        this._type = value
        this.sprite.spriteFrame = sp; // 设置图片
    }

    protected onLoad(): void {
        this.sprite = this.getComponent(Sprite);
    }
}