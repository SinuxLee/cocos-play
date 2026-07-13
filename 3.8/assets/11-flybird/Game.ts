import { _decorator, Component, find, instantiate, Node, Prefab, tween, v3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Game')
export class Game extends Component {
    @property(Prefab) private bgPrefab: Prefab = null!;
    @property(Prefab) private birdPrefab: Prefab = null!;
    @property(Prefab) private pipeDownPrefab: Prefab = null!;
    @property(Prefab) private pipeUpPrefab: Prefab = null!;
    @property(Prefab) private startUIPrefab: Prefab = null!;

    private startNode: Node = null!;
    private birdNode: Node = null!;

    protected onLoad(): void {
        this.node.addChild(instantiate(this.bgPrefab));

        let node = this.startNode = instantiate(this.startUIPrefab)
        this.node.addChild(this.startNode);

        let btn = find('btnGroup/btnPlay', node)
        btn.on('click', () => {
            this.schedule(() => {
                tween(this.startNode)
                    .to(0.2, { scale: v3(0.2, 0.2, 0.2) })
                    .call(() => {
                        this.startNode.active = false;
                        this.startGame();
                    })
                    .start()
            }, 0.2)
        })

        btn = find('btnGroup/btnScore', node)
        btn.on('click', () => {
            this.startNode.active = false;
        })

        this.birdNode = instantiate(this.birdPrefab)
    }

    protected startGame(){
        
    }
}

