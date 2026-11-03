import { createRouter, createWebHashHistory } from "vue-router";

// route record 只配置入口，不提前导入所有页面。component 的函数在需要该路由时加载 SFC，
// 与 defineAsyncComponent 的组件级异步包装是两个入口，路由懒加载直接使用 import 函数即可。
const routes = [
    {
        path: "/",
        name: "dashboard",
        component: () => import("@/features/dashboard/DashboardView.vue"),
        meta: { title: "学习总览" }
    },
    {
        path: "/tasks",
        name: "tasks",
        component: () => import("@/features/tasks/TasksView.vue"),
        meta: { title: "任务工作台" }
    },
    {
        // :id 是必需的动态参数，由详情页读取并查询 store；它不代表页面拥有一份任务副本。
        path: "/tasks/:id",
        name: "task-detail",
        component: () => import("@/features/tasks/TaskDetailView.vue"),
        meta: { title: "任务详情" }
    },
    {
        // ? 让专题参数可省略；具体默认专题和未知 topic 回退由功能入口组件处理。
        path: "/labs/:topic?",
        name: "vue-lab",
        component: () => import("@/features/labs/VueLabView.vue"),
        meta: { title: "Vue 3 核心" }
    },
    {
        path: "/css/:topic?",
        name: "css-lab",
        component: () => import("@/features/foundations/CSSLabView.vue"),
        meta: { title: "CSS 布局" }
    },
    {
        path: "/javascript/:topic?",
        name: "js-lab",
        component: () => import("@/features/foundations/JavaScriptLabView.vue"),
        meta: { title: "JavaScript 基础" }
    },
    {
        path: "/ui-library",
        name: "ui-library",
        component: () => import("@/features/ui-library/UiLibraryView.vue"),
        meta: { title: "组件库应用与定制" }
    },
    {
        path: "/migration",
        name: "migration",
        component: () => import("@/features/migration/MigrationView.vue"),
        meta: { title: "Vue 2 → 3 迁移" }
    },
    {
        path: "/interview",
        name: "interview",
        component: () => import("@/features/interview/InterviewView.vue"),
        meta: { title: "面试复习" }
    },
    {
        path: "/tooling/:topic?",
        name: "tooling",
        component: () => import("@/features/tooling/ToolingView.vue"),
        meta: { title: "Vite / Webpack" }
    },
    // 子路由渲染到 RouterPlayground 内部的第二层 RouterView；父子记录可以同时匹配。
    // children 的相对路径拼在 /routing-demo 后；切换子页时保留父布局与草稿。
    {
        path: "/routing-demo",
        component: () => import("@/features/labs/RouterPlayground.vue"),
        meta: { title: "嵌套路由实操" },
        children: [
            { path: "", redirect: { name: "routing-profile" } },
            {
                path: "profile",
                name: "routing-profile",
                component: () => import("@/features/labs/RouterChildPanel.vue"),
                // 将展示参数作为 prop 传入，使子组件不必为这段文字耦合 useRoute。
                props: { section: "学习资料" }
            },
            {
                path: "settings",
                name: "routing-settings",
                component: () => import("@/features/labs/RouterChildPanel.vue"),
                props: { section: "学习偏好" }
            }
        ]
    },
    {
        // 兜底的是未匹配路径；已匹配 /labs/:topic? 但 topic 无效时，仍由专题页决定回退。
        path: "/:pathMatch(.*)*",
        name: "not-found",
        component: () => import("@/features/dashboard/NotFoundView.vue"),
        meta: { title: "页面未找到" }
    }
];
export const router = createRouter({
    // Hash 模式方便本地/静态托管刷新深层路径；开发代理仍由 Vite 配置决定。
    history: createWebHashHistory(),
    routes,
    scrollBehavior(to, from, saved) {
        // 浏览器前进/后退优先恢复记录位置；相同 path 的 query 更新不强制回到页首。
        return saved || (to.path === from.path ? undefined : { top: 0 });
    }
});
// 导航后统一更新浏览器标题；组件内的专题标题仍可比 route.meta.title 更具体。
router.afterEach((to) => {
    document.title = to.meta.title + " · Vue Lab";
});
