# 知识点、实验与源码覆盖表

本表按当前实际代码说明深度，而不是把设计草案中的所有名词都标成“已实战”。路由采用 hash 模式，例如 `/labs/setup` 对应 `/#/labs/setup`。

- **业务实践**：完整任务工作台或应用基础设施真实使用该能力。
- **独立实验**：页面提供可操作、可重置的示例，结果来自真实 Vue/JS/CSS 行为。
- **说明拓展**：对照片段、文字、简化模型或练习方向，不代表已经实现相应完整运行环境。

一个知识点可以同时出现在业务和实验中。下表中的相关文件均为仓库实际文件，页面“阅读源码”另提供入口。

## Vue 3 核心

| 知识点 | 实验路由 | 主要源码 | 深度与边界 |
| --- | --- | --- | --- |
| createApp、插件、应用级配置 | `/labs/setup`、`/labs/lifecycle` | `src/main.js`、`src/plugins/learningPlugin.js` | 业务实践；Vue 2 new Vue 是参考对照 |
| Options、setup、script setup | `/labs/setup` | `src/features/labs/SetupLab.vue`、`components/OptionsCounter.vue`、`components/SetupCounter.vue` | 三种写法均可运行；按各自状态演示 |
| 插值、bind/on、条件、列表、修饰符、class/style | `/labs/templates` | `src/features/labs/TemplatesLab.vue` | 业务实践 + 独立实验；v-html 只展示可信静态内容 |
| key、身份与子组件本地草稿 | `/labs/templates`、`/labs/rendering` | `components/DraftRow.vue`、`components/RenderIdentity.vue` | 独立实验；比较 ID、索引与改变 key 重建实例 |
| ref/reactive、readonly、toRefs、unref/toValue | `/labs/reactivity` | `src/features/labs/ReactivityLab.vue` | 独立实验 + 业务实践；普通 reactive 解构与 props 编译解构不是同一机制 |
| shallowRef、shallowReactive、triggerRef、customRef、markRaw/toRaw | `/labs/reactivity` | `src/features/labs/ReactivityLab.vue` | 独立实验；customRef 的延迟输入真实触发并清理计时器 |
| 响应式 Map | `/labs/reactivity` | `src/features/labs/ReactivityLab.vue` | 独立实验；Set 的原生语义在 JS 工具箱另有实验 |
| computed、可写 computed、watch/watchEffect | `/labs/watchers` | `src/features/labs/WatchersLab.vue` | 独立实验 + 业务实践 |
| onCleanup/onWatcherCleanup、flush、nextTick、deep 数字、once/immediate | `/labs/watchers` | `src/features/labs/WatchersLab.vue` | 独立实验；按 Vue 版本说明，nextTick 不保证已绘制 |
| effectScope、onScopeDispose | `/labs/watchers`、`/labs/lifecycle` | `WatchersLab.vue`、`components/useScopedTicker.js` | 独立实验；把一组侦听器或计时副作用集中停止 |
| props/emits、provide/inject、useTemplateRef、defineExpose | `/labs/communication` | `CommunicationLab.vue`、`components/CommunicationChild.vue`、`components/InjectedTheme.vue` | 独立实验；业务封装也使用受控输入和最小公开接口 |
| 原生 v-model 修饰符、多个 model、defineModel、自定义修饰符 | `/labs/models` | `ModelsLab.vue`、`components/ModelInput.vue`、`components/DualModelEditor.vue` | 独立实验 + 业务实践；默认 modelValue/update:modelValue 协议另有等价代码说明 |
| 默认/具名/作用域/动态插槽、attrs、Fragment、inheritAttrs | `/labs/slots` | `SlotsLab.vue`、`components/SlotCard.vue` | 独立实验；多根组件显式选择透传节点 |
| defineOptions、useAttrs/useSlots、CSS v-bind、:deep/:slotted | `/labs/slots`、`/css/styles` | `components/SlotCard.vue`、`src/features/foundations/css/StyleSample.vue` | 独立实验；defineSlots 的 TS 类型声明属于拓展 |
| 生命周期、指令钩子、onErrorCaptured | `/labs/lifecycle` | `LifecycleLab.vue`、`components/LifecycleProbe.vue`、`components/ErrorProbe.vue` | 独立实验；业务请求仍自行管理预期错误 |
| 动态组件、KeepAlive、activated/deactivated | `/labs/builtins` | `BuiltinsLab.vue`、`components/CachedEditor.vue` | 独立实验；缓存停用不等于卸载 |
| Teleport、Transition、TransitionGroup | `/labs/builtins`、`/tasks` | `BuiltinsLab.vue`、`src/features/tasks/TasksView.vue` | 独立实验 + 列表/弹层业务实践；教学弹层不替代组件库完整能力 |
| defineAsyncComponent、SFC 顶层 await、Suspense | `/labs/builtins` | `BuiltinsLab.vue`、`components/AsyncReport.vue` | 独立实验；Suspense 明确标为实验性 |
| Router params/query、push/replace、离开守卫、懒加载、404 | `/labs/router-state`、`/tasks/:id` | `RouterStateLab.vue`、`src/router/index.js`、`src/features/tasks/TaskDetailView.vue` | 业务实践 + 独立实验；Router 是生态库 |
| 嵌套路由、第二层 RouterView、route props 与父子实例保留 | `/routing-demo/profile`、`/routing-demo/settings` | `RouterPlayground.vue`、`RouterChildPanel.vue`、`src/router/index.js` | 独立实验；切换子路径保留父级，子级按 path 重建，query 变更不重建 |
| Pinia setup store、storeToRefs、action、持久化 | `/labs/router-state`、`/tasks` | `labCounterStore.js`、`components/StoreConsumer.vue`、`src/stores/tasks.js` | 独立实验 + 业务实践；实验计数器为内存状态，业务持久化明确实现 |
| h/render、v-once/v-memo、开发调试钩子 | `/labs/rendering` | `src/features/labs/RenderingLab.vue` | 独立实验；故意遗漏 memo 依赖展示过期结果 |
| 模板编译、patch flag、静态优化、block | `/labs/rendering` | `src/features/labs/RenderingLab.vue` | 实际调用 Vue 浏览器编译器查看生成代码；diff 算法细节属于说明拓展，没有复刻完整 Vue renderer |
| Vue 2 → 3 迁移 | `/migration`、`/labs/migration` | `src/data/migrationCases.js`、`src/features/labs/MigrationLab.vue` | Vue 3 相关实验 + 两版参考代码；没有同时运行 Vue 2 |

本节中 `components/`、未写完整前缀的实验文件均相对于 `src/features/labs/`。

## Element Plus 与业务组件

| 知识点 | 路由 | 主要源码 | 深度与边界 |
| --- | --- | --- | --- |
| 任务增删改查、筛选排序、分页、选择、表格/看板 | `/tasks`、`/tasks/:id` | `src/features/tasks/TasksView.vue`、`TaskDetailView.vue`、`src/stores/tasks.js` | 业务实践；数据在浏览器本地，异步服务允许延迟/失败/取消 |
| Form、Input、Select、DatePicker、Table、Pagination、Dialog/Drawer、反馈 | `/tasks`、`/ui-library` | `src/components/business/`、`src/features/ui-library/UiLibraryView.vue` | 业务实践 + 独立配置/内容扩展实验 |
| SearchPanel：字段、model、查询/重置、字段插槽 | `/tasks`、`/ui-library` | `src/components/business/SearchPanel.vue` | 业务实践 + 第二场景复用；不是通用任意表单引擎 |
| DataTable：列配置、单元格插槽、选择/分页事件、expose | `/tasks`、`/ui-library` | `src/components/business/DataTable.vue` | 业务实践；请求和筛选由使用方管理 |
| TaskFormDialog：草稿、异步校验、保存失败、统一关闭 | `/tasks`、`/tasks/:id`、`/ui-library` | `src/components/business/TaskFormDialog.vue` | 业务实践；通过 submit 函数等待结果，不把 emit 当异步返回值 |
| RemoteSelect：loader、防抖、取消、过期结果与清理 | `/tasks`、`/ui-library` | `RemoteSelect.vue`、`src/composables/useRequest.js`、`useDebounce.js` | 业务实践 + 失败/重试实验 |
| ConfigProvider 尺寸/语言、CSS 变量、明暗主题、局部圆角 | `/ui-library` | `UiLibraryView.vue`、`src/stores/preferences.js`、`src/assets/main.css` | 业务实践 + 独立实验；逻辑注入与 DOM CSS 继承分别解释 |
| Ant Design Vue 4.x Form/Table/Modal/Design Token | `/ui-library` | `src/features/ui-library/UiLibraryView.vue` | 说明拓展：版本明确的参考片段；当前业务运行 Element Plus |

表中业务组件未写完整前缀时均位于 `src/components/business/`。公开接口细节见 [组件契约文档](component-contracts.md)。

## CSS

各路由共用 `src/features/foundations/css/CssExperiments.vue`，按 topic 分支展示；测量通过 `getBoundingClientRect`、`getComputedStyle` 和 ResizeObserver 完成。

| 知识点 | 路由 | 主要源码 | 深度 |
| --- | --- | --- | --- |
| Flex 主轴/交叉轴、换行、gap、grow/shrink/basis、min-width:0 | `/css/flex` | `css/CssExperiments.vue` | 独立实验；工作台/布局另有业务应用 |
| 盒模型、box-sizing、padding/border、边框盒实测 | `/css/box` | `css/CssExperiments.vue` | 独立实验 |
| BFC、内部浮动、父子/相邻 margin 折叠 | `/css/bfc` | `css/CssExperiments.vue` | 三组独立实验；flow-root 与 Flex 的作用范围分开 |
| Grid、auto-fit/auto-fill、minmax、实际列数 | `/css/grid` | `css/CssExperiments.vue` | 独立实验 + 总览网格业务使用 |
| relative/absolute/sticky、滚动容器、transform 层叠上下文 | `/css/position` | `css/CssExperiments.vue` | 独立实验；fixed 及其他包含块边界属于说明/改造练习 |
| CSS 变量、scoped、:deep/:slotted、优先级 | `/css/styles` | `css/CssExperiments.vue`、`css/StyleSample.vue` | 独立实验 + 组件主题业务实践 |

本表 `css/` 相对于 `src/features/foundations/`。复杂浮点分配、所有层叠/包含块规则并未逐项做实验。

## JavaScript

| 知识点 | 路由 | 主要源码 | 深度与实际行为 |
| --- | --- | --- | --- |
| var/let/const、作用域、TDZ、循环回调 | `/javascript/scope` | `javascript/JavaScriptBasics.vue` | 独立实验，真实捕获 TDZ 异常 |
| 方法/独立调用、call/apply/bind、箭头词法 this | `/javascript/this` | `javascript/JavaScriptBasics.vue` | 独立实验；运行在 ES module 严格模式 |
| 闭包、独立计数器、快照/实时读取 | `/javascript/closures` | `javascript/JavaScriptBasics.vue` | 独立实验；业务防抖与 composable 提供关联 |
| 构造函数、new 返回对象、prototype、class、自有字段/共享方法 | `/javascript/classes` | `javascript/ClassLab.vue`、`javascript/classModels.js` | 独立实验，实际原型链与描述符读取 |
| extends/super、重写、static、工厂、getter/setter、私有成员 | `/javascript/classes` | `javascript/ClassLab.vue`、`javascript/classModels.js` | 独立实验；私有字段按 ES2022 标注 |
| 回调 this、继承与组合、Error 子类、序列化、Proxy 私有字段边界 | `/javascript/classes` | `javascript/ClassLab.vue`、`javascript/classModels.js` | 六组场景中实际执行；所有历史继承模式并未各建完整工程 |
| 浅拷贝、嵌套引用、sort、filter/map/reduce、Set | `/javascript/arrays` | `javascript/JavaScriptBasics.vue` | 独立实验 + 任务草稿/筛选业务实践 |
| 事件循环、Promise、queueMicrotask、await、nextTick | `/javascript/async` | `javascript/AsyncLab.vue` | 独立实验；浏览器环境，不泛化为 Node 全部调度规则 |
| all/allSettled/race/any、请求序号、AbortController | `/javascript/async` | `javascript/AsyncLab.vue` | 独立实验；多个真实异步任务，不会伪称聚合可自动取消 |
| trailing 防抖、leading 节流、取消尾调用 | `/javascript/functions` | `javascript/JavaScriptBasics.vue`、`javascript/useExperimentLog.js` | 独立实验；业务通用防抖另在 useDebounce |
| DOM 捕获/冒泡、target/currentTarget、停止传播、监听清理 | `/javascript/events` | `javascript/JavaScriptBasics.vue` | 独立实验；事件委托原理有说明，未单独实现动态列表委托实验 |
| 静态/动态 import、live binding、模块共享与局部状态 | `/javascript/modules` | `javascript/JavaScriptBasics.vue`、`javascript/sharedCounter.js` | 独立实验；重置/卸载后忽略旧动态导入结果 |
| ES2015 常用语法/API | `/javascript/es2015` | `javascript/ApiLab.vue`、`javascript/apiExamples.js` | 16 组可运行函数，详见下表 |
| 后续语法/API 与 structuredClone | `/javascript/modern` | `javascript/ApiLab.vue`、`javascript/apiExamples.js` | 18 组可运行函数，按版本标注；部分新方法有运行时存在性检测 |

本节 `javascript/` 相对于 `src/features/foundations/`。

### 34 组 API 示例的具体范围

| 范围 | 已有实际执行函数 | 深度说明 |
| --- | --- | --- |
| ES2015 语法 | 解构、默认参数/rest、模板字符串/对象简写、数组与调用展开 | 独立实验；箭头 this 在独立 this 专题深入 |
| ES2015 数组/字符串 | from/of、find/findIndex、entries/keys/values、fill/copyWithin、includes/startsWith/endsWith/repeat | 独立实验；数组 includes 单列为 ES2016 |
| ES2015 对象/数值/集合 | assign、is、Number.isNaN/isFinite、Map/Set、WeakMap/WeakSet、Symbol | 独立实验；垃圾回收时机不做确定性演示 |
| 迭代与元编程 | Generator/next/展开、Proxy/Reflect receiver | 独立小实验；完整迭代协议实现和 Vue 依赖追踪器属于拓展 |
| ES2016 | 数组 includes、指数运算 | 独立实验 |
| ES2017 | values/entries、async/await、padStart | 独立实验；padEnd 仅在需求中列为可拓展方法 |
| ES2018 | 对象 rest/spread、Promise.finally | 独立实验 |
| ES2019 | flat/flatMap、fromEntries、trimStart/trimEnd | 独立实验 |
| ES2020 | 可选链/空值合并、allSettled、BigInt；动态 import 在模块专题 | 独立实验 |
| ES2021 | Promise.any、逻辑赋值、replaceAll | 独立实验 |
| ES2022 | at、hasOwn、类字段/私有字段与 static 字段 | 独立实验；静态初始化块和普通 ESM 顶层 await 是说明拓展，SFC async setup 另有实际实验 |
| ES2023 | toSorted/toReversed、toSpliced/with、findLast/findLastIndex | 独立实验；新数组是浅层结果 |
| 运行环境 API | structuredClone、DOM、定时器、AbortController；工具链代理页有 fetch | 实际使用；它们不按 ES6 新增方法归类 |

每组固定示例讲清返回值、是否修改原数据和相关边界。它们不是 ECMAScript 所有内置 API 的全集。所有标准库能力在旧浏览器中的 polyfill 方案也未集成成兼容性工程。

## Vite / Webpack 与工程基础

| 知识点 | 路由/命令 | 主要源码 | 深度与边界 |
| --- | --- | --- | --- |
| 开发/生产职责、loader/plugin、工具版本 | `/tooling/overview` | `src/features/tooling/ToolingView.vue`、`src/data/toolingLessons.js` | 流程为简化教学模型；命令可运行真实 Vite 与独立 Webpack 示例 |
| 动态导入与模块缓存 | `/tooling/modules` | `src/features/tooling/lazyFeature.js`、`src/router/index.js` | 实际 import；图中的依赖结构是简化模型 |
| HMR accept/dispose | `/tooling/modules` | `src/features/tooling/hmrState.js`、`hmrProbe.js` | 开发环境修改文件实际观察；生产不启用 HMR |
| import.meta.env、DefinePlugin、alias、代理 | `/tooling/config`、`pnpm mock:api` | `vite.config.js`、`examples/webpack/webpack.config.cjs`、`scripts/mock-api.mjs` | 环境读取与代理请求真实执行；代理仅作用于开发服务 |
| chunk、动态分块、Tree Shaking、contenthash、source map | `/tooling/bundling`、`pnpm build`、`pnpm webpack:build` | `ToolingView.vue`、两套构建配置、`examples/webpack/src/report.js` | 页面大小为虚构模型；真实产物分别检查根 dist 与示例 dist |
| 包体积报告 | `pnpm build:report` | `scripts/build-report.mjs` | 根据真实输出生成报告；性能结论仍需结合网络、压缩与执行测量 |

## 迁移、复习与明确的拓展范围

- `/migration` 用参考片段对照应用入口、侦测范围、组件 model、事件/attrs、生命周期、API 风格、列表/条件、filters、异步组件与数组侦听；链接到运行中的 Vue 3 实验。
- `/interview` 的题目来自实验元数据、组件库问答、迁移案例和综合追问；支持筛选、随机抽题、收藏和自评。题目数量由实际数据生成，完成标记不代表自动测评。
- **SSR/hydration、JSX、Custom Elements、自定义 renderer、完整 Vue 源码实现、完整 TypeScript 工程**属于说明/后续学习范围，不标为已完成的运行实践。
- **Ant Design Vue**为参考对照；**Webpack**是独立小型 Vue 对照示例，不是把整个主项目同步改写成两套构建系统。
- 测试关注组件协议、草稿/状态隔离、竞态/取消、类与 API 语义、源码入口连通性；CSS 尺寸、焦点、动画和 HMR 仍需要浏览器实际观察。

设计草案是目标与取舍记录，本表是当前实现范围。新增或调整实验时，应同步更新元数据、源码入口、本表和对应问答。
