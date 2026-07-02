import { _decorator, Component, easing, Enum, Node, tween, v3 } from 'cc';
const { ccclass, property, menu, disallowMultiple, help } = _decorator;

/**
 * 效果类型
 */
export enum EUIEffectType {
    /** 禁用效果 */
    NONE = 1,
    /** 光效旋转 */
    LIGHT_ROTATE = 2,
    /** 果冻抖动 */
    JELLY = 3,
    /** 间接性摇晃 */
    ROTATE_INTERVAL = 4,
    /** 心跳 */
    BREATH = 5,
    /** 摇晃 */
    ROTATE = 6,
    /** 上下循环浮动 */
    FLOAT_REPEAT = 7,
    /** 缩放 */
    SCALE = 8,
    /**快速放大缩小 */
    BUTTON_JUMP = 9,
    /** 间接性缩放 */
    SCALE_INTERVAL = 10,
}

@ccclass
export class UIEffect extends Component {
    @property({
        type: Enum(EUIEffectType),
        tooltip:
            '效果类型:<br/>' +
            '- NONE: 禁用效果.<br/>' +
            '- LIGHT_ROTATE: 光效旋转.<br/>' +
            '- JELLY: 果冻抖动.<br/>' +
            '- ROTATE_INTERVAL: 间接性摇晃.<br/>' +
            '- BREATH: 心跳.<br/>' +
            '- ROTATE: 摇晃.<br/>' +
            '- FLOAT_REPEAT: 上下循环浮动.<br/>' +
            '- SCALE: 缩放.<br/>' +
            '- BUTTON_JUMP: 快速放大缩小.<br/>' +
            '- SCALE_INTERVAL: 间接性缩放.<br/>'
        ,
    })
    effectType: EUIEffectType = EUIEffectType.NONE;

    @property({ tooltip: '定制动画参数' })
    customParams: boolean = false;

    @property({ tooltip: '动画时间', visible(this: UIEffect) { return this.customParams; } })
    duration: number = 1.0;

    @property({
        tooltip: '动画间隔时间', visible(this: UIEffect) {
            return (this.customParams && (this.effectType === EUIEffectType.ROTATE_INTERVAL ||
                this.effectType === EUIEffectType.SCALE_INTERVAL ||
                this.effectType === EUIEffectType.ROTATE)
            );
        },
    })
    interval: number = 1.0;

    protected onLoad(): void {
        this.enabled = true;
    }

    onLoaded() {
        switch (this.effectType) {
            case EUIEffectType.LIGHT_ROTATE:
                this.onLightRotate(this.node);
                break;
            case EUIEffectType.JELLY:
                // this.onJelly(this.node);
                break;
            case EUIEffectType.ROTATE_INTERVAL:
                this.onRotateInterval(this.node);
                break;
            case EUIEffectType.SCALE:
                this.onScale(this.node);
                break;
            case EUIEffectType.SCALE_INTERVAL:
                this.onScaleInterval(this.node);
                break;
            case EUIEffectType.BREATH:
                this.onBreath(this.node);
                break;
            case EUIEffectType.ROTATE:
                this.onRotate(this.node);
                break;
            case EUIEffectType.FLOAT_REPEAT:
                this.onFloatRepeat(this.node);
                break;
            case EUIEffectType.BUTTON_JUMP:
                this.onButtonJump(this.node);
                break;
            default:
                break;
        }
    }

    /** 放大缩小提示 */
    private onButtonJump(node: Node) {
        const scale = node.scale;
        tween(node).repeatForever(tween()
            .delay(1)
            .to(0.15, { scale: scale.add(v3(0.3, 0.3)) })
            .to(0.15, { scale: scale.add(v3(0.1, 0.1)) })
            .to(0.15, { scale: scale.add(v3(0.3, 0.3)) })
            .to(0.15, { scale: scale.add(v3(0.1, 0.1)) })
            .to(0.15, { scale: scale.add(v3(0.3, 0.3)) })
            .to(0.15, { scale: scale })
            .call(() => {
                // node.zIndex = zIndex;
            }).delay(2),
        ).start();
    }

    /** 光效旋转 */
    private onLightRotate(node: Node) {
        const time = this.duration;
        tween(node).by(time, { angle: -90 }).repeatForever().start();
    }

    /** 上下浮动 */
    private onFloatRepeat(node: Node) {
        const time = this.duration;
        tween(node).repeatForever(tween()
            .by(time, { position: v3(0, 10, 0) }, { easing: easing.sineInOut })
            .by(time, { position: v3(0, -10, 0) }, { easing: easing.sineInOut }),
        ).start();
    }

    /** 果冻抖动 3.x 中有些 api 废弃了，需整理 */
    /*
    private onJelly(node: Node) {
        const beganY = node.y;
        const beganX = node.x;
        const time = 2;
        const jumpTime = 1.5;

        tween(node)
            .then(scaleTo(0.3 * time, 1.1, 0.9).easing(easeSineIn()))
            .by(0.15 * time, { position: v3(0, 9, 0) }, { easing: easing.sineOut })
            .start();

        tween(node)
            .delay(0.3 * time)
            .then(scaleTo(0.3, 0.97, 1.08).easing(easeSineOut()))
            .start();

        tween(node)
            .delay(0.45 * time)
            .then(jumpTo(0.13 * jumpTime, v2(beganX, beganY), 1, 1))
            .then(jumpTo(0.11 * jumpTime, v2(beganX, beganY + 9), 1, 1))
            .then(jumpTo(0.1 * jumpTime, v2(beganX, beganY), 1, 1))
            .then(jumpTo(0.08 * jumpTime, v2(beganX, beganY + 5), 1, 1))
            .then(jumpTo(0.06 * jumpTime, v2(beganX, beganY), 1, 1))
            .then(jumpTo(0.04 * jumpTime, v2(beganX, beganY + 3), 1, 1))
            .then(jumpTo(0.02 * jumpTime, v2(beganX, beganY), 1, 1))
            .start();

        tween(node)
            .delay(0.45 * time)
            .then(scaleTo(0.13 * jumpTime, 1.1, 0.9).easing(easeSineIn()))
            .then(scaleTo(0.11 * jumpTime, 0.915, 1.08).easing(easeSineOut()))
            .then(scaleTo(0.1 * jumpTime, 1.06, 0.93).easing(easeSineIn()))
            .then(scaleTo(0.08 * jumpTime, 0.94, 1.045).easing(easeSineOut()))
            .then(scaleTo(0.06 * jumpTime, 1.035, 0.965).easing(easeSineIn()))
            .then(scaleTo(0.04 * jumpTime, 0.975, 1.025).easing(easeSineOut()))
            .then(scaleTo(0.02 * jumpTime, 1, 1).easing(easeSineIn()))
            .call(this.onJelly.bind(this, node))
            .start();
    }
    */
    /** 间接性摇晃 */
    private onRotateInterval(node: Node) {
        const time = this.duration;
        tween(node)
            .repeatForever(
                tween()
                    .by(time, { angle: 20 }, { easing: easing.sineOut })
                    .by(time * 2, { angle: -40 }, { easing: easing.sineInOut })
                    .by(time, { angle: 20 }, { easing: easing.sineIn })
                    .delay(0.5),
            )
            .start();
    }

    /** 呼吸 */
    private onBreath(node: Node) {
        const time = this.duration;
        tween(node).repeatForever(tween()
            .to(time, { scale: 1.1 })
            .to(1.5 * time, { scale: 0.9 }),
        ).start();
    }

    /** 摇晃 */
    private onRotate(node: Node) {
        const time = this.duration;
        tween(node).repeatForever(tween()
            .delay(6)
            .to(time, { angle: 15 })
            .to(time, { angle: -15 })
            .to(time, { angle: 15 })
            .to(time, { angle: -15 })
            .to(time, { angle: 0 }),
        ).start();
    }

    /** 呼吸 */
    private onScale(node: Node) {
        const time = this.duration;

        tween(node)
            .repeatForever(tween().to(time, { scale: 1.1 }).to(time, { scale: 0.9 }))
            .start();
    }

    /** 间接性缩放提示 */
    private onScaleInterval(node: Node) {
        const interval = this.interval || 3;
        const time = this.duration;

        tween(node).repeatForever(tween()
            .to(time, { scale: 1.1 })
            .to(time, { scale: 1 })
            .to(time, { scale: 1.1 })
            .to(time, { scale: 1 })
            .delay(interval),
        ).start();
    }
}