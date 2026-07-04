import { Manager } from "../../Framework";

// 用于动态加载自定义的资源到缓存中 (声乐,动效,图片)
export class CacheManager {
	public static instance: CacheManager = null;
	public cacheRes: Record<string, any> = {};

	private constructor() {
		CacheManager.instance = this;
	}

	public setcacheRes(path: string, asset: any): void {
		this.cacheRes[path] = asset;
	}

	public getcacheRes(path: string): any {
		return this.cacheRes[path];
	}

	public clearcacheRes(): void {
		for (let name in this.cacheRes) {
			Manager.LogMgr.log('[*' + this.cacheRes[name].name + ']该资源正在从缓存释放');
			delete this.cacheRes[name];
		}
	}
	
	public static getInstance(): CacheManager {
		if (CacheManager.instance == null) {
			CacheManager.instance = new CacheManager();
		} 
		return CacheManager.instance;
	}
}

