export class HttpSrverManager{
    public static instance: HttpSrverManager = null;
    private constructor() {
        HttpSrverManager.instance = this;
    }

    /***
     * 请求表单
     * @param url 请求地址
     * @param data 请求数据
     */
    public async postData(url: string, head: any, body: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url);
            // 设置请求头
            for (const key in head) {
                if (head.hasOwnProperty(key)) {
                    xhr.setRequestHeader(key, head[key]);
                }
            }
            xhr.setRequestHeader('Content-Type', 'application/json');
            
            // 监听请求完成事件
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    // 请求成功
                    try {
                        const responseData = JSON.parse(xhr.responseText);
                        resolve(responseData);
                    } catch (error) {
                        reject(new Error('Failed to parse response JSON'));
                    }
                } else {
                    // 请求失败
                    reject(new Error('Network response was not ok'));
                }
            };
    
            // 监听网络错误事件
            xhr.onerror = () => {
                reject(new Error('Network request failed'));
            };
    
            // 发送请求
            xhr.send(JSON.stringify(body));
        });
    }

    /**ping测试 */
    public ping(url: string, callback: (pingTime: number) => void): void {
        const startTime = Date.now();
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status === 200) {
                const endTime = Date.now();
                const pingTime = endTime - startTime;
                callback(pingTime);
            } else {
                callback(-1);
            }
        };
        xhr.send();
    }
    
    public static getInstance(): HttpSrverManager {
        if (HttpSrverManager.instance == null) {
            HttpSrverManager.instance = new HttpSrverManager();
        } 
        return HttpSrverManager.instance;
    }
}