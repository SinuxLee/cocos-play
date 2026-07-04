import { Manager } from "../../Framework";
/**
 * jsb反射绑定类型 拉起的跨脚本函数必须为静态函数 (静态函数才支持反射机制)
 * jsb.reflection.callStaticMethod(包名 / 函数名 / 参数定义 / ...参数)
 * (入参配置) + 返回类型配置 如 (II)Z 表示入参为两个整型,返回一个布尔型
 */
export enum JsbParam {
    boolean = "Z",
    byte = "B",
    char = "C",
    short = "S",
    int = "I",
    long = "J",
    float = "F",
    double = "D",
    string = "Ljava/lang/String;",
    void = "V"
}

export class SdkMgr {
    public static instance: SdkMgr = null;
    private sdk_eventCall: Record<string, Function> = null;
    private constructor() {
        SdkMgr.instance = this;
        this.sdk_eventCall = {};
    }

    public addEventCall(name: string, func: Function): void {
        if(this.sdk_eventCall[name] != null) {
            Manager.LogMgr.Error(`${name} sdk管理器已注册该回调`);
            return;
        }
        this.sdk_eventCall[name] = func;
    }

    public removeEventCall(name: string, func: Function): void {
        if(this.sdk_eventCall[name] != null) {
            delete this.sdk_eventCall[name];
        }
    }
    
    public static getInstance(): SdkMgr {
        if (SdkMgr.instance == null) {
            SdkMgr.instance = new SdkMgr();
        } 
        return SdkMgr.instance;
    }
}