/**
 * IPhysicsAdapter.ts
 * 物理引擎适配器接口。
 *
 * GameSession 通过此接口与底层物理引擎通信，使引擎可被替换或 Mock 测试。
 * 具体实现（如 Cocos Physics2D 实现）由外层注入。
 */

import { Vec2 } from 'cc';

// ─────────────────────────────────────────────
//  数据类型
// ─────────────────────────────────────────────

/** 物理材质配置，与引擎无关的纯数据描述 */
export interface PhysicsMaterialConfig {
    density:     number;
    restitution: number;
    friction:    number;
}

/** 线段，用于描述桌边 */
export interface LineSegment {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

// ─────────────────────────────────────────────
//  接口
// ─────────────────────────────────────────────

/**
 * 物理引擎适配器。
 *
 * 生命周期：
 *   1. `setup()` —— 初始化物理世界
 *   2. `addBall / addBorderSegments / addHoleSensor` —— 创建刚体
 *   3. 每帧由引擎驱动，通过 `onCollision / onSensorEnter / onBagBottomHit` 回调通知上层
 *   4. `teardown()` —— 清理
 */
export interface IPhysicsAdapter {

    // ── 初始化 / 清理 ─────────────────────────────────────

    /** 初始化物理世界（设置重力、碰撞分组等） */
    setup(): void;

    /** 销毁所有刚体，清理物理世界 */
    teardown(): void;

    // ── 刚体创建 ──────────────────────────────────────────

    /**
     * 在物理世界中创建一个球刚体。
     * @param id       球的唯一 id（0=白球, 1-7=实色, 8=黑八, 9-15=花色）
     * @param pos      初始位置（像素坐标）
     * @param radius   半径（像素）
     * @param material 物理材质
     */
    addBall(id: number, pos: Vec2, radius: number, material: PhysicsMaterialConfig): void;

    /**
     * 创建一组边界线段刚体（静态体）。
     * @param segments 线段数组
     * @param material 边界材质
     */
    addBorderSegments(segments: LineSegment[], material: PhysicsMaterialConfig): void;

    /**
     * 创建一个袋口传感器（触发器，不产生碰撞力）。
     * @param pos        传感器圆心位置
     * @param radius     传感器半径
     * @param holeIndex  袋口索引（0-5），回调时原样返回
     */
    addHoleSensor(pos: Vec2, radius: number, holeIndex: number): void;

    // ── 力与速度控制 ──────────────────────────────────────

    /**
     * 向指定球施加一次瞬间冲量（质量×速度增量）。
     * 对应 Lua `PhysicsBody:applyImpulse`。
     */
    applyImpulse(ballId: number, impulse: Vec2): void;

    /**
     * 向指定球施加持续力（每帧力，不是冲量）。
     * 对应高低杆的旋转附加力。
     */
    applyForce(ballId: number, force: Vec2): void;

    /** 清除指定球上所有附加的持续力 */
    resetForces(ballId: number): void;

    /** 获取指定球当前速度（像素/秒） */
    getVelocity(ballId: number): Vec2;

    /** 直接设置指定球速度（用于同步修正） */
    setVelocity(ballId: number, v: Vec2): void;

    /** 获取指定球当前位置 */
    getPosition(ballId: number): Vec2;

    /** 直接设置指定球位置（白球复位等） */
    setPosition(ballId: number, pos: Vec2): void;

    /**
     * 设置线性阻尼（对应 Lua 自定义阻尼系统）。
     * 值越大减速越快；0 表示无阻尼。
     */
    setLinearDamping(ballId: number, value: number): void;

    /** 设置角速度（弧度/秒） */
    setAngularVelocity(ballId: number, av: number): void;

    /** 获取角速度（弧度/秒） */
    getAngularVelocity(ballId: number): number;

    /**
     * 启用/禁用指定球的碰撞响应。
     * 禁用后球穿透所有物体，用于进袋动画阶段。
     */
    setCollisionEnabled(ballId: number, enabled: boolean): void;

    // ── 事件回调（由适配器实现时负责调用） ─────────────────

    /**
     * 两个物体碰撞时回调。
     * @param idA    刚体 A 的 ballId（边界用 -1 表示）
     * @param idB    刚体 B 的 ballId（边界用 -1 表示）
     * @param speed  碰撞相对速度大小（|vA| + |vB|，像素/秒）
     */
    onCollision: (idA: number, idB: number, speed: number) => void;

    /**
     * 球进入袋口传感器时回调。
     * @param ballId     进袋的球 id
     * @param holeIndex  袋口索引（0-5）
     */
    onSensorEnter: (ballId: number, holeIndex: number) => void;

    /**
     * 球碰到袋底（bag-bottom）时回调，用于重置该球的附加力（模拟落袋缓冲）。
     * @param ballId  碰到袋底的球 id
     */
    onBagBottomHit: (ballId: number) => void;
}
