import { _decorator, Component, instantiate, macro, Node, Prefab, Sprite, SpriteFrame, UITransform, view } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Game')
export class Game extends Component {
    @property([SpriteFrame])
    public textureList: SpriteFrame[] = [];

    @property(Prefab)
    public blockPrefab: Prefab = null!;
    
    @property(Prefab)
    public piecePrefab: Prefab = null!;

    private originBlock_: Node[] = [];
    private grid_: Node[][] = null!;
    private blockSize_ = 0;

    private readonly GRID_ROW = 9;
    private readonly GRID_COL = 9;

    protected onLoad(): void {
        view.setOrientation(macro.ORIENTATION_PORTRAIT)

        for (const texture of this.textureList) {
            const node = instantiate(this.blockPrefab)
            this.originBlock_.push(node)

            const sprite = node.getComponent(Sprite)
            sprite.spriteFrame = texture
            this.blockSize_ = texture.width+5

            const transform = node.getComponent(UITransform)
            transform.width = texture.width
            transform.height = texture.height
        }

        // init grid
        this.grid_ = Array.from({ length: this.GRID_ROW }, () => {
            const arr = []
            const len = this.originBlock_.length
            for (let i = 0; i < this.GRID_COL; i++) {
                arr.push(instantiate(this.originBlock_[i % len]))
            }
            return arr
        });
    }

    start() {
        this.grid_.forEach((arr, j) => {
            arr.forEach((block: Node, idx: number) => {
                block.name = `sprite${idx}`
                block.x = this.blockSize_ * idx
                block.y =  this.blockSize_ * j
                block.active = true
                this.node.addChild(block)
            })
        })
    }

    update(deltaTime: number) {

    }
}
