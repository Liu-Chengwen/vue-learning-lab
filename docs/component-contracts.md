# 业务组件接口与阅读顺序

先实际操作 `/tasks`，再按 `TasksView → SearchPanel/DataTable/TaskFormDialog → RemoteSelect → useRequest/useDebounce → tasks store → taskService` 阅读。

## 状态放在哪里

| 状态 | 归属 | 原因 |
| --- | --- | --- |
| 任务集合、持久化、统计 | `useTasksStore` | 跨页面共用一个数据源 |
| 筛选、排序、页码、选中行、视图 | `TasksView` | 页面交互，表格不决定业务查询 |
| 搜索条件编辑值 | 页面传入 SearchPanel 的 model | 区分草稿条件与已应用条件 |
| 弹窗打开状态 | 父组件 `v-model:open` | 使用方决定何时打开、编辑哪个任务 |
| 表单草稿、校验、提交锁与错误 | TaskFormDialog | 编辑中不污染列表对象 |
| 远程选项、计时器、请求序号 | RemoteSelect 与 composables | 过期请求不得覆盖新结果，跟随作用域清理 |

## SearchPanel

文件：`src/components/business/SearchPanel.vue`。

- model：`modelValue` 对象；字段更新通过新对象发出 `update:modelValue`。
- props：`fields`、`defaults`、`loading`。
- `fields[].disabled`：可选布尔值，默认 `false`，控制该字段的 Input、Select 或 DatePicker；动态切换只改变可交互状态，不清空或修改 model 中的值。
- events：`submit`、`reset`，提供当前条件快照。
- slots：`field-{key}` 接收 `{ value, update, disabled }`；`disabled` 为布尔值，自定义控件由使用方绑定 `:disabled="disabled"`，`update(value)` 沿用原有更新协议。
- 自定义字段的可聚焦控件同时设置 `id="search-{key}"`，与面板的 label 关联；优先级示例使用 `id="search-priority"`。
- 禁用字段仍包含在查询快照中；重置仍用 `defaults` 更新整个 model 并发出默认条件快照，禁用不阻止显式重置。字段更新仍发出新对象，不直接修改父级传入对象。
- 职责：展示与收集条件，请求由父页面发起。

练习：增加一个状态筛选，先使用字段配置，再通过插槽换成自己设计的按钮组。

演示：`/ui-library` → “业务组件封装” → “禁用搜索字段”开关，同时控制内置输入框与自定义优先级选择器。

## DataTable

文件：`src/components/business/DataTable.vue`。

- props：`data`、`columns`、`loading`、`total`、`page`、`pageSize`、`rowKey`、`selectable`、`emptyText`。
- `emptyText` 默认保留任务页空态；用户控制台通过 `empty-text` 指定用户文案。
- models：`v-model:page`、`v-model:page-size`；修改每页条数时把页码重置为 1。
- events：`selection-change`、`sort-change`；内部不调用任务接口。
- slots：`cell-{prop}` 接收 `row`、`value`、`index`；默认插槽可追加原生列。
- attrs：显式透传底层 Table；已声明事件避免再走自动透传。
- expose：`clearSelection()`。

任务页采用“当前页选择”语义，筛选、分页和相关数据变化会清空选中行。跨页选择应另外设计基于稳定 ID 的状态。

练习：通过 `cell-priority` 定制展示，避免为一个新样式在表格内部增加业务分支。

## TaskFormDialog

文件：`src/components/business/TaskFormDialog.vue`。

- model：`v-model:open`。
- props：`task`、`existingTasks`、`submit(draft, { signal, fail })`、`simulateFailure`。
- events：`saved(result)`、`closed`。保存函数是明确异步契约，不能依赖 emit 返回父组件 Promise。
- expose：`validate()`、`requestClose()`。
- 草稿：每次打开建立独立副本；当前结构显式复制 tags 数组，这不是通用深拷贝。
- 校验：字段规则与重复标题；异步校验前加提交锁，防止双击并发保存。
- 关闭：关闭按钮、遮罩、Esc 和页脚采用同一策略；有修改时确认放弃，提交期间阻止关闭。
- 清理：卸载时取消校验和保存，校验结束后再次检查组件是否仍有效。

练习：增加截止日期规则，验证新建、编辑、取消与失败重试四条路径。

## RemoteSelect

文件：`src/components/business/RemoteSelect.vue`。

- model：`modelValue`，默认多选标签数组。
- props：`loader(query, { signal, fail })`、`multiple`、`placeholder`、`disabled`、`simulateFailure`。
- events：`query`、`loaded`、`error`。
- attrs：传给底层 Select；公开值协议由包装组件管理。
- expose：`reload()`、`focus()`、`cancel()`。
- 异步：尾部防抖减少调用；AbortController 取消旧工作；序号保护不遵守 signal 的结果。旧请求不能结束新请求的 loading。

练习：换一组 loader 数据，保留相同 model、取消与错误处理接口。

## 定制与主题

`src/stores/preferences.js` 管理主题、颜色和尺寸；`src/assets/main.css` 把设计变量映射到 Element Plus CSS 变量。根主题在 html，body 弹层仍可继承。局部主题实验比较不同 DOM 位置的变量范围。

优先使用公开 props、插槽、变量与组合；`:deep()` 限制作用范围。TypeScript 接口对照见 `/ui-library`，主体继续使用 JavaScript。

## 后端业务控制台

入口 `src/features/backend/BackendLabView.vue`。共享登录身份在 `useBackendAuthStore` 中，Session由后端Redis保存；服务端分页筛选、表单草稿、查询与写请求状态分别归页面和子组件。`BackendUserDialog` 使用 `v-model:open`、`user`与异步`submit(draft,{signal})`，保存成功发出`saved`。每次打开复制草稿，提交期间锁定关闭，卸载取消请求。`BackendEventPanel`组合审计/Outbox/通知请求，身份变化和卸载时作废旧结果。集成与部署见 [前后端集成](backend-integration.md)。

## Hybrid 页面与原生入口

入口 `src/features/hybrid/HybridLabView.vue`，页面逻辑位于同目录 `useNativeBridge.js`。消息、输入草稿、反馈与最近 30 条日志均属于当前页面实例，不写 Pinia 或 localStorage。

- Native → H5：`window.receiveNativeMessage(message)` 只接收字符串，更新页面响应式消息；非字符串给出错误反馈。组件挂载时注册，卸载时仅清理自己仍持有的入口；存在先前入口时恢复先前值。
- H5 → Native：读取 `window.webkit?.messageHandlers?.nativeBridge`，确认 `postMessage` 可调用后提交输入的原始字符串；拒绝空白消息，保留有效输入的空格与换行。不返回 Native 业务处理结果。
- 普通浏览器：无 handler 时展示通道不可用提示；“浏览器模拟”只演示接收和页面更新，并在来源与日志中标记。
- 字符串发送反馈：已提交 WebKit 通道与 Native 已处理是两个状态；旧字符串实验没有回复协议，不能凭提交提示认定原生弹窗已出现。
- Promise 请求：`src/utils/nativeBridge.js` 暴露 `nativeBridge.call(action, params, options)`，提交 `{ id, action, params }`，等待 `window.HybridBridge.receiveResponse` 收到同 ID 响应；`ok: true` 完成 Promise，`ok: false`、通道异常或超时使其失败。`options.timeoutMs` 只控制 H5 等待时长，不进入发送协议，省略时为 5000 毫秒。
- 页面生命周期：composable 在挂载时调用 `nativeBridge.install()` 安装响应入口，卸载时调用 `dispose()` 清理等待项并恢复原入口；通信和定位页各自拥有通道，导航实验则由父布局拥有通道；不是多消费者共享订阅服务。
- Promise 展示：设备信息、问候、组合结果及错误属于页面状态；五个练习动作集中在 composable，页面不重复处理请求协议，也不在挂载时自动调用 Native。

定位入口 `src/features/hybrid/LocationLabView.vue` 对应 `/hybrid/location`，页面状态与动作位于 `useLocation.js`：

- 点击按钮才调用 `nativeBridge.call("getLocation", {}, { timeoutMs: 60000 })`；等待期间禁用重复点击，失败后可重试。不会在挂载时自动请求权限。
- 成功数据为 `{ latitude, longitude, horizontalAccuracy, timestamp }`：经纬度为数字，精度单位为米，时间为 ISO 8601 字符串。系统允许近似位置时也可成功，页面同时展示精度供观察。
- 最近一次成功结果、加载状态和错误只属于当前页面，不写 Pinia 或 localStorage，不上传坐标；普通浏览器缺少通道时显示错误。
- 两个 Hybrid 路由分别在挂载时安装入口，卸载时取消 H5 等待并防止异步结果继续写回组件。SPA 切换本身没有发送 Native 取消协议；原生定位另有 45 秒总期限，并在原生页面退出或整页导航时清理。

导航入口 `src/features/hybrid/navigation/NavigationLabLayout.vue` 对应 `/hybrid/navigation`，其子页面为实验入口及 `page-a` / `page-b`：

- 父布局安装和清理 Bridge；子页面之间切换保留响应入口。离开整个实验时清理等待项，异步结果不再写入已离开的页面。没有把 Bridge 提升为全站服务。
- `useHybridNavigation.js` 只为本实验选择 `router.push()` 或 `nativeBridge.call("openWebView", { url, title })`。模式默认路由；新容器通过目标地址的 `navMode` 查询项继承实验配置，不持久化、不改变业务页面导航。
- `url` 为路由解析后生成的绝对地址，保留 hash 和 query；`title` 可选。Native 成功数据 `{ opened: true }` 表示容器已 push，不代表网页或 Vue 已就绪。无通道、参数错误和 Native 拒绝均显示错误，不静默切换为路由。
- 草稿、计数和页面实例标识归各子页面。当前容器路由跳转会重建离开的子页面，新容器跳转保留旧容器；JS 环境标识仅用作演示，整页刷新也会变化，不是 Native 容器 ID。
- H5 返回处理本容器的实验路由历史，无可用历史时 replace 到入口；原生导航栏返回关闭当前容器。新容器内也能继续路由跳转，用来观察两层历史。

全局响应入口只在通信、定位或导航实验挂载期间有效；当前活动实验持有本 JS 环境的入口，不同 WebView 的入口和回调表各自独立。更多接入步骤与原生侧职责见 [Hybrid 联调说明](hybrid-integration.md)。
