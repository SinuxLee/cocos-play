import { _decorator, Component, UITransform, view, Widget } from 'cc';
const { ccclass, requireComponent } = _decorator;

@ccclass('ScreenContentAdapter')
@requireComponent(Widget)
export class ScreenContentAdapter extends Component {
    private _widget: Widget = null!;
    protected onLoad(): void {
        this._widget = this.node.getComponent(Widget)

        // 居中
        this._widget.isAlignHorizontalCenter = true;
        this._widget.isAlignVerticalCenter = true;
        this._widget.updateAlignment();
    }

    start() {
        this.adaptContent();
        view.on('canvas-resize', this.adaptContent, this);
    }

    adaptContent() {
        // 获取美术设计尺寸，计算设计宽高比
        const designSize = view.getDesignResolutionSize();
        const designRatio = designSize.width / designSize.height;

        // 获取可视区域的尺寸，计算可视区域宽高比
        const visibleSize = view.getVisibleSize();
        const visibleRatio = visibleSize.width / visibleSize.height;

        // 核心逻辑，计算缩放基准。尽量呈现更多内容到屏幕
        let scale = 1;
        if (visibleRatio > designRatio) {
            scale = visibleSize.height / designSize.height; // 宽屏：以高度为基准缩放，保障高度不被裁剪
        } else {
            scale = visibleSize.width / designSize.width; // 窄屏：以宽度为基准缩放，保障宽度不被裁剪
        }

        // 保持设计尺寸
        const uiTransform = this.node.getComponent(UITransform);
        uiTransform.width = designSize.width;
        uiTransform.height = designSize.height;
        // 应用缩放达到适配的目的
        this.node.setScale(scale, scale);
    }

    onDestroy() {
        view.off('canvas-resize', this.adaptContent, this);
    }
}