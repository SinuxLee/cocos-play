import { _decorator, Component, Node, Tween, tween } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Misc/Shake')
export class Shake extends Component {
  @property
  private shakeAngle: number = 15;

  @property
  private shakeInterval: number = 0.1;

  @property
  private delay: number = 2;

  private tw: Tween<Node> = null;

  protected onEnable(): void {
    this.tw = tween(this.node);
    this.tw
      .sequence(
        tween(this.node).delay(this.delay),
        tween(this.node).to(this.shakeInterval, { angle: this.shakeAngle }),
        tween(this.node).to(this.shakeInterval, { angle: -this.shakeAngle }),
        tween(this.node).to(this.shakeInterval, { angle: this.shakeAngle }),
        tween(this.node).to(this.shakeInterval, { angle: -this.shakeAngle }),
        tween(this.node).to(this.shakeInterval, { angle: 0 }),
      )
      .repeatForever()
      .start();
  }

  protected onDisable(): void {
    this.node.angle = 0;
    this.tw.stop();
    this.tw = null;
  }
}
