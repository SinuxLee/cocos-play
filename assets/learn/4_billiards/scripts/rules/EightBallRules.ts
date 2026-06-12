/**
 * EightBallRules.ts
 * 八球规则引擎 —— 纯函数，不依赖任何引擎 API，可单独测试。
 *
 * 规则依据：
 *   EightBallGameManager.lua  syncHitResult switch
 *   EightBallGameControl.lua  getIsBallAllInHole / ballInHole
 *   EightBallDefine.lua       gameRound / gameState 枚举
 */

import { BallData, BallGroup, getBallsByGroup, isGroupAllPocketed, isPocketed } from '../base/Ball';

// ─────────────────────────────────────────────
//  枚举
// ─────────────────────────────────────────────

/** 犯规类型 */
export const enum FoulType {
    /** 无犯规 */
    None            = 'none',
    /** 白球未碰到任何彩球 */
    NoHit           = 'noHit',
    /** 白球首碰了不属于自己的球种 */
    WrongBall       = 'wrongBall',
    /** 白球落袋 */
    CueBallPocketed = 'cueBallPocketed',
    /** 黑八提前落袋（自己的球尚未全部入袋） */
    EightBallPremature = 'eightBallPremature',
}

/**
 * 一轮击球的最终结论（对应 Lua gameRound 枚举）。
 *
 * - Keep    : 本轮打进了正确的球，继续击球
 * - Change  : 未打进或打进了对方球，换人
 * - Foul    : 犯规，换人并给对方自由球权利
 * - GameOver: 黑八落袋（正常结束或违规判负）
 * - Restart : 首杆开球打进黑八，重新摆球开球
 */
export const enum RoundOutcome {
    Keep     = 'keep',
    Change   = 'change',
    Foul     = 'foul',
    GameOver = 'gameOver',
    Restart  = 'restart',
}

// ─────────────────────────────────────────────
//  数据结构
// ─────────────────────────────────────────────

/**
 * 一次击球过程中收集的事件记录。
 * 由 GameSession 在物理运行期间填充，所有球停止后传给规则引擎。
 */
export interface ShotRecord {
    /** 白球是否落袋 */
    cueBallPocketed: boolean;
    /** 本次击球落袋的彩球 id 列表（不含白球） */
    pocketedBallIds: number[];
    /** 白球本次击球首次碰撞的彩球 id；若未碰到彩球则为 null */
    firstHitBallId: number | null;
    /** 本次击球期间所有球碰壁总次数（用于调试/统计，规则暂不使用） */
    borderHitCount: number;
}

/** 整局比赛的持久状态，GameSession 负责维护 */
export interface GameState {
    /** 当前可以击球的玩家索引（0 = 玩家一，1 = 玩家二） */
    currentPlayerId: number;
    /** 负责打实色球（1-7）的玩家 id；-1 表示未分配 */
    solidPlayerId: number | null;
    /** 负责打花色球（9-15）的玩家 id；-1 表示未分配 */
    stripePlayerId: number | null;
    /** 颜色是否已分配 */
    colorsAssigned: boolean;
    /**
     * 当前总击球回合数（从 0 开始）。
     * roundCount === 0 表示首杆开球阶段。
     */
    roundCount: number;
}

/** isGameOver 的返回值 */
export interface GameOverInfo {
    winnerId: number;
    reason: string;
}

// ─────────────────────────────────────────────
//  工具函数（内部）
// ─────────────────────────────────────────────

/**
 * 获取当前玩家本轮应打的球种。
 * - 若颜色尚未分配，返回 BallGroup.None（随便打）
 * - 若自己的球已经全部入袋，则应打黑八（BallGroup.Eight）
 */
export function getCurrentPlayerGroup(
    state: Readonly<GameState>,
    balls: readonly BallData[],
): BallGroup {
    const { currentPlayerId, solidPlayerId, stripePlayerId, colorsAssigned } = state;
    if (!colorsAssigned) {
        return BallGroup.None;
    }
    if (currentPlayerId === solidPlayerId) {
        const solids = getBallsByGroup(balls, BallGroup.Solid);
        if (isGroupAllPocketed(solids)) {
            return BallGroup.Eight;
        }
        return BallGroup.Solid;
    }
    if (currentPlayerId === stripePlayerId) {
        const stripes = getBallsByGroup(balls, BallGroup.Stripe);
        if (isGroupAllPocketed(stripes)) {
            return BallGroup.Eight;
        }
        return BallGroup.Stripe;
    }
    // 理论上不应到达这里
    return BallGroup.None;
}

/**
 * 获取对方玩家 id（单人/双人通用，只有 0 / 1 两个玩家）。
 */
function opponentOf(playerId: number): number {
    return playerId === 0 ? 1 : 0;
}

// ─────────────────────────────────────────────
//  规则函数（对外导出）
// ─────────────────────────────────────────────

/**
 * 判断本轮是否发生了犯规，以及犯规类型。
 *
 * 检测顺序（优先级从高到低）：
 * 1. 白球落袋
 * 2. 未碰到任何球
 * 3. 首碰了不属于自己的球（颜色已分配时）
 * 4. 本轮打进了黑八但自己的球尚未全部入袋
 */
export function determineFoul(
    shot: ShotRecord,
    currentPlayerGroup: BallGroup,
    balls: readonly BallData[],
): FoulType {
    // 1. 白球落袋
    if (shot.cueBallPocketed) {
        return FoulType.CueBallPocketed;
    }

    // 2. 未碰到任何彩球
    if (shot.firstHitBallId === null) {
        return FoulType.NoHit;
    }

    // 3. 首碰了错误球种（颜色已分配且不是黑八阶段）
    if (currentPlayerGroup !== BallGroup.None && currentPlayerGroup !== BallGroup.Eight) {
        const firstHit = balls.find(b => b.id === shot.firstHitBallId);
        if (firstHit && firstHit.group !== currentPlayerGroup && firstHit.group !== BallGroup.Eight) {
            return FoulType.WrongBall;
        }
    }

    // 4. 黑八提前落袋
    const eightBallPocketed = shot.pocketedBallIds.includes(8);
    if (eightBallPocketed) {
        // 如果当前玩家还未到达应打黑八的阶段，则算提前入袋犯规（判负，由 determineRoundOutcome 处理）
        if (currentPlayerGroup !== BallGroup.Eight) {
            return FoulType.EightBallPremature;
        }
    }

    return FoulType.None;
}

/**
 * 判断颜色是否需要在本轮分配。
 * 首次有彩球入袋且颜色尚未分配时，进行分配。
 */
export function shouldAssignColors(
    shot: ShotRecord,
    colorsAssigned: boolean,
): boolean {
    if (colorsAssigned) return false;
    // 排除白球（id=0）和黑八（id=8）
    const colorBalls = shot.pocketedBallIds.filter(id => id !== 0 && id !== 8);
    return colorBalls.length > 0;
}

/**
 * 根据本轮首个入袋的彩球决定颜色分配方案。
 *
 * 规则：首个落袋彩球属于哪种，当前玩家就打哪种；
 * 若第一个落袋球是实色（1-7），当前玩家打实色，对方打花色；反之亦然。
 *
 * @returns solidPlayerId 和 stripePlayerId 的新值
 */
export function assignColorsFromShot(
    shot: ShotRecord,
    currentPlayerId: number,
): { solidPlayerId: number; stripePlayerId: number } {
    // 找到第一个有效彩球（非白球，非黑八）
    const firstColorBall = shot.pocketedBallIds.find(id => id >= 1 && id <= 7 || id >= 9 && id <= 15);
    const opponent = opponentOf(currentPlayerId);

    if (firstColorBall !== undefined && firstColorBall >= 1 && firstColorBall <= 7) {
        // 首个落袋是实色球
        return { solidPlayerId: currentPlayerId, stripePlayerId: opponent };
    } else {
        // 首个落袋是花色球
        return { solidPlayerId: opponent, stripePlayerId: currentPlayerId };
    }
}

/**
 * 检测游戏是否因黑八落袋而结束，并返回结果信息。
 * 此函数在 `determineFoul` 之后调用，已知无提前犯规。
 *
 * 返回 null 表示游戏未结束。
 */
export function isGameOver(
    shot: ShotRecord,
    state: Readonly<GameState>,
    currentPlayerGroup: BallGroup,
): GameOverInfo | null {
    const eightBallPocketed = shot.pocketedBallIds.includes(8);
    if (!eightBallPocketed) return null;

    const { currentPlayerId, roundCount } = state;

    // 首杆打进黑八 → Restart，不是 GameOver
    if (roundCount === 0) return null;

    // 黑八提前落袋（已被 determineFoul 标记为 EightBallPremature）
    // 或者白球与黑八同时落袋 → 当前玩家判负
    if (currentPlayerGroup !== BallGroup.Eight || shot.cueBallPocketed) {
        return {
            winnerId: opponentOf(currentPlayerId),
            reason: shot.cueBallPocketed
                ? '黑八与白球同时入袋，判负'
                : '在自己的球尚未全部入袋时打进了黑八，判负',
        };
    }

    // 正常打进黑八 → 当前玩家获胜
    return {
        winnerId: currentPlayerId,
        reason: '成功将黑八打进，获胜',
    };
}

/**
 * 综合决定本轮结果（主入口）。
 *
 * 调用顺序：
 *   1. 调用 `determineFoul` 获取 foulType
 *   2. 调用本函数获取 RoundOutcome
 *
 * @param shot             本轮击球记录
 * @param state            当前游戏状态（在本轮结果应用 **之前** 的状态）
 * @param currentPlayerGroup 当前玩家本轮应打球种（由 getCurrentPlayerGroup 算出）
 * @param foulType         犯规类型（由 determineFoul 算出）
 * @param balls            当前球桌上所有球的数据
 */
export function determineRoundOutcome(
    shot: ShotRecord,
    state: Readonly<GameState>,
    currentPlayerGroup: BallGroup,
    foulType: FoulType,
    balls: readonly BallData[],
): RoundOutcome {
    const { roundCount } = state;

    // 首杆打进黑八 → 重置
    if (shot.pocketedBallIds.includes(8) && roundCount === 0) {
        return RoundOutcome.Restart;
    }

    // 黑八落袋（非首杆）→ 游戏结束
    if (shot.pocketedBallIds.includes(8)) {
        return RoundOutcome.GameOver;
    }

    // 犯规 → Foul
    if (foulType !== FoulType.None) {
        return RoundOutcome.Foul;
    }

    // 无犯规情况下，判断是否应当继续（Keep）还是换人（Change）
    const validPocketed = shot.pocketedBallIds.filter(id => id !== 0 && id !== 8);

    if (validPocketed.length === 0) {
        // 没有打进任何球 → 换人
        return RoundOutcome.Change;
    }

    // 若颜色尚未分配，打进任何彩球都算 Keep（继续）
    if (!state.colorsAssigned) {
        return RoundOutcome.Keep;
    }

    // 颜色已分配：检查是否打进了自己的球
    const myGroup = currentPlayerGroup; // Eight 时可以打黑八
    if (myGroup === BallGroup.Eight) {
        // 黑八已在前面处理，理论上不会走到这里
        return RoundOutcome.Change;
    }

    const scoredOwn = validPocketed.some(id => {
        const ball = balls.find(b => b.id === id);
        return ball && ball.group === myGroup;
    });

    const scoredWrong = validPocketed.some(id => {
        const ball = balls.find(b => b.id === id);
        return ball && ball.group !== myGroup;
    });

    if (scoredOwn && !scoredWrong) {
        return RoundOutcome.Keep;
    }

    // 打进了对方的球或者没打进自己的球
    return RoundOutcome.Change;
}

/**
 * 将一轮结果应用到 GameState，返回下一轮的新状态（不可变更新）。
 *
 * @param outcome          本轮结论
 * @param shot             本轮击球记录
 * @param foulType         犯规类型
 * @param state            当前游戏状态
 * @param balls            本轮所有球最终数据
 * @returns 更新后的 GameState 的副本
 */
export function applyRoundOutcome(
    outcome: RoundOutcome,
    shot: ShotRecord,
    foulType: FoulType,
    state: Readonly<GameState>,
    balls: readonly BallData[],
): GameState {
    const next: GameState = { ...state, roundCount: state.roundCount + 1 };

    // ── 颜色分配 ──────────────────────────────────────────
    if (!next.colorsAssigned && shouldAssignColors(shot, false)) {
        // 犯规或换人时不分配颜色（颜色归下一个首先打进的人）
        if (outcome === RoundOutcome.Keep || outcome === RoundOutcome.Change) {
            const assigned = assignColorsFromShot(shot, next.currentPlayerId);
            next.solidPlayerId   = assigned.solidPlayerId;
            next.stripePlayerId  = assigned.stripePlayerId;
            next.colorsAssigned  = true;
        }
    }

    // ── 换人逻辑 ──────────────────────────────────────────
    switch (outcome) {
        case RoundOutcome.Keep:
            // 继续：玩家不变
            break;

        case RoundOutcome.Change:
        case RoundOutcome.Foul:
            // 换人
            next.currentPlayerId = opponentOf(next.currentPlayerId);
            break;

        case RoundOutcome.Restart:
            // 首杆黑八：重置颜色，玩家不变（仍由开球方重新开球）
            next.solidPlayerId  = null;
            next.stripePlayerId = null;
            next.colorsAssigned = false;
            next.roundCount     = 0; // 重回首杆
            break;

        case RoundOutcome.GameOver:
            // 比赛结束：状态无需更新（由 GameSession 处理）
            break;
    }

    return next;
}

/**
 * 创建初始 GameState。
 */
export function createGameState(firstPlayerId: number = 0): GameState {
    return {
        currentPlayerId: firstPlayerId,
        solidPlayerId:   null,
        stripePlayerId:  null,
        colorsAssigned:  false,
        roundCount:      0,
    };
}

/**
 * 创建空白 ShotRecord（每次击球前调用重置）。
 */
export function createShotRecord(): ShotRecord {
    return {
        cueBallPocketed: false,
        pocketedBallIds: [],
        firstHitBallId:  null,
        borderHitCount:  0,
    };
}
