### 简单流程

node tree

Script
  └─(每帧 setProperty)
Sprite(Component)
  ├─ SpriteFrame(纹理 + UV/rect信息)
  └─ MaterialInstance(运行时实例)
        └─ Material(资源，引用 Effect，存默认参数)
              └─ Effect(定义 passes/props/macros)
                    └─ Shader(顶点/片元代码，含 uniform)

sprite -> script(动态修改 time param)
  |                     |
  |                     |
  |----> mat(材质，暴露 shader 参数) -> effect(提供 shader 脚本)
  |
  |
  |----> sprite frame (提供原始纹理)
