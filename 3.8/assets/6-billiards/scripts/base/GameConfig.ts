/**
 * GameConfig.ts
 * 游戏全局只读配置。所有常量从原 EightBallDefine.lua 提取并重新分组，消除魔数散落问题。
 * 使用 Object.freeze 保证运行时不可变。
 */

import { Vec2 } from 'cc';

// ─────────────────────────────────────────────────────────────────────────────
// 物理材质配置
// ─────────────────────────────────────────────────────────────────────────────

export interface PhysicsMaterialConfig {
  readonly density: number;
  readonly restitution: number;
  readonly friction: number;
}

export const BallMaterial: Readonly<PhysicsMaterialConfig> = Object.freeze({
  density: 2.7,
  restitution: 0.95,
  friction: 0.0,
});

export const WhiteBallMaterial: Readonly<PhysicsMaterialConfig> = Object.freeze({
  density: 2.7,
  restitution: 0.95,
  friction: 0.2,
});

export const BorderMaterial: Readonly<PhysicsMaterialConfig> = Object.freeze({
  density: 10_000_000,
  restitution: 0.8,
  friction: 0.5,
});

/** 袋中管道材质（高密度、零弹性） */
export const BagBorderMaterial: Readonly<PhysicsMaterialConfig> = Object.freeze({
  density: 1_000_000,
  restitution: 0.0,
  friction: 1.0,
});

// ─────────────────────────────────────────────────────────────────────────────
// 阻尼配置
// ─────────────────────────────────────────────────────────────────────────────

export interface DampingConfig {
  /** 初始线性阻尼（空气阻力） */
  readonly linear: number;
  /** 旋转阻尼 */
  readonly angular: number;
  /** 速度平方低于此值时切换为一次增强阻尼（原 ballDampingValue = 300²） */
  readonly dampingThresholdSq: number;
  /** 速度平方低于此值时切换为二次增强阻尼（原 ballDoubleDampingValue = 150²） */
  readonly doubleDampingThresholdSq: number;
  /** 一次增强阻尼系数 */
  readonly enhancedDamping: number;
  /** 二次增强阻尼系数（趋向停止） */
  readonly doubleEnhancedDamping: number;
  /** 击球后多少秒内不应用减速（开球保护时间） */
  readonly increaseVelocityTime: number;
  /** 判断小球停止的速度阈值（分量绝对值） */
  readonly stopVelocityThreshold: number;
}

export const DampingCfg: Readonly<DampingConfig> = Object.freeze({
  linear: 0.7,
  angular: 1.0,
  dampingThresholdSq: 300 * 300,
  doubleDampingThresholdSq: 150 * 150,
  enhancedDamping: 0.7,
  doubleEnhancedDamping: 1.0,
  increaseVelocityTime: 1.0,
  stopVelocityThreshold: 4.0,
});

// ─────────────────────────────────────────────────────────────────────────────
// 击球力度配置
// ─────────────────────────────────────────────────────────────────────────────

export interface ShotConfig {
  /** 主冲量系数（力度百分比 × 方向 × 此值 = 施加冲量） */
  readonly lineSpeedRatio: number;
  /** 高低杆持续力系数 */
  readonly rotateForceRatio: number;
  /** 左右塞角速度系数 */
  readonly leftRightForceRatio: number;
  /** 3D 球体滚动动画速率（越大滚动越慢） */
  readonly ballRollingRate: number;
}

export const ShotCfg: Readonly<ShotConfig> = Object.freeze({
  lineSpeedRatio: 16_000,
  rotateForceRatio: 10_000,
  leftRightForceRatio: 300,
  ballRollingRate: 20,
});

// ─────────────────────────────────────────────────────────────────────────────
// 球体尺寸配置
// ─────────────────────────────────────────────────────────────────────────────

export interface BallSizeConfig {
  /** 物理半径（像素） */
  readonly radius: number;
  /** 直径（= radius * 2，常用值提前计算） */
  readonly diameter: number;
}

export const BallSizeCfg: Readonly<BallSizeConfig> = Object.freeze({
  radius: 15,
  diameter: 30,
});

// ─────────────────────────────────────────────────────────────────────────────
// 球桌配置
// ─────────────────────────────────────────────────────────────────────────────

export interface TableConfig {
  /** 桌面节点尺寸（宽 × 高，像素） */
  readonly width: number;
  readonly height: number;
  /**
   * 可放球区域内边界（距桌面边缘的安全距离，含球半径）。
   * 白球放置合法性判断：x ∈ [playArea.minX, playArea.maxX]，y 同理。
   * 原代码中散落的 60、913、489 均来自此区域。
   */
  readonly playArea: Readonly<{ minX: number; maxX: number; minY: number; maxY: number }>;
  /**
   * 开球时白球只能在此 x 值左侧（waiting 状态限制）。
   * 原代码中的魔数 273.5。
   */
  readonly breakLineX: number;
  /** 白球初始位置（开局）。原 whiteBallOriginalPos = cc.p(270, 273.5) */
  readonly whiteBallInitPos: Readonly<{ x: number; y: number }>;
  /** 球堆顶点位置（第一列球的 x 坐标）。开球摆球用 */
  readonly rackStartX: number;
}

export const TableCfg: Readonly<TableConfig> = Object.freeze({
  width: 970,
  height: 547,
  playArea: Object.freeze({ minX: 60, maxX: 913, minY: 60, maxY: 489 }),
  breakLineX: 273.5,
  whiteBallInitPos: Object.freeze({ x: 270, y: 273.5 }),
  rackStartX: 650,
});

// ─────────────────────────────────────────────────────────────────────────────
// 袋口配置
// ─────────────────────────────────────────────────────────────────────────────

export interface HoleConfig {
  /** 袋口圆心位置（desk 节点坐标系）。顺序：左下、中下、右下、左上、中上、右上 */
  readonly positions: ReadonlyArray<Readonly<{ x: number; y: number }>>;
  /** 物理传感器半径 = radius × 1.2 */
  readonly sensorRadiusMultiplier: number;
  /** 进洞触发的逻辑判定半径 */
  readonly detectionRadius: number;
}

export const HoleCfg: Readonly<HoleConfig> = Object.freeze({
  positions: Object.freeze([
    Object.freeze({ x: 48, y: 48 }),  // 0: 左下
    Object.freeze({ x: 485, y: 30 }),  // 1: 中下
    Object.freeze({ x: 921, y: 48 }),  // 2: 右下
    Object.freeze({ x: 48, y: 498.6 }),  // 3: 左上
    Object.freeze({ x: 485, y: 516 }),  // 4: 中上
    Object.freeze({ x: 921, y: 498.6 }),  // 5: 右上
  ]),
  sensorRadiusMultiplier: 1.2,
  detectionRadius: BallSizeCfg.radius,
});

// ─────────────────────────────────────────────────────────────────────────────
// 游戏节奏配置
// ─────────────────────────────────────────────────────────────────────────────

export interface GameplayConfig {
  /** 停止检测定时器间隔（秒） */
  readonly checkStopInterval: number;
  /** 快速点击判断时间窗口（秒） */
  readonly quickClickWindow: number;
  /** 球落袋后移出桌面的等待时间（秒） */
  readonly ballInHoleDelay: number;
  /** 精度：保留小数点后几位 */
  readonly precisionDigits: number;
}

export const GameplayCfg: Readonly<GameplayConfig> = Object.freeze({
  checkStopInterval: 0.1,
  quickClickWindow: 0.2,
  ballInHoleDelay: 0.5,
  precisionDigits: 10,
});

// ─────────────────────────────────────────────────────────────────────────────
// 音效 ID
// ─────────────────────────────────────────────────────────────────────────────

export const AudioKey = Object.freeze({
  BALL_HIT: 'BallHit',      // 球与球碰撞
  CUE_HIT: 'CueHit',      // 球杆击球
  POCKET: 'Pocket',       // 球落袋
  FINE_TUNING: 'FineTuning',   // 微调音效
  BGM: 'BilliardsBg',  // 背景音乐
} as const);

export type AudioKeyType = typeof AudioKey[keyof typeof AudioKey];

// ─────────────────────────────────────────────────────────────────────────────
// 音效资源路径
// ─────────────────────────────────────────────────────────────────────────────

export const AudioResPath: Readonly<Record<AudioKeyType, string>> = Object.freeze({
  [AudioKey.BALL_HIT]: 'gameBilliards/sound/BallHit.mp3',
  [AudioKey.CUE_HIT]: 'gameBilliards/sound/CueHit.mp3',
  [AudioKey.POCKET]: 'gameBilliards/sound/Pocket.mp3',
  [AudioKey.FINE_TUNING]: 'gameBilliards/sound/Fine_Tuning.mp3',
  [AudioKey.BGM]: 'gameBilliards/sound/Billiards_Bg_2.mp3',
});
