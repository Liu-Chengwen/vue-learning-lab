import { computed, inject, onMounted, onUnmounted, provide, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { nativeBridge } from "@/utils/nativeBridge";

/** 本实验的入口地址；封装只供这三个实验页面使用，不接管全站导航。 */
const homePath = "/hybrid/navigation";
/** provide / inject 使用同一个 Symbol 连接父布局和子页，避免与其他实验的注入名称冲突。 */
const navigationKey = Symbol("hybrid-navigation-lab");
/**
 * 模块在一个网页文档中只初始化一次，所以 SPA 切页时此值不变。
 * 新 WebView 或整页刷新会重新运行模块；它是观察 JS 环境的标记，不是 Native 容器 ID。
 */
const jsEnvironmentId = `js-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
/** 当前 JS 环境内的页面实例序号；页面重新挂载时递增，便于对照卸载日志。 */
let pageSequence = 0;

/**
 * 父布局提供的实验上下文。模式和日志由布局持有，输入草稿由各个子页自己持有。
 * @typedef {Object} NavigationLabContext
 * @property {import("vue").Ref<"router" | "container">} mode 当前实验的跳转方式。
 * @property {string} jsEnvironmentId 当前网页文档的 JS 环境观察标记。
 * @property {import("vue").Ref<Array<{id: number, time: string, message: string}>>} events 最近的生命周期与跳转记录。
 * @property {function(string): void} record 添加一条记录，不保存到磁盘。
 */

/**
 * 在 NavigationLabLayout 的 setup 中创建一次，为其全部子页管理 Bridge 入口。
 * 路由从入口切到 A/B 时父布局保留；退出整个实验后才 dispose，不扩大到 App 生命周期。
 * @returns {NavigationLabContext} 布局展示的数据，同时通过 provide 交给实验子页。
 */
export function createNavigationLab() {
    const route = useRoute();
    /** @type {import("vue").Ref<"router" | "container">} query 仅传递实验模式，不用于判断 Native 身份。 */
    const mode = ref(route.query.navMode === "container" ? "container" : "router");
    /** @type {NavigationLabContext["events"]} 当前容器的最近 12 条记录，新的在前。 */
    const events = ref([]);
    let eventSequence = 0;

    /** @param {string} message 可读的事件说明。 @returns {void} */
    function record(message) {
        eventSequence += 1;
        events.value.unshift({ id: eventSequence, time: new Date().toLocaleTimeString(), message });
        events.value = events.value.slice(0, 12);
    }

    const context = { mode, jsEnvironmentId, events, record };
    provide(navigationKey, context);
    onMounted(() => {
        nativeBridge.install();
        record("实验布局挂载，Bridge 响应入口已安装。");
    });
    onUnmounted(() => {
        // Native push 新容器不会卸载这个 Vue 布局；真正离开当前实验路由才清理此入口。
        nativeBridge.dispose();
    });
    return context;
}

/**
 * 各实验子页使用的小型导航封装。每个调用者拥有自己的加载、错误和页面实例标记。
 * @param {string} pageName 生命周期日志中的页面名称。
 * @returns {{instanceId: string, loading: import("vue").Ref<boolean>, error: import("vue").Ref<string>, status: import("vue").Ref<string>, canGoBack: import("vue").ComputedRef<boolean>, openPage: function(string, string): Promise<void>, goBack: function(): void}}
 */
export function useHybridNavigation(pageName) {
    const context = inject(navigationKey);
    if (!context) {
        throw new Error("导航实验页面需要放在 NavigationLabLayout 中。");
    }
    const route = useRoute();
    const router = useRouter();
    pageSequence += 1;
    /** 页面局部状态的观察标记；跨 JS 环境比较时需同时看上方 JS 环境标记。 */
    const instanceId = `page-${pageSequence}`;
    /** @type {import("vue").Ref<boolean>} 一次打开完成前禁用当前页的重复点击。 */
    const loading = ref(false);
    /** @type {import("vue").Ref<string>} Bridge 失败、超时或路由失败时的可读说明。 */
    const error = ref("");
    /** @type {import("vue").Ref<string>} 当前页面最近一次操作的状态。 */
    const status = ref("等待选择跳转方式并打开页面");
    let pageDisposed = false;

    /**
     * 只认本封装在当前 JS 环境创建的历史标记，不用 history.length 猜测能否安全返回。
     * 新容器直达 A/B 或整页刷新后没有匹配标记，H5 返回按钮便改为 replace 实验入口。
     * @type {import("vue").ComputedRef<boolean>}
     */
    const canGoBack = computed(() => {
        // route.fullPath 是响应式依赖；路径或 query 改变时重新读取公开的 RouterHistory.state。
        void route.fullPath;
        return router.options.history.state.hybridNavigationSession === jsEnvironmentId;
    });

    /**
     * 根据当前实验模式打开同一个目标。业务参数放在 params，模式通过目标 URL 的 query 继承。
     * @param {string} path 本实验的目标路径。
     * @param {string} title 新原生容器的导航栏标题。
     * @returns {Promise<void>} 失败转成页面提示，Native 失败不会偷偷降级为路由跳转。
     */
    async function openPage(path, title) {
        if (loading.value || pageDisposed) return;
        loading.value = true;
        error.value = "";
        const mode = context.mode.value;
        const target = { path, query: { ...route.query, navMode: mode } };

        try {
            if (mode === "router") {
                status.value = "正在切换当前容器内的路由…";
                context.record(`${pageName} → Router：${path}`);
                // state 是路由历史的附加数据，不属于 URL，也不需要交给新容器继承。
                const failure = await router.push({
                    ...target,
                    state: { hybridNavigationSession: jsEnvironmentId }
                });
                if (failure) throw new Error("路由切换未完成，请重试。");
            } else {
                status.value = "正在请求 Native 打开新容器…";
                // resolve 负责 hash 路由与 query 编码，URL 再补全来源，避免手工拼接地址。
                const url = new URL(router.resolve(target).href, window.location.href).href;
                context.record(`${pageName} → openWebView：${path}`);
                const result = await nativeBridge.call("openWebView", { url, title });
                if (result?.opened !== true) throw new Error("Native 未确认打开新容器。");
                if (!pageDisposed) {
                    status.value = "新容器已打开；原页面和草稿仍留在当前容器中。";
                    context.record("Native 已确认容器打开，不代表目标 Vue 页面已经挂载。");
                }
            }
        } catch (failure) {
            if (!pageDisposed) {
                error.value = failure instanceof Error ? failure.message : "打开页面失败，请重试。";
                status.value = "本次跳转未完成";
                context.record(`${pageName}：${error.value}`);
            }
        } finally {
            // 路由跳转会卸载原子页，await 后续仍可能继续执行，不能再修改其旧状态。
            if (!pageDisposed) loading.value = false;
        }
    }

    /** H5 返回只处理当前容器中的 Router 历史；关闭原生容器请使用原生导航栏返回。 @returns {void} */
    function goBack() {
        if (loading.value || pageDisposed) return;
        if (canGoBack.value) {
            router.back();
        } else {
            router.replace({ path: homePath, query: { navMode: context.mode.value } });
        }
    }

    onMounted(() => context.record(`${pageName} 挂载（${instanceId}）。`));
    onUnmounted(() => {
        pageDisposed = true;
        context.record(`${pageName} 卸载（${instanceId}），本页局部草稿随实例结束。`);
    });
    return { instanceId, loading, error, status, canGoBack, openPage, goBack };
}
