import { Manager } from "../../Framework";
import UiView from "./UiView";

/**UI显示层级 */
export enum UiOrderIndex {
    BackGround,
    UI,
    EffectUI,
    Tip,
    ChildTop = 999,
}
export enum Macro {
    resources = "resources",
    Hall = "Hall",
    TexasPoker = "TexasPoker",
}
/**
 * UI配置类型
 * @view typeof UiView
 * @bundleName 包类型
 * @zindex 层级
 * @fartherNode 父节点
 * @args 传入数据
 */
export interface UiConfig {
    /**组件名 */
    view: typeof UiView,
    /**所在包 */
    bundleName: Macro,
    /**层级 */
    zindex: UiOrderIndex,
    /**tip: 从自定义节点创建 需要在父节点销毁时手动释放掉*/
    fartherNode?: cc.Node,
    /**传入任意参数 */
    args?: any,
}

export enum UiManagerEvent {
    showonly = "showonly",
}

export class UiManager {
    public static instance: UiManager = null;
    private viewList: Record<string, cc.Node> = {};

    private constructor() {
        // webGL 抗锯齿
        cc.macro.ENABLE_WEBGL_ANTIALIAS = true;
        UiManager.instance = this;
    }

    private addNode(prefab: cc.Prefab, uiConfig: UiConfig): void {
        let nodepath: string[] = uiConfig.view.nodepath.split("/");
        let viewName: string = nodepath[nodepath.length - 1];
        Manager.LogMgr.log(`open ${viewName}`);

        if (this.viewList[viewName]) {
            if (uiConfig.args && uiConfig.args[0] == UiManagerEvent.showonly) {
                this.onlyshowByFather(uiConfig.view);
            }
            Manager.LogMgr.log(`${viewName}已经存在`);
            // 存在就刷新参数
            const targetViewNode = this.viewList[viewName];
            targetViewNode.getComponent(uiConfig.view).userData = uiConfig.args;
            targetViewNode.getComponent(uiConfig.view).UpdateData();
            return;
        }

        let node: cc.Node = cc.instantiate(prefab);
        if (node.getComponent(uiConfig.view) == null) {
            node.addComponent(uiConfig.view).userData = uiConfig.args;
        }

        node.getComponent(uiConfig.view).className = viewName;
        Manager.LanuageMgr.updateSceneLanguage(node);
        if (uiConfig.fartherNode) {
            uiConfig.fartherNode.addChild(node);
        } else {
            cc.Canvas.instance.node.addChild(node);
        }

        node.zIndex = uiConfig.zindex;
        this.viewList[viewName] = node;
        if (uiConfig.args && uiConfig.args[0] == UiManagerEvent.showonly) {
            this.onlyshowByFather(uiConfig.view);
        }
    }

    /** 跨包加载view */
    public openViewToOtherBundle(path: string, bundleName: Macro, zindex: UiOrderIndex, fartherNode?: cc.Node, args?: any): void {
        let bundle: cc.AssetManager.Bundle = Manager.ResManager.getBundleCache(bundleName);
        //检查缓存
        if (bundle) {
            Manager.ResManager.getDataFromBundle(bundleName, path, cc.Prefab, (error: Error, asset: cc.Asset) => {
                if (error) {
                    Manager.LogMgr.log(`${path} 该资源跨包加载失败`);
                    return;
                }
                let prefab: cc.Prefab = <cc.Prefab>asset;
                let node = cc.instantiate(prefab);
                if (node.getComponent(UiView) != null) {
                    node.getComponent(UiView).userData = args;
                    node.getComponent(UiView).className = node.name;
                }
                if (this.viewList[node.name] != null) {
                    this.viewList[node.name].getComponent(UiView).UpdateData();
                    return;
                }
                Manager.LanuageMgr.updateSceneLanguage(node);
                node.zIndex = zindex;
                if (fartherNode) {
                    fartherNode.addChild(node);
                } else {
                    cc.Canvas.instance.node.addChild(node);
                }
                this.viewList[node.name] = node;
            });
        } else {
            //缓存没有就加载
            Manager.ResManager.loadBundle(bundleName, () => {
                this.openViewToOtherBundle(path, bundleName, zindex, fartherNode, args);
            });
        }
    }
    /**
     * 打开view 自动绑定脚本组件与传入数据
     * @param uiConfig UI配置类型
     */
    public openView(uiConfig: UiConfig): void {
        let nodepath: string[] = uiConfig.view.nodepath.split("/");
        let viewName: string = nodepath[nodepath.length - 1];

        let bundleName: string = uiConfig.bundleName;
        if (bundleName == Macro.resources) {
            if (Manager.CacheManager.cacheRes[viewName]) {
                this.addNode(<cc.Prefab>Manager.CacheManager.cacheRes[viewName], uiConfig);
            } else {
                Manager.ResManager.getDataFromResources(uiConfig.view.nodepath, cc.Prefab, (err: Error, asset: cc.Asset) => {
                    let prefab: cc.Prefab = <cc.Prefab>asset;
                    this.addNode(prefab, uiConfig);
                });
            }
        } else {
            let bundle: cc.AssetManager.Bundle = Manager.ResManager.getBundleCache(uiConfig.bundleName);
            //检查缓存
            if (bundle) {
                Manager.ResManager.getDataFromBundle(uiConfig.bundleName, uiConfig.view.nodepath, cc.Prefab, (error: Error, asset: cc.Asset) => {
                    let prefab: cc.Prefab = <cc.Prefab>asset;
                    this.addNode(prefab, uiConfig);
                });
            } else {
                //缓存没有就加载
                Manager.ResManager.loadBundle(uiConfig.bundleName, () => {
                    this.openView(uiConfig);
                });
            }
        }
    }

    /**
     * 关闭view 自动释放节点
     * @param view 组件类
     */
    public closeView(view: typeof UiView): void {
        let nodepath: string[] = view.nodepath.split("/");
        let viewName: string = nodepath[nodepath.length - 1];
        if (this.viewList[viewName]) {
            let node: cc.Node = this.viewList[viewName];
            delete this.viewList[viewName];
            if (cc.isValid(node)) {
                node.destroy();
                node.removeFromParent();
            }
        }
    }

    /**
     * 关闭view 自动释放节点
     * @param className 组件类名
     */
    public clearViewByClassName(className: string): void {
        if (this.viewList[className]) {
            let node: cc.Node = this.viewList[className];
            delete this.viewList[className];
            if (cc.isValid(node)) {
                node.destroy();
                node.removeFromParent();
            }
            Manager.LogMgr.log(`close ${className}`);
        }
    }

    /**
     * 显示view
     * @param view 
     */
    public show(view: typeof UiView): void {
        let nodepath: string[] = view.nodepath.split("/");
        let viewName: string = nodepath[nodepath.length - 1];
        if (this.viewList[viewName]) {
            let node: cc.Node = this.viewList[viewName];
            node.opacity = 255;  // 子节点也会自动变为活跃
            node.resumeSystemEvents(true);
        }
    }

    /**
     * 隐藏view
     * @param view 
     */
    public hide(view: typeof UiView): void {
        let nodepath: string[] = view.nodepath.split("/");
        let viewName: string = nodepath[nodepath.length - 1];
        if (this.viewList[viewName]) {
            let node: cc.Node = this.viewList[viewName];
            node.opacity = 0;  // 子节点也会自动变为不活跃
            node.pauseSystemEvents(true);
        }
    }

    /** 同一父节点下只显示本节点*/
    public onlyshowByFather(view: typeof UiView): void {
        let nodepath: string[] = view.nodepath.split("/");
        let viewName: string = nodepath[nodepath.length - 1];

        const targetViewNode = this.viewList[viewName];
        if (!targetViewNode) {
            Manager.LogMgr.log(`View ${viewName} is not found.`);
            return;
        }

        const targetParent = targetViewNode.parent;
        Object.keys(this.viewList).forEach(viewName_e => {
            const node = this.viewList[viewName_e];
            if (node.parent === targetParent) {
                if (viewName_e === viewName) {
                    node.opacity = 255;
                    node.active = true;
                } else {
                    node.opacity = 0;
                    node.active = false;
                }
            }
        });
    }

    /**是否已经创建 */
    public isPop(view: typeof UiView): boolean {
        let nodepath: string[] = view.nodepath.split("/");
        let viewName: string = nodepath[nodepath.length - 1];
        if (this.viewList[viewName]) {
            return true;
        }

        return false;
    }

    /**通过名称获取view */
    public getNodeByViewName(viewName: string): cc.Node {
        return this.viewList[viewName];
    }

    /** 分时加载普通节点 */
    public loadPrefabInTimeSlices(parentNode: cc.Node, prefab: cc.Prefab, view: typeof UiView,
        scheduleNode: cc.Node, startcall: () => void,
        endcall: () => void, data?: any,
        progress?: (now, total) => void, effect?: boolean): void {
        if (parentNode == null) return;
        if (startcall) startcall();

        cc.director.getScheduler().unscheduleAllForTarget(scheduleNode);

        let index = 0;
        let num = cc.isValid(data) ? Object.values(data).length : 0;
        if (num <= 0) {
            if (parentNode) parentNode.destroyAllChildren();
            if (endcall) endcall();
            return;
        }

        let loadNext = () => {
            if (!cc.isValid(scheduleNode)) return;

            if (index > num) {
                if (endcall) endcall();
                cc.director.getScheduler().unschedule(loadNext, scheduleNode);
                return;
            }

            let childNode: cc.Node = parentNode?.children[index];
            if (childNode) {
                if (view) {
                    // 如果子节点存在且index匹配，更新数据
                    let viewComponent = childNode.getComponent(view);
                    viewComponent.userData = { index: index, data: data };
                    viewComponent.UpdateData();
                }
            } else {
                // 如果子节点不存在，创建新节点
                let newNode = cc.instantiate(prefab);
                Manager.LanuageMgr.updateSceneLanguage(newNode);
                if (view) {
                    newNode.addComponent(view);
                    newNode.getComponent(view).userData = { index: index, data: data };
                }
                
                if (effect) {
                    newNode.x = index % 2 == 0 ? -720 : 720;
                    cc.tween(newNode)
                        .to(0.21, { position: cc.v3(0, 0) }, { easing: "smooth" })
                        .start()
                }
                parentNode.addChild(newNode);
            }

            if (progress) progress(index + 1, num);
            index++;

            let layout = parentNode.getComponent(cc.Layout);
            if (layout) layout.updateLayout();
        };

        // 删除多余的子节点
        if (parentNode.children.length > num) {
            for (let i = parentNode.children.length - 1; i >= num; i--) {
                if (parentNode.children[i]) {
                    parentNode.children[i].removeComponent(view);
                    parentNode.children[i].destroy();
                }
            }
        }
        cc.director.getScheduler().schedule(loadNext, scheduleNode, 0, num, 0, false);
    }

    /** 分时加载 pageView 子节点*/
    public loadPrefabInTimeSlicesForPageView(pageView: cc.PageView, prefab: cc.Prefab, view: typeof UiView, scheduleNode: cc.Node, startcall: () => void, endcall: () => void, data?: any): void {
        if (pageView.content == null) return;
        if (startcall) startcall();

        cc.director.getScheduler().unscheduleAllForTarget(scheduleNode);

        let index = 0;
        let num = Array.isArray(data) || typeof data === 'object' ? Object.values(data).length : 0;
        if (num <= 0) {
            // tips: removeAllPages 或者 removePage 只会删除子节点 并不会删除子节点上的组件
            pageView.content.children.forEach((node) => { node.removeComponent(view); })
            pageView.content.destroyAllChildren();
            pageView.removeAllPages();
            if (endcall) endcall();
            return;
        }

        const loadNext = () => {
            if (!cc.isValid(scheduleNode)) return;

            if (index >= num) {
                if (endcall) endcall();
                cc.director.getScheduler().unschedule(loadNext, scheduleNode);
                return;
            }

            let childNode: cc.Node = pageView.content.children[index];
            if (childNode) {
                const viewComponent = childNode.getComponent(view);
                if (viewComponent) {
                    viewComponent.userData = { index, data };
                    viewComponent.UpdateData();
                }
            } else {
                const newNode = cc.instantiate(prefab);
                Manager.LanuageMgr.updateSceneLanguage(newNode);
                if (view) {
                    const newViewComponent = newNode.addComponent(view);
                    newViewComponent.userData = { index, data };
                }
                pageView.addPage(newNode);
            }
            index++;

            let layout = pageView.content.getComponent(cc.Layout);
            if (layout) layout.updateLayout();
        };

        for (let i = pageView.content.children.length - 1; i >= num; i--) {
            pageView.content.children[i].removeComponent(view);
            pageView.content.children[i].destroy();
            pageView.removePageAtIndex(i);
        }

        cc.director.getScheduler().schedule(loadNext, scheduleNode, 0.05, num, 0, false);
    }

    public static getInstance(): UiManager {
        if (UiManager.instance == null) UiManager.instance = new UiManager();

        return UiManager.instance;
    }
}
