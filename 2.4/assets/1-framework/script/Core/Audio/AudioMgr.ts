import { Manager } from "../../Framework";
import { Macro } from "../UI/UiManager";
export enum AudioClipType {
    Music,
    Effect
}

export enum AudioLocalType {
    Music = "music_audio_value",
    Effect = "effect_audio_value"
}

/** 音频管理器 */
export class AudioManager {
    public static instance: AudioManager = null;
    private playing_effect_list: Record<string, number> = null;

    private constructor() {
        AudioManager.instance = this;
        this.playing_effect_list = {};
    }

    /**
     * 播放背景音
     * @param bundle 分包路径
     * @param path 音频路径 
     * @param isloop 是否循环
     */
    public playBgMusic(bundle: string, path: string, isloop: boolean): void {
        const res_m = Manager.CacheManager.cacheRes[bundle + '/' + path] as cc.AudioClip;
        if (res_m) {
            this.playByType(res_m, AudioClipType.Music, isloop);
            return;
        }

        console.log(bundle + '/' + path, " 该音频未缓存, 加载会有延迟!");
        if (bundle == Macro.resources) {
            this.loadAudioFromResource(path, isloop, AudioClipType.Music);
        } else {
            this.loadAudioFromBundle(bundle, path, isloop, AudioClipType.Music);
        }
    }

    /**暂停播放背景音 */
    public pauseBgMusic(): void {
        cc.audioEngine.pauseMusic();
    }

    /**恢复背景音乐 */
    public resumeBgMusic(): void {
        cc.audioEngine.resumeMusic();
    }

    /**停止播放背景音 */
    public stopBgMusic(): void {
        cc.audioEngine.stopMusic();
    }

    /**
     * 播放效果音
     * @param bundle 分包路径
     * @param path 音频路径 
     */
    public playerEffect(bundle: string, path: string, isloop: boolean, canPlay?: boolean): void {
        if (canPlay == false) return;

        let res_m: cc.AudioClip = <cc.AudioClip>Manager.CacheManager.cacheRes[bundle + '/' + path];
        if (res_m) {
            this.playByType(res_m, AudioClipType.Effect, isloop, bundle + '/' + path);
        } else {
            console.log(bundle + '/' + path, " 该音效未缓存, 加载会有延迟!");
            if (bundle == Macro.resources) {
                this.loadAudioFromResource(path, isloop, AudioClipType.Effect);
            } else {
                this.loadAudioFromBundle(bundle, path, isloop, AudioClipType.Effect);
            }
        }
    }

    /**停止播放所有效果音 */
    public stopAllEffect(): void {
        cc.audioEngine.stopAllEffects();
    }

    /**
     * 停止播放指定音效
     * @param bundle 分包路径
     * @param path 音频路径 
     */
    public stopEffect(bundle: string, path: string): void {
        let key = bundle + '/' + path;
        if (this.playing_effect_list[key]) {
            cc.audioEngine.stopEffect(this.playing_effect_list[key]);
            delete this.playing_effect_list[key];
        }
    }
    
    /**设置音乐音量 */
    public setMusicVolume(value: number): void {
        cc.audioEngine.setMusicVolume(value);
        cc.sys.localStorage.setItem(AudioLocalType.Music, value);
    }

    /**设置音效音量 */
    public setEffectsVolume(value: number): void {
        cc.audioEngine.setEffectsVolume(value);
        cc.sys.localStorage.setItem(AudioLocalType.Effect, value);
    }

    /**获取音乐音量 */
    public getMusicValume(): number {
        let value = cc.sys.localStorage.getItem(AudioLocalType.Music);
        return typeof (value) == 'string' ? Number(value) : cc.audioEngine.getMusicVolume();
    }

    /**获取音效音量 */
    public getEffectsValume(): number {
        let value = cc.sys.localStorage.getItem(AudioLocalType.Effect);
        return typeof (value) == 'string' ? Number(value) : cc.audioEngine.getEffectsVolume();
    }

    /**获取分包路径下的音频 */
    private loadAudioFromBundle(bundle: string, path: string, isloop: boolean = false, type: AudioClipType): void {
        Manager.ResManager.getDataFromBundle(bundle, path, cc.AudioClip, (e: Error, asset: cc.AudioClip) => {
            if (e) return console.error('资源加载失败', path, e);

            let key = bundle + '/' + path;
            Manager.CacheManager.cacheRes[key] = asset;
            this.playByType(asset, type, isloop, key);
        });
    }

    /**获取主包路径下的音频 */
    private loadAudioFromResource(path: string, isloop: boolean = false, type: AudioClipType): void {
        Manager.ResManager.getDataFromResources(path, cc.AudioClip, (e: Error, asset: cc.AudioClip) => {
            if (e) return console.error('资源加载失败', path, e);

            let key = Macro.resources + '/' + path;
            Manager.CacheManager.cacheRes[key] = asset;
            this.playByType(asset, type, isloop, key);
        });
    }

    private playByType(clip: cc.AudioClip, type: AudioClipType, isloop: boolean = false, effectKey?: string): void {
        switch (type) {
            case AudioClipType.Music:
                cc.audioEngine.playMusic(clip, isloop);
                break;
            case AudioClipType.Effect:
                let id = cc.audioEngine.playEffect(clip, isloop);
                if (effectKey) {
                    this.playing_effect_list[effectKey] = id;
                }
                break;
        }
    }

    public static getInstance(): AudioManager {
        if (AudioManager.instance == null) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }
}