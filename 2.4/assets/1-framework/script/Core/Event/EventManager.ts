type eventData = {
    function: Function,
    object: Object,
}

export class EventManager {
    public static instance: EventManager = null;
    private eventMap: Map<string | number, eventData[]> = new Map();

    private constructor() {
        EventManager.instance = this;
    }

    /**
     * 事件注册
     * @param name 事件名 
     * @param call 回调函数
     * @param target 目标对象
     */
    public add(name: string | number, call: Function, target: Object): void {
        let listeners = this.eventMap.get(name) || [];
        // 检查是否已经注册过相同的回调和目标
        const index = listeners.findIndex(listener => listener.function === call && listener.object === target);
        if (index === -1) {
            listeners.push({ function: call, object: target });
            this.eventMap.set(name, listeners);
        }
    }

    /**
     * 注销事件
     * @param name 事件名
     * @param target 目标对象
     */
    public remove(name: string | number, call: Function, target: Object): void {
        let listeners = this.eventMap.get(name);
        if (listeners) {
            // 逆向遍历以安全移除元素
            for (let i = listeners.length - 1; i >= 0; i--) {
                if (listeners[i].object === target && listeners[i].function === call) {
                    listeners.splice(i, 1);
                }
            }
            // 如果监听器列表为空，从map中删除该事件
            if (listeners.length === 0) {
                this.eventMap.delete(name);
            } else {
                this.eventMap.set(name, listeners);
            }
        }
    }


    /**
     * 事件派发
     * @param name 事件名
     * @param args 参数
     */
    public dispatch(name: string | number, ...args: any[]): void {
        let listeners = this.eventMap.get(name);
        if (listeners) {
            listeners.forEach(listener => {
                listener.function.apply(listener.object, args);
            });
        }
    }
    
    public static getInstance(): EventManager {
        if (EventManager.instance == null) {
            EventManager.instance = new EventManager();
        } 
        return EventManager.instance;
    }
}
