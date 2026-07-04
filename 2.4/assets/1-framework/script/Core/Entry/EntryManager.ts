import { Manager } from "../../Framework";

/**zip缓存记录，用于验证zip缓存的资源是否完整 */
export type zipHistory = {
    nLoadRes: number,
    tLoadRes: number,
}

/**分包入口管理器 分包管理 + zip自动缓存 + 自动热更*/
export class EntryManager {
    public static instance: EntryManager = null;
    public static MODE: boolean = false;
    private zipSaveDataPaths: zipHistory = null;
    private originFilePath: string = null;
    private retryCount: number = null;
    private maxRetries: number = null; // 最大重试次数

    private constructor() {
        EntryManager.instance = this;
    }

    /**检测缓存状态 */
    private checkRes(bundleName: string): boolean {
        Manager.ConnectConfig.getZipSaveDataPaths();

        this.zipSaveDataPaths = Manager.ConnectConfig.unzipData[bundleName];
        if (!this.zipSaveDataPaths && this.zipSaveDataPaths.nLoadRes == this.zipSaveDataPaths.tLoadRes) {
            Manager.LogMgr.log('资源缓存正常，正在加载分包');
            return true;
        }

        if (this.zipSaveDataPaths == null) Manager.LogMgr.log('初次加载资源');
        return false;
    }

    /**初始化远程连接配置 */
    public setOriginFilePath(originFilePath: string): void {
        this.originFilePath = originFilePath;
    }

    /**
     * 分包入口函数
     * @param bundleName 分包名 
     * @param backCall 加载后的回调
     */
    entry(bundleName: string, process?: Function, backCall?: Function): void {
        if (Manager.CacheManager.cacheRes[bundleName]) { // 默认从缓存载入 防止重复加载
            if (backCall) backCall();
            return;
        }

        if (!cc.sys.isNative) {
            this.entryBundleFromB(bundleName, process, backCall);
            return;
        }

        if (!EntryManager.MODE) {
            console.log("禁止热更模式:", EntryManager.MODE);
            this.entryBundleFromB(bundleName, process, backCall);
            return;
        }

        console.log("开启热更模式:", EntryManager.MODE);
        this.entryBundleFromA(bundleName, process, backCall);
    }

    /**从自定定义路径加载分包 */
    private entryBundleFromA(bundleName: string, process?: Function, backCall?: Function): void {
        this.retryCount = 0;
        this.maxRetries = 3;

        // 远程分包路径
        const originUrl = Manager.ConnectConfig.WebResUrl + `${this.originFilePath}/${bundleName}.zip`;
        // 本地分包路径
        const localUrl = jsb.fileUtils.getWritablePath() + `pathToBundle/${bundleName}`;
        if (this.checkRes(bundleName)) {
            let mainfest_url = this.findFileByName(localUrl, '.manifest');  //寻找绝对路径下是否存在manifest
            Manager.LogMgr.log("=========>>>>>>>>>>>>>", mainfest_url);
            if (mainfest_url != null) {
                // 开启热更检测
                Manager.HotMgr.InitUpDate(mainfest_url, localUrl, () => {
                    this.loadLocalBundle(bundleName, originUrl, localUrl, process, backCall);
                }, bundleName);
            } else {
                this.loadRemoteBundle(bundleName, originUrl, localUrl, process, backCall);
            }
        } else {
            this.loadRemoteBundle(bundleName, originUrl, localUrl, process, backCall);
        }
    }

    /**从主包路径加载分包 */
    private entryBundleFromB(bundleName: string, process?: Function, backCall?: Function): void {
        cc.assetManager.loadBundle(bundleName, (err, bundle) => {
            if (err) return console.error(`本地分包${bundleName}加载失败:${err}`);

            if (bundle) {
                Manager.CacheManager.setcacheRes(bundleName, bundle);
                Manager.EventManager.dispatch(`PerloadFile_${bundleName}`, process, backCall);
            }
        });
    }

    /**加载本地分包 */
    private loadLocalBundle(bundleName: string, originUrl: string, localUrl: string, process?: Function, backCall?: Function): void {
        //本地加载后开启热更新
        cc.assetManager.loadBundle(localUrl, (err, bundle) => {
            if (err) {
                console.error(`本地分包${bundleName}加载失败:${err}`);
                this.loadRemoteBundle(bundleName, originUrl, localUrl, backCall);
                return;
            }
            Manager.CacheManager.setcacheRes(bundleName, bundle);
            Manager.EventManager.dispatch(`PerloadFile_${bundleName}`, process, backCall);
        });
    }

    /**加载远程分包 */
    private loadRemoteBundle(bundleName: string, originUrl: string, localUrl: string, process?: Function, backCall?: Function): void {
        Manager.LogMgr.log('zip下载中');
        let downloader = new jsb.Downloader();
        downloader.createDownloadFileTask(originUrl, jsb.fileUtils.getWritablePath() + `${bundleName}.zip`);
        downloader.setOnTaskProgress((task, bytesReceived, totalBytesReceived, totalBytesExpected) => {
            if (process) process(totalBytesReceived, totalBytesExpected);
        });

        downloader.setOnTaskError((task, errorCode, errorCodeInternal, errorStr) => {
            console.error('Download failed:', errorStr);
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                Manager.LogMgr.log(`重试下载 ${this.retryCount}/${this.maxRetries}`);
                downloader = null;
                this.loadRemoteBundle(bundleName, originUrl, localUrl, backCall);
            } else {
                Manager.LogMgr.log('达到最大重试次数，停止下载');
                downloader = null;
                this.retryCount = 0;
                // this.loadRemoteBundle(bundleName, originUrl, localUrl, backCall);
            }
        });

        downloader.setOnFileTaskSuccess((task) => {
            Manager.LogMgr.log("zip下载成功!");
            //@ts-ignore
            const fileData = jsb.fileUtils.getDataFromFile(task.storagePath);
            this.unzipFile(fileData, task.storagePath, bundleName, process, backCall);
        });
    }

    /**解压zip文件 */
    private unzipFile(zipData, path, bundleName: string, process: Function, backCall: Function): void {
        let zip = new JSZip();
        zip.loadAsync(zipData).then((zip) => {
            Manager.LogMgr.log(zip);
            this.saveCache(bundleName, zip, () => {
                zip = null;
                jsb.fileUtils.removeFile(path);
                this.entryBundleFromA(bundleName, process, backCall);
            }).catch((err) => {
                zip = null;
                console.error("保存缓存时出错:", err);
            });
        }).catch((err) => {
            zip = null;
            console.error("解压zip文件时出错:", err);
        });
    }

    /**保存到用户缓存目录 */
    private async saveCache(bundleName: string, zip: JSZip, backCall: Function): Promise<void> {
        const cachePath = jsb.fileUtils.getWritablePath() + 'pathToBundle/';
        this.zipSaveDataPaths = <zipHistory>{
            nLoadRes: 0,
            tLoadRes: 0,
        };

        const maxConcurrency = 15; // 最大并发数
        let fileEntries = [];
        for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
            if (!zipEntry.dir) {
                this.zipSaveDataPaths.tLoadRes += 1;
                fileEntries.push({ relativePath, zipEntry });
            }
        }

        const semaphore = new Semaphore(maxConcurrency);
        const processFile = async (relativePath, zipEntry) => {
            try {
                const filePath = cachePath + relativePath;
                const directory = filePath.substring(0, filePath.lastIndexOf('/'));
                if (!jsb.fileUtils.isDirectoryExist(directory)) {
                    jsb.fileUtils.createDirectory(directory);
                }
                if (filePath.endsWith('.json')) {
                    const fileData = await zipEntry.async('string');
                    const success = jsb.fileUtils.writeStringToFile(fileData, filePath);
                    if (success) {
                        // Manager.LogMgr.log('JSON 文件保存到缓存目录: ' + filePath);
                    } else {
                        console.error('JSON 文件保存失败: ' + filePath);
                    }
                } else {
                    const fileData = await zipEntry.async('uint8array');
                    //@ts-ignore
                    const success = jsb.fileUtils.writeDataToFile(fileData, filePath);
                    if (success) {
                        // Manager.LogMgr.log('文件保存到缓存目录: ' + filePath);
                    } else {
                        console.error('文件保存失败: ' + filePath);
                    }
                }
                this.zipSaveDataPaths.nLoadRes += 1;
                Manager.ConnectConfig.saveZipSaveDataPaths(bundleName, this.zipSaveDataPaths);
                if (this.zipSaveDataPaths.nLoadRes == this.zipSaveDataPaths.tLoadRes) {
                    if (backCall) backCall();
                }
            } catch (error) {
                console.error('处理文件时出错: ' + relativePath, error);
            } finally {
                semaphore.release();
            }
        };

        for (const { relativePath, zipEntry } of fileEntries) {
            await semaphore.acquire();
            processFile(relativePath, zipEntry);
        }
        await semaphore.waitForAll();
    }

    /**
     * 查找指定目录下的指定文件名的文件
     * @param dirPath 目录路径
     * @param fileName 文件名
     * @returns 文件的绝对路径或空字符串
     */
    private findFileByName(dirPath: string, fileName: string): string {
        let files = jsb.fileUtils.listFiles(dirPath);
        for (let i = 0; i < files.length; i++) {
            if (files[i].endsWith(fileName)) {
                return files[i];
            }
        }
        return null;
    }

    public static getInstance(): EntryManager {
        if (EntryManager.instance == null) {
            EntryManager.instance = new EntryManager();
        }
        return EntryManager.instance;
    }
}

/**解压并发控制器*/
class Semaphore {
    private tasks: Array<() => void> = [];
    private count: number;
    private maxCount: number;
    constructor(count: number) {
        this.count = count;
        this.maxCount = count;
    }

    async acquire(): Promise<void> {
        if (this.count > 0) {
            this.count--;
            return;
        }

        // 自我阻塞，等待唤醒
        await new Promise<void>(resolve => this.tasks.push(resolve));
    }

    release(): void {
        if (this.tasks.length > 0) {
            const next = this.tasks.shift();
            if (next) next(); // 唤醒其它任务，置换方式故不用修改信号个数
            return;
        }

        this.count++; // 增加信号个数
    }

    async waitForAll(): Promise<void> {
        while (this.count < this.maxCount) {
            await new Promise<void>(resolve => this.tasks.push(resolve));
        }
    }
}