import { FrameworkEvent, Manager } from "../../Framework";
export enum BackStageStatus {
    SHOW,
    HIDE,
}

export class BackStageMgr {
    public static instance: BackStageMgr = null;
    private status: BackStageStatus = null;
    private constructor() {
        BackStageMgr.instance = this;
        this.status = BackStageStatus.SHOW;
    }

    public get Status(): BackStageStatus {
        return this.status;
    }

    Init(): void {
        cc.game.on(cc.game.EVENT_HIDE, this.Hide, this);
        cc.game.on(cc.game.EVENT_SHOW, this.Show, this);
    }

    Hide(): void {
        this.status = BackStageStatus.HIDE;
        Manager.LogMgr.log("===切换到后台===");
        Manager.EventManager.dispatch(FrameworkEvent.BACKSTAGE_CAHNGE_Hide);
    }

    Show(): void {
        this.status = BackStageStatus.SHOW;
        Manager.LogMgr.log("===切换到前台===");
        Manager.EventManager.dispatch(FrameworkEvent.BACKSTAGE_CAHNGE_Show);
    }

    public static getInstance(): BackStageMgr {
        if (!BackStageMgr.instance) BackStageMgr.instance = new BackStageMgr();
        return BackStageMgr.instance;
    }
}