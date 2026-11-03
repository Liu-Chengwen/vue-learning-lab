# 验收记录

验收日期：2026-10-24。范围对应当前 Vue Lab 实现；知识覆盖深度见 [feature-coverage.md](feature-coverage.md)。

## 自动化与构建

| 检查 | 结果 |
| --- | --- |
| `pnpm format:check` | 通过，沿用项目现有 Prettier 配置 |
| `pnpm test` | 8 个测试文件，38 项通过，无未处理测试异常 |
| `pnpm build` | Vite 生产构建通过，生成 manifest、source map 与动态分块 |
| `pnpm webpack:build` | Webpack 5 独立 Vue SFC 示例构建通过 |
| `node scripts/build-report.mjs` | 成功读取当前 dist，统计 172 个 JS/CSS/HTML 文件及原始/gzip 大小 |
| 文档核对 | README、学习指南、覆盖表、工具链指南中的命令、相对链接与路由已核对 |

测试涵盖组件通信、多 model、组件缓存、路由及嵌套父级状态保留、类与 API 行为、取消/竞态、防抖清理、持久化、真实源码读取、任务表单和受控筛选重置。DOM 模拟测试不用于证明 CSS 实际尺寸。

源码面板按需读取真实文件；Webpack 示例只收集 src 与配置，不把生成的 examples/webpack/dist 再打进主应用。体积报告包含教学源码文本分块，不等于首页首次下载量。

## Chrome 实际操作

使用用户授权的 Chrome 进行桌面宽屏检查，并在 DevTools 的 **390 × 844** 响应式视口检查窄屏。下列结果来自实际界面操作。

| 页面/场景 | 操作与观察 |
| --- | --- |
| 学习总览 | 标题、学习路线、34 个专题、80 道题及侧栏布局正常显示 |
| 明暗主题 | 切换浅色/深色；主按钮与 RadioButton 选中文字清晰；验收后恢复默认浅色与森林绿 |
| 移动端导航 | 展开导航、进入任务工作台，导航关闭；主内容随窄屏重排 |
| 任务筛选 | 搜索不存在的标题显示 0 条与空状态；重置清空条件并恢复 8 条任务 |
| 任务表单 | 改标题后取消触发未保存提示；放弃后重开仍为原值；保存原值时禁用表单、显示保存中并正常关闭 |
| 窄屏任务表单 | 标题、输入、状态、日期、优先级、标签和底部操作正常排列；没有弹窗横向越出视口 |
| 表单标签 | 修复优先级 label 指向 div 的错误后重新打开；Console 无运行报错，Issues 中 page errors 为 0 |
| Flex 实验 | 开启长文本、把容器缩到 240px，关闭 min-width:0 时第一项约 250.8px；开启后约 78.8px，真实尺寸随布局更新 |
| 类与继承 | 执行默认实验，看到自有字段、原型共享方法、箭头字段、构造返回值与描述符等真实结果 |
| 源码阅读 | 类实验切换源码，能阅读 ClassLab.vue 与 classModels.js；窄屏代码在面板内横向滚动 |
| 多 v-model | 修改子组件 title 后父级同步；输入 vue model 后自定义 capitalize 修饰符得到 Vue model，并记录真实更新日志 |
| 渲染机制 | count 更新普通节点，once/memo 保留各自边界；点击编译得到实际 Vue 编译器生成的缓存、patch flag 等代码 |
| 组件库主题 | 切换全局色，打开传送到 body 的定制弹窗，检查标题/内容/底部插槽与全局主题；随后恢复默认 |
| 面试复习 | 搜索闭包得到关联题，展开答案、收藏、标记掌握均生效；临时收藏/掌握标记已取消 |
| 动态导入 | 点击加载模块得到 lazyFeature.js 生成的真实报表结果 |
| HMR | 临时修改 hmrProbe.js 字符串，页面无需刷新即显示新文案和已接受更新 1 次；随后恢复文件原内容 |
| Vite 开发代理 | 启动本地 mock 后点击请求，得到 ok:true、vue-lab-mock 与开发代理转发成功的 JSON |
| Webpack 独立示例 | 5174 页面正常显示；计数 1 时 computed 为 2，动态加载 report.js 返回对应报表；图标 404 已修复并刷新复验 |

## 本次修复

- SearchPanel 重置时立即把同一份新值传给 update:modelValue 和 reset，避免读取尚未回写的父级 prop；新增 3 个受控父组件场景回归测试。
- 任务优先级使用 radio group 的组标签语义，保留 aria-labelledby；新增真实标签关联测试。
- ElPagination 使用 size="small"，消除旧 small API 的弃用提示。
- 深色主按钮及单选按钮选中文字调整为深色，避免浅色主色背景上的低对比度。
- Webpack HTML 提供内联图标；源码 glob 排除构建产物。

测试中的任务编辑递归异常来自全局 Teleport stub：恢复真实弹层挂载后，保留实际 Dialog、Form、Select 的集成测试通过。没有把 DOM 模拟环境的问题当作生产交互故障。

## 验证边界

这是 Chrome 代表性人工操作与 DOM 模拟回归测试，未执行完整跨浏览器、真机、读屏和性能基准矩阵。SSR、完整 TypeScript 工程与 Ant Design Vue 运行应用属于覆盖表明确列出的拓展范围。构建流程图和体积策略页的教学模型仍按页面说明解读；真实运行结果以网络、终端和生成文件为准。

检查结束后停止本次启动的 Vite、Webpack 与 mock 服务；日常学习运行 pnpm dev 即可，代理实验另外启动 pnpm mock:api。
