/**
 * Ball.ts
 * 球的纯数据模型与枚举定义。
 * 不含任何引擎渲染逻辑，可独立测试。
 */

import { Vec2 } from 'cc';

// ─────────────────────────────────────────────────────────────────────────────
// 枚举
// ─────────────────────────────────────────────────────────────────────────────

/** 球的运动状态 */
export enum BallState {
  /** 静止 */
  Idle = 'idle',
  /** 运动中 */
  Moving = 'moving',
  /** 已落袋 */
  Pocketed = 'pocketed',
}

/**
 * 球的分组。决定当前回合该打哪组球，以及犯规判定时首次碰撞是否合法。
 * 对应原 HitColor 枚举的实体归属语义。
 */
export enum BallGroup {
  /** 未分配（开局阶段或第一杆还未决定颜色） */
  None = 0,
  /** 全色球（实心，1-7 号） */
  Solid = 1,
  /** 花色球（条纹，9-15 号） */
  Stripe = 2,
  /** 8 号黑球 */
  Eight = 3,
  /** 白球（母球） */
  Cue = 4,
}

// ─────────────────────────────────────────────────────────────────────────────
// 数据模型（接口，不含方法）
// ─────────────────────────────────────────────────────────────────────────────

/** 单颗球的完整运行时数据。全部由 GameSession 管理，不自我驱动。 */
export interface BallData {
  /** 球编号：0 = 白球，1-7 = 全色，8 = 黑八，9-15 = 花色 */
  readonly id: number;
  /** 当前位置（desk 节点坐标系，像素） */
  position: Vec2;
  /** 当前线速度（像素/秒） */
  velocity: Vec2;
  /** 当前角速度（弧度/秒） */
  angularVelocity: number;
  /** 当前状态 */
  state: BallState;
  /** 球的分组（由 id 决定，初始化后固定） */
  readonly group: BallGroup;
}

// ─────────────────────────────────────────────────────────────────────────────
// 工厂函数
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 根据球的 id 推导其分组。
 * - 0     → Cue（白球）
 * - 1-7   → Solid（全色）
 * - 8     → Eight（黑八）
 * - 9-15  → Stripe（花色）
 */
export function getBallGroup(id: number): BallGroup {
  if (id === 0) return BallGroup.Cue;
  if (id >= 1 && id <= 7) return BallGroup.Solid;
  if (id === 8) return BallGroup.Eight;
  if (id >= 9 && id <= 15) return BallGroup.Stripe;
  throw new Error(`[Ball] Invalid ball id: ${id}. Valid range: 0-15.`);
}

/**
 * 创建一颗球的初始数据快照。
 * @param id       球编号 (0-15)
 * @param position 初始位置
 */
export function createBallData(id: number, position: Vec2): BallData {
  return {
    id,
    position: position.clone(),
    velocity: Vec2.ZERO.clone(),
    angularVelocity: 0,
    state: BallState.Idle,
    group: getBallGroup(id),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 查询工具函数
// ─────────────────────────────────────────────────────────────────────────────

/** 是否是白球 */
export function isCueBall(ball: BallData): boolean {
  return ball.id === 0;
}

/** 是否是黑八 */
export function isEightBall(ball: BallData): boolean {
  return ball.id === 8;
}

/** 是否已落袋 */
export function isPocketed(ball: BallData): boolean {
  return ball.state === BallState.Pocketed;
}

/** 是否仍在台面（未落袋） */
export function isOnTable(ball: BallData): boolean {
  return ball.state !== BallState.Pocketed;
}

/** 是否静止 */
export function isIdle(ball: BallData): boolean {
  return ball.state === BallState.Idle;
}

/**
 * 获取某分组的所有球（不含白球和黑八）。
 * @param balls 全部球数组（0-15 号）
 * @param group 目标分组 Solid | Stripe
 */
export function getBallsByGroup(balls: BallData[], group: BallGroup.Solid | BallGroup.Stripe): BallData[] {
  return balls.filter(b => b.group === group);
}

/**
 * 判断某分组的球是否全部落袋。
 * @param balls 全部球数组
 * @param group Solid（1-7）或 Stripe（9-15）
 */
export function isGroupAllPocketed(balls: BallData[], group: BallGroup.Solid | BallGroup.Stripe): boolean {
  return getBallsByGroup(balls, group).every(isPocketed);
}

/**
 * 获取台面上仍活跃（未落袋）的有色球（不含白球）的数量。
 */
export function countActiveBalls(balls: BallData[]): number {
  return balls.filter(b => b.id !== 0 && isOnTable(b)).length;
}
