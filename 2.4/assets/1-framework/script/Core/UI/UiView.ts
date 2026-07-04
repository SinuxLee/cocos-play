import { Manager } from "../../Framework";
import { LangEvents } from "../Language/LocalizationManager";

const { ccclass, property } = cc._decorator;

@ccclass
export default abstract class UiView extends cc.Component {
    /** 预制体路径*/
    public static nodepath: string = null;
    /** 传入数据 */
    public userData: any = null;
    /** view 类型 */
    public className: string = null;      //类型
    /** 开启对父节点的包围盒检测 */
    public itemCheck: boolean = null;

    protected onLoad(): void {
        this.itemCheck = false;
        Manager.EventManager.add(LangEvents.setSysLang, this.RefreshLang, this);
        this.addEvents();
        this.initData();
        this.initUI();
        this.NodeEventsEmit();
    }

    protected onDestroy(): void {
        Manager.EventManager.remove(LangEvents.setSysLang, this.RefreshLang, this);
        this.removeEvents();
    }

    protected update(dt: number): void {
        this.ItemCheck();
    }

    //子类继承清单   
    /**UI组件初始化 父类方法 super.onLoad() 自动执行*/
    initUI(): void {} 
    /**数据初始化 父类方法 super.onLoad() 自动执行*/
    initData(): void {}
    /**交互事件初始化 父类方法 super.onLoad() 自动执行*/
    NodeEventsEmit(): void {}
    /**全局事件注册 父类方法 super.onLoad() 自动执行*/
    addEvents(): void {}
    /**全局事件注销 父类方法 自动执行注销 */
    removeEvents(): void {}
    /**更新数据 手动注册 手动调用 */
    UpdateData(): void{}
    /**刷新系统语言 */
    RefreshLang(): void{}
    
    /** 计算可视区域碰撞包围盒*/
    private getScrollviewBox(target: cc.Node): cc.Rect {
        let target_left = target.parent.convertToWorldSpaceAR(cc.v2(
            target.x - target.anchorX * target.width,
            target.y - target.anchorY * target.height
        ));

        let Rect: cc.Rect = cc.rect(
            target_left.x,
            target_left.y,
            target.width,
            target.height
        );
        return Rect;
    }

    /** 碰撞判断*/
    private pageViewContentIsIntersects(): void {
        // 获取content节点
        let content = this.node.parent;

        // 获取PageView的可视区域
        let viewBoundingBox = this.getScrollviewBox(content.parent.parent);
        
        
        // 遍历content的子节点
        content.children.forEach(child => {
            // 获取子节点的包围盒
            let boundingBox = this.getScrollviewBox(child);

            // 调整包围盒的大小，长宽各减小20
            boundingBox.width -= 20;
            boundingBox.height -= 20;
            boundingBox.x += 10;  // 调整x坐标，使包围盒居中缩小
            boundingBox.y += 10;  // 调整y坐标，使包围盒居中缩小

            // 检测子节点是否在可视区域内
            if (viewBoundingBox.intersects(boundingBox)) {
                // 在可视区域内，设置opacity为255
                child.opacity = 255;
            } else {
                // 不在可视区域内，设置opacity为0
                child.opacity = 0;
            }
        });
    }

    /** scroll滑动 边界监测 */
    ItemCheck() {
        if (!this.itemCheck) return;
        this.pageViewContentIsIntersects();
    }

    /**右滑至左 */
    public openAni_RightToLeft(node: cc.Node, time: number, fnode?: cc.Node, endcall?: Function): void {
        node.x += cc.Canvas.instance.node.width;
        node.opacity = 0;
        cc.tween(node)
        .to(time, {position: cc.v3(0, node.y), opacity: 255}, {"easing": "sineInOut"})
        .call(()=>{
            if (endcall) endcall();
        })
        .start()
       
        if(fnode != null) {
            cc.tween(fnode)
            .to(time, {position: cc.v3(fnode.x - cc.Canvas.instance.node.width, fnode.y), opacity: 0}, {"easing": "sineInOut"})
            .start()
        }
    }

    /**左滑至右 */
    public openAni_LeftToRight(node: cc.Node, time: number, fnode?: cc.Node, endcall?: Function): void {
        cc.tween(node)
        .to(time, {position: cc.v3(node.x + cc.Canvas.instance.node.width, node.y), opacity: 0}, {"easing": "sineInOut"})
        .call(()=>{
            if (endcall) endcall();
        })
        .start()
       
        if(fnode != null) {
            cc.tween(fnode)
            .to(time, {position: cc.v3(0, fnode.y), opacity: 255}, {"easing": "sineInOut"})
            .start()
        }
    }

    /**打开动画滑至顶 */
    public openAni_bottomToTop(contentNode: cc.Node, endcall: Function): void {
        contentNode.y -= contentNode.height;
        cc.tween(contentNode)
            .to(0.16, { position:  cc.v3(0, 0)})
            .call(() => {
                if (endcall) endcall();
            })
            .start()
    }

    /**打开动画滑至底 */
    public openAni_topToBottom(contentNode: cc.Node, endcall: Function): void {
        cc.tween(contentNode)
        .to(0.16, { position:  cc.v3(0, -contentNode.height) })
        .call(() => {
            if (endcall) endcall();
            this.node.destroyAllChildren();
            this.close();
        })
        .start()
    }

    /** 打开动画由小到大*/
    public openAni_smallToBig(contentNode: cc.Node, endcall: Function): void {
        contentNode.scale = 0.5;
        cc.tween(contentNode)
            .to(0.16, { scale: 1.03 }, {easing: "smooth"})
            .to(0.1, { scale: 1 }, {easing: "smooth"})
            .call(() => {
                if (endcall) endcall();
            })
            .start()
    }

    /** 关闭动画由大到小*/
    public closeAni_BigToSmall(contentNode: cc.Node, endcall: Function): void {
        cc.tween(contentNode)
            .to(0.16, { scale: 1.03 })
            .to(0.1, { scale: 0 })
            .call(() => {
                if (endcall) endcall();
                this.close();
            })
            .start()
    }

    /** 创建动画  */
    public creatAni_light(): void {
        this.node.opacity = 0;
        cc.tween(this.node)
        .to(0.27, {opacity: 255}, {easing: "smooth"})
        .start();
    }
    
    /** 关闭*/
    public close(): void {
        Manager.UiManager.clearViewByClassName(this.className);
    }
}
