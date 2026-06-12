/**
 * ShotCalculator.ts
 * 击球参数 → 物理量的计算。
 * 纯函数，对应原 Cue.lua 的 launchBall() 中的力学计算部分（剥离所有网络和动画代码）。
 */

import { Vec2 } from 'cc';
import { ShotCfg } from '../base/GameConfig';
import { normalizeAngle, toRadians } from './BilliardsMath';

// ─────────────────────────────────────────────────────────────────────────────
// 数据类型
// ─────────────────────────────────────────────────────────────────────────────

/** 击球输入参数 */
export interface ShotParams {
  /**
   * 球杆角度（度，desk 坐标系，[0, 360)）。
   * 与白球位置共同决定冲量方向。
   */
  cueAngleDeg: number;
  /**
   * 力度百分比，范围 [0, 1]（由力度条 0~100% 归一化而来）。
   * 0 = 最轻，1 = 最重。
   */
  forcePercent: number;
  /**
   * 左右旋（侧旋）系数，范围 [-1, 1]。
   * 负值左旋，正值右旋，0 = 无旋转。
   * 来自高低杆界面的横向偏移。
   */
  spinX: number;
  /**
   * 高低杆系数，范围 [-1, 1]。
   * 正值上旋（顶杆），负值下旋（拉杆），0 = 中杆。
   * 来自高低杆界面的纵向偏移。
   */
  spinY: number;
}

/** 击球结果：需要通过 IPhysicsAdapter 施加到白球的物理量 */
export interface ShotPhysics {
  /**
   * 主冲量（impulse），通过 applyLinearImpulseToCenter 施加。
   * 单位：像素·质量/秒（在引擎中需按 PTM 换算）。
   */
  impulse: Vec2;
  /**
   * 角速度（用于左右旋），通过 setAngularVelocity 设置。
   * 单位：弧度/秒。
   */
  angularVelocity: number;
  /**
   * 高低杆持续力（continuous force），通过 applyForce 在击球后持续施加约 0.5 秒。
   * 单位：像素·质量/秒²。
   * 注：此力需要在延迟 0.5s 后通过 resetForces() 清除（对应原代码中的 Sequence + DelayTime）。
   */
  continuousForce: Vec2;
}

// ─────────────────────────────────────────────────────────────────────────────
// 核心计算函数
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 根据击球参数计算需要施加到白球上的物理量。
 * 对应原 Cue.launchBall() 中的力学计算（practise 分支）。
 *
 * 原公式：
 *   impulse     = direction * lineSpeedRatio * forcePercent
 *   angularVel  = leftRightForceRatio * spinX
 *   contForce   = direction * rotateForceRatio * forcePercent * spinY
 *
 * @param params   击球参数
 * @param whiteBallPos 白球当前位置（desk 坐标），用于从角度计算方向向量
 * @returns 需要施加的物理量
 */
export function calculateShot(params: ShotParams, whiteBallPos: Vec2): ShotPhysics {
  const { cueAngleDeg, forcePercent, spinX, spinY } = params;

  // 将球杆角度转换为冲量方向向量。
  // 球杆指向白球，冲量方向为球杆 → 白球（即从球杆尾部指向球头，再指向白球）。
  // 原代码通过 spriteTag（标记点）坐标与白球坐标的差值计算方向，等价于按角度计算。
  const angleRad = toRadians(normalizeAngle(cueAngleDeg));
  // 球杆角度对应的击球方向（与球杆方向相反，指向白球前方）
  const dirX = Math.cos(angleRad);
  const dirY = Math.sin(angleRad);

  // 主冲量
  const impulseMag = ShotCfg.lineSpeedRatio * forcePercent;
  const impulse = new Vec2(dirX * impulseMag, dirY * impulseMag);

  // 左右旋角速度
  const angularVelocity = ShotCfg.leftRightForceRatio * spinX;

  // 高低杆持续力
  const forceMag = ShotCfg.rotateForceRatio * forcePercent * spinY;
  const continuousForce = new Vec2(dirX * forceMag, dirY * forceMag);

  return { impulse, angularVelocity, continuousForce };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3D 滚动动画辅助
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 根据 2D 线速度计算 3D 球体应施加的角速度（用于滚动动画）。
 * 对应原 EightBall.adjustBallSpeed() 中对 Bullet rigidBody 设置角速度的逻辑。
 *
 * @param linearVelocity2D  2D 物理体的线速度
 * @param angularVelocity2D 2D 物理体的角速度（Z 轴）
 * @returns 3D 刚体的角速度 (x, y, z)
 */
export function calc3DRollAngularVelocity(
  linearVelocity2D: Vec2,
  angularVelocity2D: number,
): { x: number; y: number; z: number } {
  const rate = ShotCfg.ballRollingRate;
  return {
    x: -linearVelocity2D.y / rate,
    y:  linearVelocity2D.x / rate,
    z:  angularVelocity2D  / rate,
  };
}
