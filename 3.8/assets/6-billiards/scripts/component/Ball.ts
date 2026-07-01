import { _decorator, Component, Node, Sprite, UITransform } from 'cc';
const { ccclass, property } = _decorator;

import { BallSizeCfg } from '../base/GameConfig';

@ccclass('Ball')
export class Ball extends Component {

    private _sprite: Sprite = null!

    protected onLoad(): void {
        this._sprite = this.getComponent(Sprite)

        const scale = BallSizeCfg.radius / this._sprite.spriteFrame.width
        this.node.setScale(scale, scale)
    }

    start() {

    }

    update(deltaTime: number) {

    }


    private changeSpriteFrame() {
        this._sprite.spriteFrame = null
    }
}


