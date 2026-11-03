# Vue 3 前端面试实验室：需求与设计草案

状态：用户已确认的设计基线，首版已按此范围实现。实际深度见 feature-coverage.md，运行与验证方法见 README。

## 1. 项目目标

把当前 Vite 项目改造成中文前端面试学习工作台，以 Vue 3 为主线，串联「组件库应用与定制 + CSS 布局 + JavaScript 基础 + 完整业务实践 + Vue 2 对照 + 面试复习」。

本次新增需求：面向 JD 中的 Element Plus 或 Ant Design Vue 应用与定制开发要求，并通过项目巩固 CSS、JavaScript 基础。明确纳入 flex、this、闭包、类与继承、ES2015 及后续常用语法/API，以及现有 App.vue 中的 BFC、浮动、外边距折叠等练习；其他基础内容按与项目及面试的关联程度安排。

完成学习后，应当能够：

1. 独立编写和拆分 Vue 3 组件，理解数据如何驱动页面。
2. 根据场景选择响应式 API、组件通信方式和状态管理方案，并解释原因。
3. 实际复现并修复常见问题，例如解构失去响应性、错误的列表 key、异步请求竞态、副作用未清理。
4. 区分 Vue 2 → Vue 3 的版本变化、Options/Composition 两种代码组织方式，以及 Router/Pinia 等生态能力。
5. 在面试中结合可运行的例子，说明现象、原因、解决方法及适用边界。
6. 使用 Element Plus 完成实际业务页面，并能设计主题、插槽扩展和可复用的业务组件接口。
7. 调试布局和样式问题，解释 flex 尺寸分配、溢出、层叠与组件主题作用范围。
8. 用原生 JavaScript 解释 this、闭包、引用关系和异步执行，再将其应用到 composables、请求管理及组件清理中。
9. 理解构造函数、原型链、class 与继承，能选择继承或组合，并正确使用现代 JavaScript 语法与常用 API。

覆盖以 Vue 3 常用功能和高频面试知识为主；低频 API 提供专项实验或拓展说明。涉及其他运行环境的能力单独标注，避免把一个浏览器 SPA 描述为已经实践了所有 Vue 能力。

## 2. 当前基础与技术方案

- 项目起点：Vite、Vue `^3.5.38`、JavaScript、Less、Vue DevTools 插件；起初尚未配置路由和全局状态管理，现已集成 Router 与 Pinia。
- 主线：保留 JavaScript，采用单文件组件与 `<script setup>`，避免同时引入大量 TypeScript 概念。
- 对照：使用少量可运行的 Vue 3 Options API 组件，以及明确标记版本的 Vue 2 代码片段。
- 应用组织：增加 Vue Router 与 Pinia，分别用于路由实验和跨页面学习状态。
- 组件库：默认选择 Element Plus 完成业务主线；Ant Design Vue 提供版本明确的同需求 API 与主题对照。
- 样式：保留 CSS/Less，统一设计变量映射到 Element Plus 的 CSS 变量；SCSS 主题编译作为拓展方案。
- 教学组件：Vue 基础实验使用自行编写的小组件展示 props、事件、插槽和 Teleport；业务页面使用 Element Plus 并封装业务组件。
- 全局配置：Element Plus 的 ConfigProvider 管理尺寸、语言等配置；主题颜色通过 CSS 变量管理，明暗模式按官方方案接入。
- 数据：本地模拟异步服务，支持延迟、成功、失败和重试；学习记录及任务保存在 localStorage。
- 版本：实际编码时核对安装版本和兼容性；新增能力旁标注最低 Vue 版本，例如 `defineModel`（3.4+）、响应式 props 解构（3.5+）。

## 3. 产品结构

### 3.1 学习总览

展示建议学习路线、各章节完成情况、最近访问的实验和待复习题目。用户可以重置示例数据和学习记录。

默认路线：必要的 CSS/JS 基础 → Vue 模板与响应式 → 组件通信与封装 → Element Plus 业务应用 → 主题与业务组件定制 → 生命周期与异步管理 → 路由和状态管理 → 原理与迁移 → 综合面试。

提供「从基础学起」与「按面试知识点复习」两个入口。每条学习线可独立访问，相关知识通过链接串联。

### 3.2 学习任务工作台：完整业务主线

管理「学 Vue」这件事本身：

- 新增、编辑、删除学习任务；修改待学习、进行中、已完成状态。
- 搜索、标签筛选、优先级筛选、截止日期筛选、排序和分页。
- 表格视图与状态看板共享同一份任务数据；表格支持选择与批量更新状态。
- 用基于 Element Plus 封装的表单弹窗编辑标题、优先级、标签、截止日期等字段，支持动态规则与异步校验。
- 查看任务详情、统计完成率，展示加载、空结果、错误和重试状态。
- 业务弹窗和抽屉使用 Element Plus；独立实验用原生小组件解释 Teleport，状态看板中的列表变化演示 TransitionGroup。
- 筛选栏在不同宽度下自适应；主题、明暗模式与组件尺寸可切换。
- 跨页面共享学习进度，刷新后恢复；必要时恢复初始示例。

工作台负责串联知识；复杂原理和有意制造的错误放到独立实验页中，保持业务源码可读。

### 3.3 交互实验室

每个实验采用固定的学习结构：

1. **目标与操作提示**：说明要验证的问题。
2. **可操作示例**：通过按钮、表单、开关或尺寸控制触发现象；JavaScript 题先预测再执行。
3. **实时结果**：展示真实状态、事件参数、执行日志或浏览器测量的布局尺寸；支持清空与重置。
4. **源码入口**：显示对应组件、composable 的文件路径和关键代码。
5. **解释与对照**：说明原理、易错点、错误/正确版本及其业务应用；Vue 专题另附 Vue 2 对照和相关版本限制。
6. **面试追问与练习**：先预测或回答，再展开解析，并给出一个小改造任务。

页面关键代码应从实际源码提取或与源码直接关联，减少文案示例与运行实现不一致的问题。

### 3.4 Vue 2 → Vue 3 对照专区

采用「同一需求 → Vue 2 写法 → Vue 3 写法 → 变化原因 → 迁移注意点」的形式。

Vue 2 片段明确作为参考代码展示；应用运行时统一使用 Vue 3。Vue 3 的 Options API 示例可运行，避免让人误认为 Options API 已被移除。

### 3.5 面试复习

首版围绕约 80 道重点题组织，目标分布为 Vue 与工程实践约 40 道、组件库约 12 道、CSS 约 8 道、JavaScript 约 20 道，按章节和难度分类：

- 概念解释：例如 `ref` 和 `reactive` 如何选择。
- 代码预测：例如多次同步修改状态后，页面与日志分别何时变化。
- 排错改造：例如列表使用索引作 key 导致输入状态错位。
- 场景设计：例如多层组件通信、请求取消与缓存页面副作用管理。
- 组件设计：例如如何封装表格而保留插槽和事件扩展能力，如何统一弹窗关闭行为。
- 布局排错：例如 flex 子项长文本撑开页面，弹出层没有继承局部主题。
- 基础机制：例如方法提取后 this 变化、防抖中的闭包、编辑草稿的浅拷贝问题。
- 类与继承：例如实例成员与原型方法的区别、extends 建立的原型关系、super 的用途、方法提取后为何没有自动绑定 this。
- API 选择：例如 Promise.all/allSettled/race/any 如何选择、sort/toSorted 对原数据的影响、空值合并与逻辑或的区别。

答案默认折叠，提供「回答要点 → 对应实验 → 追问」。支持收藏、标记掌握和待复习；这些标记反映用户自评。

## 4. Vue 3 主线章节与覆盖范围

| 章节 | 主要实操 | 知识覆盖与面试重点 |
| --- | --- | --- |
| 01 起步与 API 风格 | 同一小功能的 Options、setup、script setup 写法对照 | `createApp`、SFC、模板暴露、`this`、编译宏、逻辑组织方式 |
| 02 模板与列表 | 任务筛选、条件显示、表单事件、列表重排 | 插值、`v-bind`、`v-on`、`v-if/else`、`v-show`、`v-for`、稳定 key、事件/按键修饰符、class/style、`v-text`；受控示例解释 `v-html` |
| 03 响应式实验 | 改对象、数组和集合，观察解构、替换及浅层响应 | `ref`、`reactive`、`readonly`、`toRef/toRefs`、`unref/toValue`、自动解包边界、Proxy 与 Vue 2 侦测限制；拓展 `shallowRef/shallowReactive`、`triggerRef`、`markRaw/toRaw`、`customRef` |
| 04 派生状态与更新时机 | 筛选统计、可写计算属性、实时搜索、DOM 测量 | `computed` 缓存与纯计算、`watch/watchEffect`、侦听源、deep/immediate/once、flush、回调 `onCleanup` 与 3.5+ `onWatcherCleanup`、取消过期请求、批量更新、`nextTick` |
| 05 组件通信 | 父子修改任务、跨层主题、父组件触发子组件聚焦 | `defineProps/defineEmits`、单向数据流、`provide/inject`、响应式注入、模板 ref/`useTemplateRef`（3.5+）、`defineExpose`、兄弟组件通过共同父级协调 |
| 06 表单与双向绑定 | 自定义输入框、多字段编辑器、校验反馈 | 原生 `v-model` 与 `.trim/.number/.lazy`、组件绑定协议、`modelValue/update:modelValue`、具名/多个 model、自定义修饰符、`defineModel` |
| 07 插槽与属性透传 | 封装可配置卡片、列表和输入框 | 默认/具名/作用域/动态插槽、插槽作用域、`$attrs/useAttrs`、`inheritAttrs`、`defineOptions`、多根节点与 Fragment |
| 08 生命周期与逻辑复用 | 挂载/卸载组件、计时器、事件监听、本地存储 | 生命周期时序、卸载清理、`onErrorCaptured`、`useRequest/useLocalStorage` 等 composables、自定义指令生命周期、`app.use` 与依赖注入；拓展 `effectScope/onScopeDispose` |
| 09 内置组件与异步 | 弹窗、缓存编辑页、列表动画、延迟组件 | Teleport、Transition、TransitionGroup、动态组件、KeepAlive、activated/deactivated、`defineAsyncComponent`；单列 Suspense 与顶层 await 实验 |
| 10 路由与共享状态 | 嵌套路由、任务详情、查询参数筛选、跨页进度 | Vue Router 参数/query、导航守卫、懒加载、404；Pinia setup store、state/getters/actions、`storeToRefs`、异步 action、本地持久化 |
| 11 渲染与性能 | 对比 key 行为、观察模板编译结果、定位无效更新 | 虚拟 DOM、组件身份、diff 思路、静态提升/patch flag/block 的概念、`v-once/v-memo`、按需加载、开发调试钩子；拓展 `h`/render、SSR 与 hydration |
| 12 迁移与面试复盘 | 对照代码、预测结果、修复问题、回答追问 | Vue 2 → 3 迁移清单、响应式/通信/调度/缓存/性能综合题、与业务源码关联的项目表达 |

基础章节同时配套 scoped CSS、`:deep()`、`:slotted()`、CSS `v-bind()` 的小例子，使现有 CSS 学习自然衔接到组件样式。

交付的覆盖清单逐项标记「业务实践 / 独立实验 / 拓展说明」，给出具体文件和操作入口。`onWatcherCleanup` 实验明确展示其须在同步阶段注册的约束；`computed` 实验说明缓存依赖当前计算实例，而不是跨组件实例的全局缓存。

## 5. 组件库应用与定制

### 5.1 选型与学习深度

默认用 Element Plus 完成整个业务闭环，理由是用户 JD 接受两者之一，而集中实践一套库有利于深入表单状态、封装接口和定制行为。Ant Design Vue 用相同需求的代码片段与差异表建立迁移能力。

| 能力 | Element Plus 主线 | Ant Design Vue 对照 |
| --- | --- | --- |
| 表单 | Form、Input、Select、DatePicker，校验、重置与字段联动 | Form 的绑定、规则与实例方法差异 |
| 表格 | Table、Pagination，列插槽、选择、排序和分页事件 | Table 的列定义、单元格插槽、分页与选择配置 |
| 弹层与反馈 | Dialog、Drawer、Message、MessageBox、Loading | Modal 的打开状态、确认事件和反馈调用 |
| 配置与主题 | ConfigProvider、CSS 变量、明暗主题、局部变量覆盖 | 4.x ConfigProvider、Design Token、CSS-in-JS 主题方案 |

Element Plus 的运行时 CSS 变量定制可以与现有 Less 共存；需要编译时改主题时，再说明 SCSS 的适用场景。Ant Design Vue 的对照标注版本，4.x 的主题依据官方 Design Token 文档，不套用旧版 Less 配置作为唯一方案。

### 5.2 将“定制化开发”转成具体需求

| 层次 | 需要实现的行为 | 体现的能力 |
| --- | --- | --- |
| 统一设计 | 调整主题色、圆角、尺寸，切换明暗模式；原生实验组件与 Element Plus 视觉一致 | CSS 变量、配置集中管理、主题持久化 |
| 局部定制 | 为任务状态、表格单元格、弹窗头尾定制内容与样式 | props、具名/作用域插槽、局部变量与有边界的 `:deep()` |
| 业务封装 | 搜索面板、数据表格、任务表单弹窗、远程选择器复用到不同场景 | 组件 API 设计、model、emits、attrs、expose、组合式函数 |
| 扩展验证 | 新增一个筛选项、一种自定义列或一条校验规则，沿用公开扩展点完成 | 可维护性、扩展性和职责边界 |

主题实验同时观察页面组件与传送到 body 的弹出层，解释 DOM 位置、CSS 变量继承和局部样式作用范围。主题色需要配套状态色与浅色层级，观察 hover、disabled、focus 等状态。

### 5.3 四个重点业务组件

| 组件 | 公开能力与验收 |
| --- | --- |
| `SearchPanel` | 支持搜索条件 model、查询/重置事件、少量字段配置与自定义字段插槽；提交和实时搜索的触发规则明确 |
| `DataTable` | 支持 data、columns、loading、total、分页/选择事件及单元格插槽；请求与筛选状态由页面或 composable 管理 |
| `TaskFormDialog` | 管理打开状态、编辑草稿、同步/异步校验、提交 loading、失败重试、取消恢复；关闭按钮、遮罩、Esc、页脚操作按同一规则处理 |
| `RemoteSelect` | 支持值绑定、远程搜索、防抖、加载/空/错误状态、过期请求处理和卸载清理；放入任务表单验证联动 |

每个组件都写清 props、事件、slots、暴露方法、状态归属与使用示例；JavaScript 实现配 JSDoc，并提供一个 TypeScript 接口对照。至少在两个使用场景中验证封装的扩展能力。

封装以真实需求为边界：字段和列配置保持简单，特殊内容通过插槽扩展，业务提交留在业务层。定制主要采用官方 API、插槽、主题变量和组件组合；涉及源码阅读时标明对应版本和文件。

### 5.4 重点排错与面试问题

- 包装组件如何转发 attrs、事件、插槽和 model，如何避免重复触发或丢失参数？
- 表单数据源、字段路径、校验规则与触发时机如何配合？重置与重新打开编辑弹窗分别意味着什么？
- 编辑草稿如何避免污染列表中的原始对象，取消编辑后如何恢复？
- 表格筛选变更时，分页、选择和请求参数应该如何协调？
- 弹窗关闭前如何统一处理未保存内容与提交中状态？Element Plus `before-close` 不自动覆盖自定义页脚按钮的直接关闭逻辑。
- 全局主题、局部主题、弹出层样式为何可能表现不同？ConfigProvider 管理的上下文与 CSS 继承分别是什么？
- 怎样解释使用现成组件、封装业务组件和定制底层交互这几种开发工作的边界？

## 6. CSS 布局实验室

把已明确提到的 flex，以及现有 App.vue 中的练习迁入独立实验页，每个实验提供参数控制、实际布局、计算样式/尺寸观察和修复前后对照。

| 专题 | 可操作实验 | 业务联系 |
| --- | --- | --- |
| 盒模型与尺寸 | 切换 box-sizing、padding、border 和宽高，比较实际尺寸 | 卡片、表单与弹窗的尺寸约束 |
| Flex | 控制方向、对齐、换行、gap、grow/shrink/basis；改变容器宽度与内容长度 | 筛选栏、页头、两栏布局；修复长文本溢出，观察 `min-width: 0` |
| Grid 与响应式 | 改列数、最小列宽和断点，对比 Flex 与 Grid 的适用场景 | 总览卡片、学习面板和窄屏布局 |
| BFC、浮动与外边距 | 复现浮动容器高度问题、相邻/父子 margin 折叠，切换 `flow-root` 等处理 | 延续现有代码，理解普通流与格式化上下文 |
| 定位与层叠 | 调整 relative/absolute/fixed/sticky、滚动容器、transform 和 z-index | 吸顶栏、抽屉、弹窗，以及 Teleport 的作用 |
| 层叠与组件样式 | 调整继承、优先级、CSS 变量与作用范围；对照 scoped/`:deep()`/`:slotted()` | Element Plus 主题、局部定制与覆盖范围 |

现有 CSS 三角形练习可作为 border 与伪元素的小扩展。BFC 仍是需要理解的布局机制，不能简单描述成“已经过时”；同时区分 BFC 与 Flex/Grid 建立的格式化上下文。

Flex 的重点包含剩余空间分配、收缩基准和默认最小尺寸。尺寸显示由浏览器实际测量，简化公式会标明假设条件；窗口变化后可重新观察，不只展示静态示意图。

## 7. JavaScript 基础实验室

每题采用「先预测 → 运行 → 实际日志 → 解释 → 修复 → 对应业务源码」流程。固定示例在明确的浏览器 ES module 环境中执行并捕获结果，避免依赖人工写死的输出。

### 7.1 运行机制与业务基础

| 专题 | 可操作实验 | Vue/业务联系 |
| --- | --- | --- |
| 作用域与变量 | 比较 var/let/const、块级作用域、暂时性死区和循环回调 | setup 中的局部变量、事件回调和模块变量 |
| this | 比较对象方法、提取调用、箭头函数、call/apply/bind、构造调用 | Options 方法与 setup/script setup 中的访问方式 |
| 闭包与状态隔离 | 两个独立计数器、共享模块状态、防抖计时器、快照与实时读取 | composable 每次调用的状态归属、回调读取 ref |
| 值、引用与拷贝 | 解构、展开、浅拷贝和嵌套对象修改；演示编辑后取消 | props 数据流、reactive 引用、表单草稿 |
| 对象、类与继承 | 构造函数/原型写法与 class 对照，观察实例属性、原型查找、继承与重写 | 任务模型实验、自定义业务错误、继承与 composable/函数组合的选择 |
| 数组与集合 | map/filter/reduce、sort 与复制后排序、Map/Set 去重 | 搜索筛选、统计、批量选择及避免污染原数组 |
| 异步与事件循环 | 观察同步、Promise、async/await、定时器的实际执行顺序 | Vue 更新队列、`nextTick`、请求 loading 与错误处理 |
| 防抖、节流与竞态 | 连续输入、连续点击、快速切换查询，记录触发次数和请求顺序 | RemoteSelect、搜索栏、请求取消与过期结果丢弃 |
| DOM 事件与清理 | 观察捕获/冒泡/委托，添加与移除监听；反复挂载/卸载 | 事件修饰符、点击外部关闭、计时器与监听清理 |
| 现代语法与模块化 | 解构、参数、展开、模块导入导出及 API 选择实验 | 组件 props、配置合并、工具函数复用、路由懒加载 |

### 7.2 对象、类与继承：正式实操专题

按「对象与原型 → 构造函数 → class → 继承 → 组合与工程边界」循序学习，而不是只展示 extends 的语法。

| 内容 | 必须能观察或解释的行为 |
| --- | --- |
| 对象与原型 | 自有属性与继承属性、属性查找、`Object.create`、`Object.getPrototypeOf`、`Object.hasOwn`、`instanceof` 的基本原理 |
| 构造函数与 new | 构造函数、prototype、constructor 的关系；new 的基本过程；返回对象对结果的影响；两个实例的字段隔离与方法共享 |
| class 基础 | 声明/表达式、constructor、实例字段、原型方法、static、getter/setter；方法提取后的 this；原型方法与箭头函数字段的差异 |
| 继承与多态 | `extends`、`super()`、`super.method()`、方法重写；派生构造函数访问 this 前的初始化要求；实例原型链与构造函数之间的静态继承关系 |
| 封装与现代类 | 公有/私有字段、私有方法、静态字段；私有成员与普通属性的区别，子类不能直接访问父类私有字段；这些能力按实际标准年份标注 |
| 继承与组合 | 用继承扩展一种任务行为，再用函数/策略组合实现同一需求，比较耦合、复用与测试边界；关联 Vue composables 的逻辑组合 |

重点实验：

1. 用构造函数和 class 分别创建任务对象，展示字段位置、原型关系与共享方法；通过浏览器真实对象检查结果。
2. 用 `Task` 与 `TimedTask` 演示 super、重写、静态工厂方法、两个实例的独立状态，以及 `instanceof` 的结果。
3. 把实例方法作为回调执行，复现 this 丢失，再比较 bind、包装函数和箭头函数字段的修复方式。
4. 用自定义 `ValidationError extends Error` 区分业务错误；把任务格式化行为改成可替换的组合策略，解释何时不必增加继承层级。

原型图由实际 `Object.getPrototypeOf` 关系生成，原型链继承、构造函数借用与组合继承提供对照片段；不以“修改 __proto__”作为日常业务方案。

类实例进入 Vue 响应式系统、私有字段与 Proxy 的接收者问题，以及序列化后原型/方法丢失作为高级排错案例。示例明确实例、普通数据和响应式状态的边界，业务持久化继续使用可序列化的数据结构。

### 7.3 ES2015（ES6）语法与 API

把“语法能力”和“标准库方法”分开介绍，每项关联实际输入、输出或业务用途。

| 分组 | 重点内容 | 实验/项目用途 |
| --- | --- | --- |
| 变量与函数语法 | let/const、箭头函数、默认参数、rest 参数 | 作用域、回调、可变参数工具函数；const 与对象可变性的区别 |
| 数据与对象语法 | 解构、模板字符串、数组/调用展开、对象属性简写、方法简写、计算属性名 | 表单数据提取、提示文案、参数组织和动态字段 |
| 数组 API | `Array.from/of`、`find/findIndex`、`entries/keys/values` | 转换可迭代对象、定位任务、显示索引和值；fill/copyWithin 提供修改原数组的对照例子 |
| 字符串 API | `includes`、`startsWith/endsWith`、`repeat` | 搜索、前后缀检查与格式化 |
| 对象与数值 API | `Object.assign/is`、`Number.isNaN/isFinite`；其他常用方法提供速查 | 配置合并、浅拷贝、相等与合法数值判断 |
| 集合与标识 | Map、Set、WeakMap、WeakSet、Symbol | 标签去重、ID 映射、对象附加信息、唯一标识；弱集合的不可枚举与引用边界 |
| Promise | 构造、then/catch、resolve/reject、all/race | 并发加载、失败传播与先完成结果；结合执行顺序实验 |
| 迭代协议 | `for...of`、`Symbol.iterator`、Iterator、Generator 基础 | 可迭代与类数组的区别，手动 next 与任务序列遍历的小实验 |
| 元编程 | Proxy、Reflect 的基本 get/set 与 receiver | 属性拦截对照普通对象，衔接 Vue 响应式；明确只是简化教学模型 |
| ES modules | 命名/默认导出、静态导入、模块作用域与共享状态、导入绑定 | 工具函数与 composable 拆分，观察模块级状态和每次调用局部状态的差别 |

高频语法、数组/对象、Map/Set、Promise、模块化进入业务或核心实验。WeakMap/WeakSet、Symbol、Iterator/Generator、Proxy/Reflect 使用聚焦的小实验，深入协议与元编程放拓展说明。

### 7.4 ES2015 之后的常用能力：明确版本

| 标准版本 | 需要介绍的常用能力 | 练习场景 |
| --- | --- | --- |
| ES2016 | 数组 `includes`、指数运算符 | 标签匹配与数值计算 |
| ES2017 | async/await、`Object.values/entries`、字符串 padStart/padEnd | 异步服务、状态统计、编号格式化 |
| ES2018 | 对象 rest/spread、`Promise.finally` | 配置和草稿的浅拷贝、请求结束清理 |
| ES2019 | `flat/flatMap`、`Object.fromEntries`、trimStart/trimEnd | 标签展开、查询条件与键值结构转换 |
| ES2020 | 可选链 `?.`、空值合并 `??`、`Promise.allSettled`、动态 `import()`；BigInt 作拓展 | 可选字段、默认值、部分失败的并行请求、路由懒加载 |
| ES2021 | `Promise.any`、逻辑赋值 `&&=/||=/??=`、replaceAll | 任一成功策略、默认配置、批量文本替换 |
| ES2022 | `Array.at`、`Object.hasOwn`、类字段/私有成员、静态初始化块；顶层 await 的模块语境 | 末尾元素、自有属性、封装、异步模块；区分 Vue SFC 顶层 await 的编译行为 |
| ES2023 | `toSorted/toReversed/toSpliced/with`、findLast/findLastIndex | 保留原数组的数据处理、倒序查找、对照传统原地修改方法 |

API 实验固定说明：参数、返回值、是否修改原数据、浅层/深层语义、空值/错误边界和适用场景。例如用同一批任务对比 sort、复制后 sort 与 toSorted；用相同成功/失败/延迟配置对比 Promise.all/allSettled/race/any。

`structuredClone`、fetch、AbortController、DOM、定时器等标为运行环境提供的 API，并说明使用限制；不将其归入 ES6。新 API 显示环境支持情况，必要时演示替代实现，并解释语法转换与 API polyfill 的区别。

### 7.5 准确性与学习边界

相等比较、类型转换提供专题练习；冷门数值方法、复杂生成器流程与特殊继承边界按速查/拓展说明处理。

准确性要求：

- 普通函数 this 结合调用方式判断；箭头函数继承词法 this。ES module 是严格模式，独立调用的普通函数不会自动使用 window 作为 this。
- Options API 中需要组件 this 的方法使用普通函数；setup 内 this 为 undefined，script setup 使用词法变量访问状态。
- 闭包是函数与其词法环境的组合，不限于返回函数；闭包本身不等于内存泄漏。实验说明引用仍被保留的原因及如何释放不再需要的资源。
- 区分捕获普通值快照、回调读取最新 ref 值、请求结果乱序这几种情况。
- `nextTick` 等待相关 Vue DOM 更新，不将其描述为保证浏览器已完成绘制；浏览器实验与 Node 环境题分别标注。
- 清理监听展示相同函数引用与匹配的 capture 参数；防抖支持取消尾调用，过期请求不能覆盖最新结果或错误地结束新请求的 loading。
- 拷贝方案写清可处理的数据范围；不把 JSON 序列化描述为通用深拷贝。
- class 基于原型机制，但有严格模式、必须 new 调用、方法属性描述符、暂时性死区及私有成员等具体语义，不能简单等同于一段构造函数代码。
- class 原型方法不会自动绑定实例 this；箭头函数字段在各实例上创建，不能把两者解释为完全相同的性能与继承行为。
- 原型继承不等于复制属性；extends 同时影响实例原型链和构造函数之间的继承关系，static 不作为实例自己的方法。
- 私有字段、对象展开、async/await、可选链等标注真实标准版本，不把全部现代语法统称为 ES6 新增。
- WeakMap/WeakSet 的实验不依赖可预测的垃圾回收时机；Map/Set 基础实验说明对象键/元素按引用身份区分。
- Promise 聚合方法不会自动取消仍在执行的任务；请求取消与清理分别使用明确的应用机制。
- API 是否可用由目标环境决定；项目能构建不等于旧浏览器已拥有这些标准库方法。

## 8. Vue 2 对照的准确性要求

需要明确区分以下两组内容。

**版本行为变化：**

- `new Vue` 与 `createApp`、应用级配置与插件注册。
- Vue 2 的侦测限制与 Vue 3 基于 Proxy 的响应式对象，包括对象属性新增/删除、数组索引等场景；解释 `$set/$delete` 为何移除。
- 组件 `v-model` 的 `value/input` 与 `modelValue/update:modelValue`，`.sync` 与具名 model 的迁移。
- `emits` 声明、`.native` 移除、`$listeners` 合入 `$attrs`、class/style 透传及多根节点影响。
- 生命周期 `beforeDestroy/destroyed` 的更名，指令钩子的变化。
- filters、实例 `$on/$off/$once`、`$children` 等移除及对应替代思路。
- `v-if/v-for` 优先级、`template v-for` 的 key 位置、数组侦听等行为变化。

**写法与架构选择：**

- Vue 3 继续支持 Options API；Composition API 已内置于 Vue 2.7。它们不能直接等同于 Vue 2、Vue 3。
- 比较 mixins 与 composables 时，结合来源可追踪、命名冲突、逻辑复用及状态隔离分析。
- `ref` 可以包装对象，不将它简单讲成「只能放基本类型」。
- 区分普通 reactive 对象的解构问题与 Vue 3.5 编译器支持的响应式 props 解构。
- props 是浅只读的；对象 prop 的嵌套字段修改可能生效，但会使数据流难以追踪，因此用事件或显式更新接口组织变更。
- 编译宏与运行时 API 分开说明，API 旁标注必要的小版本要求。

## 9. 页面与视觉设计

桌面端采用左侧章节导航、中央实验内容、右侧可折叠知识提示；窄屏合并为单列，知识提示放到实验下方。

导航按「工作台 / Vue 3 / 组件库 / CSS / JavaScript / 迁移对照 / 面试复习」分组。源码、知识点和面试题之间可以互相跳转。

```text
┌──────────────────────────────────────────────────────┐
│ Vue 3 前端面试实验室    搜索知识点 / 学习进度         │
├────────────┬─────────────────────────┬───────────────┤
│ 学习总览   │ 当前章节 · 学习目标     │ Vue 2 对照    │
│ 任务工作台 │                         │ 易错点        │
│ Vue 3      │ 可操作演示 / 参数控制   │ 面试追问      │
│ 组件库     │                         │ 官方资料      │
│ CSS        │ 状态 / 日志 / 实际尺寸  │               │
│ JavaScript │ 源码与解释 / 动手练习   │               │
│ 面试复习   │                         │               │
└────────────┴─────────────────────────┴───────────────┘
```

视觉默认采用浅色背景、深色正文、Vue 绿色强调，提供明暗切换与预设主题，代码块和状态标签保持清晰。全文中文，API 保留原名。界面优先保障阅读、操作、观察结果和源码定位。

按钮、表单和弹窗支持基本键盘操作；日志数量设上限，并提供暂停观察/清空能力，避免学习过程中持续刷屏。

## 10. 代码与学习材料组织

建议按主题组织，便于直接从 IDE 找到正在学习的内容：

```text
src/
  App.vue                    # 应用外壳
  router/                    # 页面路由
  stores/                    # 任务与学习记录
  components/
    common/                  # 原生教学组件与通用小组件
    business/                # 基于 Element Plus 的四个重点封装
    learning/                # 实验外壳、日志、源码和问答面板
  features/
    dashboard/               # 学习总览
    tasks/                   # 业务看板与详情
    labs/                    # 按章节放实验组件
    ui-library/              # 组件库应用、定制与双库对照
    foundations/
      css/                   # CSS 布局与样式实验
      javascript/            # JS 机制与基础实验
    migration/               # 迁移对照
    interview/               # 复习功能
  composables/               # 副作用和状态逻辑复用
  data/                      # 章节、题目及明确标识的对照代码
  services/                  # 模拟异步服务
  styles/                    # 设计变量、Element Plus 变量映射、明暗主题
  assets/                    # 样式与静态资源
docs/
  vue3-learning-plan.md       # 本设计方案
  learning-guide.md          # 学习顺序、源码入口、操作与练习
  feature-coverage.md        # 知识点 → 实验 → 源码 → 面试题的映射
  component-contracts.md     # 业务组件接口、状态归属与扩展方法
```

中文注释解释「为什么这样写」和易错点；每个实验聚焦一个问题。故意错误的示例需要明确标记，并能与修复版本对照。

## 11. 拓展内容的边界

- Router、Pinia 和 Vite 标为生态/工具链，避免与 Vue 核心 API 混淆。
- Suspense 根据当前官方文档标为实验性，放在独立实验中。
- SSR/hydration 讲清流程、适用场景和常见不一致原因；当前浏览器 SPA 中不将这些说明标记为已经完成服务端实践。
- TypeScript 先提供少量 props/emits、模板引用类型对照片段，完整 TypeScript 工程作为后续学习方向。
- JSX、Custom Elements、自定义渲染器等作为拓展索引，说明用途并链接官方资料。
- 响应式或 diff 的简化演示标明教学模型，与 Vue 实际源码实现区分。
- Element Plus 是主线实操；Ant Design Vue 是版本明确的参考代码和主题/API 对照，不将对照材料标为另一套已运行的完整业务。
- 业务组件定制以公开扩展点和组合能力为主；库源码阅读是拓展材料。首版的工程目标是这个学习应用及其复用组件。
- CSS/JavaScript 先完成上文与项目直接关联的实验；进阶专题在覆盖表中标记深度，避免只列名词却没有操作或说明入口。

## 12. 实施与验收

首版按以下顺序组织实现；后续保持业务、实验、讲解和验证一致。

1. 应用布局、分组导航、章节数据及实验展示骨架，接入 Element Plus 与统一主题。
2. 任务工作台、四个业务组件、模拟服务和持久化，建立完整业务闭环。
3. Vue 章节实验、真实日志、Vue 2 对照与源码入口。
4. 组件定制实验、CSS 布局实验、JavaScript 机制实验及关联练习。
5. Ant Design Vue 对照、面试复习、组件接口文档、知识覆盖映射及页面细节。
6. 构建检查、关键行为验证和浏览器体验检查，修复后交付。

验收要求：

- 可按 README 启动并完成生产构建，核心页面能直接访问。
- 任务增删改查、筛选排序、分页选择、表单校验、路由跳转和刷新恢复正常。
- 每个核心章节至少有一个可操作、可重置的实验；日志由真实交互或生命周期产生。
- 通信实验中能观察 props、事件和 model 更新的数据流；组件不依赖直接修改传入 props 完成业务更新。
- 搜索竞态、watch 清理、组件卸载清理、KeepAlive 激活/停用有可复现的验证步骤。
- 四个业务封装组件有清晰公开接口；新增自定义列/筛选项时可通过配置或插槽完成，并在两个场景中验证复用。
- 表单弹窗取消不污染原数据；各关闭入口遵守同一状态规则；异步校验与提交失败时能正常恢复操作。
- 主题、明暗模式和尺寸切换正常，弹出层与页面组件一致；局部主题实验能解释作用范围。
- Flex 参数能改变实际布局；BFC/外边距示例可复现；布局尺寸来自实际测量。
- this、闭包、异步顺序、防抖和竞态实验显示真实执行结果；重置与反复进入页面后结果一致，不累积多余计时器和监听。
- 类与继承实验能观察实例/原型/静态关系、super 与重写、方法回调 this 及组合方案，并关联面试题；类私有成员和序列化案例标明限制。
- 现代语法/API 覆盖表逐项标明标准版本、实操或拓展深度及源码位置；能运行数组修改性、Promise 聚合策略、Map/Set 和模块状态等核心对照实验。
- 高频题能关联到本项目中的代码或实验；说明与实际运行结果一致。
- 必要自动化验证集中在组件绑定协议、表单草稿隔离、异步竞态、防抖取消及持久化等容易回归的行为，辅以关键路径浏览器检查。
- 交付学习指南、知识覆盖清单、业务组件接口文档、运行方法和已知边界。

## 13. 已确认的实施选择

1. 项目形式：Vue 3 前端面试实验室 + 学习任务工作台，包含组件库、CSS 和 JavaScript 专区。
2. 主语言：JavaScript；TypeScript 作为拓展对照。
3. 组件库：Element Plus 做业务实操与定制，Ant Design Vue 做重点 API 和主题对照。
4. 学习深度：Vue 常用能力、四个业务封装及上述 CSS/JS 基础做实操；其余高级能力分专项实验和拓展说明。
5. 数据方式：模拟异步服务 + localStorage。
6. 交付范围：上述完整首版、约 80 道关联面试题、中文学习材料、组件接口文档和必要验证。

用户已确认开始编码。后续补充已纳入 Vite / Webpack 专区及必要中文代码注释，验证边界单独记录。

## 14. 后续确认的工程化与注释要求

- Vite / Webpack 独立专区：开发/生产流程、模块图、HMR、环境变量、代理、loader/plugin、动态导入、Tree Shaking、chunk、contenthash、source map。
- 主线 Vite 8 标明 Rolldown/Oxc 版本边界；Webpack 5 提供独立可运行 Vue SFC 示例。
- 实际环境、动态 import、HMR 与 Node mock 代理可执行；流程和体积模型标为教学示意。
- 业务组件、composables、状态和实验包含必要中文注释，解释数据流、接口、清理和边界。
- 自动化检查与真实浏览器视觉检查分别记录，不能互相替代。

## 官方资料依据

- [Vue 3 指南](https://cn.vuejs.org/guide/introduction.html)
- [Vue 2 → Vue 3 迁移清单](https://v3-migration.vuejs.org/breaking-changes/)
- [Composition API FAQ](https://vuejs.org/guide/extras/composition-api-faq.html)
- [script setup 与编译宏](https://vuejs.org/api/sfc-script-setup.html)
- [侦听器与副作用清理](https://vuejs.org/guide/essentials/watchers.html)
- [模板引用](https://vuejs.org/guide/essentials/template-refs.html)
- [Suspense 及其状态](https://vuejs.org/guide/built-ins/suspense.html)
- [Element Plus 主题定制](https://element-plus.org/en-US/guide/theming.html)
- [Element Plus 全局配置](https://element-plus.org/en-US/component/config-provider.html)
- [Element Plus 明暗主题](https://element-plus.org/en-US/guide/dark-mode.html)
- [Element Plus 表单](https://element-plus.org/en-US/component/form.html)
- [Element Plus 弹窗](https://element-plus.org/en-US/component/dialog.html)
- [Ant Design Vue 4.x 主题：官方仓库文档](https://github.com/vueComponent/ant-design-vue/blob/main/site/src/vueDocs/customize-theme.en-US.md)
- [MDN：Flex 基础](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Basic_concepts)
- [MDN：this](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this)
- [MDN：闭包](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures)
- [Vue：setup 中的 this](https://vuejs.org/api/composition-api-setup.html)
- [MDN：类](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes)
- [MDN：extends](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends)
- [MDN：数组 toSorted](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toSorted)
- [MDN：Promise.allSettled](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled)
- [MDN：structuredClone（Web API）](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone)
