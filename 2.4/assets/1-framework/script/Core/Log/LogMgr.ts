/**日志类型 */
export enum LogType {
    Debug = 1 << 0,  // 00000001 调试日志
    Info = 1 << 1,   // 00000010 信息日志
    Warning = 1 << 2,// 00000100 警告日志
    Error = 1 << 3,  // 00001000 错误日志
    Fatal = 1 << 4,  // 00010000 致命错误日志
    Trace = 1 << 5,  // 00100000 追踪日志
    Event = 1 << 6   // 01000000 事件日志
}

/**日志管理器 */
export class LogMgr {
    public static instance: LogMgr = null;
    private logLevel: number = null;
    private constructor() {
        LogMgr.instance = this;
        // 初始化时启用所有日志类型
        this.logLevel = LogType.Debug | LogType.Info | LogType.Warning | LogType.Error | LogType.Fatal | LogType.Trace | LogType.Event;
    }

    /**启动所有日志类型 */
    public enableLogAll(): void {
        this.logLevel = LogType.Debug | LogType.Info | LogType.Warning | LogType.Error | LogType.Fatal | LogType.Trace | LogType.Event;
    }

    /**禁用所有日志类型 */
    public disenableLogAll(): void {
        this.logLevel = 0;
    }

    /**启用某个日志类型*/
    public enableLogType(type: LogType): void {
        this.logLevel |= type;
    }

    /**禁用某个日志类型*/
    public disableLogType(type: LogType): void {
        this.logLevel |= type;
    }

    /**检查某个日志类型是否启用*/
    private isLogTypeEnabled(type: LogType): boolean {
        return (this.logLevel & type) !== 0;
    }

    public log(...args): void {
        if (this.isLogTypeEnabled(LogType.Info)) {
            console.info(...args);
        }
    }

    public Debug(...args): void {
        if (this.isLogTypeEnabled(LogType.Info)) {
            console.debug(...args);
        }
    }
    public Warning(...args): void {
        if (this.isLogTypeEnabled(LogType.Warning)) {
            console.warn(...args);
        }
    }

    public Error(...args): void {
        if (this.isLogTypeEnabled(LogType.Error)) {
            console.error(...args);
        }
    }

    public Fatal(...args): void {
        if (this.isLogTypeEnabled(LogType.Fatal)) {
            console.error(`Fatal:`, ...args);
        }
    }

    public Trace(...args): void {
        if (this.isLogTypeEnabled(LogType.Trace)) {
            console.trace(...args);
        }
    }

    public Event(...args): void {
        if (this.isLogTypeEnabled(LogType.Event)) {
            console.info(`Event:`, ...args);
        }
    }

    public static getInstance(): LogMgr {
        if (LogMgr.instance == null) {
            LogMgr.instance = new LogMgr();
        }
        return LogMgr.instance;
    }
}
