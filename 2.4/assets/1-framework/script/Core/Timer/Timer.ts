interface timerData {
    timerId: any,
    loop: boolean
}
export class Timer {
    public static instance: Timer = null;
    private count_timer: Record<number, timerData> = {};
    private startcount: number = 0;

    private constructor() {
        Timer.instance = this;
    }

    public makeTimer(call: Function, reflashTime: number, loop: boolean): number {
        const timerId = ++this.startcount;
        let wrappedCall = () => {
            if (!this.count_timer[timerId]) return;
            call();
        };

        if (loop) {
            this.count_timer[timerId] = { timerId: setInterval(wrappedCall, reflashTime), loop: true };
        } else {
            this.count_timer[timerId] = { timerId: setTimeout(wrappedCall, reflashTime), loop: false };
        }

        return timerId;
    }

    public clearTimer(timerId: number): void {
        if (!timerId) return;

        const timerEntry = this.count_timer[timerId];
        if (!timerEntry) return;
        
        if (timerEntry.loop) {
            clearInterval(timerEntry.timerId);
        } else {
            clearTimeout(timerEntry.timerId);
        }
        delete this.count_timer[timerId];
    }

    public closeAllTimers(): void {
        Object.keys(this.count_timer).forEach((timerId) => {
            const timerEntry = this.count_timer[timerId];
            if (!timerEntry) return;

            if (timerEntry.loop) {
                clearInterval(timerEntry.timerId);
            } else {
                clearTimeout(timerEntry.timerId);
            }
            delete this.count_timer[timerId];
        });
    }

    public static getInstance(): Timer {
        if (Timer.instance == null) Timer.instance = new Timer();
        return Timer.instance;
    }
}
