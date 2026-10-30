# V7 首页：高亮日光泳池（对照效果图）

基线：`Martin_Pool_Portfolio_V6_5_1_Pool_Lighting_Icon_Fixes_20261027.zip`。只改首页泳池和图片尺寸属性，About 和案例正文未动。

## 本轮修改
- **整体提亮**（`shaders.ts`、`PoolEngine.ts`）
  - 池底、池壁瓷砖改成接近白色的浅水蓝；
  - 水体吸收降低，深水色改为明亮的青蓝；
  - 焦散改为在瓷砖上叠加白色光带，水面呈现明亮的光网；
  - 高光闪烁增强；
  - 物件曝光由 0.94 提到 1.12，半球光、主光和环境光同步加强。
- **泳道**：改成效果图里的矩形泳道，四角各出头一格；池底姓名改用更深的蓝。
- **浮标**（`objects.ts`）
  - 每个浮标是品牌色的圆角软垫：Meetfolio 深绿、AbTrace 墨绿、FanScope 藏青、Document AI 白、Adapt to China 白色圆垫；
  - 顶面在画布上合成，品牌标志加项目名称，带湿润高光；
  - FanScope 的标志用矢量重绘，不再用发灰的原图。
- **水下部分与波纹**（`waterFrag`）
  - 每个浮标水下的身体，透过折射的水面显示为被水染色、随波晃动的轮廓；
  - 浮标周围有一圈圈向外扩散的波纹：它们作用在水面坡度上，所以会折射瓷砖、反射阳光。
- **纸船**：重做成经典折纸船，船身印有 “About Martin”，向镜头倾斜，放大到 1.35 倍。
- **池边装饰**（`Garnish.tsx` + CSS）
  - 用 SVG 绘制：棕榈叶投影（正片叠底）、虚化的前景棕榈叶、盆栽、条纹躺椅和饮料、遮阳伞；
  - 不拦截鼠标事件；手机端只保留叶子。
- **标签**：项目名已经印在浮标上，DOM 名称标签只在悬停或键盘聚焦时，和说明一起出现。
- **手机竖屏**
  - 修复池底姓名在竖屏下镜像、拉伸的问题；
  - 调整 FanScope、纸船、Document AI、Adapt to China 的位置，不再压住姓名。
- **内容检查修复**：给图标和卡片图片补上 width/height。这是 V6.5.1 原本就有的失败项。

## 实际运行过的检查（本次）
- `tsc --noEmit`：通过。
- `npm run build`：通过（10 个页面）。
- `npm run test:content`：全部通过。
- Playwright + Chromium（SwiftShader 软件 WebGL）实际截图，pool 状态为 `live`，无控制台错误：
  - `docs/v7/v7-home-1440.png`（1440×900）
  - `docs/v7/v7-home-hover-1440.png`（悬停 FanScope 时的提示）
  - `docs/v7/v7-home-390.png`（390×844）
  - 对比基线：`docs/v7/v6-5-1-before-1440.png`

## 未验证
- 截图来自软件渲染，帧率很低；真实 GPU 上的流畅度、波纹动画观感需要在 Windows Chrome 上实测。
- 1024×768 平板、键盘 Tab 导航、减少动态效果、无 WebGL 回退，这次没有重新截图检查。
- `npm run test:e2e` 未运行。
