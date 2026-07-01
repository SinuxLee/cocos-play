/**
 * RoutePredictor.ts
 * 瞄准线（路径）预测。
 * 对应原 PhysicalControl.drawRouteDetection() 中的纯计算逻辑（剥离所有渲染操作）。
 * 纯函数，输出几何数据供 UI 层渲染。
 */

import { Vec2 } from 'cc';
import { BallSizeCfg } from '../base/GameConfig';
import { BallState } from '../base/Ball';
import type { BallData } from '../base/Ball';
import {
  rotateToLocalSpace,
  circleIntersectsRect,
  distance,
  collisionLineOffset,
  rayLengthToTableEdge,
  normalizeAngle,
} from './BilliardsMath';

// ─────────────────────────────────────────────────────────────────────────────
// 数据类型
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 路径预测结果，供 UI 层使用，决定如何绘制瞄准线。
 */
export interface RouteResult {
  /**
   * 瞄准线有效长度（从白球到接触点的距离，减去球半径）。
   * 对应原代码中 _line.setContentSize(size, ...) 的 size 值。
   */
  lineLength: number;
  /**
   * 瞄准圆（白球幽灵圆）的中心距白球的距离。
   * 对应原 _circle.setPosition(x, ...) 的 x 值。
   */
  circleDistance: number;
  /**
   * 第一个被瞄准的目标球 ID（-1 表示无目标球，直接打到边框）。
   */
  targetBallId: number;
  /**
   * 白球碰撞后的反弹线角度（度）。
   * 仅当 targetBallId >= 0 时有效。
   */
  whiteBallDeflectAngle: number;
  /**
   * 白球碰撞后的反弹线长度（像素）。
   */
  whiteBallLineLength: number;
  /**
   * 目标球被击中后的运动线角度（度，垂直于反弹线）。
   */
  colorBallDeflectAngle: number;
  /**
   * 目标球线长度。
   */
  colorBallLineLength: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 射线检测宽度常量
// 原代码中 _borderWidth = 1136（与桌面等宽的检测矩形）
// ─────────────────────────────────────────────────────────────────────────────

const DETECTION_BOX_WIDTH = 1136;

// ─────────────────────────────────────────────────────────────────────────────
// 核心函数
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 计算瞄准线的几何数据。
 * 对应原 PhysicalControl.drawRouteDetection() 的计算部分。
 *
 * @param cueAngleDeg    球杆旋转角度（度，对应原 cue:getRotation()）
 * @param whiteBallPos   白球位置（desk 坐标）
 * @param whiteBallAngle 白球自身旋转角度（度，对应原 whiteBall:getRotation()）
 * @param refPos         射线检测矩形的参考点（desk 坐标，对应原 _rectPos）
 * @param targetBalls    所有台面上的目标球（不含白球，不含已落袋球）
 */
export function predictRoute(
  cueAngleDeg: number,
  whiteBallPos: Vec2,
  whiteBallAngle: number,
  refPos: Vec2,
  targetBalls: BallData[],
): RouteResult {
  const radius = BallSizeCfg.radius;

  // 瞄准角度（归一化）= 360 - 球杆角度 - 白球自身旋转
  // 对应原 rotate = changeAngleTo0to360(360 - rotate - whiteBall:getRotation())
  const aimAngle = normalizeAngle(360 - cueAngleDeg - whiteBallAngle);

  // 碰撞候选球列表（ball id + 到白球的距离）
  const candidates: Array<{ ballId: number; distToWhite: number }> = [];

  for (const ball of targetBalls) {
    if (ball.state === BallState.Pocketed) continue;
    if (ball.position.x <= 0) continue;  // 已落袋球位置可能在桌外

    const { rx, ry } = rotateToLocalSpace(
      refPos.x, refPos.y,
      ball.position.x, ball.position.y,
      aimAngle,
    );

    const ballDiam = BallSizeCfg.diameter;
    if (circleIntersectsRect(DETECTION_BOX_WIDTH, ballDiam, ballDiam / 2, rx, ry)) {
      candidates.push({
        ballId: ball.id,
        distToWhite: distance(whiteBallPos.x, whiteBallPos.y, ball.position.x, ball.position.y),
      });
    }
  }

  if (candidates.length > 0) {
    // 取距白球最近的候选球
    candidates.sort((a, b) => a.distToWhite - b.distToWhite);
    const nearest = candidates[0];
    const targetBall = targetBalls.find(b => b.id === nearest.ballId)!;
    const targetPos = targetBall.position;

    const { offset, side } = collisionLineOffset(aimAngle, targetPos, whiteBallPos, radius);
    const dist = nearest.distToWhite;

    // 瞄准线长度（白球到接触点，不含球体本身）
    const lineLength = dist - offset - radius;
    // 白球幽灵圆的位置
    const circleDistance = dist - offset;

    // 白球碰撞后偏转角
    const deflectAngle = Math.asin(offset / radius / 2) * 180 / Math.PI;
    const whiteBallDeflectAngle = side * deflectAngle;
    const whiteBallLineLength   = 90 - deflectAngle + radius;

    // 目标球运动线（垂直于白球偏转方向）
    const colorBallDeflectAngle = side * deflectAngle - side * 90;
    const colorBallLineLength   = deflectAngle + radius;

    return {
      lineLength,
      circleDistance,
      targetBallId: nearest.ballId,
      whiteBallDeflectAngle,
      whiteBallLineLength,
      colorBallDeflectAngle,
      colorBallLineLength,
    };
  } else {
    // 无目标球：瞄准线直接打到边框
    const lineLength     = rayLengthToTableEdge(aimAngle, whiteBallPos, radius);
    const circleDistance = lineLength + radius;

    return {
      lineLength,
      circleDistance,
      targetBallId:           -1,
      whiteBallDeflectAngle:  0,
      whiteBallLineLength:    0,
      colorBallDeflectAngle:  0,
      colorBallLineLength:    0,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 辅助：判断当前瞄准的目标球是否是合法目标（用于高亮圆圈颜色）
// 对应原 drawRouteDetection 中的 setCircleByLegal 判断逻辑
// ─────────────────────────────────────────────────────────────────────────────

import { BallGroup } from '../base/Ball';

/**
 * 根据当前玩家应打的颜色和瞄准的目标球，判断目标球是否合法。
 * 合法 → 显示白色瞄准圆；非法 → 显示红色瞄准圆，且隐藏分离线。
 *
 * @param targetBallId  被瞄准的球 ID（-1 表示无目标球）
 * @param playerGroup   当前玩家应打的分组
 *                      None  → 未分配（开局），所有球均合法
 *                      Solid → 应打 1-7（全色）
 *                      Stripe→ 应打 9-15（花色）
 *                      Eight → 应打 8 号黑球
 */
export function isAimTargetLegal(targetBallId: number, playerGroup: BallGroup): boolean {
  if (targetBallId < 0) return true;  // 无目标球，圆圈不需要变红

  switch (playerGroup) {
    case BallGroup.None:
      return true; // 未分配颜色，任何球都可以打
    case BallGroup.Solid:
      return targetBallId >= 1 && targetBallId <= 7;
    case BallGroup.Stripe:
      return targetBallId >= 9 && targetBallId <= 15;
    case BallGroup.Eight:
      return targetBallId === 8;
    default:
      return true;
  }
}
