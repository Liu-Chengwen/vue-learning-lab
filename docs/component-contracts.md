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
- events：`submit`、`reset`，提供当前条件快照。
- slots：`field-{key}` 接收 `value`、`update` 等字段接口。
- 职责：展示与收集条件，请求由父页面发起。

练习：增加一个状态筛选，先使用字段配置，再通过插槽换成自己设计的按钮组。

## DataTable

文件：`src/components/business/DataTable.vue`。

- props：`data`、`columns`、`loading`、`total`、`page`、`pageSize`、`rowKey`、`selectable`。
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
