import { Manager } from "../../Framework";
export enum LangEvents {
    setSysLang = "setSysLang",
}
export enum LanuageConfig {
    langConfig = "json/langConfig",
}
type lang = {
    name: string,
    zh: string,
    en: string,
}

export class LocalizationManager {
    public static instance: LocalizationManager = null;
    public _currentLanguage: string = null;
    private languageData: lang[] = null;
    private keyData: Record<string, cc.Node[]> = null;
    private constructor() {
        LocalizationManager.instance = this;
        this.keyData = {};
        this._currentLanguage = cc.sys.localStorage.getItem('language');
        if (this._currentLanguage == null) this._currentLanguage = 'en';
    }

    /**设置当前语言*/
    public setLanguage(language: string): void {
        if (this.languageData) {
            this._currentLanguage = language;
            cc.sys.localStorage.setItem('language', this._currentLanguage);
            this.RefreshSceneLanguage();
            Manager.EventManager.dispatch(LangEvents.setSysLang);
        } else {
            cc.assetManager.resources.load(LanuageConfig.langConfig, cc.JsonAsset, null, (e, a) => {
                if (!a || e) {
                    cc.error(`${language} 该语言不存在!`);
                    return;
                }
                this.languageData = (<cc.JsonAsset>a).json['Sheet1'] as lang[];
                this._currentLanguage = language;
                cc.sys.localStorage.setItem('language', this._currentLanguage);
                this.RefreshSceneLanguage();
            });
        }
    }

    /**获取当前语言*/
    public getLanguage(): string {
        return this._currentLanguage;
    }

    /**获取翻译文本*/
    public getText(key: string): string {
        if (this.languageData) {
            let str = key.split('Poker.')[1];
            if (!str) return null;
            let dd = this.languageData.filter(data => data.name == str)[0];
            return dd == undefined ? null : dd[this._currentLanguage];
        }
    }

    /**场景中所有文本节点的语言*/
    public updateSceneLanguage(Node: cc.Node): void {
        if (!Node) return;
        const labels = Node.getComponentsInChildren(cc.Label);
        labels.forEach((label) => {
            // 假设label节点的name与languageData的key相同
            let str = this.getText(label.string);
            if (str) {
                if (!this.keyData[label.string]) this.keyData[label.string] = [];
                this.keyData[label.string].push(label.node);
                label.string = this.getText(label.string);
            }
        });
        // const RichTexts = Node.getComponentsInChildren(cc.RichText);
        // RichTexts.forEach((label) => {
        //     // 假设label节点的name与languageData的key相同
        //     let str = this.getText(label.string);
        //     if (str) {
        //         if (!this.keyData[label.string]) this.keyData[label.string] = [];
        //         this.keyData[label.string].push(label.node);
        //         label.string = this.getText(label.string);
        //     }
        // });
    }

    /**刷新当前节点语言 */
    public RefreshSceneLanguage(): void {
        this.updateSceneLanguage(cc.Canvas.instance.node);
        let keys = Object.keys(this.keyData);
        Object.values(this.keyData).forEach((nodes: cc.Node[], Index) => {
            nodes.forEach((node) => {
                if (node.parent && node.getComponent(cc.Label)) {
                    node.getComponent(cc.Label).string = this.getText(keys[Index]);
                }
                // if (node.parent && node.getComponent(cc.RichText)) {
                //     node.getComponent(cc.RichText).string = this.getText(keys[Index]);
                // }
            });
        });
    }

    public static getInstance(): LocalizationManager {
        if (LocalizationManager.instance == null) {
            LocalizationManager.instance = new LocalizationManager();
        }
        return LocalizationManager.instance;
    }
}