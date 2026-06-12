/**
 * DampingSystem.ts
 * 台球自定义阻尼系统。
 * 对应原 EightBall.lua 的 adjustBallSpeed() + checkIsStop()。
 * 纯函数/纯逻辑，不直接操作物理引擎。
 */

import { Vec2 } from 'cc';
import { DampingCfg } from '../base/GameConfig';
import type { DampingConfig } from '../base/GameConfig';

// ─────────────────────────────────────────────────────────────────────────────
// 数据类型
// ─────────────────────────────────────────────────────────────────────────────

/** 阻尼更新结果 */
export interface DampingResult {
  /** 是否需要将球强制停止（速度归零） */
  shouldStop: boolean;
  /** 建议设置的线性阻尼值（仅在 shouldStop=false 时有效） */
  linearDamping: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 核心函数
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 根据当前速度和已运动时长，计算应设置的阻尼值或是否停止。
 * 每帧调用一次（在物理步进后）。
 *
 * 阻尼分级逻辑（来自原代码）：
 *   速度² > dampingThresholdSq        → 普通阻尼 linear
 *   速度² ≤ dampingThresholdSq        → 增强阻尼 enhancedDamping
 *   速度² ≤ doubleDampingThresholdSq  → 二次增强阻尼 doubleEnhancedDamping
 *   |vx| < stopThreshold AND |vy| < stopThreshold → 强制停止
 *
 * @param velocity        当前线速度
 * @param elapsedTime     本次击球后已经过的时间（秒）
 * @param cfg             阻尼配置（默认使用 DampingCfg）
 */
export function computeDamping(
  velocity: Vec2,
  elapsedTime: number,
  cfg: DampingConfig = DampingCfg,
): DampingResult {
  // 速度分量绝对值均低于阈值 → 强制停止
  if (Math.abs(velocity.x) < cfg.stopVelocityThreshold &&
      Math.abs(velocity.y) < cfg.stopVelocityThreshold) {
    return { shouldStop: true, linearDamping: cfg.doubleEnhancedDamping };
  }

  // 开球保护时间内不减速
  if (elapsedTime <= cfg.increaseVelocityTime) {
    return { shouldStop: false, linearDamping: cfg.linear };
  }

  // 分级阻尼
  const speedSq = velocity.x ** 2 + velocity.y ** 2;
  if (speedSq <= cfg.doubleDampingThresholdSq) {
    return { shouldStop: false, linearDamping: cfg.doubleEnhancedDamping };
  } else if (speedSq <= cfg.dampingThresholdSq) {
    return { shouldStop: false, linearDamping: cfg.enhancedDamping };
  } else {
    return { shouldStop: false, linearDamping: cfg.linear };
  }
}

/**
 * 判断球是否已满足停止条件（速度足够低）。
 * 对应原 EightBall.checkIsStop()。
 *
 * @param velocity  当前线速度
 * @param threshold 停止判断阈值（默认使用 DampingCfg.stopVelocityThreshold）
 */
export function isBallStopped(
  velocity: Vec2,
  threshold: number = DampingCfg.stopVelocityThreshold,
): boolean {
  return Math.abs(velocity.x) < threshold && Math.abs(velocity.y) < threshold;
}

/**
 * 判断台面上是否所有运动中的球都已停止。
 * 对应原 EBGameControl.getIsBallAllStop()，但解耦了 mainLayer 引用。
 *
 * @param velocities 所有台面上球的速度映射 (ballId → velocity)
 * @param threshold  停止阈值
 */
export function areAllBallsStopped(
  velocities: Map<number, Vec2>,
  threshold: number = DampingCfg.stopVelocityThreshold,
): boolean {
  for (const [, vel] of velocities) {
    if (!isBallStopped(vel, threshold)) {
      return false;
    }
  }
  return true;
}
