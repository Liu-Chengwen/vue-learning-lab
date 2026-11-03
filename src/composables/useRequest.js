import { getCurrentScope, onScopeDispose, ref, shallowRef } from "vue";

/**
 * 管理“只接受最近一次结果”的异步状态，供远程选择器等可重复查询场景复用。
 * request(...业务参数, { signal }) 应返回 Promise，并尽量响应 AbortSignal。
 * execute 成功返回结果；已取消或过期的调用返回 undefined；当前调用的真实错误继续抛给页面。
 * data 保留最后一次成功值，新请求开始只清空 error；loading/error/data 都有明确请求归属。
 */
export function useRequest(request) {
    // 只侦听结果整体替换，不在通用请求层把响应对象递归包装成响应式对象。
    const data = shallowRef(null);
    const loading = ref(false);
    const error = shallowRef(null);
    let controller;
    let version = 0;
    function cancel() {
        // 先作废序号，再 abort：即便底层不支持取消，晚返回的结果也无法写入当前状态。
        version += 1;
        controller?.abort();
        loading.value = false;
    }
    async function execute(...args) {
        controller?.abort();
        controller = new AbortController();
        const current = ++version;
        loading.value = true;
        error.value = null;
        try {
            const result = await request(...args, { signal: controller.signal });
            // await 之后的世界可能已改变，不能仅凭“请求成功”就覆盖新查询的数据。
            if (current !== version) return undefined;
            data.value = result;
            return result;
        } catch (reason) {
            // 用户主动取消不是页面错误；旧请求的失败同样不能污染新请求。
            if (current !== version || reason?.name === "AbortError") return undefined;
            // 调用方有可能抛字符串等值，这里统一错误形态，页面可以稳定读取 message。
            const requestError = reason instanceof Error ? reason : new Error(String(reason ?? "请求失败"));
            error.value = requestError;
            throw requestError;
        } finally {
            // 旧请求先结束时，新请求可能仍在运行，因此只有当前序号能关闭 loading。
            if (current === version) loading.value = false;
        }
    }
    // 在组件/EffectScope 中使用会自动清理；无作用域时由使用方负责调用 cancel。
    if (getCurrentScope()) onScopeDispose(cancel);
    return { data, loading, error, execute, cancel };
}
