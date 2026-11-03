/**
 * 把计时器和 DOM 监听封装成可组合逻辑：状态由每次调用创建，副作用由所属组件作用域释放。
 * 需在组件 setup 的同步阶段调用，以便 onMounted/onScopeDispose 关联到正确的上下文。
 */
import { ref, onMounted, onScopeDispose } from "vue";

/**
 * @param {(message: string) => void} log 外部提供的记录函数，不把观察组件耦合进此 composable。
 * @returns {{ seconds: import("vue").Ref<number> }} 可直接供模板读取的计时状态。
 * 只处理真实卸载/作用域停止；KeepAlive 停用不会停止作用域，需要时应另加激活/停用策略。
 */
export function useScopedTicker(log) {
    const seconds = ref(0);
    let interval;
    // 保存同一个回调引用，清理时才能精确移除本次注册的监听器。
    const resize = () => log("window resize：仍在监听。");
    onMounted(() => {
        // DOM 环境建立后再访问 window；setup 本身只准备状态与注册生命周期。
        interval = setInterval(() => {
            seconds.value++;
        }, 1000);
        window.addEventListener("resize", resize);
        log("composable：开始计时，并添加 resize 监听。");
    });
    onScopeDispose(() => {
        // Vue 会停止组件作用域里的响应式副作用，但不会替业务清理任意定时器或 DOM 监听。
        // clearInterval/removeEventListener 对尚未启动或已清理的资源重复调用也是安全的。
        clearInterval(interval);
        window.removeEventListener("resize", resize);
        log("onScopeDispose：计时器与 resize 监听已清理。");
    });
    return { seconds };
}
