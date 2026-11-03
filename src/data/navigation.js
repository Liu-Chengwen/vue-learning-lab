// topic 是路由标识，显示标题可以独立修改；展开状态属于应用壳，不混入教学业务状态。
// 每个 items 元组是 [topic, title]；base + topic 决定导航地址，icon 是 App.vue 中的图标映射键。
// 新增专题时需同步功能入口/元数据，导航配置本身不会自动创建可运行的实验组件。
export const navGroups = [
    {
        id: "vue",
        label: "Vue 3 核心",
        icon: "vue",
        base: "/labs",
        items: [
            ["setup", "起步与 API 风格"],
            ["templates", "模板、列表与 key"],
            ["reactivity", "响应式系统"],
            ["watchers", "计算、侦听与更新"],
            ["communication", "组件通信"],
            ["models", "表单与 v-model"],
            ["slots", "插槽与属性透传"],
            ["lifecycle", "生命周期与复用"],
            ["builtins", "内置与异步组件"],
            ["router-state", "路由与状态管理"],
            ["rendering", "渲染机制与性能"],
            ["migration", "Vue 2 → 3 迁移"]
        ]
    },
    {
        id: "css",
        label: "CSS 布局",
        icon: "css",
        base: "/css",
        items: [
            ["flex", "Flex 弹性布局"],
            ["box", "盒模型与尺寸"],
            ["bfc", "BFC、浮动与折叠"],
            ["grid", "Grid 与响应式"],
            ["position", "定位与层叠"],
            ["styles", "组件样式与主题"]
        ]
    },
    {
        id: "javascript",
        label: "JavaScript 基础",
        icon: "js",
        base: "/javascript",
        items: [
            ["scope", "作用域与变量"],
            ["this", "this 指向"],
            ["closures", "闭包与状态隔离"],
            ["classes", "类、原型与继承"],
            ["arrays", "数组、引用与集合"],
            ["async", "异步与事件循环"],
            ["functions", "防抖、节流与竞态"],
            ["events", "事件与资源清理"],
            ["es2015", "ES2015 语法与 API"],
            ["modern", "现代 JavaScript"],
            ["modules", "ES modules"]
        ]
    },
    {
        id: "tooling",
        label: "Vite / Webpack",
        icon: "tool",
        base: "/tooling",
        items: [
            ["overview", "工具链与构建流程"],
            ["modules", "模块图与 HMR"],
            ["config", "环境、代理与配置"],
            ["bundling", "分包、优化与产物"]
        ]
    }
];
// flatMap 把“分组数组 → 各组子项数组”压成一层，供搜索复用，避免单独手写第二份导航标题。
export const flatLessons = navGroups.flatMap((group) =>
    group.items.map(([topic, title]) => ({
        id: group.id + "-" + topic,
        topic,
        title,
        category: group.label,
        path: group.base + "/" + topic
    }))
);
// 搜索既包含工作台等固定入口，也包含全部专题。此处只存本地元数据，不索引源文件正文。
export const searchEntries = [
    { title: "学习总览", category: "工作台", path: "/" },
    { title: "任务工作台", category: "业务实践", path: "/tasks" },
    { title: "Element Plus 应用与定制", category: "组件库", path: "/ui-library" },
    { title: "Vue 2 → Vue 3 迁移对照", category: "迁移", path: "/migration" },
    { title: "面试复习", category: "面试", path: "/interview" },
    ...flatLessons
];
