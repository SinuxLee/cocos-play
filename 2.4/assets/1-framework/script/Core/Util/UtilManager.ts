import { Manager } from "../../Framework";
import { md5 } from "../Third/md5/Md5";
export class UtilManager {
    public static instance: UtilManager;
    private constructor() {}
    public static getInstance(): UtilManager {
        if (UtilManager.instance == null) {
            UtilManager.instance = new UtilManager();
        } 
        return UtilManager.instance;
    }
    /** 随机生成8位数*/
    public generateRandom8DigitNumber() {
        return Math.floor(Math.random() * (99999999 - 10000000 + 1)) + 10000000;
    }
    /** 字节数据转字符串（UTF-8）*/
    public arrayBufferToString(buffer) {
        const uint8Array = new Uint8Array(buffer);
        let str = '';
        let i = 0;

        while (i < uint8Array.length) {
            let byte = uint8Array[i++];

            if (byte < 0x80) {
                // 单字节字符
                str += String.fromCharCode(byte);
            } else if ((byte & 0xe0) === 0xc0) {
                // 双字节字符
                const byte2 = uint8Array[i++];
                str += String.fromCharCode(((byte & 0x1f) << 6) | (byte2 & 0x3f));
            } else if ((byte & 0xf0) === 0xe0) {
                // 三字节字符
                const byte2 = uint8Array[i++];
                const byte3 = uint8Array[i++];
                str += String.fromCharCode(((byte & 0xf) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f));
            } else {
                 // 四字节字符
                const byte2 = uint8Array[i++];
                const byte3 = uint8Array[i++];
                const byte4 = uint8Array[i++];
                let codePoint = ((byte & 0x07) << 18) | ((byte2 & 0x3f) << 12) | ((byte3 & 0x3f) << 6) | (byte4 & 0x3f);

                // 将 UTF-32 编码的码点转换为 UTF-16 编码的字符
                if (codePoint < 0x10000) {
                    str += String.fromCharCode(codePoint);
                } else {
                    // 对于四字节字符，需要使用两个 UTF-16 代码单元表示
                    codePoint -= 0x10000;
                    str += String.fromCharCode(0xd800 | ((codePoint >> 10) & 0x3ff));
                    str += String.fromCharCode(0xdc00 | (codePoint & 0x3ff));
                }
            }
        }

        return str;
    }
    /** 数组切割分数 默认3个一组 */
    public splitList<T>(list: T[], maxGroupSize: number = 3): T[][] {
        const result: T[][] = [];
        for (let i = 0; i < list.length; i += maxGroupSize) {
            result.push(list.slice(i, i + maxGroupSize));
        }
        return result;
    }
    /** 计时触发事件*/
    public TimeCount(count: number, startcall: (secord: number) => void): number {
        //一秒执行一次
        let Timer = Manager.TimerManager.makeTimer(() => {
            count--;
            if (count <= 0) {
                Manager.TimerManager.clearTimer(Timer);
            }
            if (startcall) {
                startcall(count);
            }
        }, 1000, true);

        return Timer;
    }
    /** long转换位number类型 */
    public longToNumber(longObj) {
        // 如果高位（high）不为0，则表示数值超出了number的安全范围
        if (longObj.high !== 0) {
            console.warn("Warning: Converting a long where 'high' is not 0 will result in precision loss.");
        }
        // 直接返回 low 值。如果 high 为 0，这是安全的；如果不为 0，结果将不准确。
        return longObj.low;
    }
    /** 将json导出为object*/
    public JsonOjectParse(path, tableName?: string, IdName?: string, id?: number): any {
        let jsonAsset: cc.JsonAsset = <cc.JsonAsset>Manager.CacheManager.getcacheRes(path);
        if (tableName) {
            let list = jsonAsset.json[tableName];
            if (id && IdName) {
                for (let key in list) {
                    if (Object.prototype.hasOwnProperty.call(list, key)) {
                        let element = list[key];
                        if (element[IdName] == id) {
                            return element;
                        }
                    }
                }
            } else {
                return list;
            }
        } else {
            return jsonAsset;
        }
    }
    /** 范围随机数生成器 */
    public generateRandomNumber(min: number, max: number): number {
        if (min > max) {
            [min, max] = [max, min]; // 交换min和max的值，确保min <= max
        }
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    /** string转MD5 */
    public stringToMD5(input: string): string {
        return md5(input);
    }
    /** 时间戳转换倒计时 */
    public formatCountdown(timestamp: number): string {
        const now = Date.now();
        const remainingTime = timestamp - now;
        if (remainingTime <= 0) {
            return '已结束';
        }
        const days = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
        if (days > 0) {
            return `${days}天 ${hours}小时 ${minutes}分钟 ${seconds}秒`;
        } else {
            return `${hours}小时 ${minutes}分钟 ${seconds}秒`;
        }
    }
    /** 时间戳转年月日小时分钟秒 */
    public formatDateTime(timestamp: number): string {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = ('0' + (date.getMonth() + 1)).slice(-2); // 月份从 0 开始，需要加 1
        const day = ('0' + date.getDate()).slice(-2);
        const hours = ('0' + date.getHours()).slice(-2);
        const minutes = ('0' + date.getMinutes()).slice(-2);
        const seconds = ('0' + date.getSeconds()).slice(-2);
        return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
    }
    /** 秒数转天+小时+分+秒 */
    public formatSecTime(seconds: number): string {
        if (seconds < 0) return '0'; 
        const days = Math.floor(seconds / (24 * 3600));
        seconds %= 24 * 3600;
        const hours = Math.floor(seconds / 3600);
        seconds %= 3600;
        const minutes = Math.floor(seconds / 60);
        seconds %= 60;
    
        const parts = [];
        if (days > 0) {
            parts.push(`${days}Day`);
        }

        if (days > 0) {

        } else {
            if (hours > 0) {
                parts.push(`${hours}:`);
            }
            if (minutes > 0) {
                parts.push(`${minutes}:`);
            } else {
                if (parts.length > 0) parts.push(`00:`);
            }
            if (seconds > 0 || parts.length === 0) {
                parts.push(`${Math.ceil(seconds)}`);
            } else {
                parts.push(`00`);
            }
        }
        return parts.join('');
    }
    /** 毫秒数转天+小时+分+秒 */
    public formatSecTime_m(milliseconds: number): string {
        return this.formatSecTime(milliseconds / 1000);
    }
    /** 计算出时间戳到现在过去的秒数 */
    public getSecondsPastSince(timestamp: number, nowtime?: number): number {
        let time = new Date(timestamp).getTime();
        let now = new Date(nowtime).getTime();
        let difference = now - time;
        return Math.floor(difference / 1000); // 将毫秒转换为秒并返回
    }
    /** Base64解析函数 */
    public base64Decode(base64String: string): string {
        try {
            // 使用 atob 函数解码 Base64 字符串
            return decodeURIComponent(
                atob(base64String)
                .split("")
                .map(function (c) {
                    return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
                })
                .join("")
            );
        } catch (e) {
            // 如果解码失败，可以抛出异常或返回错误信息
            console.error("Failed to decode Base64 string:", e);
            return ""; // 或者返回空字符串，根据实际需求决定
        }
    }
    /** 值映射*/
    public mapRange(value, fromLow, fromHigh, toLow, toHigh): number {
        // 计算原始范围内的值在 [0, 1] 范围内的比例
        let ratio = (value - fromLow) / (fromHigh - fromLow);
        
        // 判断目标范围是否是从大到小的
        if (toLow > toHigh) {
            // 反转比例
            ratio = 1 - ratio;
            // 交换 toLow 和 toHigh
            [toLow, toHigh] = [toHigh, toLow];
        }
        
        // 将比例应用到目标范围，并返回结果
        return toLow + ratio * (toHigh - toLow);
    }
    /** 校验邮箱格式的函数 */
    public validateEmail(email: string): boolean {
        // 定义用于邮箱格式校验的正则表达式
        const regEmail = /^([a-zA-Z0-9_-])+@([a-zA-Z0-9_-])+(\.[a-zA-Z0-9_-])+/
        // 测试邮箱字符串是否符合正则表达式
        return regEmail.test(email);
    }
    /** 根据国际区号对手机号进行格式校验 */
    public validatePhoneNumberByCountryCode(phoneNumber: string, countryCode: string): boolean {
        // 国家代码和手机号格式校验正则表达式的映射关系
        const phoneRegexByCountryCode: Record<string, RegExp> = {
            "244": /^\+2449\d{8}$/,
            "93": /^\+93\d{9}$/,
            "355": /^\+355\d{8,9}$/,
            "213": /^\+213\d{9}$/,
            "376": /^\+376\d{6}$/,
            "1264": /^\+1264\d{7}$/,
            "1268": /^\+1268\d{7}$/,
            "54": /^\+54\d{10}$/,
            "374": /^\+374\d{8}$/,
            "247": /^\+247\d{5}$/,
            "61": /^\+61\d{9}$/,
            "43": /^\+43\d{10}$/,
            "994": /^\+994\d{9}$/,
            "1242": /^\+1242\d{7}$/,
            "973": /^\+973\d{7}$/,
            "880": /^\+880\d{10}$/,
            "1246": /^\+1246\d{7}$/,
            "375": /^\+375\d{9}$/,
            "32": /^\+32\d{9}$/,
            "501": /^\+501\d{7}$/,
            "229": /^\+229\d{7}$/,
            "1441": /^\+1441\d{7}$/,
            "591": /^\+591\d{7,8}$/,
            "267": /^\+267\d{7}$/,
            "55": /^\+55\d{11}$/,
            "673": /^\+673\d{6}$/,
            "359": /^\+359\d{9}$/,
            "226": /^\+226\d{7}$/,
            "95": /^\+95\d{8,9}$/,
            "257": /^\+257\d{7}$/,
            "237": /^\+237\d{8}$/,
            "1": /^\+1\d{10}$/,
            "1345": /^\+1345\d{7}$/,
            "236": /^\+236\d{8}$/,
            "235": /^\+235\d{8}$/,
            "56": /^\+56\d{9}$/,
            "86": /^\+86\d{11}$/,
            "57": /^\+57\d{10}$/,
            "242": /^\+242\d{9}$/,
            "682": /^\+682\d{4}$/,
            "506": /^\+506\d{8}$/,
            "53": /^\+53\d{8}$/,
            "357": /^\+357\d{8}$/,
            "420": /^\+420\d{9}$/,
            "45": /^\+45\d{8}$/,
            "253": /^\+253\d{6}$/,
            "1890": /^\+1890\d{7}$/,
            "593": /^\+593\d{9}$/,
            "20": /^\+20\d{9}$/,
            "503": /^\+503\d{8}$/,
            "372": /^\+372\d{7}$/,
            "251": /^\+251\d{9}$/,
            "679": /^\+679\d{7}$/,
            "358": /^\+358\d{9}$/,
            "33": /^\+33\d{9}$/,
            "594": /^\+594\d{9}$/,
            "241": /^\+241\d{6}$/,
            "220": /^\+220\d{7}$/,
            "995": /^\+995\d{9}$/,
            "49": /^\+49\d{11}$/,
            "233": /^\+233\d{9}$/,
            "350": /^\+350\d{8}$/,
            "30": /^\+30\d{10}$/,
            "1809": /^\+1809\d{7}$/,
            "1671": /^\+1671\d{7}$/,
            "502": /^\+502\d{8}$/,
            "224": /^\+224\d{8}$/,
            "592": /^\+592\d{7}$/,
            "509": /^\+509\d{8}$/,
            "504": /^\+504\d{8}$/,
            "852": /^\+852\d{8}$/,
            "36": /^\+36\d{8}$/,
            "354": /^\+354\d{7}$/,
            "91": /^\+91\d{10}$/,
            "62": /^\+62\d{9,12}$/,
            "98": /^\+98\d{9,10}$/,
            "964": /^\+964\d{10}$/,
            "353": /^\+353\d{9}$/,
            "972": /^\+972\d{9}$/,
            "39": /^\+39\d{10}$/,
            "225": /^\+225\d{8}$/,
            "1876": /^\+1876\d{7}$/,
            "81": /^\+81\d{10}$/,
            "962": /^\+962\d{9}$/,
            "855": /^\+855\d{8,9}$/,
            "327": /^\+327\d{9}$/,
            "254": /^\+254\d{9}$/,
            "82": /^\+82\d{9,10}$/,
            "965": /^\+965\d{8}$/,
            "331": /^\+331\d{8}$/,
            "856": /^\+856\d{8,9}$/,
            "371": /^\+371\d{8}$/,
            "961": /^\+961\d{7,8}$/,
            "266": /^\+266\d{8}$/,
            "231": /^\+231\d{7}$/,
            "218": /^\+218\d{9}$/,
            "423": /^\+423\d{7}$/,
            "370": /^\+370\d{8}$/,
            "352": /^\+352\d{8}$/,
            "853": /^\+853\d{8}$/,
            "261": /^\+261\d{9}$/,
            "265": /^\+265\d{7}$/,
            "60": /^\+60\d{9,10}$/,
            "960": /^\+960\d{7}$/,
            "223": /^\+223\d{8}$/,
            "356": /^\+356\d{8}$/,
            "1670": /^\+1670\d{7}$/,
            "596": /^\+596\d{9}$/,
            "230": /^\+230\d{7}$/,
            "52": /^\+52\d{10}$/,
            "373": /^\+373\d{7}$/,
            "377": /^\+377\d{8}$/,
            "976": /^\+976\d{8}$/,
            "1664": /^\+1664\d{7}$/,
            "212": /^\+212\d{9}$/,
            "258": /^\+258\d{9}$/,
            "264": /^\+264\d{9}$/,
            "674": /^\+674\d{5}$/,
            "977": /^\+977\d{9}$/,
            "599": /^\+599\d{7}$/,
            "31": /^\+31\d{9}$/,
            "64": /^\+64\d{9}$/,
            "505": /^\+505\d{8}$/,
            "227": /^\+227\d{8}$/,
            "234": /^\+234\d{10}$/,
            "850": /^\+850\d{8}$/,
            "47": /^\+47\d{8}$/,
            "968": /^\+968\d{8}$/,
            "92": /^\+92\d{10}$/,
            "507": /^\+507\d{7}$/,
            "675": /^\+675\d{9}$/,
            "595": /^\+595\d{8}$/,
            "51": /^\+51\d{9}$/,
            "63": /^\+63\d{10}$/,
            "48": /^\+48\d{9}$/,
            "689": /^\+689\d{6}$/,
            "351": /^\+351\d{9}$/,
            "1787": /^\+1787\d{7}$/,
            "974": /^\+974\d{7}$/,
            "262": /^\+262\d{9}$/,
            "40": /^\+40\d{9}$/,
            "7": /^\+7\d{10}$/,
            "1758": /^\+1758\d{7}$/,
            "1784": /^\+1784\d{7}$/,
            "684": /^\+684\d{7}$/,
            "685": /^\+685\d{7}$/,
            "378": /^\+378\d{6}$/,
            "239": /^\+239\d{7}$/,
            "966": /^\+966\d{9}$/,
            "221": /^\+221\d{9}$/,
            "248": /^\+248\d{7}$/,
            "232": /^\+232\d{8}$/,
            "65": /^\+65\d{8}$/,
            "421": /^\+421\d{9}$/,
            "386": /^\+386\d{8}$/,
            "677": /^\+677\d{5}$/,
            "252": /^\+252\d{7}$/,
            "27": /^\+27\d{9}$/,
            "34": /^\+34\d{9}$/,
            "94": /^\+94\d{9}$/,
            "249": /^\+249\d{9}$/,
            "597": /^\+597\d{7}$/,
            "268": /^\+268\d{7}$/,
            "46": /^\+46\d{9}$/,
            "41": /^\+41\d{9}$/,
            "963": /^\+963\d{9}$/,
            "886": /^\+886\d{9}$/,
            "992": /^\+992\d{9}$/,
            "255": /^\+255\d{9}$/,
            "66": /^\+66\d{9}$/,
            "228": /^\+228\d{8}$/,
            "676": /^\+676\d{5}$/,
            "216": /^\+216\d{8}$/,
            "90": /^\+90\d{10}$/,
            "993": /^\+993\d{8}$/,
            "256": /^\+256\d{9}$/,
            "380": /^\+380\d{9}$/,
            "971": /^\+971\d{9}$/,
            "44": /^\+44\d{10,11}$/,
            "598": /^\+598\d{8}$/,
            "58": /^\+58\d{10}$/,
            "84": /^\+84\d{9}$/,
            "967": /^\+967\d{9}$/,
            "381": /^\+381\d{8,9}$/,
            "263": /^\+263\d{9}$/,
            "243": /^\+243\d{9}$/,
            "260": /^\+260\d{9}$/,
        };
        const regex = phoneRegexByCountryCode[countryCode];
        if (regex) {
            return regex.test(`+${countryCode}${phoneNumber}`);
        } else {
            return false;
        }
    }
    /** 密码格式校验 */
    public validatePassword(password: string): boolean {
        // 检查密码长度
        if (password.length < 6 || password.length > 50) {
            return false;
        }
        
        // 检查密码是否包含不允许的字符
        const regex = /^[0-9a-zA-Z@#$]+$/;
        if (!regex.test(password)) {
            return false;
        }

        // 密码格式符合要求
        return true;
    }
    /** base64转uint8Array */
    public base64ToUint8Array(base64String): Uint8Array {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
                .replace(/\-/g, '+')
                .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
    /** uint8Array转base64 */
    public arrayBufferToBase64(buffer): string {
        var binary = '';
        var bytes = new Uint8Array(buffer);
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
              binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
    /** 货币转K或M 为计量单位 */
    public CurrencyConversionKorM(value: number | string): string {
        let s: string[] = value.toString().split('.');
        let mi = `${s[1] == null ? '' : `.${s[1]}`}`;
        let str = null;
        let temp = null;
        if (s[0].length > 0 && s[0].length <= 3) { //百位
            temp = Number(s[0]);
            str = `${temp}${mi}`;
        } else if (s[0].length > 3 && s[0].length <= 6) {//千位
            temp = Number(s[0]) / 1000;
            str = `${temp}K`;
        } else if (s[0].length > 6 && s[0].length <= 9){ //万位
            temp = Number(s[0]) / 1000000;
            str = `${temp}M`;
        } else{
            temp = Number(s[0]) / 1000000000; //千万
            str = `${temp}B`;
        }
        return str;
    }
    /** 三位分割 */
    public formatStringInterval(str: string | number): string {
        let s = str.toString().split('.');
        return s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')  + `${s[1] == null ? '' : `,${s[1]}`}`;
    }
}