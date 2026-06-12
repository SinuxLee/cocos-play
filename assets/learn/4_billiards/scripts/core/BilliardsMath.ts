/**
 * BilliardsMath.ts
 * 台球游戏专用几何与数学工具函数。
 * 全部为纯函数（无副作用，无全局状态），可独立单测。
 * 对应原 MathMgr.lua，并修正了命名和冗余。
 */

import { Vec2 } from 'cc';
import type { BallData } from '../base/Ball';
import { BallSizeCfg } from '../base/GameConfig';

// ─────────────────────────────────────────────────────────────────────────────
// 角度工具
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 将任意角度归一化到 [0, 360) 区间。
 * 对应原 changeAngleTo0to360()。
 */
export function normalizeAngle(angle: number): number {
  angle = angle % 360;
  if (angle < 0) angle += 360;
  return angle;
}

/**
 * 将度数转为弧度。
 */
export function toRadians(deg: number): number {
  return deg * Math.PI / 180;
}

/**
 * 将弧度转为度数。
 */
export function toDegrees(rad: number): number {
  return rad * 180 / Math.PI;
}

/**
 * 根据触摸点和白球坐标计算球杆需要旋转的角度（度数）。
 * 返回值已归一化到 [0, 360)。
 * 对应原 getAngularByTouchPosAndBallPos()。
 *
 * @param touchPos 触摸点坐标（desk 坐标系）
 * @param ballPos  白球坐标（desk 坐标系）
 */
export function angleBetweenTouchAndBall(touchPos: Vec2, ballPos: Vec2): number {
  const dx = ballPos.x - touchPos.x;
  const dy = ballPos.y - touchPos.y;

  // 使用 atan2 更健壮（原代码用 atan 需要分四象限处理，atan2 自动正确）
  let angle = toDegrees(Math.atan2(dy, dx));
  // atan2 返回 (-180, 180]，转换为 CocosCreator 惯用的 [0, 360)
  return normalizeAngle(angle);
}

/**
 * 根据球杆角度和力度百分比，计算球杆相对于球心的偏移量。
 * 用于在拖拽力度条时实时更新球杆位置。
 * 对应原 getCuePosByRotate()。
 *
 * @param cueAngle 球杆角度（度，已归一化到 [0,360)）
 * @param percent  力度百分比对应的偏移距离（像素）
 * @returns (posX, posY) 相对于球心的偏移
 */
export function cueOffsetByAngle(cueAngle: number, percent: number): Vec2 {
  const rad = toRadians(cueAngle);
  // 球杆锚点在右侧，向球杆旋转方向的反方向偏移
  const posX = -Math.cos(rad) * percent;
  const posY =  Math.sin(rad) * percent;
  return new Vec2(posX, posY);
}

// ─────────────────────────────────────────────────────────────────────────────
// 距离工具
// ─────────────────────────────────────────────────────────────────────────────

/** 两点间欧氏距离 */
export function distance(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

/** 两点间距离的平方（避免开方，用于比较大小时性能更好） */
export function distanceSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

// ─────────────────────────────────────────────────────────────────────────────
// 直线方程
// ─────────────────────────────────────────────────────────────────────────────

/** 直线方程系数：Ax + By + C = 0 */
export interface LineEquation {
  A: number;
  B: number;
  C: number;
}

/**
 * 根据角度（弧度）和直线上一点（白球位置），得到直线方程系数。
 * 对应原 getLineEquation()。
 *
 * @param angleRad 角度（弧度）
 * @param point    直线上一点
 */
export function lineEquationFromAngle(angleRad: number, point: Vec2): LineEquation {
  const tanVal = Math.tan(angleRad);
  return {
    A: -tanVal,
    B: 1,
    C: tanVal * point.x - point.y,
  };
}

/**
 * 点到直线（Ax+By+C=0）的有符号距离。
 * 正值表示点在直线正法线方向，负值反之。
 */
export function signedDistancePointToLine(eq: LineEquation, point: Vec2): number {
  return (eq.A * point.x + eq.B * point.y + eq.C) / Math.sqrt(eq.A * eq.A + eq.B * eq.B);
}

// ─────────────────────────────────────────────────────────────────────────────
// 路径检测几何
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 将目标点相对于参考点旋转到局部坐标系，得到新的 (rx, ry)。
 * 用于路径检测：把球的坐标旋转到"以白球为原点、瞄准方向为 x 轴"的局部系。
 * 对应原 getNewRx_Ry()。
 *
 * @param refX    参考点 x（射线检测矩形在桌面的位置）
 * @param refY    参考点 y
 * @param targetX 目标点 x（球的位置）
 * @param targetY 目标点 y
 * @param angleDeg 旋转角度（度）
 */
export function rotateToLocalSpace(
  refX: number, refY: number,
  targetX: number, targetY: number,
  angleDeg: number
): { rx: number; ry: number } {
  const dist = distance(refX, refY, targetX, targetY);
  // 两点连线与 X 轴的夹角（数学角度）
  const lineAngleDeg = toDegrees(Math.atan2(targetY - refY, targetX - refX));
  // 旋转到局部坐标系
  const localAngleRad = toRadians(lineAngleDeg - angleDeg);
  return {
    rx: Math.cos(localAngleRad) * dist,
    ry: Math.sin(localAngleRad) * dist,
  };
}

/**
 * 判断圆心（rx, ry）是否与一条宽 w、高 h 的矩形碰撞（矩形以原点为中心）。
 * 对应原 computeCollision()，用于路径检测中的球-射线宽度相交判断。
 *
 * @param w     矩形宽度（射线检测框的长度，原 1136px）
 * @param h     矩形高度（= 球的直径）
 * @param r     圆的半径（= 球的半径）
 * @param rx    圆心在局部坐标系中的 x
 * @param ry    圆心在局部坐标系中的 y
 */
export function circleIntersectsRect(
  w: number, h: number, r: number,
  rx: number, ry: number
): boolean {
  // 找矩形上离圆心最近的点
  const clampedX = Math.max(-w * 0.5, Math.min(rx, w * 0.5));
  const clampedY = Math.max(-h * 0.5, Math.min(ry, h * 0.5));
  return (clampedX - rx) ** 2 + (clampedY - ry) ** 2 <= r * r - 1;
}

/**
 * 计算瞄准线在碰到目标球时，白球的碰撞推进量（接触点偏移）以及偏转方向。
 * 对应原 getShortestDistanceBetweenPointAndLine()。
 *
 * @param angleDeg  瞄准角度（度）
 * @param targetPos 目标球位置
 * @param whitePos  白球位置
 * @param radius    球半径
 * @returns { offset: 接触点偏移量, side: +1 或 -1（目标球在直线左/右侧） }
 */
export function collisionLineOffset(
  angleDeg: number,
  targetPos: Vec2,
  whitePos: Vec2,
  radius: number
): { offset: number; side: number } {
  const eq = lineEquationFromAngle(toRadians(angleDeg), whitePos);
  const perpDist = Math.abs(
    (eq.A * targetPos.x + eq.B * targetPos.y + eq.C) /
    Math.sqrt(eq.A * eq.A + eq.B * eq.B)
  );
  const offset = Math.sqrt(4 * radius * radius - perpDist * perpDist);

  // 判断目标球在直线的哪一侧（用于白球/目标球分离线角度计算）
  const signedDist = eq.A * targetPos.x + eq.B * targetPos.y + eq.C;
  let side: number;
  if (angleDeg >= 0 && angleDeg < 90 || angleDeg >= 270 && angleDeg <= 360) {
    side = signedDist > 0 ? 1 : -1;
  } else {
    side = signedDist > 0 ? -1 : 1;
  }

  return { offset, side };
}

/**
 * 计算白球沿瞄准方向到台面边界的距离（不碰撞任何球的情况）。
 * 用于无目标球时调整瞄准圆的位置。
 * 对应原 getLineLengthBetweenPointAndLine()。
 *
 * @param angleDeg  瞄准角度（度，[0,360)）
 * @param whitePos  白球在桌面坐标（desk 本地坐标）
 * @param radius    球半径
 */
export function rayLengthToTableEdge(angleDeg: number, whitePos: Vec2, radius: number): number {
  // 原代码将白球位置偏移到内边界区域坐标系（原 -58, -59 的偏移）
  const localX = whitePos.x - 58;
  const localY = whitePos.y - 59;
  const borderWidth  = 854;  // 原 borderWidth（910 - 58）
  const borderHeight = 431;  // 原 borderHeight（489 - 59 - 约为 430）

  const angle = normalizeAngle(angleDeg);

  if (angle <= 90) {
    const rad  = toRadians(angle);
    const projH = (borderWidth - localX) * Math.tan(rad);
    if (projH <= borderHeight - localY) {
      return projH / Math.sin(rad) - radius / Math.cos(rad);
    }
    return (borderHeight - localY) / Math.sin(rad) - radius / Math.sin(rad);

  } else if (angle <= 180) {
    const rad  = toRadians(180 - angle);
    const projH = localX * Math.tan(rad);
    if (projH <= borderHeight - localY) {
      return projH / Math.sin(rad) - radius / Math.cos(rad);
    }
    return (borderHeight - localY) / Math.sin(rad) - radius / Math.sin(rad);

  } else if (angle <= 270) {
    const rad  = toRadians(angle - 180);
    const projH = localX * Math.tan(rad);
    if (projH <= localY) {
      return projH / Math.sin(rad) - radius / Math.cos(rad);
    }
    return localY / Math.sin(rad) - radius / Math.sin(rad);

  } else {
    const rad  = toRadians(360 - angle);
    const projH = (borderWidth - localX) * Math.tan(rad);
    if (projH <= localY) {
      return (borderWidth - localX) / Math.cos(rad) - radius / Math.cos(rad);
    }
    return localY / Math.sin(rad) - radius / Math.sin(rad);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 白球位置合法性
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayArea {
  minX: number; maxX: number;
  minY: number; maxY: number;
}

/**
 * 判断白球放置位置是否完全在桌面边界外。
 * 对应原 checkBallLocationIsOut()。
 */
export function isBallOutOfBounds(pos: Vec2, area: PlayArea, radius: number): boolean {
  return !(pos.x > area.minX + radius && pos.x < area.maxX - radius &&
           pos.y > area.minY + radius && pos.y < area.maxY - radius);
}

/**
 * 判断白球放置位置是否合法（在边界内且不与任何目标球重叠）。
 * 对应原 checkBallLocationIsLegal()。
 *
 * @param pos       待放置位置
 * @param area      可放球区域
 * @param otherBalls 需要检测碰撞的其他球（通常是 1-15 号球）
 * @param ballRadius 球半径
 */
export function isBallPositionLegal(
  pos: Vec2,
  area: PlayArea,
  otherBalls: BallData[],
  ballRadius: number = BallSizeCfg.radius,
): boolean {
  const minX = area.minX + ballRadius;
  const maxX = area.maxX - ballRadius;
  const minY = area.minY + ballRadius;
  const maxY = area.maxY - ballRadius;

  if (pos.x <= minX || pos.x >= maxX || pos.y <= minY || pos.y >= maxY) {
    return false;
  }

  const minDistSq = (ballRadius * 2) ** 2;
  for (const ball of otherBalls) {
    if (distanceSq(pos.x, pos.y, ball.position.x, ball.position.y) <= minDistSq) {
      return false;
    }
  }

  return true;
}

/**
 * 在给定起始位置附近自动搜索合法的白球放置坐标。
 * 沿 +x 方向递增搜索，直到找到合法位置。
 * 对应原 dealWhiteBallInHole() 中的 while 循环。
 *
 * @param startPos    初始候选位置
 * @param area        可放球区域
 * @param otherBalls  台面上其他球
 * @param step        每次搜索步长（像素）
 */
export function findLegalCueBallPosition(
  startPos: Vec2,
  area: PlayArea,
  otherBalls: BallData[],
  step: number = BallSizeCfg.diameter + 5,
): Vec2 {
  let pos = startPos.clone();
  let attempts = 0;
  const maxAttempts = 50;

  while (attempts < maxAttempts) {
    if (isBallPositionLegal(pos, area, otherBalls)) {
      return pos;
    }
    pos = new Vec2(pos.x + step, pos.y);
    attempts++;
  }

  // 兜底：返回原位（极端情况下桌面拥挤无法放置）
  console.warn('[BilliardsMath] Could not find a legal cue ball position after', maxAttempts, 'attempts.');
  return startPos.clone();
}

// ─────────────────────────────────────────────────────────────────────────────
// 精度截断
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 截断数值到指定精度（保留指定位小数，通过截断而非四舍五入）。
 * 对应原 GetPreciseDecimal()。
 *
 * @param num    原始数值
 * @param digits 保留小数位数（默认 10）
 */
export function truncatePrecision(num: number, digits: number = 10): number {
  const factor = Math.pow(10, digits);
  return Math.trunc(num * factor) / factor;
}
