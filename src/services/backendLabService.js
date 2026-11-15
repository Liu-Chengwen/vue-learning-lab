const apiPrefix = "/api/v1";
const invalidatedListeners = new Set();
let sessionVersion = 0;
let csrfVersion = 0;
let csrfToken = null;
let csrfTask = null;

/** 统一保留 HTTP 状态与字段错误，页面可以按状态和字段展示，不能把所有失败当成网络错误。 */
export class BackendApiError extends Error {
    constructor(status, body = {}) {
        super(body?.message || `接口请求失败（HTTP ${status}）`);
        this.name = "BackendApiError";
        this.status = status;
        this.body = body || {};
        this.fieldErrors = body?.fieldErrors || {};
    }
}

function aborted() {
    return new DOMException("请求已取消或登录身份已变化", "AbortError");
}

function checkSignal(signal) {
    if (signal?.aborted) throw aborted();
}

function invalidateCsrf() {
    csrfVersion += 1;
    csrfToken = null;
    csrfTask?.controller.abort();
    csrfTask = null;
}

/** 退出、重新登录和确认会话失效后，旧请求结果不能进入新身份的页面。 */
export function clearBackendSession() {
    sessionVersion += 1;
    invalidateCsrf();
}

export function subscribeSessionInvalidated(listener) {
    invalidatedListeners.add(listener);
    return () => invalidatedListeners.delete(listener);
}

function protocolError(message) {
    return new BackendApiError(0, { code: "INVALID_RESPONSE", message });
}

async function rawRequest(path, { method = "GET", body, signal, headers = {} } = {}, version = sessionVersion) {
    checkSignal(signal);
    let response;
    try {
        response = await fetch(path, {
            method,
            credentials: "same-origin",
            signal,
            headers: {
                Accept: "application/json",
                ...(body === undefined ? {} : { "Content-Type": "application/json" }),
                ...headers
            },
            ...(body === undefined ? {} : { body: JSON.stringify(body) })
        });
    } catch (error) {
        checkSignal(signal);
        if (error?.name === "AbortError") throw error;
        throw new BackendApiError(0, {
            code: "NETWORK_ERROR",
            message: "无法连接后端，请确认 Spring Boot 与前端代理已经启动。"
        });
    }
    checkSignal(signal);
    if (version !== null && version !== sessionVersion) throw aborted();
    let result = null;
    if (response.status !== 204) {
        if (!response.headers.get("content-type")?.includes("application/json")) {
            throw protocolError("接口未返回 JSON，请检查后端地址与前端代理配置。");
        }
        try {
            result = await response.json();
        } catch (error) {
            checkSignal(signal);
            if (error?.name === "AbortError") throw error;
            throw protocolError("接口返回的 JSON 无法解析，请检查后端响应。");
        }
    }
    checkSignal(signal);
    if (version !== null && version !== sessionVersion) throw aborted();
    if (!response.ok) {
        const error = new BackendApiError(response.status, result);
        if (version !== null && response.status === 401) {
            // 密码错误不会撤销浏览器原有的其他登录态；受保护接口的401才表示当前身份失效。
            if (path === `${apiPrefix}/auth/login`) invalidateCsrf();
            else {
                clearBackendSession();
                for (const listener of invalidatedListeners) listener(error);
            }
        } else if (version !== null && response.status === 403) {
            // 403也可能只是权限不足，不能据此把用户误判为已退出。
            invalidateCsrf();
        }
        throw error;
    }
    return result;
}

/**
 * 并发写操作共享一次CSRF获取，避免首次无Cookie时创建互相覆盖的Session。
 * 每位等待者拥有自己的取消；只有最后一位也取消时才终止共享网络请求。
 */
async function ensureCsrf({ signal } = {}) {
    checkSignal(signal);
    if (csrfToken) return csrfToken;
    if (!csrfTask) {
        const task = { controller: new AbortController(), waiters: 0, done: false, version: csrfVersion };
        task.promise = rawRequest(`${apiPrefix}/auth/csrf`, { signal: task.controller.signal })
            .then((token) => {
                if (task.controller.signal.aborted || task.version !== csrfVersion) throw aborted();
                if (
                    !token ||
                    typeof token.headerName !== "string" ||
                    !/^[a-zA-Z0-9-]+$/.test(token.headerName) ||
                    typeof token.token !== "string" ||
                    !token.token
                )
                    throw protocolError("后端没有返回有效的 CSRF token。");
                csrfToken = token;
                return token;
            })
            .finally(() => {
                task.done = true;
                if (csrfTask === task) csrfTask = null;
            });
        csrfTask = task;
    }
    const task = csrfTask;
    task.waiters += 1;
    return new Promise((resolve, reject) => {
        let finished = false;
        const finish = (callback, value) => {
            if (finished) return;
            finished = true;
            signal?.removeEventListener("abort", onAbort);
            task.waiters -= 1;
            if (!task.done && task.waiters === 0) {
                task.controller.abort();
                if (csrfTask === task) csrfTask = null;
            }
            callback(value);
        };
        const onAbort = () => finish(reject, aborted());
        signal?.addEventListener("abort", onAbort, { once: true });
        task.promise.then(
            (value) => finish(resolve, value),
            (error) => finish(reject, error)
        );
        // 覆盖检查signal与注册监听之间的极短取消窗口。
        if (signal?.aborted) onAbort();
    });
}

async function request(path, options = {}) {
    const version = sessionVersion;
    const method = options.method || "GET";
    if (["GET", "HEAD", "OPTIONS"].includes(method)) return rawRequest(path, options, version);
    const token = await ensureCsrf(options);
    checkSignal(options.signal);
    if (version !== null && version !== sessionVersion) throw aborted();
    // 不自动重试写请求：即便客户端未收到响应，服务端也可能已提交事务。
    return rawRequest(path, { ...options, headers: { [token.headerName]: token.token } }, version);
}

function queryString(query = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
    }
    const text = params.toString();
    return text ? `?${text}` : "";
}

function authResponse(value) {
    if (
        !value ||
        !Number.isSafeInteger(value.id) ||
        value.id <= 0 ||
        typeof value.username !== "string" ||
        typeof value.displayName !== "string" ||
        !["ADMIN", "USER"].includes(value.role)
    )
        throw protocolError("后端没有返回有效的登录身份。");
    return { id: value.id, username: value.username, displayName: value.displayName, role: value.role };
}

/** API只负责协议与传输；身份归Pinia，分页筛选和表单草稿归页面/组件。 */
export const backendApi = {
    csrf: ensureCsrf,
    async me(options) {
        return authResponse(await request(`${apiPrefix}/auth/me`, options));
    },
    async login(body, options = {}) {
        clearBackendSession();
        const version = sessionVersion;
        try {
            const user = authResponse(await request(`${apiPrefix}/auth/login`, { ...options, method: "POST", body }));
            // Spring登录后换Session ID并清除旧CSRF；下一次写操作重新获取。
            clearBackendSession();
            return user;
        } finally {
            // 请求取消时服务端也可能已完成登录；当前动作的旧token同样不能继续使用。
            // 若另一次认证已开始，不让旧动作的清理取消新动作正在获取的token。
            if (version === sessionVersion) invalidateCsrf();
        }
    },
    register: (body, options) => request(`${apiPrefix}/auth/register`, { ...options, method: "POST", body }),
    async logout(options = {}) {
        clearBackendSession();
        const version = sessionVersion;
        try {
            await request(`${apiPrefix}/auth/logout`, { ...options, method: "POST" });
            clearBackendSession();
        } finally {
            if (version === sessionVersion) invalidateCsrf();
        }
    },
    async listUsers(query, options) {
        const page = await request(`${apiPrefix}/users${queryString(query)}`, options);
        if (
            !page ||
            !Array.isArray(page.items) ||
            !Number.isSafeInteger(page.total) ||
            page.total < 0 ||
            !Number.isInteger(page.page) ||
            page.page < 1 ||
            !Number.isInteger(page.size) ||
            page.size < 1
        ) {
            throw protocolError("后端没有返回有效的用户分页数据。");
        }
        return page;
    },
    getUser: (id, options) => request(`${apiPrefix}/users/${encodeURIComponent(id)}`, options),
    createUser: (body, options) => request(`${apiPrefix}/users`, { ...options, method: "POST", body }),
    updateUser: (id, body, options) =>
        request(`${apiPrefix}/users/${encodeURIComponent(id)}`, { ...options, method: "PUT", body }),
    changeUserStatus: (id, status, options) =>
        request(`${apiPrefix}/users/${encodeURIComponent(id)}/status`, {
            ...options,
            method: "PATCH",
            body: { status }
        }),
    deleteUser: (id, options) =>
        request(`${apiPrefix}/users/${encodeURIComponent(id)}`, { ...options, method: "DELETE" }),
    fetchOutbox: (options) => request(`${apiPrefix}/events/outbox`, options),
    fetchNotifications: (options) => request(`${apiPrefix}/notifications`, options),
    fetchAuditLogs: (options) => request(`${apiPrefix}/audit-logs?limit=20`, options),
    // 健康状态是公开数据，不随登录身份作废；仍然受组件传入的AbortSignal约束。
    health: (options) => rawRequest("/backend-health", options, null)
};
