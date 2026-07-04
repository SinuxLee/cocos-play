const {ccclass, property} = cc._decorator;
import WebvideoPlayer from "./webvideoPlayer";

@ccclass
export default class SuperVideoPlayer extends cc.Component {

    @property(cc.String) url = '';
    webvideoPlayer:WebvideoPlayer = new WebvideoPlayer()

    start () {
        cc.resources.load(this.url, cc.Asset, (err, asset: any) => {
            this.webvideoPlayer.open(asset.nativeUrl,()=>{
                this.setTexture()
            })
        })
    }

    setTexture(){
        let texture = this.webvideoPlayer.getTexture()
        let spriteFrame = new cc.SpriteFrame();
        spriteFrame.setTexture(texture);
        this.node.getComponent(cc.Sprite).spriteFrame = spriteFrame
    }

    update (dt) {
        this.webvideoPlayer.update(dt)
        this.setTexture()
    }
}
