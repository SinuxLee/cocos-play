/**
 * GameSession.ts
 * 游戏会话协调器 —— 单局比赛的"大脑"。
 *
 * 职责：
 *   1. 初始化桌面（球、边界、袋口）
 *   2. 处理击球：将 ShotParams 转换为物理冲量并施加
 *   3. 物理运行期间收集事件（碰撞、落袋）填充 ShotRecord
 *   4. 所有球静止后调用规则引擎判定结果，更新 GameState
 *   5. 通过 IGameEventBus 对外发布所有游戏事件
 *
 * 依赖注入：
 *   - IPhysicsAdapter：物理引擎（Cocos2D、Box2D 等均可）
 *   - IAudioAdapter  ：音频系统
 *
 * 不依赖任何 UI / 渲染代码。
 */

import { Vec2, v2 } from 'cc';

// ── 配置 & 数据层 ─────────────────────────────────────────
import {
    BallMaterial, WhiteBallMaterial, BorderMaterial, BagBorderMaterial,
    BallSizeCfg, TableCfg, DampingCfg, GameplayCfg,
} from '../base/GameConfig';
import {
    BallData, BallGroup, BallState,
    createBallData, getBallGroup,
    isCueBall, isEightBall, isPocketed, isOnTable,
} from '../base/Ball';

// ── 核心算法层 ─────────────────────────────────────────────
import {
    createInitialBalls,
    INNER_BORDER_SEGMENTS, BAG_BORDER_SEGMENTS,
    HOLE_SENSORS,
} from '../core/Table';
import { ShotParams, calculateShot } from '../core/ShotCalculator';
import { computeDamping, isBallStopped } from '../core/DampingSystem';
import { isBallPositionLegal, findLegalCueBallPosition } from '../core/BilliardsMath';

// ── 规则层 ────────────────────────────────────────────────
import {
    GameState, ShotRecord, FoulType, RoundOutcome,
    createGameState, createShotRecord,
    getCurrentPlayerGroup,
    determineFoul,
    determineRoundOutcome,
    applyRoundOutcome,
    isGameOver,
    shouldAssignColors, assignColorsFromShot,
} from '../rules/EightBallRules';

// ── 会话层 ────────────────────────────────────────────────
import {
    SimpleEventEmitter, IGameEventEmitter,
    GameEventKey, GameEventData,
} from './GameEvent';

// ── 适配器接口 ────────────────────────────────────────────
import { IPhysicsAdapter } from '../adapter/IPhysicsAdapter';
import { IAudioAdapter }   from '../adapter/IAudioAdapter';

// ─────────────────────────────────────────────────────────
//  内部状态枚举
// ─────────────────────────────────────────────────────────

/** GameSession 自身的运行阶段 */
const enum Phase {
    /** 等待游戏开始 */
    Idle       = 'idle',
    /** 等待玩家击球 */
    Waiting    = 'waiting',
    /** 物理运行中（球在运动） */
    Physics    = 'physics',
    /** 犯规后摆放白球 */
    PlacingCue = 'placingCue',
    /** 游戏已结束 */
    Over       = 'over',
}

// ─────────────────────────────────────────────────────────
//  GameSession
// ─────────────────────────────────────────────────────────

export class GameSession {

    // ── 注入依赖 ──────────────────────────────────────────
    private readonly _physics: IPhysicsAdapter;
    private readonly _audio:   IAudioAdapter;
    private readonly _bus:     SimpleEventEmitter = new SimpleEventEmitter();

    // ── 游戏数据 ──────────────────────────────────────────
    private _balls:      BallData[] = [];
    private _gameState:  GameState  = createGameState(0);
    private _shotRecord: ShotRecord = createShotRecord();

    // ── 运行状态 ──────────────────────────────────────────
    private _phase:           Phase   = Phase.Idle;
    /** 本次击球已过去的时间（秒），用于 increaseVelocityTime 阻尼逻辑 */
    private _shotElapsedTime: number  = 0;
    /** 阻尼定时累积（与 checkStopInterval 配合） */
    private _checkStopAccum:  number  = 0;

    // ─────────────────────────────────────────────────────
    //  构造
    // ─────────────────────────────────────────────────────

    constructor(physics: IPhysicsAdapter, audio: IAudioAdapter) {
        this._physics = physics;
        this._audio   = audio;

        // 将物理回调绑定到本会话
        physics.onCollision    = this._handleCollision.bind(this);
        physics.onSensorEnter  = this._handleSensorEnter.bind(this);
        physics.onBagBottomHit = this._handleBagBottomHit.bind(this);
    }

    // ─────────────────────────────────────────────────────
    //  公开 API —— 订阅事件
    // ─────────────────────────────────────────────────────

    /** 订阅游戏事件 */
    on<K extends GameEventKey>(event: K, cb: (data: GameEventData<K>) => void): void {
        this._bus.on(event, cb);
    }

    /** 取消订阅 */
    off<K extends GameEventKey>(event: K, cb: (data: GameEventData<K>) => void): void {
        this._bus.off(event, cb);
    }

    // ─────────────────────────────────────────────────────
    //  公开 API —— 生命周期
    // ─────────────────────────────────────────────────────

    /**
     * 初始化一局游戏。
     * 会重置所有状态、初始化物理世界，并将球摆好。
     *
     * @param firstPlayerId 先手玩家 id（0 或 1），默认 0
     */
    startGame(firstPlayerId: number = 0): void {
        // ── 重置状态 ──────────────────────────────────────
        this._gameState  = createGameState(firstPlayerId);
        this._shotRecord = createShotRecord();
        this._phase      = Phase.Waiting;
        this._shotElapsedTime = 0;
        this._checkStopAccum  = 0;

        // ── 初始化物理世界 ─────────────────────────────────
        this._physics.teardown();
        this._physics.setup();

        // ── 创建球数据 & 球刚体 ────────────────────────────
        this._balls = createInitialBalls(TableCfg.width, TableCfg.height);
        for (const ball of this._balls) {
            const mat = isCueBall(ball.id) ? WhiteBallMaterial : BallMaterial;
            this._physics.addBall(
                ball.id,
                v2(ball.position.x, ball.position.y),
                BallSizeCfg.radius,
                mat,
            );
        }

        // ── 边界线段 ──────────────────────────────────────
        this._physics.addBorderSegments(INNER_BORDER_SEGMENTS, BorderMaterial);
        this._physics.addBorderSegments(BAG_BORDER_SEGMENTS,   BagBorderMaterial);

        // ── 袋口传感器 ────────────────────────────────────
        for (let i = 0; i < HOLE_SENSORS.length; i++) {
            const h = HOLE_SENSORS[i];
            this._physics.addHoleSensor(v2(h.x, h.y), h.radius, i);
        }

        // ── 预加载音效 ────────────────────────────────────
        this._audio.preloadAll?.();
    }

    /**
     * 重新摆球开局（首杆打进黑八时调用）。
     * 保留当前玩家，回合数归零。
     */
    restartGame(): void {
        const currentPlayer = this._gameState.currentPlayerId;
        this.startGame(currentPlayer);
    }

    // ─────────────────────────────────────────────────────
    //  公开 API —— 击球
    // ─────────────────────────────────────────────────────

    /**
     * 玩家发起击球。
     * 仅在 Phase.Waiting 或 Phase.PlacingCue（摆好白球后）阶段有效。
     *
     * @param params 击球参数（角度、力度、旋转）
     * @returns 是否成功发射（false 表示当前阶段不允许）
     */
    beginShot(params: ShotParams): boolean {
        if (this._phase !== Phase.Waiting && this._phase !== Phase.PlacingCue) {
            return false;
        }

        const cueBall = this._getCueBallData();
        if (!cueBall || isPocketed(cueBall)) {
            return false;
        }

        // ── 计算物理参数 ──────────────────────────────────
        const physics = calculateShot(params, cueBall.position);

        // ── 通知 UI 击球开始 ──────────────────────────────
        this._bus.emit('shot:start', { playerId: this._gameState.currentPlayerId });
        this._bus.emit('shot:physics', {
            impulse:         physics.impulse,
            angularVelocity: physics.angularVelocity,
            continuousForce: physics.continuousForce,
        });

        // ── 施加力 ────────────────────────────────────────
        this._physics.applyImpulse(0, physics.impulse);
        this._physics.setAngularVelocity(0, physics.angularVelocity);
        if (physics.continuousForce.x !== 0 || physics.continuousForce.y !== 0) {
            this._physics.applyForce(0, physics.continuousForce);
        }

        // ── 重置本轮记录 & 切换阶段 ───────────────────────
        this._shotRecord      = createShotRecord();
        this._shotElapsedTime = 0;
        this._checkStopAccum  = 0;
        this._phase           = Phase.Physics;

        // ── 播放击球音效 ──────────────────────────────────
        this._audio.playCueHit();

        return true;
    }

    // ─────────────────────────────────────────────────────
    //  公开 API —— 每帧调用
    // ─────────────────────────────────────────────────────

    /**
     * 每帧调用，处理自定义阻尼逻辑并检测所有球是否停止。
     * 对应 Lua 中 `checkStopTimeEntry` 定时器 + `PhyControl` 阻尼更新。
     *
     * @param dt 帧时间间隔（秒）
     */
    tick(dt: number): void {
        if (this._phase !== Phase.Physics) return;

        this._shotElapsedTime += dt;
        this._checkStopAccum  += dt;

        // ── 每帧更新阻尼 ──────────────────────────────────
        for (const ball of this._balls) {
            if (!isOnTable(ball)) continue;

            const vel = this._physics.getVelocity(ball.id);
            const result = computeDamping(vel, this._shotElapsedTime, DampingCfg);

            if (result.shouldStop) {
                // 强制停止
                this._physics.setVelocity(ball.id, v2(0, 0));
                this._physics.setAngularVelocity(ball.id, 0);
                this._physics.resetForces(ball.id);
                this._updateBallState(ball.id, BallState.Idle);
            } else {
                this._physics.setLinearDamping(ball.id, result.linearDamping);
                this._updateBallState(ball.id, BallState.Moving);
            }
        }

        // ── 按间隔检测全部停止 ────────────────────────────
        if (this._checkStopAccum >= GameplayCfg.checkStopInterval) {
            this._checkStopAccum = 0;
            if (this._areAllBallsStopped()) {
                this._onAllBallsStopped();
            }
        }
    }

    // ─────────────────────────────────────────────────────
    //  公开 API —— 白球放置（犯规后自由球）
    // ─────────────────────────────────────────────────────

    /**
     * 尝试将白球放置到指定位置（拖动放球时每帧调用）。
     *
     * @param pos 目标位置
     * @returns true = 位置合法并已放置；false = 位置非法，未放置
     */
    setCueBallPosition(pos: Vec2): boolean {
        if (this._phase !== Phase.PlacingCue) return false;

        const legal = isBallPositionLegal(
            pos,
            BallSizeCfg.radius,
            TableCfg.playArea,
            this._balls.filter(b => !isCueBall(b.id) && isOnTable(b)),
        );

        if (legal) {
            this._physics.setPosition(0, pos);
            this._physics.setVelocity(0, v2(0, 0));
            this._physics.setAngularVelocity(0, 0);
            this._updateBallPosition(0, pos);
            this._bus.emit('cueball:reset', { position: pos });
        }
        return legal;
    }

    /**
     * 确认白球位置，进入等待击球状态。
     * 若当前白球位置非法，自动寻找最近合法位置放置。
     */
    confirmCueBallPlacement(): void {
        if (this._phase !== Phase.PlacingCue) return;

        const cueBall = this._getCueBallData();
        if (!cueBall) return;

        let pos = cueBall.position;
        if (!isBallPositionLegal(pos, BallSizeCfg.radius, TableCfg.playArea,
                this._balls.filter(b => !isCueBall(b.id) && isOnTable(b)))) {
            pos = findLegalCueBallPosition(
                BallSizeCfg.radius,
                TableCfg.playArea,
                this._balls.filter(b => !isCueBall(b.id) && isOnTable(b)),
            );
            this._physics.setPosition(0, pos);
            this._updateBallPosition(0, pos);
            this._bus.emit('cueball:reset', { position: pos });
        }

        this._phase = Phase.Waiting;
    }

    // ─────────────────────────────────────────────────────
    //  公开 API —— 只读访问
    // ─────────────────────────────────────────────────────

    /** 获取白球数据 */
    getCueBall(): Readonly<BallData> | undefined {
        return this._getCueBallData();
    }

    /** 获取所有球数据（只读） */
    getBalls(): readonly BallData[] {
        return this._balls;
    }

    /** 获取当前游戏状态（只读） */
    getGameState(): Readonly<GameState> {
        return this._gameState;
    }

    /** 获取当前运行阶段（供 UI 判断是否可以击球等） */
    getPhase(): string {
        return this._phase;
    }

    /** 是否在等待玩家操作（击球 或 摆白球） */
    isWaitingForPlayer(): boolean {
        return this._phase === Phase.Waiting || this._phase === Phase.PlacingCue;
    }

    // ─────────────────────────────────────────────────────
    //  物理适配器回调（内部）
    // ─────────────────────────────────────────────────────

    /**
     * 碰撞回调（由 IPhysicsAdapter 触发）。
     */
    private _handleCollision(idA: number, idB: number, speed: number): void {
        if (this._phase !== Phase.Physics) return;

        // 更新 ShotRecord：记录白球首次碰彩球
        if (this._shotRecord.firstHitBallId === null) {
            if (isCueBall(idA) && idB >= 1 && idB <= 15) {
                this._shotRecord.firstHitBallId = idB;
            } else if (isCueBall(idB) && idA >= 1 && idA <= 15) {
                this._shotRecord.firstHitBallId = idA;
            }
        }

        // 边界碰撞（-1 表示边界静态体）
        const isBorderCollision = idA === -1 || idB === -1;
        if (isBorderCollision) {
            const ballId = idA === -1 ? idB : idA;
            this._shotRecord.borderHitCount++;
            this._bus.emit('ball:hit:border', { ballId });
        }

        // 发射碰撞事件（供音效）
        this._bus.emit('ball:collision', { ballIdA: idA, ballIdB: idB, speed });

        // 球-球碰撞音效
        if (!isBorderCollision) {
            this._audio.playBallCollision(speed);
        }
    }

    /**
     * 袋口传感器触发（球进袋）。
     */
    private _handleSensorEnter(ballId: number, holeIndex: number): void {
        if (this._phase !== Phase.Physics) return;

        // 更新本地球数据
        this._updateBallState(ballId, BallState.Pocketed);

        // 禁用该球碰撞（防止二次触发）
        this._physics.setCollisionEnabled(ballId, false);
        this._physics.setVelocity(ballId, v2(0, 0));
        this._physics.setAngularVelocity(ballId, 0);
        this._physics.resetForces(ballId);

        // 记录落袋
        if (isCueBall(ballId)) {
            this._shotRecord.cueBallPocketed = true;
        } else {
            if (!this._shotRecord.pocketedBallIds.includes(ballId)) {
                this._shotRecord.pocketedBallIds.push(ballId);
            }
        }

        // 发射事件
        this._bus.emit('ball:pocketed', { ballId, holeIndex });

        // 进袋音效
        this._audio.playPocket();
    }

    /**
     * 袋底碰撞（球落入袋底，重置速度和力）。
     */
    private _handleBagBottomHit(ballId: number): void {
        this._physics.resetForces(ballId);
        this._physics.setVelocity(ballId, v2(0, 0));
        this._physics.setAngularVelocity(ballId, 0);
        this._bus.emit('ball:hit:bag-bottom', { ballId });
    }

    // ─────────────────────────────────────────────────────
    //  全部停止处理（内部）
    // ─────────────────────────────────────────────────────

    private _areAllBallsStopped(): boolean {
        for (const ball of this._balls) {
            if (!isOnTable(ball)) continue;
            const vel = this._physics.getVelocity(ball.id);
            if (!isBallStopped(vel, DampingCfg.stopVelocityThreshold)) {
                return false;
            }
        }
        return true;
    }

    private _onAllBallsStopped(): void {
        this._phase = Phase.Idle; // 防止重入

        // 同步所有球的最终位置到本地数据
        this._syncPositionsFromPhysics();

        // 发射「全部停止」事件
        this._bus.emit('all:balls:stopped', {});

        // ── 规则判定 ──────────────────────────────────────
        const currentPlayerGroup = getCurrentPlayerGroup(this._gameState, this._balls);
        const foulType           = determineFoul(this._shotRecord, currentPlayerGroup, this._balls);
        const outcome            = determineRoundOutcome(
            this._shotRecord, this._gameState, currentPlayerGroup, foulType, this._balls,
        );

        // ── 游戏结束检测 ──────────────────────────────────
        const gameOverInfo = isGameOver(this._shotRecord, this._gameState, currentPlayerGroup);
        if (gameOverInfo) {
            this._gameState = { ...this._gameState }; // 保持当前状态不变
            this._phase     = Phase.Over;
            this._bus.emit('round:resolved', {
                outcome,
                nextPlayerId: this._gameState.currentPlayerId,
                foulType: foulType !== FoulType.None ? foulType : undefined,
            });
            this._bus.emit('game:over', gameOverInfo);
            return;
        }

        // ── 颜色分配检测 ──────────────────────────────────
        const wasAssigned = this._gameState.colorsAssigned;

        // ── 应用回合结果，更新 GameState ──────────────────
        const prevState      = this._gameState;
        this._gameState      = applyRoundOutcome(
            outcome, this._shotRecord, foulType, this._gameState, this._balls,
        );

        // 若颜色刚刚被分配，发射 colors:assigned 事件
        if (!wasAssigned && this._gameState.colorsAssigned) {
            this._bus.emit('colors:assigned', {
                solidPlayerId:  this._gameState.solidPlayerId!,
                stripePlayerId: this._gameState.stripePlayerId!,
            });
        }

        // ── 发射回合结算事件 ──────────────────────────────
        this._bus.emit('round:resolved', {
            outcome,
            nextPlayerId: this._gameState.currentPlayerId,
            foulType: foulType !== FoulType.None ? foulType : undefined,
        });

        // ── 处理重置/犯规/正常等待 ─────────────────────────
        if (outcome === RoundOutcome.Restart) {
            // 首杆黑八：重新摆球
            this.restartGame();
        } else if (outcome === RoundOutcome.Foul || this._shotRecord.cueBallPocketed) {
            // 犯规：进入摆白球阶段
            this._resetCueBallForPlacement();
            this._phase = Phase.PlacingCue;
        } else {
            // 正常：等待下一次击球
            this._phase = Phase.Waiting;
        }
    }

    // ─────────────────────────────────────────────────────
    //  内部工具方法
    // ─────────────────────────────────────────────────────

    /** 从物理引擎同步所有球的最新位置到本地 BallData */
    private _syncPositionsFromPhysics(): void {
        for (const ball of this._balls) {
            if (!isOnTable(ball)) continue;
            const pos = this._physics.getPosition(ball.id);
            ball.position = pos;
            const vel = this._physics.getVelocity(ball.id);
            ball.velocity = vel;
        }
    }

    /** 更新本地 BallData 中某球的状态 */
    private _updateBallState(id: number, state: BallState): void {
        const ball = this._balls.find(b => b.id === id);
        if (ball) ball.state = state;
    }

    /** 更新本地 BallData 中某球的位置 */
    private _updateBallPosition(id: number, pos: Vec2): void {
        const ball = this._balls.find(b => b.id === id);
        if (ball) ball.position = pos;
    }

    /** 获取白球数据 */
    private _getCueBallData(): BallData | undefined {
        return this._balls.find(b => isCueBall(b.id));
    }

    /**
     * 犯规后将白球重置到开球线左侧的合法位置（对应 Lua dealWhiteBallInHole）。
     * 若白球已在桌面（非进袋犯规），也需要重新启用碰撞。
     */
    private _resetCueBallForPlacement(): void {
        // 重新启用白球碰撞
        this._physics.setCollisionEnabled(0, true);

        // 找到合法初始放置位置（开球线 x ≤ breakLineX 区域）
        const otherBalls = this._balls.filter(b => !isCueBall(b.id) && isOnTable(b));
        const startPos   = v2(TableCfg.breakLineX - BallSizeCfg.radius * 4, TableCfg.height / 2);
        const legalPos   = findLegalCueBallPosition(BallSizeCfg.radius, TableCfg.playArea, otherBalls, startPos);

        this._physics.setPosition(0, legalPos);
        this._physics.setVelocity(0, v2(0, 0));
        this._physics.setAngularVelocity(0, 0);
        this._physics.resetForces(0);

        // 恢复白球数据到「在桌面」状态
        const cueBall = this._getCueBallData();
        if (cueBall) {
            cueBall.state    = BallState.Idle;
            cueBall.position = legalPos;
            cueBall.velocity = v2(0, 0);
        }

        this._bus.emit('cueball:reset', { position: legalPos });
    }
}
