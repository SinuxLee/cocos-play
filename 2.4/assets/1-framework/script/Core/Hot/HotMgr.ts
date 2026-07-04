import { Manager } from "../../Framework";
import { Macro } from "../UI/UiManager";

/**热更状态 */
export enum HotState {
    None,
    Check,
    Update,
}

/**热更状态码 */
export enum HotUpdateCode {
    ERROR_NO_LOCAL_MANIFEST,
    NEW_VERSION_FOUND,
    ALREADY_UP_TO_DATE,
    UPDATE_PROGRESSION,
    ASSET_UPDATED,
    UPDATE_FAILED,
    UPDATE_FINISHED,
    ERROR_DOWNLOAD_MANIFEST,
    ERROR_PARSE_MANIFEST,
    ERROR_UPDATING,
    ERROR_DECOMPRESS,
}

export class HotMgr {
    public static instance: HotMgr = null;
    private HotState: HotState = null;
    private assets: jsb.AssetsManager = null;
    private hotEndCall: Function = null;
    private bundleType: string = null;
    private storagePath: string = null;
    private constructor() {
        HotMgr.instance = this;
        Manager.LogMgr.log('hotmgr已经被创建');
    }

    /////////////////////更新初始化部分//////////////////////////
    /**
     * 初始化热更环境
     * @param bundle 进行热更检测的分包名
     * @param updatePath 本地热更文件存储路径
     */
    public InitUpDate(MainifestNativeUrl: string, updatePathName: string, hotEndCall: Function, bundleType: string): void {
        if (!this.systemIsSupportUpdate()) {
            this.hotEndCall();
            return;
        }

        if (this.assets != null) {
            this.assets = null;
            this.HotState = null;
            this.hotEndCall = null;
            this.storagePath = null;
        }
        this.bundleType = bundleType;
        this.hotEndCall = hotEndCall;

        let storagePath = bundleType == Macro.resources ? (jsb.fileUtils.getWritablePath() + updatePathName) : updatePathName;
        this.storagePath = storagePath;
        //热更根路径
        Manager.LogMgr.log("热更根路径", storagePath);
        //manifest绝对路径
        let manifest_localPath = this.GetManiFestFile(MainifestNativeUrl);
        Manager.LogMgr.log("manifest路径", manifest_localPath);

        //创建热更管理器
        this.assets = new jsb.AssetsManager(manifest_localPath, storagePath);
        this.assets.setVersionCompareHandle(this.checkVersion.bind(this));
        this.assets.setVerifyCallback(this.Verify.bind(this));
        this.assets.setEventCallback(this.hotUpdateCallBack.bind(this));
        let local_manifest: jsb.Manifest = this.assets.getLocalManifest();
        this.ManifestInfo(local_manifest);
        this.CheckUpdate();
    }

    /**检测系统环境是否支持热更新 */
    private systemIsSupportUpdate(): boolean {
        if (!cc.sys.isNative) {
            Manager.LogMgr.log('系统环境不支持热更!');
            return false;
        }
        return true;
    }

    /**获取分包下的manifest文件路径 */
    private GetManiFestFile(nativeUrl: string): string {
        if (!this.systemIsSupportUpdate()) return;
        let url = cc.loader.md5Pipe.transformURL(nativeUrl)
        return url;
    }

    /**manifest配置 详情打印*/
    private ManifestInfo(manifest: jsb.Manifest): void {
        Manager.LogMgr.log('[HotUpdate] 热更新资源存放路径: ' + manifest.getSearchPaths());
        Manager.LogMgr.log('[HotUpdate] 本地manifest路径: ' + manifest.getManifestFileUrl());
        Manager.LogMgr.log('[HotUpdate] remote packageUrl: ' + manifest.getPackageUrl());
        Manager.LogMgr.log('[HotUpdate] project.manifest remote url: ' + manifest.getManifestFileUrl());
        Manager.LogMgr.log('[HotUpdate] version.manifest remote url: ' + manifest.getVersionFileUrl());
    }

    /**版本对比 */
    private checkVersion(versionA, versionB): number {
        // 比较版本
        let vA = versionA.split('.');
        let vB = versionB.split('.');
        for (let i = 0; i < vA.length; ++i) {
            let a = parseInt(vA[i]);
            let b = parseInt(vB[i] || '0');
            if (a != b) {
                return a - b;
            }
        }

        // 有差异就更新
        if (vB.length != vA.length) {
            return -1;
        } else {
            return 0;
        }
    }

    /**文件MD5验证 */
    private Verify(assetsFullPath, asset): boolean {
        let { compressed, md5, path, size } = asset;
        if (compressed) {
            return true;
        } else {
            return true;
        }
    }
    /////////////////////更新处理部分//////////////////////////

    /**检测 */
    private CheckUpdate() {
        if (this.assets.getState() === jsb.AssetsManager.State.UNINITED) {
            cc.error('未初始化')
            return;
        }

        if (!this.assets.getLocalManifest().isLoaded()) {
            Manager.LogMgr.log('加载本地 manifest 失败 ...');
            return;
        }

        this.HotState = HotState.None;
        this.assets.checkUpdate();
    }

    /**散列更新 */
    private Update(): void {
        if (!this.assets) {
            Manager.LogMgr.log('请先初始化');
            return;
        }
        this.HotState = HotState.Update;
        this.assets.update();
    }

    /**热更事件回调处理*/
    private hotUpdateCallBack(event: jsb.EventAssetsManager): void {
        let code = event.getEventCode();
        Manager.LogMgr.log(`hotUpdate Code: ${code}`);
        switch (code) {
            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE: //无需更新 检测回调
                Manager.LogMgr.log("已经和远程版本一致，无须更新");
                this.hotEndCall();
                break;
            case jsb.EventAssetsManager.NEW_VERSION_FOUND: //需要更新 检测回调
                Manager.LogMgr.log('发现新版本,请更新');
                const fileSize = event.getTotalBytes();
                const fileCount = event.getTotalFiles();
                Manager.LogMgr.log(`检测到新版本,一共${fileCount}个文件:${fileSize}Kb\n开始更新`);
                this.Update();
                break;
            case jsb.EventAssetsManager.UPDATE_PROGRESSION: //正在更新 更新回调
                if (this.HotState == HotState.Update) {
                    let bytes = event.getDownloadedBytes() + '/' + event.getTotalBytes();
                    let files = event.getDownloadedFiles() + '/' + event.getTotalFiles();

                    let file = event.getPercentByFile().toFixed(2);
                    let byte = event.getPercent().toFixed(2);
                    let msg = event.getMessage();
                    Manager.LogMgr.log('[更新中]: 进度=' + file);
                    Manager.LogMgr.log(msg);
                } else {
                    // 检查状态下，不回调更新进度
                    Manager.LogMgr.log('差异对比中...')
                }
                break;
            case jsb.EventAssetsManager.UPDATE_FINISHED: //更新完成 更新回调
                Manager.LogMgr.log('更新成功');
                this.saveSearchPath();
                break;
            case jsb.EventAssetsManager.ASSET_UPDATED: // 不予理会的消息事件
                break;
            default: //更新失败 更新回调
                this.assets.setEventCallback(null);
                let codeMsg = {};
                codeMsg[HotUpdateCode.ERROR_NO_LOCAL_MANIFEST.toString()] = Manager.LanuageMgr.getText('Poker.GameTipsFound');
                codeMsg[HotUpdateCode.ERROR_DOWNLOAD_MANIFEST.toString()] = Manager.LanuageMgr.getText('Poker.GameTipsDownload');
                codeMsg[HotUpdateCode.ERROR_PARSE_MANIFEST.toString()] = Manager.LanuageMgr.getText('Poker.GameTipsParsing');
                codeMsg[HotUpdateCode.ERROR_UPDATING.toString()] = Manager.LanuageMgr.getText('Poker.GameTipsUpdate');
                codeMsg[HotUpdateCode.ERROR_DECOMPRESS.toString()] = Manager.LanuageMgr.getText('Poker.GameTipsDecompression');
                Manager.LogMgr.log(`error code msg: ${codeMsg[code.toString()]}`);
                cc.game.restart();
                break;
        }
    }

    /**打印搜索路径 */
    private showSearchPath(): void {
        Manager.LogMgr.log("========================搜索路径========================");
        let searchPaths = jsb.fileUtils.getSearchPaths();
        for (let i = 0; i < searchPaths.length; i++) {
            Manager.LogMgr.log("[" + i + "]: " + searchPaths[i]);
        }
        Manager.LogMgr.log("======================================================");
    }

    /**保存搜索路径*/
    private saveSearchPath(): void {
        switch (this.bundleType) {
            case Macro.resources:
                let searchPaths = jsb.fileUtils.getSearchPaths();
                let newPaths = this.assets.getLocalManifest().getSearchPaths();
                Array.prototype.unshift(searchPaths, newPaths);
                // 保存搜索路径到本地存储
                cc.sys.localStorage.setItem('HotUpdateSearchPaths', JSON.stringify(searchPaths));
                jsb.fileUtils.setSearchPaths(searchPaths);
                this.showSearchPath();
                this.assets.setEventCallback(null);
                cc.audioEngine.stopAll();
                cc.game.restart();
                break
            default:
                Manager.LogMgr.log('分包无需设置搜索路径');
                this.hotEndCall();
                break;
        }
    }

    public static getInstance(): HotMgr {
        if (HotMgr.instance == null) {
            HotMgr.instance = new HotMgr();
        }
        return HotMgr.instance;
    }
}