import { AudioManager } from "./Core/Audio/AudioMgr";
import { BackStageMgr } from "./Core/BackStage/BackStageMgr";
import { CacheManager } from "./Core/Cache/CacheManager";
import { EntryManager } from "./Core/Entry/EntryManager";
import { EventManager } from "./Core/Event/EventManager";
import { HotMgr } from "./Core/Hot/HotMgr";
import { LocalizationManager } from "./Core/Language/LocalizationManager";
import { LogMgr } from "./Core/Log/LogMgr";
import { ConnectConfig } from "./Core/Net/ConnectConfig";
import { HttpSrverManager } from "./Core/Net/HttpServerManager";
import { wsManager } from "./Core/Net/wsManager";
import { ResManager } from "./Core/Res/ResManager";
import { SdkMgr } from "./Core/Sdk/SdkMgr";
import { TaskManager } from "./Core/TaskQueue/TaskManager";
import { Timer } from "./Core/Timer/Timer";
import { UiManager } from "./Core/UI/UiManager";
import { UtilManager } from "./Core/Util/UtilManager";

/** 系统级事件 */
export enum FrameworkEvent {
    systemBase = 8000,
    UPDATE_PING = systemBase + 1,              // ping 值刷新
    LOADING_TIP = systemBase + 2,              // 加载提示
    SERVICE_OVER = systemBase + 3,             // 连接断开
    SERVICE_RECOVER = systemBase + 4,          // 连接恢复
    BACKSTAGE_CAHNGE_Hide = systemBase + 5,    // 前后台切换 进入后台
    BACKSTAGE_CAHNGE_Show = systemBase + 6,    // 前后台切换 进入前台
    UIVIEW_OPEN_EVENT = systemBase + 7,        // UI打开事件
    UIVIEW_CLOSE_EVENT = systemBase + 8,       // UI关闭事件
    VIEWGROUP_NESTING_OPEN = systemBase + 9,   // 开启事件捕获处理
    VIEWGROUP_NESTING_STOP = systemBase + 10,  // 关闭事件捕获处理

}

/**框架模块 */
class Framework {
    /**工具管理器 */
    public get UtilManager(): UtilManager {
        return UtilManager.getInstance();
    }

    /**UI管理器*/
    public get UiManager(): UiManager {
        return UiManager.getInstance();
    }

    /**资源加载器*/
    public get ResManager(): ResManager {
        return ResManager.getInstance();
    }

    /**缓存管理器*/
    public get CacheManager(): CacheManager {
        return CacheManager.getInstance();
    }

    /**全局事件派发器*/
    public get EventManager(): EventManager {
        return EventManager.getInstance();
    }

    /**任务队列管理*/
    public get TaskManager(): TaskManager {
        return TaskManager.getInstance();
    }

    /**毫秒计时管理器*/
    public get TimerManager(): Timer {
        return Timer.getInstance();
    }

    /**Websocket管理器*/
    public get WebSocketManager(): wsManager {
        return wsManager.getInstance();
    }

    /**Http服务管理器 */
    public get HttpServerManager(): HttpSrverManager {
        return HttpSrverManager.getInstance();
    }

    /**连接配置*/
    public get ConnectConfig(): ConnectConfig {
        return ConnectConfig.getInstance();
    }

    /**入口管理器*/
    public get EntryManager(): EntryManager {
        return EntryManager.getInstance();
    }

    /**后台管理器 */
    public get BackStageMgr(): BackStageMgr {
        return BackStageMgr.getInstance();
    }

    /**日志管理器 */
    public get LogMgr(): LogMgr {
        return LogMgr.getInstance();
    }

    /**SDK管理器 */
    public get SdkMgr(): SdkMgr {
        window['SdkMgr'] = SdkMgr.getInstance();
        return SdkMgr.getInstance();
    }

    /**音频管理器 */
    public get AudioMgr(): AudioManager {
        return AudioManager.getInstance();
    }

    /**热更管理器 */
    public get HotMgr(): HotMgr {
        return HotMgr.getInstance();
    }

    /**多语言管理器 */
    public get LanuageMgr(): LocalizationManager {
        return LocalizationManager.getInstance();
    }

    /**开启编辑器spine预览 */
    private initSkExt(): void {
        // 注册一个事件，该事件仅在Cocos Creator引擎初始化完成后触发一次
        cc.game.once(cc.game.EVENT_ENGINE_INITED, () => {
            // 使用mixin将新定义的update方法添加到sp.Skeleton原型中，这影响了所有Spine骨架实例
            cc.js.mixin(sp.Skeleton.prototype, {
                // 重写Spine骨架的update方法，添加自定义的逻辑
                update(dt: number): void {
                    // 如果当前是在编辑器环境中，启用动画预览
                    if (CC_EDITOR) {
                        (cc as any).engine._animatingInEditMode = 1;
                        (cc as any).engine.animatingInEditMode = 1;
                    }
                    // 如果当前Spine动画被暂停，则直接返回不进行更新处理
                    if (this.paused) return;
                    // 忽略TypeScript的类型检查警告，乘以全局和实例的时间缩放因子，计算实际的时间间隔
                    //@ts-ignore
                    dt *= this.timeScale * sp.timeScale;
                    // 检查是否使用了缓存动画模式
                    if (this.isAnimationCached()) {
                        // 如果当前动画已经完成
                        if (this._isAniComplete) {
                            // 如果动画队列为空且没有正在处理的动画信息
                            if (this._animationQueue.length === 0 && !this._headAniInfo) {
                                let frameCache = this._frameCache;
                                // 如果存在帧缓存且帧缓存是无效的
                                if (frameCache && frameCache.isInvalid()) {
                                    // 更新到最新帧
                                    frameCache.updateToFrame();
                                    let frames = frameCache.frames;
                                    // 设置当前帧为最后一帧
                                    this._curFrame = frames[frames.length - 1];
                                }
                                // 由于没有可播放的动画，返回结束方法
                                return;
                            }
                            // 如果没有正在处理的动画信息，则从队列中取出一个动画信息
                            if (!this._headAniInfo) {
                                this._headAniInfo = this._animationQueue.shift();
                            }
                            // 累加时间间隔
                            this._accTime += dt;
                            // 如果累计时间超过了动画信息中指定的延迟
                            if (this._accTime > this._headAniInfo.delay) {
                                let aniInfo = this._headAniInfo;
                                // 清除当前的动画信息，以准备下一次动画播放
                                this._headAniInfo = null;
                                // 设置并播放指定的动画
                                this.setAnimation(0, aniInfo.animationName, aniInfo.loop);
                            }
                            // 完成更新，返回结束方法
                            return;
                        }
                        // 更新缓存模式下的动画
                        this._updateCache(dt);
                    } else {
                        // 更新实时模式下的动画
                        this._updateRealtime(dt);
                    }
                }
            });
        });
    }

    /**动态合配置*/
    private initCocosDynamicCinfig(): void {
        // 开启引擎的动态合图
        cc.dynamicAtlasManager.enabled = true;
        // 关闭清除图片缓存
        cc.macro.CLEANUP_IMAGE_CACHE = false;

        cc.dynamicAtlasManager.maxAtlasCount = 5;

        // 默认只有贴图宽高都小于 512 的贴图才可以进入到动态合图系统
        cc.dynamicAtlasManager.maxFrameSize = 2048;
        // 设置适合当前设备的最大纹理尺寸
        cc.dynamicAtlasManager.textureSize = 4096;

        // cc.dynamicAtlasManager.reset();
        // cc.dynamicAtlasManager.insertSpriteFrame(aa);

        // 开启调试
        // cc.dynamicAtlasManager.showDebug(true);
        // 关闭调试
        // cc.dynamicAtlasManager.showDebug(false);
    }

    /**自动适配 Canvas 组件*/
    public adaptScreen(canvas: cc.Canvas): void {
        cc.sys.getSafeAreaRect();

        // 获取屏幕尺寸
        var screenSize = cc.view.getFrameSize();

        // 设计分辨率
        var designResolution = cc.size(720, 1280); // 根据您的设计调整
        canvas.designResolution = designResolution;

        // 计算屏幕宽高比
        var screenRatio = screenSize.width / screenSize.height;

        // 获取屏幕密度
        var dpi = cc.view.getDevicePixelRatio();

        // 设定适配阈值
        var phoneRatio = 16 / 9; // 普通手机宽高比
        var tabletRatio = 4 / 3;  // 平板宽高比

        // 选择适配模式
        if (screenRatio >= phoneRatio) {
            // 当屏幕宽高比大于等于普通手机的比例时，优先适配高度
            canvas.fitHeight = true;
            canvas.fitWidth = false;
        } else if (screenRatio < phoneRatio && screenRatio >= tabletRatio) {
            // 当屏幕宽高比介于平板和普通手机之间时，根据屏幕密度进一步判断
            if (dpi > 2) { // 大多数高分辨率手机的 dpi 都会大于 2
                canvas.fitHeight = true;
                canvas.fitWidth = false;
            } else {
                canvas.fitHeight = true;
                canvas.fitWidth = true;
            }
        } else {
            // 当屏幕宽高比明显小于平板的比例时
            canvas.fitHeight = false;
            canvas.fitWidth = true;
        }

        // 额外处理超宽或超窄屏幕
        if (screenRatio > 21 / 9 || screenRatio < 4 / 3) {
            // 超宽或超窄屏幕可能需要特殊处理
            Manager.LogMgr.log('超宽或超窄屏幕');
        } else {
            Manager.LogMgr.log('pc');
            canvas.fitHeight = true;
            canvas.fitWidth = true;
        }
    }

    public static Instance: Framework;
    private constructor() {
        this.initSkExt();
        this.initCocosDynamicCinfig();
        this.BackStageMgr.Init();

        window["SdkMgr"] = this.SdkMgr;
    }

    public static getInstance(): Framework {
        if (!Framework.Instance) Framework.Instance = new Framework();
        return Framework.Instance;
    }
}

export const Manager = Framework.getInstance();
