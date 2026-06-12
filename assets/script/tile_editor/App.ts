import { _decorator, Camera, Component, Node, EventTouch, Input, input, v3, math, EventMouse, log, Layers} from 'cc';
import {Game} from './Game'
const { ccclass, property } = _decorator;

@ccclass('App')
export class App extends Component {
    private _gameNode: Node = null;
    private _camera: Camera = null;
    private _game: Game = null;

    onLoad() {
        this._gameNode = new Node('game')
        this._gameNode.layer = 1<<5
        this.node.addChild(this._gameNode)

        this._game = this._gameNode.addComponent(Game)
        this._camera = this.node.getComponentInChildren(Camera)
        this._camera.clearColor = new math.Color('#B8FDFD80');
    }

    start() {
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove,this)
        input.on(Input.EventType.MOUSE_WHEEL, this.onMouseWheel,this)
    }

    onTouchMove(event: EventTouch) {
        if (event.getTouches().length > 1) return; // 多指触摸时不移动相机

        const delta = event.getDelta().multiplyScalar(0.2); // 获取触摸位移
        const relPos = this._camera.node.position.subtract(v3(delta.x, delta.y,0))
        this._camera.node.setPosition(relPos);
        // log(`App x=${relPos.x}, y=${relPos.y}`)
    }

    onMouseWheel(event: EventMouse) {
        const delta = event.getScrollY() * -0.01;
        let fov = this._camera.fov + math.clamp(delta, -10, 10);
        this._camera.fov = math.clamp(fov, 30, 70);
    }
}

