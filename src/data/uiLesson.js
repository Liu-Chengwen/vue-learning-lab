// 组件库专题元数据与问答；页面、导航和面试复习共用一份内容。
// id 与 catalogue 的组件库摘要保持一致；source 数组决定源码面板中的切换按钮。
// Element Plus 是实际运行的业务组件，Ant Design Vue 是有版本范围的参考对照。
export const uiLesson = {
    id: "ui-library",
    title: "从组件应用，到业务定制",
    subtitle: "用 Element Plus 完成实际业务，再把重复模式沉淀为清晰的组件接口。",
    category: "ELEMENT PLUS / ANT DESIGN VUE",
    level: "应用 → 封装",
    source: [
        "src/features/ui-library/UiLibraryView.vue",
        "src/components/business/SearchPanel.vue",
        "src/components/business/DataTable.vue",
        "src/components/business/TaskFormDialog.vue",
        "src/components/business/RemoteSelect.vue",
        "src/composables/useRequest.js",
        "src/composables/useDebounce.js"
    ],
    goals: ["主题与配置", "插槽和受控状态", "可复用业务组件", "跨组件库迁移"],
    explanation: [
        "应用组件库时，先理解公开 API 的 props、事件、插槽与暴露方法。业务封装只收敛真实的重复需求，特殊内容保留插槽扩展。",
        "Element Plus 的 ConfigProvider 管理语言、尺寸等上下文；颜色与明暗主题通过 CSS 变量实现。CSS 的继承沿 DOM 树发生，Teleport 改变的 DOM 位置会影响局部变量的继承。",
        "数据请求留在页面或 composable，表格展示数据并发出交互事件。TaskFormDialog 用独立草稿隔离编辑，用 submit 函数等待保存结果，因为 emit 不返回父组件异步处理的结果。",
        "Ant Design Vue 的对照基于 4.x API 与主题方案；它作为参考代码展示，当前运行的业务使用 Element Plus。迁移时应核对所用版本的公开文档。"
    ],
    interview: [
        {
            question: "二次封装表格时，如何保留灵活性？",
            answer: "公开 data、columns、loading、分页/选择事件，并保留单元格插槽。请求与业务权限由页面决定，不把所有需求堆进复杂 schema。插槽中透出 row/value/index，既能扩展展示，也能组织业务交互。"
        },
        {
            question: "包装组件如何避免丢失事件与双向绑定？",
            answer: "先明确自己的 props/emits，再有意识地转发 attrs；组件 model 明确使用值 prop 与更新事件或 defineModel。已声明事件不再自动出现在 attrs 中，避免自动透传和手动 emit 双重触发。"
        },
        {
            question: "修改主题为何可能没有影响弹出层？",
            answer: "局部 CSS 变量沿真实 DOM 继承，传送到 body 的节点不再继承原容器变量。可把全局变量放到 html，或通过组件公开的挂载目标/class 等接口控制局部主题。ConfigProvider 的逻辑上下文与 DOM 的 CSS 继承是两种机制。"
        },
        {
            question: "编辑弹窗为什么要使用草稿？",
            answer: "如果直接编辑列表对象的嵌套字段，取消弹窗也无法还原。先建立所需数据范围的独立副本，校验与异步提交成功后再更新 store；取消只丢弃草稿。"
        },
        {
            question: "Dialog 的 before-close 能覆盖所有自定义关闭按钮吗？",
            answer: "Element Plus 的公开说明指出，自定义页脚按钮要自行执行相同关闭逻辑。本项目将是否可关闭集中到 canClose，并在关闭图标/遮罩/键盘/页脚入口遵守统一状态规则；提交中禁用关闭。"
        },
        {
            question: "远程搜索如何避免旧结果覆盖新结果？",
            answer: "输入变化立即取消旧请求，并对新调用做防抖；useRequest 通过 AbortController 取消工作，再用请求序号保护数据、错误和 loading 的归属。组件卸载也取消防抖尾调用与请求。"
        },
        {
            question: "为什么不修改 node_modules 中的组件源码来定制？",
            answer: "先通过公开 API、插槽、主题变量和业务组合完成扩展，这些接口更易升级和维护。确实需要底层变更时，应明确版本、维护分支和升级成本，而不是依赖安装目录里的临时修改。"
        },
        {
            question: "动态表单封装应该做到多通用？",
            answer: "先提炼两三个实际使用场景的共性，支持少量字段类型和字段插槽。复杂联动或特殊布局直接使用插槽与业务逻辑，避免为了配置一切而制造新的难学语言。"
        },
        {
            question: "表单校验与数据保存如何协调？",
            answer: "先等待 validate 成功，再提交；提交中避免重复请求。错误由用户可见状态展示，成功后通知父级并关闭。表单规则负责交互反馈，服务层仍应验证数据，异步期间还需考虑任务已删除或同名冲突。"
        },
        {
            question: "如何验证封装真正可复用？",
            answer: "在任务工作台与此实验页复用同一 SearchPanel/DataTable/RemoteSelect/TaskFormDialog，通过不同字段、列插槽和回调验证接口；检查状态归属、默认行为、attrs、事件参数以及错误恢复。"
        },
        {
            question: "Element Plus 和 Ant Design Vue 的主题接口一样吗？",
            answer: "不一样。这里 Element Plus 用 CSS 变量与可选 SCSS 主题，ConfigProvider 提供语言/尺寸等配置；Ant Design Vue 4.x 通过 ConfigProvider theme 中的 Design Token 与算法管理主题，组件 Token 还能局部定制。"
        },
        {
            question: "表格翻页时选择状态由谁管理？",
            answer: "取决于产品需求。此工作台切页或变更筛选后清空当前页选择；若需要跨页选择，应使用稳定 row-key 和由业务持有的选中 ID 集合，并明确全选、删除及过滤后的语义。"
        }
    ],
    exercise:
        "为 DataTable 增加一个“截止日期提醒”自定义列，再给 SearchPanel 增加状态筛选。使用现有公开配置与插槽完成，尽量不修改封装内部。"
};
