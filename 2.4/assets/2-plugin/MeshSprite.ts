const {ccclass, property} = cc._decorator;

@ccclass()
export default class MeshSprite extends cc.Component {
    @property({ type: [cc.Vec2] })
    vertexes: cc.Vec2[] = [
        cc.v2(-50, -50),
        cc.v2(50, -50),
        cc.v2(50, 50),
        cc.v2(-50, 50),
    ]; // 给个初始四边形，避免选中后场景里啥都看不见

    @property()
    deleteMode: boolean = false;

    @property(cc.Texture2D)
    texture: cc.Texture2D = null;

    onLoad() {
        this.rebuildMesh();
    }

    // 编辑器里改了 vertexes 后，希望实时重建网格/贴图填充
    onFocusInEditor() {}

    update() {
        if (CC_EDITOR) {
            this.rebuildMesh();
        }
    }

    private rebuildMesh() {
        // TODO: 根据 this.vertexes 生成三角剖分 mesh，貼上 this.texture
    }
}
