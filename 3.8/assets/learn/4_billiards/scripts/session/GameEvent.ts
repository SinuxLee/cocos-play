/**
 * GameEvent.ts
 * 游戏会话的类型安全事件系统。
 *
 * 设计目标：
 * - 完全类型安全：on/off/emit 均基于 GameEventMap 的键约束
 * - 零外部依赖：不依赖任何 Cocos/Node.js 事件系统
 * - 可测试：SimpleEventEmitter 可直接在单元测试中使用
 */

import { Vec2 } from 'cc';
import { FoulType, RoundOutcome } from '../rules/EightBallRules';
import { RouteResult } from '../core/RoutePredictor';

// ─────────────────────────────────────────────
//  事件数据 Map
// ─────────────────────────────────────────────

/**
 * GameSession 发射的所有游戏事件及其数据类型。
 *
 * 命名规范：`domain:action`
 *
 * 订阅示例：
 * ```ts
 * session.on('round:resolved', ({ outcome, nextPlayerId }) => { ... });
 * ```
 */
export interface GameEventMap {

    // ── 击球阶段 ──────────────────────────────────────────

    /**
     * 玩家开始击球（已调用 beginShot），物理即将开始运行。
     */
    'shot:start': {
        playerId: number;
    };

    /**
     * 击球物理参数已计算完毕，适配器即将施加冲量。
     * UI 可在此时开始击球动画。
     */
    'shot:physics': {
        impulse:          Vec2;
        angularVelocity:  number;
        continuousForce:  Vec2;
    };

    // ── 球事件 ────────────────────────────────────────────

    /**
     * 一颗球进入了袋口传感器区域（落袋动画可在此开始）。
     */
    'ball:pocketed': {
        ballId:    number;
        holeIndex: number;   // 0-5，对应 HoleCfg 中的位置
    };

    /**
     * 两个球发生碰撞（含球-边界，此时 ballIdB = -1）。
     * 音效系统可在此播放碰撞音。
     */
    'ball:collision': {
        ballIdA: number;
        ballIdB: number;   // -1 表示边界
        speed:   number;   // 相对速度大小（像素/秒）
    };

    /**
     * 某球碰到了边界（普通边框）。
     */
    'ball:hit:border': {
        ballId: number;
    };

    /**
     * 某球碰到了袋底，速度和附加力已被重置。
     */
    'ball:hit:bag-bottom': {
        ballId: number;
    };

    // ── 全部停止 ──────────────────────────────────────────

    /**
     * 所有球已完全静止，规则引擎即将判定结果。
     * 此事件之后会紧接着发射 `round:resolved`（或 `game:over`）。
     */
    'all:balls:stopped': Record<string, never>;

    // ── 回合结算 ──────────────────────────────────────────

    /**
     * 本轮结算完毕，游戏状态已更新。
     */
    'round:resolved': {
        outcome:      RoundOutcome;
        nextPlayerId: number;
        foulType?:    FoulType;      // 仅 outcome===Foul 时有意义
    };

    /**
     * 颜色分配完成（只触发一次）。
     */
    'colors:assigned': {
        solidPlayerId:  number;
        stripePlayerId: number;
    };

    // ── 游戏结束 ──────────────────────────────────────────

    /**
     * 游戏结束（黑八落袋或判负）。
     */
    'game:over': {
        winnerId: number;
        reason:   string;
    };

    // ── 白球复位 ──────────────────────────────────────────

    /**
     * 白球已被放置到合法位置（犯规后自由球）。
     */
    'cueball:reset': {
        position: Vec2;
    };

    // ── 瞄准线更新 ────────────────────────────────────────

    /**
     * 瞄准线/辅助线数据已更新（玩家旋转球杆时触发）。
     */
    'route:updated': {
        result: RouteResult;
    };
}

// ─────────────────────────────────────────────
//  类型工具
// ─────────────────────────────────────────────

export type GameEventKey      = keyof GameEventMap;
export type GameEventData<K extends GameEventKey> = GameEventMap[K];
export type GameEventCallback<K extends GameEventKey> = (data: GameEventData<K>) => void;

// ─────────────────────────────────────────────
//  接口
// ─────────────────────────────────────────────

/** 游戏事件发射器公共接口（只暴露订阅/取消订阅） */
export interface IGameEventEmitter {
    on<K extends GameEventKey>(event: K, cb: GameEventCallback<K>): void;
    off<K extends GameEventKey>(event: K, cb: GameEventCallback<K>): void;
}

/** 完整游戏事件接口（含发射能力，供 GameSession 内部使用） */
export interface IGameEventBus extends IGameEventEmitter {
    emit<K extends GameEventKey>(event: K, data: GameEventData<K>): void;
}

// ─────────────────────────────────────────────
//  SimpleEventEmitter 实现
// ─────────────────────────────────────────────

/**
 * 轻量级类型安全事件总线。
 *
 * 特性：
 * - 不依赖任何外部库
 * - 支持同一事件的多个监听器
 * - `off` 需传入相同引用才能正确移除（与标准 EventEmitter 一致）
 *
 * @example
 * ```ts
 * const bus = new SimpleEventEmitter();
 * const handler = (data: GameEventMap['ball:pocketed']) => console.log(data.ballId);
 * bus.on('ball:pocketed', handler);
 * bus.emit('ball:pocketed', { ballId: 3, holeIndex: 2 });
 * bus.off('ball:pocketed', handler);
 * ```
 */
export class SimpleEventEmitter implements IGameEventBus {

    // key → 监听器集合（用 Set 避免重复注册）
    private readonly _listeners = new Map<string, Set<Function>>();

    on<K extends GameEventKey>(event: K, cb: GameEventCallback<K>): void {
        let set = this._listeners.get(event);
        if (!set) {
            set = new Set();
            this._listeners.set(event, set);
        }
        set.add(cb);
    }

    off<K extends GameEventKey>(event: K, cb: GameEventCallback<K>): void {
        this._listeners.get(event)?.delete(cb);
    }

    emit<K extends GameEventKey>(event: K, data: GameEventData<K>): void {
        const set = this._listeners.get(event);
        if (!set) return;
        // 复制一份以防回调中有 off 操作
        for (const cb of Array.from(set)) {
            (cb as GameEventCallback<K>)(data);
        }
    }

    /** 移除某事件下所有监听器 */
    removeAllListeners(event?: GameEventKey): void {
        if (event) {
            this._listeners.delete(event);
        } else {
            this._listeners.clear();
        }
    }
}
