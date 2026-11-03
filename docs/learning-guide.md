# Vue Lab 学习指南

这份指南帮助你按“观察行为 → 找到源码 → 修改验证 → 面试表达”的顺序使用项目。知识覆盖和实操深度见 [feature-coverage.md](feature-coverage.md)；运行与构建命令以根 [README.md](../README.md) 为准。

## 1. 启动与导航

在项目根目录运行：

```sh
pnpm install
pnpm dev
```

打开终端打印的地址。应用使用 hash 路由，下面写的 `/labs/setup` 对应浏览器地址中的 `/#/labs/setup`；同理，`/javascript/classes` 对应 `/#/javascript/classes`。

- **学习总览**：查看路线、完成情况和最近访问。
- **任务工作台**：体验完整的 Element Plus 业务流程。
- **Vue 3 / CSS / JavaScript / Vite 与 Webpack**：进入可运行实验。
- **组件库应用与定制**：观察主题、配置、业务封装和 Ant Design Vue 参考片段。
- **迁移对照 / 面试复习**：把操作现象整理成能说清楚的答案。

先在任务工作台新增一条自己的学习任务。编辑标题、状态、标签和截止日期，取消一次编辑，再保存一次；尝试筛选、分页、表格/看板切换和失败重试。先知道应用能做什么，再逐步理解它怎样实现。

## 2. 推荐学习顺序

不要求一次学完所有基础。遇到 Vue 行为不清楚时，返回关联的原生 JS/CSS 实验验证。

| 阶段 | 建议入口 | 学习目标 |
| --- | --- | --- |
| 1. 必要语言基础 | `/javascript/scope`、`/javascript/this`、`/javascript/closures`、`/javascript/arrays` | 理解变量、调用接收者、词法环境、值与引用 |
| 2. Vue 入门 | `/labs/setup`、`/labs/templates`、`/labs/reactivity` | 把状态和声明式模板连接起来，区分三种 API 写法 |
| 3. 组件设计 | `/labs/communication`、`/labs/models`、`/labs/slots` | 用 props、事件、model、插槽和有限的实例接口组织协作 |
| 4. 组件库实践 | `/tasks`、`/ui-library` | 看懂表单、表格、远程选择器和弹窗的职责边界 |
| 5. CSS 巩固 | `/css/flex` → `/css/box` → `/css/bfc` → `/css/grid` → `/css/position` → `/css/styles` | 从真实布局尺寸理解空间分配、格式化上下文和主题作用范围 |
| 6. 异步与资源 | `/javascript/async`、`/javascript/functions`、`/javascript/events`、`/labs/watchers`、`/labs/lifecycle` | 处理竞态、计时器、监听器以及组件清理 |
| 7. 类与现代 JS | `/javascript/classes`、`/javascript/es2015`、`/javascript/modern`、`/javascript/modules` | 原型与继承、常用语法/API、标准版本、模块共享状态 |
| 8. 组件进阶 | `/labs/builtins`、`/labs/router-state`、`/routing-demo/profile`、`/labs/rendering` | 缓存、异步边界、路由与嵌套出口、Pinia、模板编译与优化 |
| 9. 构建工具 | `/tooling/overview` → `/tooling/modules` → `/tooling/config` → `/tooling/bundling` | 对照真实模块加载、HMR、代理、配置和构建产物 |
| 10. 面试复盘 | `/migration`、`/interview` | 用“现象、机制、方案、边界”组织回答，并回到实验验证 |

## 3. 一个实验的学习方法

1. **先预测**：写下输出、尺寸或状态应当如何变化。
2. **再操作**：改一个变量或开关，观察实际结果和日志。
3. **解释差异**：如果预测错了，先找到哪一步理解有误。
4. **阅读源码**：切到“阅读源码”，选择相关子文件，在 IDE 中定位同一路径。
5. **修改验证**：完成页面底部的小练习，再运行检查结果。
6. **口头复述**：用自己的话回答“为什么这样，什么时候适用，有什么边界”。

“阅读源码”展示通过 Vite `?raw` 读取的实际文件。某些实验的逻辑在子组件或工具函数中，源码栏提供多个文件入口；例如类模型在 `classModels.js`，API 函数在 `apiExamples.js`。

切到源码或问答页签时，实验组件保持挂载，当前计时器可能继续运行；离开整个专题时才卸载并清理。完成标记是你的学习自评，不是自动考试结果。

## 4. 建议认真做的实验

### 列表 key 与组件身份

进入 `/labs/templates`，先改动列表中某个输入框的草稿，再反转列表。比较稳定 ID 和索引两列：每一行的业务 ID、输入值和组件本地状态是否仍对应？

源码入口：[TemplatesLab.vue](../src/features/labs/TemplatesLab.vue)、[DraftRow.vue](../src/features/labs/components/DraftRow.vue)。

练习：增加删除与筛选，再描述哪些情况下索引不能代表业务身份。不要简单背诵“索引永远不能当 key”。

### 响应式与侦听清理

进入 `/labs/reactivity`，比较普通解构、toRefs 和 shallowRef。先只修改深层字段，再分别使用对象替换与 triggerRef。

进入 `/labs/watchers`，同步修改三次数量，比较立即读取 DOM、默认 watch、flush:post 和 nextTick 的日志；快速输入短关键词再补成长关键词，观察上一轮定时器被清理。

源码入口：[ReactivityLab.vue](../src/features/labs/ReactivityLab.vue)、[WatchersLab.vue](../src/features/labs/WatchersLab.vue)。

练习：解释为什么 computed 缓存属于当前实例，为什么 nextTick 不等于保证浏览器已经绘制。

### 类、继承与原型

进入 `/javascript/classes`，依次运行六种实验。不要只看 extends 的语法：

- 比较两个实例的字段、共享原型方法和独立箭头函数字段。
- 查看由 `Object.getPrototypeOf` 生成的实际原型链。
- 比较实例继承与构造函数之间的静态继承。
- 提取方法作为回调，观察 this 丢失，再比较三种修复方式。
- 查看私有字段与 Proxy 接收者、JSON 序列化后的边界。
- 用函数参数组合行为，与继承方案对照。

源码入口：[ClassLab.vue](../src/features/foundations/javascript/ClassLab.vue)、[classModels.js](../src/features/foundations/javascript/classModels.js)。

练习：增加一个任务展示策略，通过组合实现，无需再创建一个仅改变格式的子类。

### Promise 与竞态

进入 `/javascript/async`：

1. 先预测同步代码、Promise、queueMicrotask、await 与计时器顺序，再运行。
2. 在“Promise 聚合”中保留 B 失败，逐个运行 all、allSettled、race、any。观察聚合完成时间与其余任务是否仍继续。
3. 在“请求竞态”中先关闭保护，再模拟快速切换；旧条件延迟 900ms，新条件延迟 180ms。
4. 开启最新请求保护或取消，再运行一次。
5. 请求执行期间重置或离开页面，确认没有旧结果重新写入。

源码入口：[AsyncLab.vue](../src/features/foundations/javascript/AsyncLab.vue)、[useExperimentLog.js](../src/features/foundations/javascript/useExperimentLog.js)。业务中的对应实现见 [useRequest.js](../src/composables/useRequest.js) 和 [RemoteSelect.vue](../src/components/business/RemoteSelect.vue)。

### Flex、BFC 和层叠

进入 `/css/flex`，缩小容器并开启长文本，比较 min-width:0 开关。逐项调整 basis、grow、shrink，再改变主轴方向。页面显示浏览器实际测量尺寸，布局中的小数可能是正常分配结果。

进入 `/css/bfc`，分别观察内部浮动、父子 margin 和相邻 margin。flow-root 与相邻块改成 Flex 解决的不是同一个边界。

进入 `/css/position`，在局部容器里滚动，比较 sticky、absolute、relative；切换祖先 transform，观察子项的 z-index:999 为什么仍可能被盖住。

源码入口：[CssExperiments.vue](../src/features/foundations/css/CssExperiments.vue)。

### Element Plus 业务组件定制

进入 `/ui-library`，按应用、主题、业务封装、Ant 对照四个页签学习。切换主题时，同时打开弹层检查；将组件 API 的差异与 Vue 数据流分别理解。

依次阅读四个业务组件：

| 文件 | 阅读重点 | 小练习 |
| --- | --- | --- |
| [SearchPanel.vue](../src/components/business/SearchPanel.vue) | 值归父级、查询/重置、字段插槽 | 增加一个状态筛选或自定义字段 |
| [DataTable.vue](../src/components/business/DataTable.vue) | data/columns、分页与选择事件、单元格插槽 | 增加截止日期提醒列 |
| [TaskFormDialog.vue](../src/components/business/TaskFormDialog.vue) | 独立草稿、校验、等待 submit、统一关闭 | 保存失败后重试，取消后检查原数据 |
| [RemoteSelect.vue](../src/components/business/RemoteSelect.vue) | loader、防抖、取消、请求序号、expose | 连续输入并模拟失败，比较错误和 loading 的归属 |

Ant Design Vue 部分是版本明确的参考片段，当前实际业务运行 Element Plus。迁移时关注 prop 名、model 参数、事件、插槽和主题机制，不能只批量替换标签名。

### 嵌套路由与状态归属

在 `/labs/router-state` 先修改 query，再进入 `/routing-demo/profile`。编辑父级草稿与子级草稿，切换到 `/routing-demo/settings`：父布局草稿保留，子面板在本实验中按 path 重建。只切换 query 时，两级实例都保留。

源码入口：[RouterPlayground.vue](../src/features/labs/RouterPlayground.vue)、[RouterChildPanel.vue](../src/features/labs/RouterChildPanel.vue)、[路由配置](../src/router/index.js)。观察 children、第二层 RouterView 与 key 的配合，不把详情页的路径参数直接等同于嵌套路由。

### ES2015 与后续 API 工具箱

`/javascript/es2015` 提供 16 组示例，`/javascript/modern` 提供 18 组示例，共 34 组固定可审阅的执行函数。先看参数、返回值、修改性和边界，再运行。

重点比较：

- find 返回原对象引用；新数组容器不代表元素也深拷贝。
- Object.assign 与对象展开的浅层语义。
- Map/Set 的对象引用身份。
- 可选链、空值合并与逻辑或。
- sort 与复制排序 API 的区别。
- ES 标准 API 与 structuredClone 等运行环境 API 的区别。

源码入口：[apiExamples.js](../src/features/foundations/javascript/apiExamples.js)。例子运行固定函数，不对输入文本执行 eval。

## 5. 从开发服务走到构建产物

工具链专题包含流程/包体积教学模型，也包含真实运行环节。模型中的大小和模块图用于说明权衡，不能当成这个项目的性能测量。

- `/tooling/modules`：点击真实动态 import；开发环境修改 [hmrProbe.js](../src/features/tooling/hmrProbe.js)，观察热更新记录。HMR 不是生产能力。
- `/tooling/config`：读取当前 import.meta.env；另开终端运行 `pnpm mock:api` 后测试开发代理。这个 Node 服务用于代理演示，任务工作台的数据仍由浏览器本地服务与 Pinia 管理。
- `/tooling/bundling`：切换教学策略后，运行真实构建，检查产物再下结论。

```sh
pnpm test
pnpm build
pnpm webpack:build
pnpm preview
```

Vite 产物在根 `dist`；Webpack 独立对照示例产物在 `examples/webpack/dist`。`pnpm preview` 会持续运行预览服务；退出时按 Ctrl+C。想看 Webpack 开发行为，在另一个终端运行 `pnpm webpack:dev`，见 [示例 README](../examples/webpack/README.md)。具体配置解释由根 README 和工具链材料提供。

## 6. 源码阅读顺序

1. [main.js](../src/main.js)：createApp、插件和全局样式。
2. [App.vue](../src/App.vue)：布局、导航、全局配置与路由出口。
3. [router/index.js](../src/router/index.js)：页面如何懒加载、参数如何进入页面。
4. 一个你操作过的实验组件，然后阅读它使用的子组件。
5. [TasksView.vue](../src/features/tasks/TasksView.vue)：从业务状态到界面。
6. 四个业务封装 → [useRequest.js](../src/composables/useRequest.js) / [useDebounce.js](../src/composables/useDebounce.js) → [tasks store](../src/stores/tasks.js) → [taskService.js](../src/services/taskService.js)。
7. [LessonFrame.vue](../src/components/learning/LessonFrame.vue)、[SourceViewer.vue](../src/components/learning/SourceViewer.vue)：看项目怎样组织学习内容和源码阅读。

先改一处行为，再查相关原理。避免一开始逐行读完所有文件，最后却没亲自复现一个问题。

## 7. 学习记录、重置与验证

任务、学习标记和主题偏好分别保存在当前浏览器 localStorage。换浏览器或换 origin 不会自动同步。学习总览的“重置学习记录”清理完成、收藏、自评和访问记录；任务示例由工作台单独恢复。

实验的“重置”用于恢复该实验状态或取消工作；浏览器刷新会重新创建大部分实验局部状态，模块级内存状态和 Pinia 实验状态也随应用重新启动。任务工作台的持久化状态则会恢复。

修改后至少验证与你的改动有关的路径。项目测试覆盖关键通信、数据隔离、请求竞态、取消、类与 API 语义及目录连通性；它们不能代替浏览器的 CSS 尺寸、焦点和实际热更新观察。

面试回答可以用四句话组织：**具体触发了什么 → 实际观察到什么 → 背后的机制 → 我在项目中如何选择和处理边界**。最后使用 `/interview` 随机抽题，隐藏答案口述，再展开核对。
