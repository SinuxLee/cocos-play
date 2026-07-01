import { _decorator, Animation, Component } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('entry')
export class entry extends Component {
    @property(Animation)
    private clock: Animation = null!;

    @property(Animation)
    private icon: Animation = null!;

    @property(Animation)
    private role: Animation = null!;

    protected onLoad(): void {
        for (const clip of this.role.clips) {
            console.debug(clip.name)
        }
    }

    protected start() {
        this.schedule(() => this.clock.play(), 1);
        this.schedule(() => this.icon.play(), 3);
        this.schedule(() => this.role.play('snow_front'), 5);
    }

    update(deltaTime: number) {

    }
}

