import { zipHistory } from "../Entry/EntryManager";

export class ConnectConfig {
    public static Instance: ConnectConfig;
    public ServerInfoList;                                               // 网络配置
    public GateUrl: string;                                              // 网关 Url
    public ChatServiceUrl: string;                                       // 聊天 Url
    public WebResUrl: string;                                            // 资源 Url
    public BackStageUrl: string;                                         // 后台 Url
    private ServerInfoListKey = 'ServerInfoList';
    public unzipData: Record<string, zipHistory>;
    private zipHistoryKey: string = 'zipHistory';
    private constructor() {
        ConnectConfig.Instance = this;
        this.unzipData = {};
    }

    /**缓存服务列表 */
    public saveServerInfoList(): void {
        const json = JSON.stringify(this.ServerInfoList);
        cc.sys.localStorage.setItem(this.ServerInfoListKey, json);
    }

    /** 更新网络配置 */
    public upDateServerInfoList(data): void {
        this.ServerInfoList = data;
        this.ServerInfoList.UsingServer = {
            GATE_INDEX: 0,
            CHAT_INDEX: 0,
            WEB_SERVICE_INDEX: 0,
            WEB_RES_INDEX: 0,
        };
        this.saveServerInfoList();
        // this.GateUrl = 'ws://192.168.100.16:6001/';
        this.GateUrl = this.ServerInfoList.GATE_LIST[this.ServerInfoList.UsingServer.GATE_INDEX];
        this.ChatServiceUrl = this.ServerInfoList.CHAT_LIST[this.ServerInfoList.UsingServer.CHAT_INDEX];
        this.WebResUrl = this.ServerInfoList.WEB_RES_LIST[this.ServerInfoList.UsingServer.WEB_RES_INDEX];
        this.BackStageUrl = this.ServerInfoList.WEB_SERVICE_LIST[this.ServerInfoList.UsingServer.WEB_SERVICE_INDEX];
    }

    /** 更换网关服务连接 */
    public changeGateIndex(): void {
        if (this.ServerInfoList.UsingServer.GATE_INDEX >= this.ServerInfoList.GATE_LIST.length - 1) {
            this.ServerInfoList.UsingServer.GATE_INDEX = 0;
        } else {
            this.ServerInfoList.UsingServer.GATE_INDEX++;
        }
        this.GateUrl = this.ServerInfoList.GATE_LIST[this.ServerInfoList.UsingServer.GATE_INDEX];
    }

    /** 更换聊天服务连接 */
    public changeChatIndex(): void {
        if (this.ServerInfoList.UsingServer.CHAT_INDEX >= this.ServerInfoList.CHAT_LIST.length - 1) {
            this.ServerInfoList.UsingServer.CHAT_INDEX = 0;
        } else {
            this.ServerInfoList.UsingServer.CHAT_INDEX++;
        }
        this.GateUrl = this.ServerInfoList.CHAT_LIST[this.ServerInfoList.UsingServer.CHAT_INDEX];
    }

    /** 更换后台服务连接 */
    public changeBackStageIndex(): void {
        if (this.ServerInfoList.UsingServer.WEB_SERVICE_INDEX >= this.ServerInfoList.WEB_SERVICE_LIST.length - 1) {
            this.ServerInfoList.UsingServer.WEB_SERVICE_INDEX = 0;
        } else {
            this.ServerInfoList.UsingServer.WEB_SERVICE_INDEX++;
        }
        this.BackStageUrl = this.ServerInfoList.WEB_SERVICE_LIST[this.ServerInfoList.UsingServer.WEB_SERVICE_INDEX];
    }

    /** 获取zip缓存记录 */
    public getZipSaveDataPaths(): void {
        let json = cc.sys.localStorage.getItem(this.zipHistoryKey);
        if (json != null) {
            this.unzipData = JSON.parse(json);
        }
    }

    /** 保存zip缓存记录 */
    public saveZipSaveDataPaths(bundleName: string, zipHistory: zipHistory): void {
        this.unzipData[bundleName] = zipHistory;
        const json = JSON.stringify(this.unzipData);
        cc.sys.localStorage.setItem(this.zipHistoryKey, json);
    }
    
    public static getInstance(): ConnectConfig {
        if (ConnectConfig.Instance == null) {
            return new ConnectConfig();
        } else {
            return ConnectConfig.Instance;
        }
    }
};