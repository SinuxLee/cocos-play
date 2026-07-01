/**
 * Table.ts
 * 球桌物理数据：边界线段、袋口传感器、球袋管道、开球摆球布局。
 * 所有坐标均以 desk 节点的本地坐标系（左下角为原点，Y 轴向上，像素单位）。
 * 纯数据层，不含任何渲染或物理引擎调用。
 */

import { Vec2 } from 'cc';
import { BallSizeCfg, HoleCfg, TableCfg } from '../base/GameConfig';
import { createBallData } from '../base/Ball';
import type { BallData } from '../base/Ball';

// ─────────────────────────────────────────────────────────────────────────────
// 基础数据类型
// ─────────────────────────────────────────────────────────────────────────────

export interface LineSegment {
  start: Readonly<{ x: number; y: number }>;
  end:   Readonly<{ x: number; y: number }>;
}

export interface HoleSensor {
  /** 袋口索引 (0-5) */
  index:  number;
  /** 圆心坐标 */
  center: Readonly<{ x: number; y: number }>;
  /** 物理传感器半径 */
  radius: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 台球桌外边界（4 条围边，desk contentSize 大小）
// 由引擎层通过 desk.contentSize 动态生成，此处提供工厂函数
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 根据桌面宽高生成 4 条外边界线段。
 * 对应原 createEightBallOutBorder()。
 */
export function createOuterBorderSegments(width: number, height: number): LineSegment[] {
  return [
    { start: { x: 0,     y: 0      }, end: { x: width, y: 0      } }, // 下
    { start: { x: 0,     y: 0      }, end: { x: 0,     y: height } }, // 左
    { start: { x: width, y: 0      }, end: { x: width, y: height } }, // 右
    { start: { x: 0,     y: height }, end: { x: width, y: height } }, // 上
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// 台球桌内边界（含袋口缺口的实际可弹边界）
// 对应原 createEightBallInnerBorder()，固定坐标
// ─────────────────────────────────────────────────────────────────────────────

export const INNER_BORDER_SEGMENTS: ReadonlyArray<LineSegment> = Object.freeze([
  // 下边（分两段，中间留袋口缺口）
  { start: { x:  91, y:  59 }, end: { x: 457, y:  59 } },
  { start: { x: 512, y:  59 }, end: { x: 878, y:  59 } },
  // 右边（单段）
  { start: { x: 910, y:  92 }, end: { x: 910, y: 455 } },
  // 上边（分两段）
  { start: { x: 878, y: 488 }, end: { x: 512, y: 488 } },
  { start: { x: 456, y: 488 }, end: { x:  91, y: 488 } },
  // 左边（单段）
  { start: { x:  58, y: 456 }, end: { x:  58, y:  91 } },
]);

// ─────────────────────────────────────────────────────────────────────────────
// 袋中管道边界（让落袋球沿管道滚入袋底）
// 对应原 createBagBorder()，固定坐标；使用 BagBorderMaterial
// ─────────────────────────────────────────────────────────────────────────────

export const BAG_BORDER_SEGMENTS: ReadonlyArray<LineSegment> = Object.freeze([
  { start: { x:   3, y: 470 }, end: { x: -11, y: 470 } },
  { start: { x: -11, y: 470 }, end: { x: -21, y: 463 } },
  { start: { x: -21, y: 463 }, end: { x: -21, y:  35 } },
  // 袋底（tag = bagBottom，碰撞回调中球接触此段则停止）
  { start: { x: -21, y:  35 }, end: { x: -54, y:  35 } },
  { start: { x: -54, y:  35 }, end: { x: -54, y: 492 } },
  { start: { x: -54, y: 492 }, end: { x: -45, y: 505 } },
  { start: { x: -45, y: 505 }, end: { x:   5, y: 505 } },
]);

/** 袋底线段在 BAG_BORDER_SEGMENTS 中的索引（球碰到此段需调用 resetForceAndEffect） */
export const BAG_BOTTOM_SEGMENT_INDEX = 3;

// ─────────────────────────────────────────────────────────────────────────────
// 袋口传感器（Sensor，穿透触发进袋）
// 对应原 createEightBallHoleBorder()
// ─────────────────────────────────────────────────────────────────────────────

export const HOLE_SENSORS: ReadonlyArray<HoleSensor> = Object.freeze(
  HoleCfg.positions.map((pos, i) => Object.freeze({
    index:  i,
    center: pos,
    radius: BallSizeCfg.radius * HoleCfg.sensorRadiusMultiplier,
  }))
);

// ─────────────────────────────────────────────────────────────────────────────
// 开球摆球顺序（ballPosIndex）
// 决定 15 颗目标球在三角形中每个格子里放哪颗球（1-15 号）
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 三角形摆球顺序表。共 15 个位置，按行从上到下、每行从左到右排列。
 * 第 5 个位置（索引 4）固定为 8 号球（三角形正中心）。
 *
 * 原 ballPosIndex 数组：[1,2,9,10,8,3,4,11,5,12,13,6,14,15,7]
 */
export const RACK_BALL_ORDER: ReadonlyArray<number> = Object.freeze([
  1, 2, 9, 10,  8,   // 第1行1个，第2行2个，第3行2个（8在中心）
  3, 4, 11,          // 第3行后段和第4行前段
  5, 12, 13,         // 第4行
  6, 14, 15, 7,      // 第5行
]);

// 注：上方按逻辑分组标注，实际是单一平铺数组 [1,2,9,10,8,3,4,11,5,12,13,6,14,15,7]
// 对应原数组不变，此处重新整理为正确顺序：
const _RACK_ORDER_CORRECT = Object.freeze([1, 2, 9, 10, 8, 3, 4, 11, 5, 12, 13, 6, 14, 15, 7]);
export { _RACK_ORDER_CORRECT as RACK_BALL_ORDER_CORRECT };

// ─────────────────────────────────────────────────────────────────────────────
// 开球摆球坐标生成
// 对应原 createEightBallAllBalls() / resetAllBallsPos() 中的摆球循环
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 生成 15 颗目标球的初始位置数组（按 RACK_BALL_ORDER 顺序）。
 *
 * @param tableHeight 桌面高度（像素），用于计算垂直中心
 * @returns 长度 15 的坐标数组，positions[i] 对应 RACK_BALL_ORDER_CORRECT[i] 号球的位置
 */
export function generateRackPositions(tableHeight: number): Vec2[] {
  const diameter = BallSizeCfg.diameter + 2;  // 原代码 radius*2+2（留 2px 间隙）
  const positions: Vec2[] = [];

  // 球堆顶点（最左列）
  let ballX = TableCfg.rackStartX;
  let ballY = tableHeight / 2;

  let idx = 0;
  for (let col = 1; col <= 5; col++) {
    // 每进一列，x 增加 diameter-3，y 下移半个 diameter 作为起始偏移
    ballX += diameter - 3;
    ballY -= diameter;
    const colStartY = ballY;

    for (let row = 0; row < col; row++) {
      ballY += diameter;
      positions[idx] = new Vec2(ballX, ballY);
      idx++;
      // 每列最后一颗球后，将 y 调整为下一列的中间起始点
      if (row === col - 1) {
        ballY = colStartY + diameter / 2;
      }
    }
  }

  return positions;
}

/**
 * 构建初始 BallData 数组（0 号白球 + 1-15 号目标球）。
 * 可直接传给 GameSession.startGame()。
 *
 * @param tableWidth  桌面宽度
 * @param tableHeight 桌面高度
 */
export function createInitialBalls(tableWidth: number, tableHeight: number): BallData[] {
  const balls: BallData[] = [];

  // 0 号白球
  balls.push(createBallData(0, new Vec2(TableCfg.whiteBallInitPos.x, tableHeight / 2)));

  // 1-15 号目标球，按摆球顺序赋予位置
  const positions = generateRackPositions(tableHeight);
  for (let i = 0; i < 15; i++) {
    const ballId  = _RACK_ORDER_CORRECT[i];
    const ballPos = positions[i];
    balls.push(createBallData(ballId, ballPos));
  }

  return balls;
}

// ─────────────────────────────────────────────────────────────────────────────
// 白球合法位置检测辅助数据
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 对应原 checkBallLocationIsLegal() 中使用的内边界值（与 TableCfg.playArea 相同）。
 * 暴露出来方便 BilliardsMath 使用。
 */
export const PLAY_AREA = TableCfg.playArea;
