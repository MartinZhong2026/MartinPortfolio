# V6.5.1 局部修复与验收说明

## 基线

严格基于 `Martin_Pool_Portfolio_V6_5_Refined_Pool_Icons_20261027.zip`，未重做 About 或其它案例正文；保留首页池底姓名、项目跳转及原有物理互动。

## 本轮修改

1. **FanScope 项目卡**：恢复官方风格的应用 Logo，停止把整张 Research Trends 屏幕截图缩进小图标容器。研究趋势真实截图仍保留在 FanScope 详情页。
2. **图标过曝**：五个浮标的正面 Logo 改用色彩稳定、不受强方向光二次漂白的材质；侧边壳体降低主光、环境光和高光能量，使用较温和的色调映射；保留侧面立体感、浮动和鼠标推动。
3. **泳池水体**：添加随时间缓慢变化的细小折射光斑，让非交互时也可看到水中光线，而不是仅凭偶发鼠标波纹；降低宽区域硬边采光差异、缩小大面积黑色池底阴影、适度压低过亮的瓷砖和水体颜色，添加图标附近低亮度水线高光。
4. **已有资产**：保留原有品牌图片、真正的应用页面截图与相应案例页面；没有增加外部图片依赖。

## 已核实

- ZIP 完整性检查（压缩后执行）。
- 27 个 TS/TSX 文件的 TypeScript 语法解析无错误。
- CSS 解析无错误。
- 所有五个 Logo 文件、FanScope 和 Adapt to China 页面截图文件路径存在。
- FanScope 项目卡片恢复 `<Glyph>`，详情页仍然引用 `/assets/fanscope/research-trends-20261027.webp`。

## 未核实 / 重要限制

- 受运行环境限制，`npm ci --offline` 由于未缓存的 TypeScript 包而失败；在线 npm 安装也未在限定时间内完成。
- 因此没有宣称 `typecheck/build/e2e` 通过，没有获得真实 WebGL2 截图，也不能宣称本次水面视觉已完全达到静态参考效果图。
- 浏览器软件渲染环境未能在限定时间内完成 shader smoke test。这不是确认存在 Shader Bug；需要在用户 Windows Chrome 上实际运行。
- 这版是候选修复版，必须进行本机桌面和手机检查后再考虑上线。

## Windows 验收

在包含 `package.json` 的目录打开 PowerShell：

```powershell
npm ci
npm run typecheck
npm run build
npm run dev
```

浏览器访问 `http://localhost:4321/` 和 `http://localhost:4321/work/`。检查 FanScope 小卡 Logo 是否完整清晰，Document AI/Adapt to China 白色浮标是否恢复层次，波纹和阴影是否仍有异常。鼠标移动、推动及点击项目导航均需实测。

F12 -> Console 检查 `document.documentElement.dataset.pool` 是否为 `live`，再使用浏览器设备工具查看 390 × 844。

运行 `npm run test:content` 和 `npm run test:e2e`（e2e 若需要浏览器运行时，先执行 `npx playwright install chromium`）；保存测试输出和实际截图。出现 WebGL 黑屏时首先保留 Console 原始报错。
