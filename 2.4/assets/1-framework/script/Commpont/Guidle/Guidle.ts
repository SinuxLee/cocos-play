import { TutorialTask } from "../../Core/TaskQueue/TaskManager";
import { Manager } from "../../Framework";

// 点击监听任务
export class ClickListenerTask implements TutorialTask {
    constructor(private targetNode: cc.Node) { }

    execute(completeCallback: () => void) {
        // 注册 确认点击订阅
        Manager.EventManager.add("sure_click", completeCallback, this);

        Manager.LogMgr.log("please click btn!");
        this.targetNode.once('click', () => {
            Manager.LogMgr.log("Node clicked:", this.targetNode.name);
        });
    }
}

// 提示监听任务
export class TipListenerTask implements TutorialTask {
    execute(completeCallback: () => void) {
        Manager.LogMgr.log("click success! This is a TipTask!");
        completeCallback();
    }
}

export class TestTask implements TutorialTask {
    constructor(private func: Function) {
        this.func();
    };

    execute(completeCallback: () => void) {
        completeCallback();
    }
}