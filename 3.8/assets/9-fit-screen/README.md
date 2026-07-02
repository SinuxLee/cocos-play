## 适配屏幕

### 设置 UI Canvas
1. 添加 widget 组件，并设置 top,left,bottom,right 都是 0
2. 给 Canvas 添加一个 background 子节点，设置 sprite 为 2x2 的地图
3. 通过代码控制 background 的 尺寸实现图片平铺。
4. 设置 sprite 颜色，这样就实现了游戏的底色。

**发现一种更方便的方式，将相机的 clear color 设置为 99D1F0** 就不会有黑边了

### 控制游戏容器
1. 添加游戏根节点 game_container
2. 添加 GameContainer.ts 脚本组件，实现游戏内容的适配，可以实现竖屏游戏在 PC 宽屏和手机窄屏上的完整显示
3. 如果是竖屏游戏，一定要在项目设置里设置适配高度。

### 刘海屏、挖孔屏等异形屏
- 需要结合 SafeArea 组件
- 或者 widget.top = 50; // 根据设备安全区域动态调整

