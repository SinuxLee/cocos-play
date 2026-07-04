import { Manager } from "../../Framework";
import { Macro } from "../UI/UiManager";
export type assetData = {
	path: string;
	type: typeof cc.Asset;
};

export class ResManager{
	public static instance: ResManager = null;
	private constructor() {
		ResManager.instance = this;
	}

	/**加载bundle*/
	public loadBundle(bundleName: string, onComplete?: Function): void {
		cc.assetManager.loadBundle(bundleName, null, (err: Error, bundle: cc.AssetManager.Bundle) => {
			if (err) {
				console.error(err);
				return;
			}

			Manager.CacheManager.setcacheRes(bundleName, bundle);
			if (onComplete) {
				onComplete();
			}
		});
	}

	/**获取缓存中的bundle */
	public getBundleCache(bundleName: string): cc.AssetManager.Bundle {
		return cc.assetManager.getBundle(bundleName);
	}

	/**从主包加载数据 */
	public getDataFromResources(path: string, type: typeof cc.Asset, onComplete: (error: Error, assets: cc.Asset) => void): void {
		cc.assetManager.resources.load(path, type, null, onComplete);
	}

	/**从主包加载数据集 */
	public getDataListFromResources(path: string, type: typeof cc.Asset, onProgress: (finish: number, total: number, item?: cc.AssetManager.RequestItem) => void, onComplete: (error: Error, assets: cc.Asset[]) => void) {
		cc.assetManager.resources.loadDir(path, type, onProgress, onComplete);
	}

	/**从缓存的分包中加载资源 */
	public getDataFromBundle(bundleName: string, path: string, type: typeof cc.Asset, onComplete: (error: Error, assets: cc.Asset) => void): void {
		let bundle: cc.AssetManager.Bundle = Manager.CacheManager.getcacheRes(bundleName);
		if (bundle) {
			bundle.load(path, type, null, onComplete);
		} else {
			this.loadBundle(bundleName, ()=>{
				this.getDataFromBundle(bundleName, path, type, onComplete);
			});
		}
	}

	/**
	 * 预加载config配置资源
	 * @param bundleName 包类别
	 * @param progress 进度
	 * @param endcall 完成回调
	 * @param ResEnum 资源路径
	 * @param ResList 资源类型
	 */
	public perLoadConfigRes(bundleName: string, progress: (ncount: number, ntotal: number) => void ,endcall: () => void, ResList: assetData[]): void {
		let total: number = ResList.length;
		let count: number = 0;

		if (total == 0) {
			progress(1, 1);
			if (endcall) endcall();
			return;
		}

		ResList.forEach((data) => {
			if (Manager.CacheManager.getcacheRes(bundleName + '/' + data.path)) {
				// 如果资源已缓存，则更新进度并检查是否完成所有资源的处理
				count++;
				if (count == total && endcall) {
					progress(count, total);
					endcall();
				}
			} else {
				switch (bundleName) {
					case Macro.resources:
						this.getDataFromResources(data.path, data.type, (error: Error, assets: cc.Asset) => {
							if (error) {
								console.error('资源异常', data.path);
								return;
							}
							Manager.CacheManager.setcacheRes(bundleName + '/' + data.path, assets);
							count++;
							progress(count, total);
							if (count === total && endcall) {
								endcall();
							}
						});
						break;
					default:
						this.getDataFromBundle(bundleName, data.path, data.type, (error: Error, assets: cc.Asset) => {
							if (error) {
								console.error('资源异常', data.path);
								return;
							}
							Manager.CacheManager.setcacheRes(bundleName + '/' + data.path, assets);
							count++;
							progress(count, total);
							if (count === total && endcall) {
								endcall();
							}
						});
						break;
				}
			}
		});
	}
	
	public static getInstance(): ResManager {
		if (ResManager.instance == null) {
			ResManager.instance = new ResManager();
		} 
		return ResManager.instance;
	}
}

