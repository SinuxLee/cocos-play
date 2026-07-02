import { _decorator, Collider, Component, Node, UITransform, view, Widget } from 'cc';
const { ccclass, property, requireComponent, executeInEditMode } = _decorator;

@ccclass('Main')
@requireComponent(Widget)
@requireComponent(Collider)
export class Main extends Component {
    @property(Node)
    private bg: Node = null!;

    private _widget: Widget = null!;

    protected onLoad(): void {
        this._widget = this.node.getComponent(Widget);
        this._widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
    }

    start() {
        this.adaptContent();
        view.on('canvas-resize', this.adaptContent, this);
    }

    protected onEnable(): void {
        console.debug("main enable in editor")
    }

    private adaptContent() {
        this._widget.top = 0;
        this._widget.bottom = 0;
        this._widget.left = 0;
        this._widget.right = 0;
        this._widget.updateAlignment(); // 立即刷新对齐

        const designSize = view.getVisibleSize();
        const transform = this.bg.getComponent(UITransform);
        transform.width = designSize.width;
        transform.height = designSize.height;
    }

    update(deltaTime: number) {
        view.off('canvas-resize', this.adaptContent, this);
    }
}

