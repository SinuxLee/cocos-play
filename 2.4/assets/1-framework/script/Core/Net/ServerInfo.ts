/**通信包数据头结构*/
export interface HeadInfo {
    wSign: number;
    wLen : number;
    wCtrl: number;
    wMsgId: number;
    wParam: number;
    wnAttach: number;
    wCheckSum: number;
}

/**
 * 创建一个通信包数据头 结构
 * @param wSign 
 * @param wCtrl 
 * @param wMsgId 事件id
 * @param wParam data标识 json OR ArrayBuffer 解析时用于判断
 * @param wLen 数据头+数据体的·长度， send函数会自动计算，无需设置
 * @param wCheckSum 用于校验
 * 
    // bool sendJson(
    //     int wMsgId,
    //     int wCtrl,
    //     int nParam,
    //     int nAttach,
    //     dynamic json,
    // )
 */
export function makeHeadInfoNil(
    wSign: number = 0x55aa, 
    wLen: number = 0, 
    wCtrl: number = 0, 
    wMsgId: number = 0, 
    wParam: number = 0, 
    wnAttach: number = 0, 
    wCheckSum: number = 0): HeadInfo {
        
    return {
        wSign,
        wLen,
        wCtrl,
        wMsgId,
        wParam,
        wnAttach,
        wCheckSum
    };
}