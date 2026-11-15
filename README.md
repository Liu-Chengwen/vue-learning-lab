# Vue Lab · 前端面试实验室

这是基于当前 Vite 项目实现的中文学习应用：通过真实交互理解 Vue 3，用 Element Plus 完成业务封装，再把 CSS、JavaScript 和构建工具串起来复习。

## 启动

建议使用项目 engines 要求的 Node.js（`^22.18.0 || >=24.12.0`）和 pnpm。

```sh
pnpm install
pnpm dev
```

打开终端显示的本地地址（通常是 `http://localhost:5173`）。路由使用 hash 模式，刷新实验或任务详情不会丢失入口。任务、完成记录、收藏和主题保存在当前浏览器 localStorage。

## 从哪里开始学

1. **学习总览**：查看路线、完成情况和最近访问的实验。
2. **Vue 3 核心**：从 API 风格、模板与响应式开始，再学习通信、model、插槽、生命周期、内置组件、路由和渲染。
3. **任务工作台**：实际操作 CRUD、筛选、分页、看板、表单校验和失败重试，再阅读四个业务组件。
4. **CSS / JavaScript**：调布局参数观察实际尺寸；先预测 JS 结果再执行，特别复习 this、闭包、类与继承、ES2015 和后续 API。
5. **Vite / Webpack**：运行两套开发与生产构建，比较模块加载、HMR、分块、代理和 source map。
6. **迁移与面试复习**：先回答，再展开解析，回到相关实验验证。

每个专题提供「动手实验 / 阅读源码 / 面试追问」，并附解释和改造练习。源码面板通过 Vite `?raw` 读取真实文件，修改示例后阅读内容也随之变化。完成标记和“掌握”是个人自评。

- [学习指南](docs/learning-guide.md)：建议路线、操作方法与源码阅读顺序。
- [知识覆盖表](docs/feature-coverage.md)：哪些做了实操、哪些是拓展说明。
- [WKWebView / Hybrid 联调](docs/hybrid-integration.md)：第 04 课的字符串通信、Promise 协议、原生定位、导航实验和 Swift 接入步骤。
- [业务组件接口](docs/component-contracts.md)：状态归属、props、events、slots、expose。
- [Vite / Webpack 实践](docs/vite-webpack-guide.md)：运行、代理、构建与验证方法。
- [需求设计](docs/vue3-learning-plan.md)：项目范围和最初的学习目标。
- [验收记录](docs/verification.md)：自动化结果、Chrome 桌面与窄屏操作检查。
- [项目面试介绍](docs/project-interview.md)：技术栈、口述稿、简历描述、技术问题与演示顺序。
- [AI Harness 实践计划](docs/ai-harness-plan.md)：项目规则、Skill、MCP 与校验闭环的阶段及实际进度；项目约定见 [AGENTS.md](AGENTS.md)。
- [AI Harness 使用指南](docs/harness/guide.md)：启动带项目 MCP 的 Codex、调用三个 Skill、执行统一校验及读取报告。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 启动主应用的 Vite 开发服务 |
| `pnpm build` | 主应用生产构建，输出 `dist` |
| `pnpm preview` | 预览已构建的主应用 |
| `pnpm test` | 运行 Vitest 组件、状态与路由集成测试 |
| `pnpm test:watch` | 开发时持续运行测试 |
| `pnpm format` | 按现有 `.prettierrc` 格式化代码 |
| `pnpm format:check` | 检查代码格式 |
| `pnpm webpack:dev` | 启动独立 Webpack Vue SFC 对照应用，端口 5174 |
| `pnpm webpack:build` | 对照应用生产构建，输出 `examples/webpack/dist` |
| `pnpm mock:api` | 启动仅本机可访问的模拟 API，端口 3001 |
| `pnpm build:report` | 构建主应用并显示真实产物的原始/gzip 大小 |
| `pnpm check` | 连续运行测试和两个生产构建 |
| `pnpm harness:codex` | 启动带项目只读 MCP 配置的 Codex，可传入标准 Codex 参数 |
| `pnpm harness:mcp` | 单独启动本地 stdio MCP，通常由宿主自动管理 |
| `pnpm harness:verify` | 顺序执行格式、测试及两个构建，失败非零退出并保存 JSON 报告和日志 |

主项目保留 CSS/Less。Element Plus 通过显式组件导入使用，样式通过全局 CSS 变量统一主题；图标依赖名 `lucide-vue-next` 使用 npm alias 指向维护中的 `@lucide/vue`。依赖实际版本以 `pnpm-lock.yaml` 为准。

## 真实开发代理

开两个终端，分别运行：

```sh
pnpm mock:api
pnpm dev
```

在工程专题的「环境、代理与配置」实验中点击实际请求按钮，或访问 `http://localhost:5173/api/health`。Vite 将 `/api` 前缀去除后转发到本机 3001 接口。生产预览不运行开发代理。

### Spring Boot 业务控制台

业务前端全部位于本工程。配套 `../springboot-lab` 只负责 Java API、数据库与基础设施。侧栏「后端业务控制台」或 `http://localhost:5173/#/backend-lab` 提供登录注册、用户分页筛选与管理员 CRUD、审计和异步消息观察；原 `/#/backend-demo` 保留最早的问候练习。

1. 在后端运行 `./scripts/lab.py run`，或部署后端容器。
2. 在本工程 `.env.local` 设置 `SPRING_BOOT_PROXY_TARGET` 指向实际 Java 端口（默认8080，当前本机完整后端容器为8081）。
3. 运行 `pnpm dev` 并打开 `/#/backend-lab`。管理员凭证在后端本机 `infra/.env` 中。

| 浏览器路径 | 开发目标 | 处理 |
| --- | --- | --- |
| `/api/v1/...` | `SPRING_BOOT_PROXY_TARGET` | 保留路径，Java API |
| `/backend-health` | 同上 | 转为 `/actuator/health` |
| `/swagger-ui/...`、`/v3/api-docs...` | 同上 | 保留路径，文档与登录共享浏览器源 |
| 其他 `/api/...` | `API_PROXY_TARGET`，默认3001 | 去掉 `/api` 前缀，Node Mock |

Session Cookie 为 HttpOnly，登录态仅在 Pinia 内存中保存，页面通过 `/auth/me` 恢复；所有写请求先取得 CSRF token，登录和退出后更新。密码、Cookie 与 CSRF token 均不写入 localStorage。完整运行与 Nginx 部署见 [前后端集成说明](docs/backend-integration.md)。

## WKWebView / Hybrid 实验

侧栏与全局搜索提供 Hybrid 入口，或直接打开 `http://localhost:5173/#/hybrid`。页面接收 `window.receiveNativeMessage(message)` 的字符串，并通过 `window.webkit.messageHandlers.nativeBridge.postMessage(text)` 向原生提交消息。

第三阶段通过 `src/utils/nativeBridge.js` 封装 `nativeBridge.call(action, params)`：请求 ID 与 Promise 回调表配对结果，5 秒超时和页面卸载会清理等待项。页面提供设备信息、带参问候、未知方法、调试版超时和并发请求五个练习。

原生定位实验位于 `/#/hybrid/location`，也可从 HybridLab 首页的定位入口打开。点击按钮后，H5 通过 `nativeBridge.call("getLocation", {}, { timeoutMs: 60000 })` 等待 Swift 请求系统授权并执行单次定位，展示经纬度、精度和采样时间；其他调用仍默认等待 5 秒。定位结果只保留在当前页面内存中，不持久化或上传，普通浏览器不会返回模拟坐标。

导航实验位于 `/#/hybrid/navigation`，包含入口、页面 A 和页面 B。实验内的小封装可以选择当前容器的 Vue 路由跳转，或调用 `openWebView` 新建原生容器；输入草稿、计数和 JS 环境标识用于观察生命周期与状态保留。模式只作用于本实验，现有业务导航保持当前行为。

普通浏览器可使用明确标注的“浏览器模拟”观察字符串接收与 Vue 更新；真实联调需要 HybridLab 注册 `nativeBridge` 并加载该地址。字符串提交提示不代表原生已处理，Promise 结果则来自 Native 的结构化响应。完整协议、目录与各实验的手工步骤见 [Hybrid 联调说明](docs/hybrid-integration.md)。

## 代码组织

```text
src/
  App.vue                   应用布局、导航、搜索
  components/learning/      学习框架与真实源码面板
  components/business/      搜索、表格、任务表单、远程选择器
  features/labs/            Vue 3 实验与子组件
  features/foundations/     CSS / JavaScript 实验
  features/tasks/           任务管理与详情
  features/ui-library/      Element Plus 定制、封装与 Ant 对照
  features/tooling/         构建工具实验
  features/backend/         Spring Boot 控制台、登录、用户表单与消息观察
  features/hybrid/          WKWebView 双向通信、定位与专用导航实验
  features/interview/       问答、筛选、收藏和自评
  stores/                   任务、外观与学习记录
  composables/              请求取消、防抖等复用逻辑
  services/                 本地异步模拟、校验与任务数据
  utils/                    独立的 Native Promise 请求与响应工具
  data/                     专题、导航、迁移片段和关联题库
examples/webpack/           可单独运行的 Webpack 5 + Vue 3 SFC 示例
scripts/                    模拟 API 与构建产物报告
```

## 范围与验证说明

- **Element Plus** 是实际业务主线；**Ant Design Vue 4.x** 提供 Form/Table/Modal/主题的参考代码与迁移对照。
- **Vue 2** 代码作为阅读对照；应用统一运行 Vue 3。Options API 与 Composition API 不等同于版本边界。
- **Suspense** 标注为实验性；SSR/hydration、自定义渲染器等是拓展说明。
- Vite / Webpack 页面区分真实环境、模块加载、HMR与代理实验，以及明确标注的流程/体积教学模型。真实产物以终端和生成文件为准。
- Vite 构建保留 manifest 和 source map，便于教学。源码阅读功能会额外生成按需加载的源码文本 chunk，分析体积时应与实际运行模块区分。
- 关键代码包含中文注释，解释数据流、API 选择、扩展接口和清理边界。测试覆盖通信、缓存、异步竞态、防抖清理、草稿隔离、持久化和主路径渲染。
- 当前通过 83 项自动化测试、Vite / Webpack 生产构建和代码格式检查；Harness 的实际 Skill、MCP 调用及校验见[阶段记录](docs/harness/runs/2026-11-03-skills-mcp-verify.md)，字段禁用功能的最新检查见[测试与浏览器验收](docs/harness/runs/002-search-panel-disabled-browser.md)。
- 学习应用已完成 Chrome 桌面与 390 × 844 窄屏的代表性视觉/交互验收，具体操作与验证边界见[验收记录](docs/verification.md)。
