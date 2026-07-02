import { _decorator, Component, Node, tween, v3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Entry')
export class Entry extends Component {
    @property(Node)
    private ball: Node = null!;

    @property(Node)
    private icon: Node = null!;

    start() {
        this.schedule(() => this.showEffect(), 1, 100);
    }

    private showEffect() {
        // 果冻
        tween(this.ball)
            .delay(0.3)
            .to(0.1, { scale: v3(1.3, 0.7, 1) })
            .to(0.1, { scale: v3(0.8, 1.2, 1) })
            .to(0.1, { scale: v3(1.1, 0.95, 1) })
            .to(0.1, { scale: v3(1, 1, 1) })
            .start();

        // 弹跳效果
        // tween(this.icon)
        //     .to(0.3, { position: v3(100, -100, 0) }, { easing: 'bounceOut' })
        //     .delay(0.2)
        //     .to(0.3, { position: v3(0, 0, 0) }, { easing: 'bounceIn' })
        //     .start();
    }
}

