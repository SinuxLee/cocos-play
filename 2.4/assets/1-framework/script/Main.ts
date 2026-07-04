import { Manager } from "./Framework";

const {ccclass, property} = cc._decorator;

@ccclass
export default class NewClass extends cc.Component {
    onLoad () {
        Manager.UiManager.getNodeByViewName
    }

    start () {

    }
}
