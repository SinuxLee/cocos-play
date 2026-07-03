/**
 * TweenLib.ts
 * ------------------------------------------------------------
 * Cocos Creator 3.x 生产级缓动效果库
 * 120+ 个游戏行业常用缓动效果，静态方法，import 即用，无需挂节点。
 *
 * 用法示例：
 *   import { TweenLib } from './TweenLib';
 *   TweenLib.iconBreath(this.node);
 *   TweenLib.buttonPressDown(this.node);
 *
 * 另附 TweenFX 组件（文件底部），可直接拖到任意节点上，
 * 在 Inspector 面板下拉选择效果类型，不用写代码。
 *
 * 说明：
 * - 所有方法返回 Tween<Node> 或 void，方便外部再 .stop() / 链式扩展。
 * - 依赖 UIOpacity 的方法会自动 getComponent/addComponent，无需手动挂。
 * - 2D 旋转统一用 node.angle（Z 轴角度，单位：度）。
 * ------------------------------------------------------------
 */

import { _decorator, Color, Component, Enum, Node, Sprite, tween, Tween, UIOpacity, v3, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

// ============================================================
// 内部通用工具（不对外暴露，供下面 120+ 方法复用，避免重复造轮子）
// ============================================================

function opacityOf(node: Node): UIOpacity {
    return node.getComponent(UIOpacity) || node.addComponent(UIOpacity);
}

function spriteOf(node: Node): Sprite | null {
    return node.getComponent(Sprite);
}

/** 通用：轴向抖动（往返 N 次后回到原位） */
function shakeAxis(node: Node, axis: 'x' | 'y', amplitude: number, duration: number, times: number): Tween<Node> {
    const seg = duration / (times * 2);
    const origin = node.position.clone();
    let t = tween(node);
    for (let i = 0; i < times; i++) {
        const offset = axis === 'x' ? v3(amplitude, 0, 0) : v3(0, amplitude, 0);
        const neg = axis === 'x' ? v3(-amplitude, 0, 0) : v3(0, -amplitude, 0);
        t = t.by(seg, { position: offset }).by(seg, { position: neg });
    }
    t = t.to(0.01, { position: origin });
    return t.start();
}

/** 通用：缩放冲击（放大再回弹） */
function scalePunch(node: Node, punch: number, duration: number): Tween<Node> {
    const origin = node.scale.clone();
    return tween(node)
        .to(duration * 0.35, { scale: v3(origin.x * punch, origin.y * punch, origin.z) }, { easing: 'sineOut' })
        .to(duration * 0.65, { scale: origin }, { easing: 'elasticOut' })
        .start();
}

/** 通用：透明度渐变 (0~255) */
function fadeTo(node: Node, opacity: number, duration: number, easing = 'sineOut'): Tween<UIOpacity> {
    return tween(opacityOf(node)).to(duration, { opacity }, { easing }).start();
}

/** 通用：从偏移量滑入到当前位置 */
function slideInFromOffset(node: Node, offset: Vec3, duration: number): Tween<Node> {
    const target = node.position.clone();
    node.setPosition(target.x + offset.x, target.y + offset.y, target.z);
    const op = opacityOf(node);
    op.opacity = 0;
    tween(op).to(duration, { opacity: 255 }).start();
    return tween(node).to(duration, { position: target }, { easing: 'quartOut' }).start();
}

/** 通用：滑出到偏移量并淡出 */
function slideOutToOffset(node: Node, offset: Vec3, duration: number, onComplete?: () => void): Tween<Node> {
    const start = node.position.clone();
    const target = v3(start.x + offset.x, start.y + offset.y, start.z);
    tween(opacityOf(node)).to(duration, { opacity: 0 }).start();
    return tween(node)
        .to(duration, { position: target }, { easing: 'quartIn' })
        .call(() => onComplete && onComplete())
        .start();
}

// ============================================================
// TweenLib：120+ 个命名效果方法，按类别分组
// ============================================================

export class TweenLib {

    // ------------------------------------------------------------
    // 一、UI 按钮 / 交互反馈（1-15）
    // ------------------------------------------------------------

    /** 1. 按钮按下缩小 */
    static buttonPressDown(node: Node, downScale = 0.92, duration = 0.08): Tween<Node> {
        return tween(node).to(duration, { scale: v3(downScale, downScale, 1) }, { easing: 'sineOut' }).start();
    }

    /** 2. 按钮抬起回弹 */
    static buttonPressUp(node: Node, duration = 0.12): Tween<Node> {
        return tween(node).to(duration, { scale: v3(1, 1, 1) }, { easing: 'backOut' }).start();
    }

    /** 3. 点击冲击缩放（一次到位，常用于点赞/收藏图标） */
    static buttonClickPunch(node: Node, punch = 1.15, duration = 0.2): Tween<Node> {
        return scalePunch(node, punch, duration);
    }

    /** 4. 图标呼吸（无限循环，适合入口图标提示） */
    static iconBreath(node: Node, min = 0.95, max = 1.05, duration = 0.9): Tween<Node> {
        return tween(node)
            .to(duration, { scale: v3(max, max, 1) })
            .to(duration, { scale: v3(min, min, 1) })
            .union()
            .repeatForever()
            .start();
    }

    /** 5. 水平抖动（错误提示、拒绝反馈） */
    static iconShakeX(node: Node, amplitude = 6, duration = 0.3, times = 4): Tween<Node> {
        return shakeAxis(node, 'x', amplitude, duration, times);
    }

    /** 6. 垂直抖动 */
    static iconShakeY(node: Node, amplitude = 6, duration = 0.3, times = 4): Tween<Node> {
        return shakeAxis(node, 'y', amplitude, duration, times);
    }

    /** 7. 摇摆旋转（新手引导手指、感叹号提示） */
    static iconWiggleRotate(node: Node, angle = 8, duration = 0.25): Tween<Node> {
        return tween(node)
            .to(duration, { angle: angle })
            .to(duration * 2, { angle: -angle })
            .to(duration, { angle: 0 })
            .union()
            .repeatForever()
            .start();
    }

    /** 8. 红点脉冲提示 */
    static redDotPulse(node: Node): Tween<Node> {
        return tween(node)
            .to(0.5, { scale: v3(1.25, 1.25, 1) }, { easing: 'sineInOut' })
            .to(0.5, { scale: v3(1, 1, 1) }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }

    /** 9. 徽标弹入 */
    static badgeBounceIn(node: Node, duration = 0.4): Tween<Node> {
        node.setScale(0, 0, 1);
        return tween(node).to(duration, { scale: v3(1, 1, 1) }, { easing: 'backOut' }).start();
    }

    /** 10. 开关切换（打开/关闭状态过渡缩放） */
    static toggleFlip(node: Node, on: boolean, duration = 0.15): Tween<Node> {
        const s = on ? 1.1 : 0.9;
        return tween(node)
            .to(duration, { scale: v3(s, s, 1) })
            .to(duration, { scale: v3(1, 1, 1) })
            .start();
    }

    /** 11. Tab 切换冲击反馈 */
    static tabSwitchPunch(node: Node): Tween<Node> {
        return scalePunch(node, 1.1, 0.18);
    }

    /** 12. 长按变大（蓄力/长按触发前反馈） */
    static longPressGrow(node: Node, targetScale = 1.2, duration = 0.6): Tween<Node> {
        return tween(node).to(duration, { scale: v3(targetScale, targetScale, 1) }, { easing: 'sineOut' }).start();
    }

    /** 13. 拖拽松手回弹原位 */
    static dragSnapBack(node: Node, originalPos: Vec3, duration = 0.3): Tween<Node> {
        return tween(node).to(duration, { position: originalPos }, { easing: 'backOut' }).start();
    }

    /** 14. 悬浮上浮（PC 端 hover 反馈） */
    static hoverLift(node: Node, lift = 6, duration = 0.15): Tween<Node> {
        return tween(node).by(duration, { position: v3(0, lift, 0) }, { easing: 'sineOut' }).start();
    }

    /** 15. 点击闪烁反馈（透明度快速一闪） */
    static clickFlashOpacity(node: Node): Tween<UIOpacity> {
        const op = opacityOf(node);
        return tween(op).to(0.05, { opacity: 120 }).to(0.1, { opacity: 255 }).start();
    }

    // ------------------------------------------------------------
    // 二、入场 / 出场动画（16-35）
    // ------------------------------------------------------------

    /** 16. 弹入（从 0 缩放到 1，带回弹） */
    static popIn(node: Node, duration = 0.35): Tween<Node> {
        node.setScale(0, 0, 1);
        return tween(node).to(duration, { scale: v3(1, 1, 1) }, { easing: 'backOut' }).start();
    }

    /** 17. 弹出消失（缩小至 0） */
    static popOut(node: Node, duration = 0.25, onComplete?: () => void): Tween<Node> {
        return tween(node)
            .to(duration, { scale: v3(0, 0, 1) }, { easing: 'backIn' })
            .call(() => onComplete && onComplete())
            .start();
    }

    /** 18. 淡入 */
    static fadeIn(node: Node, duration = 0.3): Tween<UIOpacity> {
        return fadeTo(node, 255, duration);
    }

    /** 19. 淡出 */
    static fadeOut(node: Node, duration = 0.3): Tween<UIOpacity> {
        return fadeTo(node, 0, duration);
    }

    /** 20. 淡入 + 放大 组合入场 */
    static fadeScaleIn(node: Node, duration = 0.3): void {
        node.setScale(0.8, 0.8, 1);
        opacityOf(node).opacity = 0;
        tween(node).to(duration, { scale: v3(1, 1, 1) }, { easing: 'quartOut' }).start();
        fadeTo(node, 255, duration);
    }

    /** 21. 从左滑入 */
    static slideInLeft(node: Node, distance = 200, duration = 0.35): Tween<Node> {
        return slideInFromOffset(node, v3(-distance, 0, 0), duration);
    }

    /** 22. 从右滑入 */
    static slideInRight(node: Node, distance = 200, duration = 0.35): Tween<Node> {
        return slideInFromOffset(node, v3(distance, 0, 0), duration);
    }

    /** 23. 从上滑入 */
    static slideInTop(node: Node, distance = 200, duration = 0.35): Tween<Node> {
        return slideInFromOffset(node, v3(0, distance, 0), duration);
    }

    /** 24. 从下滑入 */
    static slideInBottom(node: Node, distance = 200, duration = 0.35): Tween<Node> {
        return slideInFromOffset(node, v3(0, -distance, 0), duration);
    }

    /** 25. 滑出至左侧并消失 */
    static slideOutLeft(node: Node, distance = 200, duration = 0.3, onComplete?: () => void): Tween<Node> {
        return slideOutToOffset(node, v3(-distance, 0, 0), duration, onComplete);
    }

    /** 26. 滑出至右侧并消失 */
    static slideOutRight(node: Node, distance = 200, duration = 0.3, onComplete?: () => void): Tween<Node> {
        return slideOutToOffset(node, v3(distance, 0, 0), duration, onComplete);
    }

    /** 27. 滑出至上方并消失 */
    static slideOutTop(node: Node, distance = 200, duration = 0.3, onComplete?: () => void): Tween<Node> {
        return slideOutToOffset(node, v3(0, distance, 0), duration, onComplete);
    }

    /** 28. 滑出至下方并消失 */
    static slideOutBottom(node: Node, distance = 200, duration = 0.3, onComplete?: () => void): Tween<Node> {
        return slideOutToOffset(node, v3(0, -distance, 0), duration, onComplete);
    }

    /** 29. 弹跳式放大进入（比 popIn 更夸张，适合奖励弹窗标题） */
    static zoomInBounce(node: Node, duration = 0.5): Tween<Node> {
        node.setScale(0, 0, 1);
        return tween(node)
            .to(duration * 0.6, { scale: v3(1.15, 1.15, 1) }, { easing: 'quartOut' })
            .to(duration * 0.4, { scale: v3(1, 1, 1) }, { easing: 'sineOut' })
            .start();
    }

    /** 30. 缩小消失退场 */
    static zoomOutShrink(node: Node, duration = 0.25, onComplete?: () => void): Tween<Node> {
        return tween(node)
            .to(duration, { scale: v3(0.01, 0.01, 1) }, { easing: 'sineIn' })
            .call(() => onComplete && onComplete())
            .start();
    }

    /** 31. 旋转 + 缩放进入 */
    static rotateIn(node: Node, fromAngle = -180, duration = 0.4): Tween<Node> {
        node.angle = fromAngle;
        node.setScale(0, 0, 1);
        tween(node).to(duration, { angle: 0 }, { easing: 'quartOut' }).start();
        return tween(node).to(duration, { scale: v3(1, 1, 1) }, { easing: 'quartOut' }).start();
    }

    /** 32. Y 轴翻转进入（scaleX 模拟 3D 翻转） */
    static flipInY(node: Node, duration = 0.35): Tween<Node> {
        node.setScale(0, 1, 1);
        return tween(node).to(duration, { scale: v3(1, 1, 1) }, { easing: 'quartOut' }).start();
    }

    /** 33. X 轴翻转进入 */
    static flipInX(node: Node, duration = 0.35): Tween<Node> {
        node.setScale(1, 0, 1);
        return tween(node).to(duration, { scale: v3(1, 1, 1) }, { easing: 'quartOut' }).start();
    }

    /** 34. 从上方掉落进入并带一次小回弹（掉落式奖励/关卡星星） */
    static dropInBounce(node: Node, fallDistance = 300, duration = 0.5): Tween<Node> {
        const target = node.position.clone();
        node.setPosition(target.x, target.y + fallDistance, target.z);
        return tween(node)
            .to(duration * 0.7, { position: target }, { easing: 'quadIn' })
            .by(duration * 0.15, { position: v3(0, 20, 0) }, { easing: 'sineOut' })
            .by(duration * 0.15, { position: v3(0, -20, 0) }, { easing: 'sineIn' })
            .start();
    }

    /** 35. 弹簧式进入（先超出目标再回弹） */
    static springIn(node: Node, duration = 0.45): Tween<Node> {
        node.setScale(0, 0, 1);
        return tween(node).to(duration, { scale: v3(1, 1, 1) }, { easing: 'elasticOut' }).start();
    }

    // ------------------------------------------------------------
    // 三、弹窗 / 关卡 UI（36-45）
    // ------------------------------------------------------------

    /** 36. 弹窗打开（缩放 + 遮罩需外部另配 maskFadeIn） */
    static panelOpen(node: Node, duration = 0.3): Tween<Node> {
        node.setScale(0.7, 0.7, 1);
        opacityOf(node).opacity = 0;
        fadeTo(node, 255, duration);
        return tween(node).to(duration, { scale: v3(1, 1, 1) }, { easing: 'backOut' }).start();
    }

    /** 37. 弹窗关闭 */
    static panelClose(node: Node, duration = 0.2, onComplete?: () => void): Tween<Node> {
        fadeTo(node, 0, duration);
        return tween(node)
            .to(duration, { scale: v3(0.7, 0.7, 1) }, { easing: 'backIn' })
            .call(() => onComplete && onComplete())
            .start();
    }

    /** 38. 遮罩淡入 */
    static maskFadeIn(node: Node, duration = 0.25, targetOpacity = 180): Tween<UIOpacity> {
        return fadeTo(node, targetOpacity, duration);
    }

    /** 39. 遮罩淡出 */
    static maskFadeOut(node: Node, duration = 0.25): Tween<UIOpacity> {
        return fadeTo(node, 0, duration);
    }

    /** 40. 弹窗错误抖动（密码错误、余额不足等） */
    static dialogErrorShake(node: Node): Tween<Node> {
        return shakeAxis(node, 'x', 12, 0.4, 5);
    }

    /** 41. Toast 上滑出现 */
    static toastSlideUp(node: Node, distance = 40, duration = 0.25): void {
        slideInFromOffset(node, v3(0, -distance, 0), duration);
    }

    /** 42. Toast 停留后自动隐藏 */
    static toastAutoHide(node: Node, stay = 1.5, fadeDuration = 0.3, onComplete?: () => void): Tween<Node> {
        return tween(node)
            .delay(stay)
            .call(() => fadeTo(node, 0, fadeDuration))
            .delay(fadeDuration)
            .call(() => onComplete && onComplete())
            .start();
    }

    /** 43. Loading 图标持续旋转 */
    static loadingSpin(node: Node, duration = 0.8): Tween<Node> {
        return tween(node).by(duration, { angle: -360 }).repeatForever().start();
    }

    /** 44. Loading 单点跳动（多个点用不同 delay 调用即可错开） */
    static loadingDotsBounce(node: Node, height = 10, duration = 0.3, delay = 0): Tween<Node> {
        return tween(node)
            .delay(delay)
            .by(duration, { position: v3(0, height, 0) }, { easing: 'sineOut' })
            .by(duration, { position: v3(0, -height, 0) }, { easing: 'sineIn' })
            .union()
            .repeatForever()
            .start();
    }

    /** 45. 进度条填充（node 为进度条 Sprite/Bar 节点，用 scaleX 模拟） */
    static progressBarFill(node: Node, toRatio: number, duration = 0.4): Tween<Node> {
        return tween(node).to(duration, { scale: v3(toRatio, node.scale.y, 1) }, { easing: 'sineOut' }).start();
    }

    // ------------------------------------------------------------
    // 四、数值 / 文本反馈（46-58）
    // ------------------------------------------------------------

    /** 46. 数字滚动（传入回调，每帧写回 Label.string） */
    static numberRollUp(from: number, to: number, duration: number, onUpdate: (v: number) => void, onComplete?: () => void): Tween<{ value: number }> {
        const obj = { value: from };
        return tween(obj)
            .to(duration, { value: to }, { easing: 'quartOut', onUpdate: (t?: object) => onUpdate((t as { value: number }).value) })
            .call(() => onComplete && onComplete())
            .start();
    }

    /** 47. 加分飘字（上升 + 淡出，常用于战斗/消除得分） */
    static scoreFloatUp(node: Node, riseDistance = 60, duration = 0.6, onComplete?: () => void): Tween<Node> {
        fadeTo(node, 0, duration);
        return tween(node)
            .by(duration, { position: v3(0, riseDistance, 0) }, { easing: 'quartOut' })
            .call(() => onComplete && onComplete())
            .start();
    }

    /** 48. Combo 文字冲击缩放 */
    static comboPunch(node: Node, punch = 1.3, duration = 0.25): Tween<Node> {
        return scalePunch(node, punch, duration);
    }

    /** 49. 文本颜色闪烁提示（需 Label 组件自带 color，用 Sprite 同理） */
    static textColorFlash(node: Node, flashColor: Color, originColor: Color, duration = 0.15): void {
        const sp = spriteOf(node);
        if (!sp) return;
        tween(sp).to(duration, { color: flashColor }).to(duration, { color: originColor }).start();
    }

    /** 50. 倒计时数字脉冲（最后几秒强调） */
    static countdownPulse(node: Node, duration = 0.3): Tween<Node> {
        return tween(node)
            .to(duration * 0.4, { scale: v3(1.3, 1.3, 1) }, { easing: 'sineOut' })
            .to(duration * 0.6, { scale: v3(1, 1, 1) }, { easing: 'sineIn' })
            .start();
    }

    /** 51. 金币/货币飞向目标点（直线） */
    static currencyFlyTo(node: Node, target: Vec3, duration = 0.5, onComplete?: () => void): Tween<Node> {
        return tween(node)
            .to(duration, { position: target }, { easing: 'quadIn' })
            .call(() => onComplete && onComplete())
            .start();
    }

    /** 52. 货币抛物线飞行（先冲高再落到目标，视觉更活泼） */
    static currencyFlyArc(node: Node, target: Vec3, arcHeight = 80, duration = 0.6, onComplete?: () => void): Tween<Node> {
        const start = node.position.clone();
        const mid = v3((start.x + target.x) / 2, Math.max(start.y, target.y) + arcHeight, start.z);
        return tween(node)
            .to(duration * 0.45, { position: mid }, { easing: 'quadOut' })
            .to(duration * 0.55, { position: target }, { easing: 'quadIn' })
            .call(() => onComplete && onComplete())
            .start();
    }

    /** 53. 奖励爆开式缩放（宝箱开出奖励瞬间） */
    static rewardBurstScale(node: Node, duration = 0.4): Tween<Node> {
        node.setScale(0, 0, 1);
        return tween(node)
            .to(duration * 0.5, { scale: v3(1.3, 1.3, 1) }, { easing: 'quartOut' })
            .to(duration * 0.5, { scale: v3(1, 1, 1) }, { easing: 'elasticOut' })
            .start();
    }

    /** 54. 星级评分逐个弹出（结算界面 3 星评价） */
    static starPopInSequence(nodes: Node[], stagger = 0.15, duration = 0.3): void {
        nodes.forEach((n, i) => {
            n.setScale(0, 0, 1);
            tween(n).delay(i * stagger).to(duration, { scale: v3(1, 1, 1) }, { easing: 'backOut' }).start();
        });
    }

    /** 55. 伤害数字浮动（受击飘字，比加分飘字幅度更大更快） */
    static damageNumberFloat(node: Node, riseDistance = 40, duration = 0.4): Tween<Node> {
        node.setScale(0.6, 0.6, 1);
        tween(node).to(0.15, { scale: v3(1, 1, 1) }, { easing: 'backOut' }).start();
        fadeTo(node, 0, duration);
        return tween(node).by(duration, { position: v3(0, riseDistance, 0) }, { easing: 'quartOut' }).start();
    }

    /** 56. 金币收集弹跳（掉落到 UI 图标前的小跳） */
    static goldCoinBounceCollect(node: Node, bounceHeight = 15, duration = 0.25): Tween<Node> {
        return tween(node)
            .by(duration, { position: v3(0, bounceHeight, 0) }, { easing: 'sineOut' })
            .by(duration, { position: v3(0, -bounceHeight, 0) }, { easing: 'sineIn' })
            .start();
    }

    /** 57. 文本错误抖动 */
    static textShakeError(node: Node): Tween<Node> {
        return shakeAxis(node, 'x', 8, 0.3, 4);
    }

    /** 58. 文本高亮强调脉冲（无限循环，用于新功能提示文字） */
    static textPulseHighlight(node: Node, duration = 0.6): Tween<Node> {
        return tween(node)
            .to(duration, { scale: v3(1.08, 1.08, 1) })
            .to(duration, { scale: v3(1, 1, 1) })
            .union()
            .repeatForever()
            .start();
    }

    // ------------------------------------------------------------
    // 五、战斗 / 角色反馈（59-75）
    // ------------------------------------------------------------

    /** 59. 受击抖动 */
    static hitShake(node: Node, amplitude = 8, duration = 0.2): Tween<Node> {
        return shakeAxis(node, 'x', amplitude, duration, 3);
    }

    /** 60. 受击闪白（需配合材质，这里退化为透明度快闪，兼容性最好） */
    static hitFlashOpacity(node: Node): Tween<UIOpacity> {
        const op = opacityOf(node);
        return tween(op).to(0.04, { opacity: 80 }).to(0.08, { opacity: 255 }).start();
    }

    /** 61. 受击击退位移 */
    static hitKnockback(node: Node, direction: Vec3, distance = 20, duration = 0.15): Tween<Node> {
        const offset = v3(direction.x * distance, direction.y * distance, 0);
        return tween(node)
            .by(duration, { position: offset }, { easing: 'quadOut' })
            .by(duration * 1.5, { position: v3(-offset.x, -offset.y, 0) }, { easing: 'quadIn' })
            .start();
    }

    /** 62. 死亡淡出 + 缩小 */
    static deathFadeScale(node: Node, duration = 0.4, onComplete?: () => void): void {
        fadeTo(node, 0, duration);
        tween(node)
            .to(duration, { scale: v3(0.6, 0.6, 1) }, { easing: 'sineIn' })
            .call(() => onComplete && onComplete())
            .start();
    }

    /** 63. 出生/召唤放大登场 */
    static spawnScaleUp(node: Node, duration = 0.3): Tween<Node> {
        node.setScale(0, 0, 1);
        return tween(node).to(duration, { scale: v3(1, 1, 1) }, { easing: 'backOut' }).start();
    }

    /** 64. 攻击前冲刺位移 */
    static attackLunge(node: Node, direction: Vec3, distance = 40, duration = 0.15): Tween<Node> {
        return tween(node)
            .by(duration, { position: v3(direction.x * distance, direction.y * distance, 0) }, { easing: 'quadOut' })
            .start();
    }

    /** 65. 攻击后归位 */
    static attackReturn(node: Node, originalPos: Vec3, duration = 0.2): Tween<Node> {
        return tween(node).to(duration, { position: originalPos }, { easing: 'quadIn' }).start();
    }

    /** 66. 跳跃抛物线（简化版，无重力模拟，纯曲线插值） */
    static jumpArc(node: Node, target: Vec3, jumpHeight = 60, duration = 0.5, onComplete?: () => void): Tween<Node> {
        const start = node.position.clone();
        const mid = v3((start.x + target.x) / 2, Math.max(start.y, target.y) + jumpHeight, start.z);
        return tween(node)
            .to(duration * 0.5, { position: mid }, { easing: 'sineOut' })
            .to(duration * 0.5, { position: target }, { easing: 'sineIn' })
            .call(() => onComplete && onComplete())
            .start();
    }

    /** 67. 落地挤压变形（Squash） */
    static landSquash(node: Node, duration = 0.15): Tween<Node> {
        return tween(node)
            .to(duration * 0.4, { scale: v3(1.25, 0.75, 1) }, { easing: 'sineOut' })
            .to(duration * 0.6, { scale: v3(1, 1, 1) }, { easing: 'elasticOut' })
            .start();
    }

    /** 68. 挤压拉伸（Squash & Stretch，动画十二法则之一，通用强调动作） */
    static squashStretch(node: Node, duration = 0.25): Tween<Node> {
        return tween(node)
            .to(duration * 0.3, { scale: v3(0.8, 1.2, 1) })
            .to(duration * 0.3, { scale: v3(1.15, 0.9, 1) })
            .to(duration * 0.4, { scale: v3(1, 1, 1) }, { easing: 'elasticOut' })
            .start();
    }

    /** 69. 蓄力变大（技能释放前） */
    static chargeUpScale(node: Node, targetScale = 1.4, duration = 0.5): Tween<Node> {
        return tween(node).to(duration, { scale: v3(targetScale, targetScale, 1) }, { easing: 'sineIn' }).start();
    }

    /** 70. 硬直抖动（连续受击/眩晕状态） */
    static staggerShake(node: Node, amplitude = 4, duration = 0.15): Tween<Node> {
        return shakeAxis(node, 'x', amplitude, duration, 2);
    }

    /** 71. 无敌闪烁（透明度切换，循环 N 次自动停止需外部 stop） */
    static invincibleFlicker(node: Node, duration = 0.12): Tween<UIOpacity> {
        const op = opacityOf(node);
        return tween(op).to(duration, { opacity: 100 }).to(duration, { opacity: 255 }).union().repeatForever().start();
    }

    /** 72. 治疗脉冲（放大 + 淡入淡出光效节点配合使用） */
    static healPulse(node: Node, duration = 0.5): Tween<Node> {
        return tween(node)
            .to(duration * 0.5, { scale: v3(1.2, 1.2, 1) }, { easing: 'sineOut' })
            .to(duration * 0.5, { scale: v3(1, 1, 1) }, { easing: 'sineIn' })
            .start();
    }

    /** 73. 复活淡入 */
    static reviveFadeIn(node: Node, duration = 0.6): void {
        opacityOf(node).opacity = 0;
        node.setScale(0.8, 0.8, 1);
        fadeTo(node, 255, duration);
        tween(node).to(duration, { scale: v3(1, 1, 1) }, { easing: 'sineOut' }).start();
    }

    /** 74. 格挡反馈抖动（幅度小于受击，用于区分"格挡成功"） */
    static blockShake(node: Node, amplitude = 4, duration = 0.12): Tween<Node> {
        return shakeAxis(node, 'x', amplitude, duration, 2);
    }

    /** 75. 暴击冲击缩放（比普通 comboPunch 更夸张） */
    static criticalHitPunch(node: Node, duration = 0.3): Tween<Node> {
        return scalePunch(node, 1.5, duration);
    }

    // ------------------------------------------------------------
    // 六、镜头 / 场景（76-83）
    // ------------------------------------------------------------

    /** 76. 镜头抖动（node 通常为 Camera 挂点或根节点） */
    static cameraShakeNode(node: Node, amplitude = 10, duration = 0.3, times = 5): Tween<Node> {
        return shakeAxis(node, 'x', amplitude, duration, times);
    }

    /** 77. 全屏闪光（node 为全屏白色/彩色遮罩节点） */
    static screenFlashOpacity(node: Node, duration = 0.15): Tween<UIOpacity> {
        const op = opacityOf(node);
        op.opacity = 255;
        return tween(op).to(duration, { opacity: 0 }).start();
    }

    /** 78. 镜头缩放冲击（受击/爆炸时短暂拉近） */
    static screenZoomPunch(node: Node, punch = 1.05, duration = 0.2): Tween<Node> {
        return scalePunch(node, punch, duration);
    }

    /** 79. 场景过渡淡入淡出（黑幕节点） */
    static sceneFadeTransition(node: Node, duration = 0.3, onMidpoint?: () => void): void {
        const op = opacityOf(node);
        op.opacity = 0;
        tween(op)
            .to(duration, { opacity: 255 })
            .call(() => onMidpoint && onMidpoint())
            .to(duration, { opacity: 0 })
            .start();
    }

    /** 80. 视差层缓慢漂移（背景装饰层） */
    static parallaxDrift(node: Node, distance = 20, duration = 4): Tween<Node> {
        return tween(node)
            .by(duration, { position: v3(distance, 0, 0) })
            .by(duration, { position: v3(-distance, 0, 0) })
            .union()
            .repeatForever()
            .start();
    }

    /** 81. 背景循环滚动（需两张背景图首尾拼接，node 为背景容器） */
    static bgScrollLoop(node: Node, scrollDistance: number, duration: number): Tween<Node> {
        return tween(node)
            .by(duration, { position: v3(-scrollDistance, 0, 0) })
            .call(() => node.setPosition(0, node.position.y, node.position.z))
            .repeatForever()
            .start();
    }

    /** 82. 云朵漂浮循环 */
    static cloudDriftLoop(node: Node, distance = 100, duration = 8): Tween<Node> {
        return tween(node).by(duration, { position: v3(distance, 0, 0) }).repeatForever().start();
    }

    /** 83. 灯光闪烁（透明度不规则跳变，营造电流/故障感） */
    static lightFlicker(node: Node): Tween<UIOpacity> {
        const op = opacityOf(node);
        return tween(op)
            .to(0.05, { opacity: 100 })
            .to(0.05, { opacity: 255 })
            .to(0.08, { opacity: 150 })
            .to(0.05, { opacity: 255 })
            .union()
            .repeatForever()
            .start();
    }

    // ------------------------------------------------------------
    // 七、弹跳 / 物理质感（84-93，常见于 UI 强调动作）
    // ------------------------------------------------------------

    /** 84. 弹性放大进入 */
    static elasticBounceIn(node: Node, duration = 0.6): Tween<Node> {
        node.setScale(0, 0, 1);
        return tween(node).to(duration, { scale: v3(1, 1, 1) }, { easing: 'elasticOut' }).start();
    }

    /** 85. 重力掉落弹跳（模拟落地后余震式回弹） */
    static gravityDropBounce(node: Node, dropDistance = 200, duration = 0.6): Tween<Node> {
        const target = node.position.clone();
        node.setPosition(target.x, target.y + dropDistance, target.z);
        return tween(node)
            .to(duration * 0.6, { position: target }, { easing: 'quadIn' })
            .by(duration * 0.15, { position: v3(0, 25, 0) }, { easing: 'sineOut' })
            .by(duration * 0.1, { position: v3(0, -25, 0) }, { easing: 'sineIn' })
            .by(duration * 0.1, { position: v3(0, 8, 0) }, { easing: 'sineOut' })
            .by(duration * 0.05, { position: v3(0, -8, 0) }, { easing: 'sineIn' })
            .start();
    }

    /** 86. 钟摆摇摆（挂件、吊饰类装饰节点） */
    static pendulumSwing(node: Node, angle = 15, duration = 1): Tween<Node> {
        return tween(node)
            .to(duration, { angle: angle })
            .to(duration * 2, { angle: -angle })
            .to(duration, { angle: 0 })
            .union()
            .repeatForever()
            .start();
    }

    /** 87. 弹簧震荡（缩放来回震荡，逐渐衰减用 times 控制次数） */
    static springOscillate(node: Node, amplitude = 0.15, duration = 0.15, times = 4): Tween<Node> {
        let t = tween(node);
        let amp = amplitude;
        for (let i = 0; i < times; i++) {
            t = t.to(duration, { scale: v3(1 + amp, 1 + amp, 1) }).to(duration, { scale: v3(1 - amp * 0.5, 1 - amp * 0.5, 1) });
            amp *= 0.5;
        }
        return t.to(duration, { scale: v3(1, 1, 1) }).start();
    }

    /** 88. 橡皮筋弹出（拉伸后回弹，适合按钮点击强反馈） */
    static rubberBandPop(node: Node, duration = 0.4): Tween<Node> {
        return tween(node)
            .to(duration * 0.2, { scale: v3(1.25, 0.75, 1) })
            .to(duration * 0.2, { scale: v3(0.75, 1.25, 1) })
            .to(duration * 0.2, { scale: v3(1.15, 0.85, 1) })
            .to(duration * 0.4, { scale: v3(1, 1, 1) }, { easing: 'elasticOut' })
            .start();
    }

    /** 89. 果冻晃动（比 rubberBand 更 Q 弹，用于卡通风格弹窗出现） */
    static jellyWobble(node: Node, duration = 0.15, times = 4): Tween<Node> {
        let t = tween(node);
        let scale = 0.15;
        for (let i = 0; i < times; i++) {
            t = t.to(duration, { scale: v3(1 + scale, 1 - scale, 1) }).to(duration, { scale: v3(1 - scale, 1 + scale, 1) });
            scale *= 0.6;
        }
        return t.to(duration, { scale: v3(1, 1, 1) }).start();
    }

    /** 90. 心跳效果（连续两次快速缩放，模拟心跳节奏） */
    static heartBeat(node: Node, duration = 0.15): Tween<Node> {
        return tween(node)
            .to(duration, { scale: v3(1.15, 1.15, 1) })
            .to(duration, { scale: v3(1, 1, 1) })
            .to(duration, { scale: v3(1.15, 1.15, 1) })
            .to(duration, { scale: v3(1, 1, 1) })
            .start();
    }

    /** 91. Tada 效果（经典强调动画，来自 Animate.css，缩放 + 轻微旋转） */
    static tada(node: Node, duration = 0.6): Tween<Node> {
        const seg = duration / 6;
        return tween(node)
            .to(seg, { scale: v3(0.9, 0.9, 1), angle: -3 })
            .to(seg, { scale: v3(1.1, 1.1, 1), angle: -3 })
            .to(seg, { angle: 3 })
            .to(seg, { angle: -3 })
            .to(seg, { angle: 3 })
            .to(seg, { scale: v3(1, 1, 1), angle: 0 })
            .start();
    }

    /** 92. RubberBand 效果（横向拉伸回弹，来自 Animate.css） */
    static rubberBand(node: Node, duration = 0.8): Tween<Node> {
        const seg = duration / 5;
        return tween(node)
            .to(seg, { scale: v3(1.25, 0.75, 1) })
            .to(seg, { scale: v3(0.75, 1.25, 1) })
            .to(seg, { scale: v3(1.15, 0.85, 1) })
            .to(seg, { scale: v3(0.95, 1.05, 1) })
            .to(seg, { scale: v3(1, 1, 1) })
            .start();
    }

    /** 93. Wobble 效果（左右摇晃 + 旋转，来自 Animate.css，常用于错误/警告） */
    static wobble(node: Node, distance = 15, duration = 0.8): Tween<Node> {
        const seg = duration / 6;
        const origin = node.position.clone();
        return tween(node)
            .by(seg, { position: v3(-distance, 0, 0), angle: -5 } as any)
            .by(seg, { position: v3(distance * 1.5, 0, 0), angle: 3 } as any)
            .by(seg, { position: v3(-distance, 0, 0), angle: -3 } as any)
            .by(seg, { position: v3(distance * 0.5, 0, 0), angle: 2 } as any)
            .by(seg, { position: v3(-distance * 0.3, 0, 0), angle: -1 } as any)
            .to(seg, { position: origin, angle: 0 } as any)
            .start();
    }

    // ------------------------------------------------------------
    // 八、图标 / 装饰循环动画（94-101）
    // ------------------------------------------------------------

    /** 94. 持续旋转（风车、齿轮、加载图标） */
    static spinForever(node: Node, duration = 2): Tween<Node> {
        return tween(node).by(duration, { angle: -360 }).repeatForever().start();
    }

    /** 95. 单次旋转 */
    static spinOnce(node: Node, duration = 0.5, onComplete?: () => void): Tween<Node> {
        return tween(node).by(duration, { angle: -360 }, { easing: 'quartOut' }).call(() => onComplete && onComplete()).start();
    }

    /** 96. 上下悬浮（宝箱、道具、飘浮岛） */
    static floatUpDown(node: Node, distance = 10, duration = 1.2): Tween<Node> {
        return tween(node)
            .by(duration, { position: v3(0, distance, 0) }, { easing: 'sineInOut' })
            .by(duration, { position: v3(0, -distance, 0) }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }

    /** 97. 悬浮 + 缓慢自转组合 */
    static floatRotateLoop(node: Node, distance = 10, floatDuration = 1.2, rotateDuration = 3): void {
        TweenLib.floatUpDown(node, distance, floatDuration);
        TweenLib.spinForever(node, rotateDuration);
    }

    /** 98. 闪烁星星（透明度 + 缩放交替，装饰性小图标） */
    static twinkleStar(node: Node, duration = 0.6): Tween<Node> {
        const op = opacityOf(node);
        tween(op).to(duration, { opacity: 100 }).to(duration, { opacity: 255 }).union().repeatForever().start();
        return tween(node)
            .to(duration, { scale: v3(0.8, 0.8, 1) })
            .to(duration, { scale: v3(1, 1, 1) })
            .union()
            .repeatForever()
            .start();
    }

    /** 99. 发光脉冲（用缩放模拟光晕呼吸，需配合半透明光效节点） */
    static glowPulseScale(node: Node, max = 1.3, duration = 1): Tween<Node> {
        return tween(node)
            .to(duration, { scale: v3(max, max, 1) }, { easing: 'sineInOut' })
            .to(duration, { scale: v3(1, 1, 1) }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }

    /** 100. 高光扫过（透明度模拟，真实高光扫光建议用 Shader，这里做轻量替代） */
    static shimmerOpacity(node: Node, duration = 1): Tween<UIOpacity> {
        const op = opacityOf(node);
        return tween(op).to(duration, { opacity: 150 }).to(duration, { opacity: 255 }).union().repeatForever().start();
    }

    /** 101. 金币自转（scaleX 来回模拟 3D 翻转旋转） */
    static coinSpinY(node: Node, duration = 0.5): Tween<Node> {
        return tween(node)
            .to(duration, { scale: v3(0, 1, 1) })
            .to(duration, { scale: v3(1, 1, 1) })
            .union()
            .repeatForever()
            .start();
    }

    // ------------------------------------------------------------
    // 九、结算 / 庆祝动画（102-109）
    // ------------------------------------------------------------

    /** 102. 胜利横幅从上掉落 */
    static victoryBannerDrop(node: Node, dropDistance = 150, duration = 0.5): Tween<Node> {
        const target = node.position.clone();
        node.setPosition(target.x, target.y + dropDistance, target.z);
        return tween(node).to(duration, { position: target }, { easing: 'bounceOut' }).start();
    }

    /** 103. 结算星星依次弹出（复用 starPopInSequence，语义化别名） */
    static victoryStarsSequence(nodes: Node[], stagger = 0.2, duration = 0.35): void {
        TweenLib.starPopInSequence(nodes, stagger, duration);
    }

    /** 104. 升级闪光冲击缩放 */
    static levelUpFlashScale(node: Node, duration = 0.5): Tween<Node> {
        return scalePunch(node, 1.6, duration);
    }

    /** 105. 烟花式脉冲缩放（配合粒子系统使用，node 通常是文字/图标） */
    static fireworksPulse(node: Node, duration = 0.3, times = 3): Tween<Node> {
        let t = tween(node);
        for (let i = 0; i < times; i++) {
            t = t.to(duration * 0.5, { scale: v3(1.3, 1.3, 1) }).to(duration * 0.5, { scale: v3(1, 1, 1) });
        }
        return t.start();
    }

    /** 106. 奖杯弹入 */
    static trophyBounceIn(node: Node, duration = 0.5): Tween<Node> {
        node.setScale(0, 0, 1);
        return tween(node).to(duration, { scale: v3(1, 1, 1) }, { easing: 'bounceOut' }).start();
    }

    /** 107. 勋章旋转飞入 */
    static medalSpinIn(node: Node, duration = 0.5): Tween<Node> {
        node.setScale(0, 0, 1);
        node.angle = 180;
        tween(node).to(duration, { angle: 0 }, { easing: 'quartOut' }).start();
        return tween(node).to(duration, { scale: v3(1, 1, 1) }, { easing: 'backOut' }).start();
    }

    /** 108. 宝箱摇晃后开启（先抖动，再放大表示开启） */
    static chestShakeOpen(node: Node, onOpen?: () => void): void {
        tween(node)
            .to(0.08, { angle: 5 })
            .to(0.08, { angle: -5 })
            .to(0.08, { angle: 5 })
            .to(0.08, { angle: 0 })
            .call(() => {
                onOpen && onOpen();
                scalePunch(node, 1.2, 0.3);
            })
            .start();
    }

    /** 109. 段位提升横幅（滑入 + 停留 + 滑出，一步到位） */
    static rankUpBanner(node: Node, stay = 1.2, duration = 0.35, onComplete?: () => void): void {
        slideInFromOffset(node, v3(0, 60, 0), duration);
        tween(node)
            .delay(duration + stay)
            .call(() => slideOutToOffset(node, v3(0, 60, 0), duration, onComplete))
            .start();
    }

    // ------------------------------------------------------------
    // 十、列表 / 卡牌（110-115）
    // ------------------------------------------------------------

    /** 110. 列表项依次弹入（背包格子、关卡列表） */
    static listItemStaggerIn(nodes: Node[], stagger = 0.06, duration = 0.25): void {
        nodes.forEach((n, i) => {
            n.setScale(0, 0, 1);
            const op = opacityOf(n);
            op.opacity = 0;
            tween(n).delay(i * stagger).to(duration, { scale: v3(1, 1, 1) }, { easing: 'backOut' }).start();
            tween(op).delay(i * stagger).to(duration, { opacity: 255 }).start();
        });
    }

    /** 111. 列表项左滑删除 */
    static listItemSwipeDelete(node: Node, distance = 400, duration = 0.3, onComplete?: () => void): Tween<Node> {
        return slideOutToOffset(node, v3(-distance, 0, 0), duration, onComplete);
    }

    /** 112. 滚动越界回弹（ScrollView 拉到底部/顶部的回弹反馈） */
    static scrollBounceBack(node: Node, originalPos: Vec3, duration = 0.25): Tween<Node> {
        return tween(node).to(duration, { position: originalPos }, { easing: 'backOut' }).start();
    }

    /** 113. 卡牌翻转（scaleX 归零再回到 1 模拟翻面，中点回调用于换图） */
    static cardFlipY(node: Node, duration = 0.3, onMidFlip?: () => void): void {
        tween(node)
            .to(duration / 2, { scale: v3(0, 1, 1) }, { easing: 'sineIn' })
            .call(() => onMidFlip && onMidFlip())
            .to(duration / 2, { scale: v3(1, 1, 1) }, { easing: 'sineOut' })
            .start();
    }

    /** 114. 发牌动画（从牌堆位置飞到目标手牌位） */
    static cardDealIn(node: Node, fromPos: Vec3, toPos: Vec3, duration = 0.3, delay = 0): Tween<Node> {
        node.setPosition(fromPos);
        node.angle = 15;
        tween(node).delay(delay).to(duration, { angle: 0 }).start();
        return tween(node).delay(delay).to(duration, { position: toPos }, { easing: 'quartOut' }).start();
    }

    /** 115. 轮播图切换滑动（node 为轮播容器，滑到指定索引位置） */
    static carouselSlideTo(node: Node, targetX: number, duration = 0.3): Tween<Node> {
        return tween(node).to(duration, { position: v3(targetX, node.position.y, node.position.z) }, { easing: 'quartOut' }).start();
    }

    // ------------------------------------------------------------
    // 十一、通用工具方法（116-120）
    // ------------------------------------------------------------

    /** 116. 延迟调用（比 setTimeout 更适合和 tween 队列衔接） */
    static delayCall(duration: number, callback: () => void): Tween<Node> {
        // 用一个空节点占位有点浪费，实际项目建议传入任意常驻节点；这里演示用法
        const dummy = new Node();
        return tween(dummy).delay(duration).call(callback).start();
    }

    /** 117. 顺序链式播放多个效果函数 */
    static chainSequence(...fns: Array<() => void>): void {
        let t = tween(new Node());
        fns.forEach((fn) => { t = t.call(fn).delay(0); });
        t.start();
    }

    /** 118. 并行组合播放（同时触发多个独立效果） */
    static comboParallel(...fns: Array<() => void>): void {
        fns.forEach((fn) => fn());
    }

    /** 119. 往返循环（在两个数值间无限来回，适合进度指示、扫描线等） */
    static loopPingPong(node: Node, from: number, to: number, duration: number, onUpdate: (v: number) => void): Tween<{ value: number }> {
        const obj = { value: from };
        return tween(obj)
            .to(duration, { value: to }, { onUpdate: (t?: object) => onUpdate((t as { value: number }).value) })
            .to(duration, { value: from }, { onUpdate: (t?: object) => onUpdate((t as { value: number }).value) })
            .union()
            .repeatForever()
            .start();
    }

    /** 120. 平滑跟随目标位置（每次调用推进到目标当前坐标，适合摄像机跟随/UI 指示箭头） */
    static followSmooth(node: Node, target: Node, duration = 0.15): Tween<Node> {
        return tween(node).to(duration, { position: target.position.clone() }, { easing: 'sineOut' }).start();
    }
}

// ============================================================
// TweenFX：可直接拖到节点上使用的通用组件
// 面板选择效果类型即可播放，覆盖上面高频使用的效果
// ============================================================

enum FXType {
    IconBreath, ShakeX, ShakeY, WiggleRotate, RedDotPulse,
    PopIn, FadeIn, SlideInLeft, SlideInRight, SlideInTop, SlideInBottom,
    ZoomInBounce, SpringIn, HeartBeat, Tada, RubberBand, Wobble,
    SpinForever, FloatUpDown, GlowPulse, Twinkle, LoadingSpin,
}

@ccclass('Misc/TweenFX')
export class TweenFX extends Component {
    @property({ type: Enum(FXType), tooltip: '选择要播放的缓动效果' })
    fxType: FXType = FXType.IconBreath;

    @property({ tooltip: '效果时长（部分效果专用，如抖动/淡入淡出）' })
    duration = 0.3;

    @property({ tooltip: '幅度（用于抖动/呼吸类效果，含义因效果而异）' })
    amplitude = 8;

    @property({ tooltip: '是否在 onEnable 时自动播放' })
    playOnEnable = true;

    private _runningTween: Tween<any> | null = null;

    protected onEnable(): void {
        if (this.playOnEnable) this.play();
    }

    protected onDisable(): void {
        this.stop();
    }

    /** 手动触发播放（也可在按钮 onClick 里直接调用） */
    public play(): void {
        this.stop();
        switch (this.fxType) {
            case FXType.IconBreath: this._runningTween = TweenLib.iconBreath(this.node, 1 - this.amplitude / 100, 1 + this.amplitude / 100, this.duration); break;
            case FXType.ShakeX: this._runningTween = TweenLib.iconShakeX(this.node, this.amplitude, this.duration); break;
            case FXType.ShakeY: this._runningTween = TweenLib.iconShakeY(this.node, this.amplitude, this.duration); break;
            case FXType.WiggleRotate: this._runningTween = TweenLib.iconWiggleRotate(this.node, this.amplitude, this.duration); break;
            case FXType.RedDotPulse: this._runningTween = TweenLib.redDotPulse(this.node); break;
            case FXType.PopIn: this._runningTween = TweenLib.popIn(this.node, this.duration); break;
            case FXType.FadeIn: this._runningTween = TweenLib.fadeIn(this.node, this.duration); break;
            case FXType.SlideInLeft: this._runningTween = TweenLib.slideInLeft(this.node, this.amplitude * 10, this.duration); break;
            case FXType.SlideInRight: this._runningTween = TweenLib.slideInRight(this.node, this.amplitude * 10, this.duration); break;
            case FXType.SlideInTop: this._runningTween = TweenLib.slideInTop(this.node, this.amplitude * 10, this.duration); break;
            case FXType.SlideInBottom: this._runningTween = TweenLib.slideInBottom(this.node, this.amplitude * 10, this.duration); break;
            case FXType.ZoomInBounce: this._runningTween = TweenLib.zoomInBounce(this.node, this.duration); break;
            case FXType.SpringIn: this._runningTween = TweenLib.springIn(this.node, this.duration); break;
            case FXType.HeartBeat: this._runningTween = TweenLib.heartBeat(this.node, this.duration); break;
            case FXType.Tada: this._runningTween = TweenLib.tada(this.node, this.duration); break;
            case FXType.RubberBand: this._runningTween = TweenLib.rubberBand(this.node, this.duration); break;
            case FXType.Wobble: this._runningTween = TweenLib.wobble(this.node, this.amplitude, this.duration); break;
            case FXType.SpinForever: this._runningTween = TweenLib.spinForever(this.node, this.duration); break;
            case FXType.FloatUpDown: this._runningTween = TweenLib.floatUpDown(this.node, this.amplitude, this.duration); break;
            case FXType.GlowPulse: this._runningTween = TweenLib.glowPulseScale(this.node, 1 + this.amplitude / 100, this.duration); break;
            case FXType.Twinkle: this._runningTween = TweenLib.twinkleStar(this.node, this.duration); break;
            case FXType.LoadingSpin: this._runningTween = TweenLib.loadingSpin(this.node, this.duration); break;
        }
    }

    /** 停止当前效果并复位常见属性 */
    stop(): void {
        this._runningTween?.stop();
        this._runningTween = null;
        this.node.setScale(1, 1, 1);
        this.node.angle = 0;
    }
}