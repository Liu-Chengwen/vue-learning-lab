import { computed, onScopeDispose, ref, shallowRef } from "vue";
import { defineStore } from "pinia";
import { backendApi, clearBackendSession, subscribeSessionInvalidated } from "@/services/backendLabService";

/**
 * 共享登录身份属于Pinia，Session与密码都不写入localStorage。
 * revision在身份变化时递增，页面可据此取消旧列表、关闭表单并清理上一身份的数据。
 */
export const useBackendAuthStore = defineStore("backend-auth", () => {
    const user = shallowRef(null);
    const initialized = ref(false);
    const loading = ref(false);
    const error = shallowRef(null);
    const revision = ref(0);
    const isAdmin = computed(() => user.value?.role === "ADMIN");
    let controller;
    let operationVersion = 0;
    let initialization;
    let disposed = false;

    function setIdentity(identity) {
        user.value = identity;
        initialized.value = true;
        revision.value += 1;
    }

    function clearIdentity() {
        operationVersion += 1;
        controller?.abort();
        initialization = null;
        loading.value = false;
        error.value = null;
        clearBackendSession();
        setIdentity(null);
    }

    const unsubscribe = subscribeSessionInvalidated(clearIdentity);

    async function perform(operation, { signal, anonymousIsNormal = false } = {}) {
        if (disposed) return undefined;
        controller?.abort();
        const currentController = new AbortController();
        controller = currentController;
        const version = ++operationVersion;
        const cancel = () => {
            currentController.abort();
            if (version === operationVersion) {
                operationVersion += 1;
                loading.value = false;
            }
        };
        signal?.addEventListener("abort", cancel, { once: true });
        loading.value = true;
        error.value = null;
        if (signal?.aborted) {
            cancel();
            signal.removeEventListener("abort", cancel);
            return undefined;
        }
        try {
            const result = await operation(currentController.signal);
            if (disposed || currentController.signal.aborted || version !== operationVersion) return undefined;
            return result;
        } catch (reason) {
            if (
                disposed ||
                currentController.signal.aborted ||
                version !== operationVersion ||
                reason?.name === "AbortError"
            ) {
                return undefined;
            }
            if (anonymousIsNormal && reason.status === 401) {
                setIdentity(null);
                return null;
            }
            error.value = reason instanceof Error ? reason : new Error(String(reason));
            throw error.value;
        } finally {
            signal?.removeEventListener("abort", cancel);
            if (version === operationVersion) loading.value = false;
        }
    }

    function initialize({ signal, force = false } = {}) {
        if (initialized.value && !force) return Promise.resolve(user.value);
        // 同一个初始化共享store拥有的请求；有显式signal的页面独立建立生命周期。
        if (initialization && !force && !signal) return initialization;
        const pending = perform(
            async (requestSignal) => {
                const identity = await backendApi.me({ signal: requestSignal });
                if (!requestSignal.aborted && !disposed) setIdentity(identity);
                return identity;
            },
            { signal, anonymousIsNormal: true }
        );
        initialization = pending;
        pending
            .finally(() => {
                if (initialization === pending) initialization = null;
            })
            .catch(() => {});
        return pending;
    }

    async function login(body, options = {}) {
        return perform(async (signal) => {
            const identity = await backendApi.login(body, { signal });
            if (!signal.aborted && !disposed) setIdentity(identity);
            return identity;
        }, options);
    }

    async function register(body, options = {}) {
        // 注册只创建USER资料+凭证，不建立登录身份；成功后由页面切回登录表单。
        return perform((signal) => backendApi.register(body, { signal }), options);
    }

    async function logout(options = {}) {
        return perform(async (signal) => {
            await backendApi.logout({ signal });
            if (!signal.aborted && !disposed) setIdentity(null);
            return null;
        }, options);
    }

    onScopeDispose(() => {
        disposed = true;
        operationVersion += 1;
        controller?.abort();
        unsubscribe();
    });

    return { user, initialized, loading, error, isAdmin, revision, initialize, login, register, logout, clearIdentity };
});
