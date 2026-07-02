import { _decorator, Component, tween, v3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Misc/Floaty')
export class Floaty extends Component {
  @property
  private floatInterval: number = 0.5;

  @property
  private floatOffset: number = 10;

  start() {
    const tw = tween(this.node);
    tw.sequence(
      tween(this.node).by(this.floatInterval, { position: v3(0, this.floatOffset, 0) }),
      tween(this.node).by(this.floatInterval, { position: v3(0, -this.floatOffset, 0) }),
    )
      .repeatForever()
      .start();
  }
}
