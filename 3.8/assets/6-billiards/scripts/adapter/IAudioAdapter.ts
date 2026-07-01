/**
 * IAudioAdapter.ts
 * 音频引擎适配器接口。
 *
 * GameSession 通过此接口播放音效，与具体音频系统解耦。
 * 实现层可对接 Cocos Creator AudioSource、Web Audio API 或任意平台音频。
 *
 * 音效键值来源：GameConfig.ts → AudioKey
 */

// ── 导入音效键枚举 ──────────────────────────────────────────
// 避免直接引用 GameConfig 全量模块，只取类型
export type AudioKeyType = string;

// ─────────────────────────────────────────────
//  接口
// ─────────────────────────────────────────────

/**
 * 音频适配器。
 *
 * 设计原则：
 * - 所有方法都是可选调用，忽略不会影响游戏逻辑
 * - `playBallCollision` 根据碰撞速度动态调整音量，是最常用的方法
 */
export interface IAudioAdapter {

    /**
     * 播放指定键对应的音效。
     * @param key    音效键（参见 GameConfig.AudioKey）
     * @param volume 音量，范围 0.0 ~ 1.0，默认为 1.0
     */
    play(key: AudioKeyType, volume?: number): void;

    /**
     * 停止指定键对应的正在播放的音效。
     * @param key 音效键
     */
    stop(key: AudioKeyType): void;

    /**
     * 播放球与球碰撞音效，音量根据碰撞速度自动缩放。
     *
     * 对应 Lua `EightBallGameManager:playEffectByTag` 中的球-球碰撞逻辑：
     * ```lua
     * velocity = velocity > 1000 and 1.0 or velocity / 1000
     * playEffectByIndex(sound.ball, velocity)
     * ```
     *
     * @param speed  碰撞相对速度（像素/秒），内部换算为 [0,1] 音量
     */
    playBallCollision(speed: number): void;

    /**
     * 播放球进袋音效（固定音量 1.0）。
     * 对应 Lua `sound.pocket`。
     */
    playPocket(): void;

    /**
     * 播放球杆击球音效（固定音量 1.0）。
     * 对应 Lua `sound.cue`。
     */
    playCueHit(): void;

    /**
     * 预加载所有常用音效资源（可选优化）。
     * 对应 Lua `EightBallGameManager:preLoadBilliardsEffect`。
     */
    preloadAll?(): void;
}
