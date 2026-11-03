import { defineStore } from "pinia";
import { ref, watch } from "vue";

// localStorage 的键同时包含业务名与结构版本，避免与其他 store 混用。
// 将来修改保存结构时，可通过升级版本或显式迁移兼容旧数据。
const STORAGE_KEY = "vue-lab:preferences:v1";

/**
 * 外观偏好使用 Pinia setup store：同一个 Pinia 实例内，调用者共享这一份状态。
 * App.vue 通过 ConfigProvider 使用 density，main.css 通过 html 上的 class/data-accent 使用颜色。
 * 这是浏览器端实现，直接使用 document/localStorage；SSR 项目需要另行划分客户端副作用。
 */
export const usePreferencesStore = defineStore("preferences", () => {
    // 只在 store 第一次实例化时恢复偏好。JSON.parse 可能因旧数据损坏而抛错，
    // 存储本身也可能被浏览器策略禁用；两种情况都允许使用默认外观继续启动。
    let saved = {};
    try {
        saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
    } catch {
        // 存储损坏不影响应用启动，后续操作会重新保存。
    }
    // JSON 数据不可信：只接受这里认识的枚举值，不能直接把任意保存值应用到界面。
    // ref 在此函数内部读写需要 .value；Pinia store 实例上访问这些状态会自动解包。
    const theme = ref(saved.theme === "dark" ? "dark" : "light");
    const accent = ref(["green", "blue", "violet"].includes(saved.accent) ? saved.accent : "green");
    const density = ref(["default", "small", "large"].includes(saved.density) ? saved.density : "default");
    // 保存失败只影响跨刷新恢复，本次运行中的响应式状态和主题切换仍然有效。
    const storageError = ref("");
    // action 集中约束输入范围，页面只表达“切换到什么”，无需重复校验规则。
    // theme 对无效输入回退 light；另外两个 action 对无效值保持原状态。
    const setTheme = (value) => {
        theme.value = value === "dark" ? "dark" : "light";
    };
    const setAccent = (value) => {
        if (["green", "blue", "violet"].includes(value)) accent.value = value;
    };
    const setDensity = (value) => {
        if (["default", "small", "large"].includes(value)) density.value = value;
    };

    // 数组表示同时侦听三个独立 ref，并非侦听一个普通数组的内部变化。
    // 它们保存的都是字符串，因此不需要 deep；默认调度也会合并同一轮同步修改。
    watch(
        [theme, accent, density],
        () => {
            // Vue 的逻辑组件树与 CSS 的实际 DOM 继承不同：ElDialog 等 Teleport 到 body 后，
            // 仍是 html 的后代，所以把全局主题放在 html 可以覆盖这些弹出层。
            document.documentElement.classList.toggle("dark", theme.value === "dark");
            document.documentElement.dataset.accent = accent.value;
            try {
                localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify({ theme: theme.value, accent: accent.value, density: density.value })
                );
                storageError.value = "";
            } catch {
                storageError.value = "当前浏览器无法保存偏好，本次切换仍然有效。";
            }
        },
        // 初始化时也执行：把恢复的主题同步到 DOM，并保存经过枚举校验后的值。
        // 不加 immediate，初次打开页面要等用户修改偏好才会应用保存的外观。
        { immediate: true }
    );
    // setup store 需要返回希望被外部使用的 state/action；未返回的 saved 只是初始化局部变量。
    return { theme, accent, density, storageError, setTheme, setAccent, setDensity };
});
