import { FrameworkEvent, Manager } from "../../Framework";
import { HeadInfo, makeHeadInfoNil } from "./ServerInfo";

/**网关服务 */
class GateService {
    private socket: WebSocket = null;
    private retry_timer: number = null;
    public ping: number = null;
    public heartSendTime: number = null;
    constructor() {
        this.heartSendTime = 100;
        this.retry_timer = 3;
    }
    
    /**连接ws服务器 */
    public connectWebSocket(wsUrl: string) {
        // 创建一个WebSocket连接
        if (cc.sys.isNative && cc.sys.os == cc.sys.OS_ANDROID) {
            if (cc.loader.md5Pipe) {
                let cacert = cc.url.raw('resources/ssl/cacert.pem');
                cacert = cc.loader.md5Pipe.transformURL(cacert);
                //@ts-ignore
                this.socket = new WebSocket(wsUrl, null, cacert);
                this.socket.onopen = this.onOpen.bind(this);
                this.socket.onmessage = this.onMessage.bind(this);
                this.socket.onerror = this.onError.bind(this);
                this.socket.onclose = this.onClose.bind(this);
            }
        } else {
            this.socket = new WebSocket(wsUrl);
            this.socket.onopen = this.onOpen.bind(this);
            this.socket.onmessage = this.onMessage.bind(this);
            this.socket.onerror = this.onError.bind(this);
            this.socket.onclose = this.onClose.bind(this);
        }
    }

    /**ping服务器*/
    public ReqPingWsServer(): void {
        // 序列化消息
        let head = makeHeadInfoNil();
        head.wMsgId = 1003;
        let data = null;
        // 发送序列化后的消息
        Manager.WebSocketManager.SendToGate(head, data);
    }

    /**开启心跳 */
    private openHeart(): void {
        this.ReqPingWsServer();
        this.heartSendTime = Date.now();
        Manager.TimerManager.makeTimer(() => {
            //心跳请求
            this.ReqPingWsServer();
            this.heartSendTime = Date.now();
        }, 5000, true);
    }

    /**请求断开websocket */
    private ReqLoginOut(): void {
        let head = makeHeadInfoNil();
        head.wMsgId = 1004;
        let data = null;
        Manager.WebSocketManager.SendToGate(head, data);
    }

    /**连接成功*/
    private onOpen(event): void {
        Manager.LogMgr.log("网关服务器已连接.");
        //重置重连次数
        this.retry_timer = 3;
        //连接打开后，开启心跳
        this.openHeart();
    }

    /**数据接收*/
    private onMessage(event): void {
        // Manager.LogMgr.log("收到服务器数据");
        if (event.data instanceof ArrayBuffer) {
            // Manager.LogMgr.log('字节流');
            parseMessage(event.data);
        } else if (event.data instanceof Blob) {
            // Manager.LogMgr.log('blob流');
            let reader = new FileReader();
            reader.onload = () => {
                if (reader.result) {
                    // Manager.LogMgr.log("解析出blob");
                    parseMessage(reader.result as ArrayBufferLike);
                } else {
                    console.error("读取结果为空");
                }
            };
            reader.onerror = (error) => {
                console.error("FileReader 读取错误", error);
            };
            reader.readAsArrayBuffer(event.data);
        } 

        /**解析消息 */
        function parseMessage(arrayBufferLike: ArrayBufferLike): void {
            //解析数据头
            let wSign = new Uint16Array(arrayBufferLike, 0, 1);        //2byte
            let wLen = new Uint16Array(arrayBufferLike, 2, 1);
            let wCtrl = new Uint16Array(arrayBufferLike, 4, 1);
            let wMsgId = new Uint16Array(arrayBufferLike, 6, 1);       //MSG ID
            let wParam = new Uint32Array(arrayBufferLike, 8, 1);       //data标识 json OR ArrayBuffer
            let wnAttach = new Uint32Array(arrayBufferLike, 12, 1);
            let wCheckSum = new Uint32Array(arrayBufferLike, 16, 1);
            
            let head = makeHeadInfoNil();
            head.wSign = wSign[0];
            head.wLen = wLen[0];
            head.wCtrl = wCtrl[0];
            head.wMsgId = wMsgId[0];
            head.wParam = wParam[0];
            head.wnAttach = wnAttach[0];
            head.wCheckSum = wCheckSum[0];
            
            // 解析包体
            let jsonArray = new Uint8Array(arrayBufferLike, 20, arrayBufferLike.byteLength - 20);
            let json = null;
            if (wLen[0] > 0) {
                json = JSON.parse(Manager.UtilManager.arrayBufferToString(jsonArray));
            }
    
            // 事件派发
            Manager.EventManager.dispatch(wMsgId[0].toString(), json, head);
        }
    }

    /**主动断开连接 */
    public closeSocket(): void {
        Manager.TimerManager.closeAllTimers();
        console.error('已请求主动断开网关连接');
        this.ReqLoginOut();
        this.socket.onopen = null;
        this.socket.onmessage = null;
        this.socket.onerror = null;
        this.socket.onclose = null;
        this.socket = null;
    }

    /**监听WebSocket的错误事件*/
    private onError(event): void {
        Manager.TimerManager.closeAllTimers();
        console.error("网关服务异常", event.error);
        if (this.retry_timer != null) {
            this.retry_timer--;
        }
    }

    /**监听WebSocket的关闭事件*/
    private onClose(event): void {
        Manager.TimerManager.closeAllTimers();
        console.error("网关服务主动断开", event.error);
        this.retry();
    }

    /**重连尝试 */
    private retry(): void {
        if (this.retry_timer > 0) {
            Manager.LogMgr.log('网络已断开!\n正在尝试重新连接...');
            Manager.TimerManager.makeTimer(() => {
                this.closeSocket();
                this.connectWebSocket(Manager.ConnectConfig.GateUrl);
            }, 3000, false);
        } else {
            Manager.EventManager.dispatch(FrameworkEvent.SERVICE_OVER);
            Manager.LogMgr.Error('连接超时，重置连接中');
            this.retry_timer = 3;
            Manager.ConnectConfig.changeGateIndex(); //尝试更换网络连接
            this.retry();
        }
    }

    /**
     * 发送数据
     * @param head 数据头 
     * @param data 数据体
     * @returns 发送状态 true/false
     */
    public send(head: HeadInfo, data: any): boolean {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            // 假设消息ID、控制信息等都是16位整数，可以根据实际情况调整
            let wSign = head.wSign;
            let wLen = head?.wLen;
            let wCtrl = head.wCtrl;    //serverid
            let wMsgId = head.wMsgId;
            let wParam = head.wParam;  // data标识 json OR ArrayBuffer
            let wnAttach = head.wnAttach;
            let wCheckSum = head.wCheckSum;
            
            // data转json转buffer
            let jsonBufferLen = 0;
            let jsonBuffer = null;
            if (data) {
                let d = JSON.stringify(data);
                jsonBuffer = new SimpleTextEncoder().encode(d);
                jsonBufferLen = jsonBuffer.length;
            }
            
            // 计算head + data的数据长度
            wLen = 20 + jsonBufferLen;  // 7个头部元素
            // 根据长度创建ArrayBuffer
            let arrayBuffer = new ArrayBuffer(wLen);
            // 创建DataView用于写入数据
            let dataView = new DataView(arrayBuffer);
            
            // 写入头数据，注意字节偏移量
            dataView.setUint32(0, wSign, true); 
            dataView.setUint32(2, jsonBufferLen, true); 
            dataView.setUint32(4, wCtrl, true); 
            dataView.setUint32(6, wMsgId, true); 
            dataView.setUint32(8, wParam, true);
            dataView.setUint32(12, wnAttach, true);
            dataView.setUint32(16, wCheckSum, true);
    
            // 写入data数据
            let bufferOffset = 20;  // 头部数据占20字节
            if (jsonBuffer) {
                jsonBuffer.forEach((byte, i) => {
                    dataView.setUint8(bufferOffset + i, byte);
                });
            }
    
            this.socket.send(arrayBuffer);
            return true;
        }
        return false;
    }
}

/**websocket管理器 */
export class wsManager {
    public static instance: wsManager = null;
    private GateService: GateService = null;
    public setPing(recvTime: number): void {
        this.GateService.ping = recvTime - this.GateService.heartSendTime;
    }
    public getPing(): number {
        return this.GateService.ping;
    }
    private constructor() {
        wsManager.instance = this;
    }
    /**连接网关 */
    public connectToGate(wsUrl: string): void {
        this.GateService = new GateService();
        this.GateService.connectWebSocket(wsUrl);
    }
    /**主动断开网关 */
    public disconnectGate(): void {
        if(!this.GateService)return;
        this.GateService.closeSocket();
    }
    /**发送至网关 */
    public SendToGate(head: HeadInfo, data: any): void {
        if (!this.GateService) return;
        //console.log("打印"+ head.wMsgId );
        this.GateService.send(head, data);
    }
    public static getInstance(): wsManager {
        if (wsManager.instance == null) {
            wsManager.instance = new wsManager();
        } 
        return wsManager.instance;
    }
}

/**string To ArrayBuffer */
export class SimpleTextEncoder {
    // UTF-8编码 => 二进制
    encode(str: string): Uint8Array {
        let utf8 = [];
        for (let i = 0; i < str.length; i++) {
            let charCode = str.charCodeAt(i);
            if (charCode < 0x80) {
                utf8.push(charCode);
            } else if (charCode < 0x800) {
                utf8.push(0xc0 | (charCode >> 6),
                          0x80 | (charCode & 0x3f));
            } else if (charCode < 0x10000) {
                utf8.push(0xe0 | (charCode >> 12),
                          0x80 | ((charCode >> 6) & 0x3f),
                          0x80 | (charCode & 0x3f));
            } else {
                utf8.push(0xf0 | (charCode >> 18),
                          0x80 | ((charCode >> 12) & 0x3f),
                          0x80 | ((charCode >> 6) & 0x3f),
                          0x80 | (charCode & 0x3f));
            }
        }
        return new Uint8Array(utf8);
    }
}