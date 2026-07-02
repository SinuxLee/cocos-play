import { _decorator, Component } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Misc/Rotate')
export class Rotate extends Component {
  @property
  private rotate_speed: number = 10;

  protected update(deltaTime: number) {
    this.node.angle += this.rotate_speed * deltaTime;
  }
}
