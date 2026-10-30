# V9 修改说明

## 本轮修改
1. **Contact 并入 About**
   - 删除独立的 `/contact/` 页面和导航里的 Contact；
   - About 页（以及首页底部的同一区块）新增 `#contact` 联系区：邮箱 adapttochina@163.com 和 “Email me” 按钮；GitHub、LinkedIn、简历链接在 `site.ts` 里填写后会自动出现；
   - 页脚和项目页里的 Contact 链接改为指向 `/about/#contact`；
   - `_redirects` 把旧的 `/contact` 地址 301 跳转到 `/about/#contact`。
2. **泳池再暗一点**：瓷砖、焦散光带、水色和曝光（1.0 → 0.96）都略微下调。
3. **Adapt to China 压缩为两屏**
   - 第一屏：项目单页卡（官网截图 + ATC AI 手机截图）；
   - 第二屏：发展的 5 个阶段、本地目录数据、ATC AI 介绍（截图 + 功能说明 + “Try ATC AI” 链接，指向 adapttochina.com/aichatbox，已确认可以打开）、两条已授权的用户评价、Status & limits。
4. **手机截图显示成黑块的问题**：项目卡里的截图不再使用懒加载，手机外框底色从黑色改成浅米色；即使图片没加载出来，也不会再显示成黑块。ATC AI 手机截图换成了这次提供的高清图。
5. **项目卡片**：Meetfolio、FanScope 的卡片改回图标。FanScope 图标按你提供的 Logo 重新绘制成高清版（青色圆角方块 + 白色三角）。

## 实际运行过的检查
- `tsc --noEmit`、`npm run build`（9 个页面）、`npm run test:content` 全部通过。
- 内容检查新增两项：独立的 Contact 页不能存在；About 页上必须能看到邮箱。
- Playwright 截图：`docs/v9/`。

## 未验证
- 黑块问题我这边没能复现，上面只是预防性修复，请你在本机确认。
- 真实 GPU 上的泳池亮度、平板尺寸、`npm run test:e2e` 没有运行。
