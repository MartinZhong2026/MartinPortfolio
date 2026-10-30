# V8 — 首页叙事、单页项目卡、字体

基线：V7（`Martin_Pool_Portfolio_V7_Sunlit_Homepage_20261027.zip`）。

## 本轮修改
1. **泳池调暗**：亮度大致回到 V6.5.1 和 V7 之间。
   - 瓷砖、水色、焦散光带、高光、物件曝光（1.12 → 1.0）都相应降低。
2. **去掉纸船和所有池边装饰**：植物、躺椅、遮阳伞、叶影都删除了（`Garnish.tsx` 已删）。池中只留五个项目浮标。
3. **池中按钮**：池底姓名下方加了 “Dive into my work ↓”（跳到作品区）和 “About me”（跳到个人介绍），并补了一个对读屏可见的 `<h1>`。
4. **首页顺序**：泳池 → About（夜景肖像、教育经历）→ 我的经历和时间线 → 作品（5 个）→ 生活照片 → 结尾 CTA。
   - About 页拆成可复用的几个区块，`/about/` 页面内容不变。
5. **项目页改成单页结构**（Meetfolio、FanScope、AbTrace、Supplier Document Intelligence）：
   - 每页一屏，依次是：名称、时间、状态、What it is、Who it's for、Problems it solves、My role、链接 / 下一个项目、一行 Status & limits。
   - 右侧放图：
     - Meetfolio：新的访谈准备截图 + 实时转写截图；
     - FanScope：桌面版趋势页 + 两张手机截图；
     - AbTrace：新 Logo + 审核流程 + 示意版本记录；
     - Document AI：图标 + 示意审核界面（合成数据）。
6. **Adapt to China**：顶部用同样的单页卡（官网首页截图 + ATC AI 手机截图），下面保留完整的长故事。
7. **项目卡片**：Meetfolio、FanScope 的卡片换成真实截图。
8. **字体**：标题和正文都改用 `Cahuenga` 字体栈。
   - Cahuenga 是 Luxtypo 的商业字体，没有免费版本，项目中没有包含它的字体文件；当前只在访问者电脑已安装时才会使用；
   - 其余情况回退到开源的 Source Serif 4（SIL OFL），浮标和池底文字也用同一字体栈；
   - 购买网页授权后，把字体文件放进 `public/fonts/`，再在 `main.css` 顶部的 Cahuenga `@font-face` 里加上 `url()` 就能切换；
   - 旧的 Bricolage 和 Instrument Sans 字体已移除。

## 实际运行过的检查
- `tsc --noEmit`：通过。
- `npm run build`：通过（10 个页面）。
- `npm run test:content`：全部通过。
- Playwright 截图（`docs/v8/`）：
  - 首页泳池 1440 / 390（WebGL live，无控制台错误）；
  - 首页整页（静态泳池模式）；
  - 5 个项目页 1440（确认一屏放得下）；
  - 项目页 390。

## 未验证
- 真实 GPU 上的泳池亮度和动画，需要在 Windows Chrome 上看。
- 1024 宽平板、键盘导航、`npm run test:e2e` 没有运行。
- FanScope 截图上有样本数和缺失率（n=740 / 2,365、缺失 69%）。这些图是你本次提供的，已按你的要求公开展示；如果这些数字不想公开，可以换图。
