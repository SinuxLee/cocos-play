import { _decorator, Component, Node, tween, Tween, v3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Misc/Breath')
export class Breath extends Component {
  private tw: Tween<Node> = null;

  protected onEnable(): void {
    this.tw = tween(this.node); // 创建以 this.node 为目标的 Tween 实例

    this.tw
      .to(0.75, { scale: v3(1.1, 1.1, 1) }) // 0.75 秒内放大到 1.1 倍
      .to(0.75, { scale: v3(1, 1, 1) }) // 0.75 秒内缩回原始大小
      .union() // 把上面两个 to 合并为一个整体序列
      .repeatForever() // 无限重复这个整体
      .start(); // 启动
  }

  protected onDisable(): void {
    this.node.scale = v3(1, 1, 1);

    this.tw.stop();
    this.tw = null;
  }
}
