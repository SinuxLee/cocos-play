import { _decorator, Component, EPhysics2DDrawFlags, PhysicsSystem2D, v2,PHYSICS_2D_PTM_RATIO } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('phy')
export class phy extends Component {

    protected onLoad(): void {
        const system = PhysicsSystem2D.instance;
        system.enable = true;
        system.allowSleep = true

        // system.debugDrawFlags = EPhysics2DDrawFlags.Aabb |
        //     EPhysics2DDrawFlags.Pair |
        //     EPhysics2DDrawFlags.CenterOfMass |
        //     EPhysics2DDrawFlags.Joint |
        //     EPhysics2DDrawFlags.Shape;
    }

    start() {

    }

    update(deltaTime: number) {

    }
}

