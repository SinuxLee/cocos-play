// 定义引导任务接口
export interface TutorialTask {
    execute(completeCallback: () => void): void;
}

// 队列管理器
export class TaskManager {
    public static instance: TaskManager = null;
    private queue: TutorialTask[] = [];
    private isTaskRunning = false;

    private constructor() {
        TaskManager.instance = this;
    }

    clear() {
        this.queue = [];
        this.isTaskRunning = false;
    }

    /** 接口实现*/
    enqueue(task: TutorialTask) {
        this.queue.push(task);
        this.checkAndExecuteNext();
    }

    /** 任务扫描 (递归)*/
    private checkAndExecuteNext() {
        if (!this.isTaskRunning && this.queue.length > 0) {
            this.isTaskRunning = true;
            const task = this.queue.shift();
            task.execute(() => {
                this.isTaskRunning = false;
                this.checkAndExecuteNext();
            });
        }
    }
    
    public static getInstance(): TaskManager {
        if (TaskManager.instance == null) {
            TaskManager.instance = new TaskManager();
        } 
        return TaskManager.instance;
    }
}
