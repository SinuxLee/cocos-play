effect 里最核心的三部分是：**CCEffect（管线/材质参数声明）**、**VS 顶点程序（把网格数据变成片元可用的插值数据）**、**FS 片元程序（真正算颜色）**。它们的作用和依赖关系如下。

---

## 1) `CCEffect %{ ... }%`：渲染管线配置 + 材质参数入口（“怎么画 + 画的时候能调什么”）

### 作用
- **指定使用哪个顶点/片元程序**
  ```yaml
  vert: vs:vert
  frag: fs:frag
  ```
  这意味着该 pass 会调用 `CCProgram vs` 里的 `vert()`，和 `CCProgram fs` 里的 `frag()`。

- **配置 GPU 状态（2D Sprite 常规状态）**
  - `depthTest=false / depthWrite=false`：不参与深度测试、不写深度，避免 2D 被深度挡住或写深度影响其它对象。
  - `blendState`：开启透明混合（src_alpha / one_minus_src_alpha），保证 PNG 等透明边缘正常。
  - `cullMode: none`：不剔除背面，2D 面片正反都能显示（通常 sprite 没必要剔除）。

- **声明材质面板可调的 `properties`**
  ```yaml
  properties:
    startColor ...
    endColor ...
    horizontal ...
    time ...
    speed ...
    amplitude ...
  ```
  这些是“材质实例”可调参数，**引擎会把它们自动绑定到 shader 中的 uniform（通常是 `Constant` 块）**。

### 依赖关系
- **依赖 VS/FS 的入口函数名和 program 名一致**（`vs:vert` / `fs:frag`）。
- `properties` **依赖 FS（或 VS）里存在对应的 uniform 字段**才能真正被用到；不使用也不会报错，但参数调了没效果。
- 这里的 blend/depth/cull 会直接影响 FS 输出颜色如何被合成到屏幕上（比如不开 blend 透明就“糊成黑块”）。

---

## 2) `CCProgram vs`：顶点着色器（“把点变成屏幕上的形状，并生成插值数据”）

### 作用
- **读取引擎提供的顶点输入语义**
  ```glsl
  in vec3 a_position;
  in vec2 a_texCoord;
  in vec4 a_color;
  ```
  Sprite 渲染时，网格通常就带这三样：位置、UV、顶点色（顶点色常用于 Tint/透明）。

- **输出给片元着色器的插值变量**
  ```glsl
  out vec2 uv0;
  out vec4 color;
  ```
  它们会在三角形内部被插值，FS 才能拿到每个像素对应的 uv/颜色。

- **做坐标变换到裁剪空间**
  ```glsl
  return cc_matViewProj * vec4(a_position, 1.0);
  ```
  `cc_matViewProj` 来自 `cc-global` 内建 uniform，用于把本地坐标变到 clip space。

### 依赖关系
- FS **依赖** VS 输出的 `uv0`、`color`：你在 FS 里写了 `in vec2 uv0; in vec4 color;`，必须由 VS 对应 `out` 提供，类型/名字要匹配（在同一套管线语义下）。
- VS 依赖 `#include <builtin/uniforms/cc-global>` 提供的 `cc_matViewProj`；没有它就无法正确变换坐标。

---

## 3) `CCProgram fs`：片元着色器（“最终每个像素怎么着色”）

### 作用
- **采样 Sprite 纹理**
  ```glsl
  layout(set = 2, binding = 11) uniform sampler2D cc_spriteTexture;
  vec4 tex = CCSampleWithAlphaSeparated(cc_spriteTexture, uv0);
  ```
  - `cc_spriteTexture` 是引擎约定的 sprite 主纹理绑定位。
  - `CCSampleWithAlphaSeparated` 来自 `embedded-alpha`，用于兼容“颜色纹理 + 单独 alpha 纹理”的打包方式（移动端/压缩纹理常见）。

- **使用 `properties -> uniform Constant` 驱动效果**
  ```glsl
  uniform Constant {
    vec4 startColor;
    vec4 endColor;
    float horizontal;
    float time;
    float speed;
    float amplitude;
  };
  ```
  然后用 `sin(time*speed)` 做动态值，混合出渐变色 `grad`：
  ```glsl
  float s = sin(time * speed);
  float wobble = (s * 0.5 + 0.5);
  vec3 grad = mix(startColor.rgb, endColor.rgb, wobble);
  ```

- **输出最终颜色：纹理 * 渐变 * 顶点色**
  ```glsl
  return vec4(tex.rgb * grad, tex.a) * color;
  ```
  - `color` 是 VS 传下来的顶点色（通常包含节点 tint + opacity）。
  - alpha：保持 `tex.a`，再乘顶点 alpha（常规 sprite 透明叠加路径）。

### 依赖关系
- FS **依赖**：
  1) VS 的 `uv0`（决定采样哪里）、`color`（决定最终 tint/透明）。
  2) CCEffect 的 `properties` 自动绑定到 `Constant`，否则 `time/speed/...` 只能是默认值或未定义来源。
  3) 引擎内建的 `cc_spriteTexture` 绑定（set=2,binding=11）和 `embedded-alpha` 实现，否则采样可能不对或直接编译失败。

---

## 三者之间的“链路”（以终为始：从屏幕像素倒推）

1. **FS 想算每个像素颜色**  
   需要：`uv0` 来采样纹理、`Constant` 参数来算渐变、`color` 来叠顶点色。
2. **这些输入从哪里来**  
   - `uv0/color`：只能由 VS 产出并插值传递。  
   - `Constant`：由 CCEffect 的 `properties` 和材质实例提供（其中 `time` 还需要脚本每帧更新）。
3. **最终怎么显示到屏幕上**  
   CCEffect 的 blend/depth/cull 状态决定 FS 输出颜色如何与背景混合、是否被深度影响、是否会被剔除。
