# V6 Refresh 验收报告（V7 任务）

**Public contact configured:** `adapttochina@163.com`，已由 Martin 确认为公开邮箱；联系方式阻塞已解除。WebGL 动态验收状态不变。

日期：2026-10-27。唯一开发基线：用户上传的 V6 源码；未采用被否定的 V7 视觉设计。保留原技术栈、路由、五个项目和泳池交互方式。未部署、未推送。

**交付状态：源码更新和静态构建完成；WebGL 动态视觉验收未完成，不应将本报告视为全面上线验收通过。**

## 真正运行过的检查

| 检查 | 结果 |
| --- | --- |
| `npm install --ignore-scripts --no-audit --no-fund --fetch-retries=0 --fetch-timeout=15000` | 通过，安装 19 个包。原 dependencies / devDependencies 声明未改变，新增锁文件。 |
| `npm run typecheck` | 通过。最终代码无 TypeScript 错误。 |
| `npm run build` | 通过。最终输出 10 个静态 HTML 页面及资源。 |
| `npm run test:content` | 通过。页面、5 项目链接、图片 alt/宽高/存在性、两条原文评价、撤销授权时不渲染、无 TODO/VERIFY 泄漏、无未授权合照/未确认邮箱，已确认邮箱正确显示并链接、每案例一处集中边界说明。 |
| `npm run test:e2e` | **未通过：测试浏览器无法启动**。环境中缺少 Playwright Chromium。不是网页测试断言已通过。 |
| `npx playwright install chromium` | 下载失败，返回的文件不是有效 ZIP；没有继续更换网络或浏览器路径。 |
| 主机离屏 GLSL 编译检查 | 16/16 着色器阶段编译通过：11 段池体/水面/模拟代码、2 段 Three physical 材质浸水注入、2 段轮廓阴影、1 段模糊。环境为 EGL/Mesa OpenGL 4.5 compatibility；使用桌面 GLSL 兼容前缀。日志：`docs/shader-check.log`。这不是 WebGL2 浏览器运行或视觉验收。 |
| 本地预览的独立浏览器检查 | 浏览器报告 `no-webgl2`；静态降级显示可用。三个指定尺寸均已实际截取。 |
| 浏览器 DOM 检查 | 手机静态首页 375px 可用宽度 / 375px 内容宽度，无横向溢出；六标签矩形不重叠。平板 1009/1009，桌面 1425/1425。尺寸差值来自截图容器的滚动条。 |
| About 手机页面 | 375/375 无横向溢出；肖像及 3 张公开生活图片加载成功；未出现群体合照。 |
| 企业项目筛选 | 实际点击 Client Work，正确保留 AbTrace / Supplier Document Intelligence 两项。 |
| ATC 评价及图片 | 实际页面恰有两条 `data-consent=true` 的匿名评价；首页和历史海报加载成功。 |
| `public/og.png` | 1200×630，实际打开检查；使用静态泳池截图、姓名和标语。 |

预览所用临时 iframe 页面只用于尺寸验收，不进入 `dist/` 或交付路由。预览服务已停止。独立浏览器日志出现浏览器扩展自身的 metadata 错误；未把这些误报为站点 JS 错误，也未声称整个站点控制台零错误。

## P0：逐项对照原评审

| 原问题 | 本次源代码改动 | 可确认的结果与剩余验证 |
| --- | --- | --- |
| 1. 物件像贴纸，没有浸水 | 每张 PNG alpha 生成距离场；relief 材质加入外缘水色、法线 UV 扰动、随 bob 改变的水线、淡接触阴影；水面射线与近似椭球求交，支持射线从体内出发，并加入水下衰减及柔和焦散。 | 代码、资源、类型及离屏编译通过。**真实折射、水线厚度、材质观感未验证。** 保留 2.5D 资产方式，没有声称已变成高模 GLB。 |
| 2. 高斯椭圆与轮廓不符 | `FloatShadows.ts` 新增 512×320 RGBA8 轮廓目标，按折射后的光向投影真实 alpha / 程序化几何，双 pass 高斯模糊；软度随水深及物件高度变化；最大遮挡约 0.43。旧椭圆阴影着色路径已替换，原 footprint 数组仅用于水下体积。 | 离屏编译通过；屏幕左上光向随竖屏相机旋转。**动态阴影方向、接触距离及视觉软硬未验证。** |
| 3. 池底硬边亮矩形 | 移除 caustic `inside` 的 step 门限，改为沿光线回溯到水面的池壁距离 smoothstep；只让实际背光方向产生壁影。减轻暗角、缩窄马赛克水线、提亮池壁。 | 水面着色器编译通过。**真实池底光照和矩形消失情况未验证。** |
| 4. 霓虹能量圈 | 焦散面积比先限幅，再指数软饱和；hover 扰动强度约为原先 60%，半径增大，高光加上限，降低环境和浮动物体持续扰动。 | 数值和编译检查通过。**鼠标划水后的光圈强度、节奏和整体亮度未验证。** |
| 5. 纸船不可辨认 | 替换为带尖首尾、开放船身、中央三角折面与深浅纸面的小型程序化体积，取消原先接近竖直的翻转。 | 几何代码和类型检查通过。静态降级仍用纸船 glyph。**新 WebGL 船体的实际可辨识度未验证。** |
| 6. 手机拥挤、空白、标签重叠 | 找到并修正了真正的竖屏逻辑错误：桌面避让标题的 x 约束被误用于竖屏；熊猫移至上方，尺寸按投影约半池宽调节，四个物件在下方 2×2 分布；纸船在角落。增加屏幕坐标标签候选位置与碰撞避让。隐藏提示框不再扩大页面宽度。 | **390×844 静态截图已确认布局分散、六标签不重叠、无横向溢出。** 真实 WebGL 移动/推挤后的标签避让、触屏操作仍未验证。 |

### 资产说明与评审文件的差异

实查发现，V6 PNG 的 AbTrace / Document AI / FanScope 分别是烧瓶、打印机、泳圈上的望远镜，评审中的绿/粉/橙鸭描述与实际文件不符。因此保留实际 V6 素材并纠正 tooltip，不强制替换成另一套物件。Meetfolio 黄鸭的耳机/麦克风版可作为后续资产改进。

## P1 / P2 内容落地

- 保留 V6 About 版式，加入带日期的 6 段职业/教育经历、从研究到产品的主线及 YBBE 企业沟通经历。
- 四张能力卡连接到具体决策；不再把缺乏原始复现的航站楼错误或 30 分钟故障写成已解决的成绩。
- `src/data/testimonials.ts` 仅录入两条已授权原文摘录；`Testimonial` 严格要求 `consent === true`。自动检查实际将 consent 改为 false，确认输出为空，再恢复。
- 北京评价邻近实际服务故事；医院评价邻近医疗导航/早期 PDF 决策。无原头像、昵称或聊天截图。
- ATC 使用真实首页截图、标注历史的宣传图、RMB 30 医疗小册子停止试验的经历，以及带快照边界的早期订单数。
- 原始医疗小册子封面仍缺失；显示明确的文字 artifact 卡，不用其他图冒充。数据字段为 null，没有传播未核验的 “official 2026 standards” 声明。
- 生活区只公开个人跑步/10 km 和原创画作；两张合照 `publicOk: false`。10 个徒步地区由实际数组计数。
- 首页轻量个人生活入口、求职方向、地域与时间线均已加入；具体到岗日期仍为 null。
- 每个 case 的事实边界集中至一个 Status & limits 区块。House Planner、ERP 草稿、人类审批、FanScope 覆盖率与研发阶段边界保留。
- Martin 本轮确认公开邮箱 `adapttochina@163.com`；已更新 Contact 地址展示及各页页脚的 mailto 入口，并通过内容检查。原候选邮箱没有公开。origin 为空时仍不编造 canonical 域名。
- 新建 1200×630 OG 图；内容检查覆盖所有 HTML 图片和编辑标记。

## 实际截图

所有截图均来自真实页面。下面三张首页图片是 **静态降级模式**，不是 GPU 水面效果的截图。

| 路径 | 尺寸 / 内容 |
| --- | --- |
| `test-results/portfolio-v6-desktop-static.jpg` | 1440×900：首页静态降级 |
| `test-results/portfolio-v6-tablet-static.jpg` | 1024×768：首页静态降级 |
| `test-results/portfolio-v6-mobile-static.jpg` | 390×844：首页静态降级 |
| `test-results/portfolio-v6-about-desktop.jpg` | 实际浏览器桌面 About 首屏 |
| `test-results/portfolio-v6-about-mobile.jpg` | 390×844：About 首屏 |
| `test-results/portfolio-v6-life-mobile.jpg` | 390×844：生活区实际滚动位置 |
| `test-results/portfolio-v6-atc-testimonial.jpg` | 实际 ATC 服务与评价区 |
| `docs/v6-before-mobile.png` | 用户提供的原 V6 手机截图，只用作问题参考；不是此次运行截图 |

**没有提供虚假的 2× WebGL 特写。** 包内 e2e 脚本已准备好在正常测试环境以 DPR2 拍摄熊猫/黄鸭，等待 4 秒并进行鼠标划水后保存首页图片。该脚本在此环境未进入浏览器用例。

## Unverified

1. Three.js 场景完整着色器组合、实际像素和动态表现；离屏 GLSL 编译不等于完整 WebGL2 渲染通过。
2. 水线和折射的细节、阴影方向和软度、焦散亮度、新纸船观感；指定三尺寸的 **live** 页面及真正 2× 特写。
3. 实际 GPU 下性能、长时间显存、context loss/restore、页面返回、对象推挤碰撞。
4. 无 JavaScript、reduced-motion 和键盘全流程的运行验收；现有实现保留并加入了待执行 e2e 用例。
5. 触屏、Windows Chrome、Safari/iOS/Android 的真实设备验收。
6. 正式域名、外部作品链接、所有外部站点当前可用性；本任务未访问外部项目或验证实时经营指标。
7. 其他公开账号/简历、合照许可、企业原型公开边界，以及医疗小册子原始资料，见 CONTENT_TODO.md。公开邮箱已确认，不再是待办。

## 在支持 WebGL2 的机器上继续验收

```powershell
npm ci
npm run typecheck
npm run build
npm run test:content
npx playwright install chromium
npm run test:e2e
npm run dev
```

打开 `http://localhost:4321/`，确认页面进入 live 模式；划过水面，逐项复查 P0。若 WebGL 不可用，项目入口应保留在静态池和项目列表中。测试文件最后会明确拒绝将只通过静态降级的运行当作 live 验收通过。
