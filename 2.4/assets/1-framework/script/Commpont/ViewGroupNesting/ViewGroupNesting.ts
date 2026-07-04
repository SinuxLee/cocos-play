/**事件捕获处理 全局滑动事件捕获与派发*/
import { Manager } from "../../Framework";
const { ccclass, property } = cc._decorator;
export enum Direction {
    up,
    down,
    left,
    right,
    undefine = -1
}
export enum ViewGroup {
    ScrollViewCallPageView = "ScrollViewCallPageView",
}

@ccclass
export default class ViewGroupNesting extends cc.Component {
    @property(cc.String)
    id: number = 0;

    @property(cc.ScrollView)
    ScorllViewList: cc.ScrollView[] = [];

    private previousPos: cc.Vec2[] = null;
    private previousTime: number[] = null;
    private direction: Direction = -1;
    private canMoveStep: number = 10;  // 触发截断力度值

    onLoad() {
        this.previousPos = [null, null, null];
        this.previousTime = [null, null, null];
        this.ScorllViewList.forEach((ScorllView, index) => {
            ScorllView.node.on(cc.Node.EventType.TOUCH_START, (event) => {
                this.onTouchHandle(event, index);
            }, this, true);
            ScorllView.node.on(cc.Node.EventType.TOUCH_MOVE, (event) => {
                this.onTouchHandle(event, index);
            }, this, true);
            ScorllView.node.on(cc.Node.EventType.TOUCH_END, (event) => {
                this.onTouchHandle(event, index);
            }, this, true);
            ScorllView.node.on(cc.Node.EventType.TOUCH_CANCEL, (event) => {
                this.onTouchHandle(event, index);
            }, this, true);
        });
    }

    private onTouchHandle(event, index): void {
        if (event.sham || event.simulate || event.target === this.node) return;
        switch (event.type) {
            case cc.Node.EventType.TOUCH_START:
                this.previousPos[index] = event.getLocation();
                this.previousTime[index] = Date.now();
                this.direction = Direction.undefine;
                break;
            case cc.Node.EventType.TOUCH_MOVE:
                const cur_previousPos = event.getLocation();
                const cur_previousTime = Date.now();

                //向量减法运算
                const deltaPos = cur_previousPos.subtract(this.previousPos[index]);
                const deltaTime = (cur_previousTime - this.previousTime[index]) / 1000;

                //滑动力度
                const velocity = deltaPos.mag() / deltaTime;

                //滑动方向判断
                if (this.direction == Direction.undefine) {
                    if (velocity < this.canMoveStep) return;
                    //滑动角度
                    const angleR = Math.atan2(deltaPos.y, deltaPos.x);
                    const angle = angleR * (180 / Math.PI);
                    if (angle >= -45 && angle <= 45) { //右滑
                        this.direction = Direction.right;
                    } else if (angle > 45 && angle < 135) { //上滑
                        this.direction = Direction.up;
                    } else if (angle >= 135 || angle <= -135) { //左滑
                        this.direction = Direction.left;
                    } else if (angle < -45 && angle > -135) { //下滑
                        this.direction = Direction.down;
                    }
                } else {
                    this.moveChoose(event);
                }
                break;
            default:
                if (this.direction == Direction.left || this.direction == Direction.right) { //横向滑动
                    Manager.EventManager.dispatch(ViewGroup.ScrollViewCallPageView, event, this.id);
                }
                this.ScorllViewList.forEach((scroll: cc.ScrollView) => {
                    if (!scroll.vertical) scroll.vertical = true;
                });
                this.direction = Direction.undefine;
                break;
        }
    }
    
    private moveChoose(event): void {
        if (this.direction == Direction.left || this.direction == Direction.right) { //横向滑动
            Manager.EventManager.dispatch(ViewGroup.ScrollViewCallPageView, event, this.id);
            this.ScorllViewList.forEach((scroll: cc.ScrollView) => {
                scroll.vertical = false;
            });
        } else {
            this.ScorllViewList.forEach((scroll: cc.ScrollView) => {
                if (!scroll.vertical) scroll.vertical = true;
            });
        }
    }
}