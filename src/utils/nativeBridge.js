/**
 * H5 发给 Swift 的一次能力请求。id 用来匹配结果，action 决定执行什么，params 携带参数。
 * @typedef {Object} BridgeRequest
 * @property {string} id 本次请求的唯一标识。
 * @property {string} action 原生方法名，例如 getDeviceInfo、getLocation 或 openWebView。
 * @property {Object} params 可由 WebKit 传递的简单对象。
 */

/**
 * Swift 通过 window.HybridBridge.receiveResponse 传回的结果。
 * @typedef {Object} BridgeResponse
 * @property {string} id 必须与原请求的 id 一致。
 * @property {boolean} ok true 表示成功，false 表示失败。
 * @property {unknown} [data] 成功时的业务数据。
 * @property {string} [error] 失败时的错误说明。
 */

/**
 * 暂存一个 Promise 的完成函数，以及它对应的超时定时器。
 * @typedef {Object} PendingRequest
 * @property {function(unknown): void} resolve 完成成功结果。
 * @property {function(Error): void} reject 完成失败结果。
 * @property {ReturnType<typeof setTimeout>} timer 本次调用的超时定时器。
 */

/**
 * 单次调用的等待选项，不属于发送给 Native 的业务参数。
 * @typedef {Object} BridgeCallOptions
 * @property {number} [timeoutMs=5000] 最大等待毫秒数；定位需要留出用户阅读授权弹窗的时间。
 */

/** 未指定选项时最多等待 5 秒；发送成功和收到业务结果仍是两个不同的判断。 */
const defaultTimeoutMilliseconds = 5000;
/** @type {Map<string, PendingRequest>} 仅保存尚未完成的请求，不保存已经完成的历史。 */
const pending = new Map();
/** 递增序号不在离开路由时重置，避免同一 JS 环境重新进入页面后复用旧请求 ID。 */
let sequence = 0;
/** @type {{ receiveResponse: typeof receiveResponse } | null} 当前安装到 window 的入口对象。 */
let installedEndpoint = null;
/** @type {PropertyDescriptor | undefined} 安装之前的属性，用于退出页面时恢复。 */
let previousEndpoint;

/**
 * 发起 H5 → Native 请求，并把异步消息包装成 Promise。
 * 发送不会直接产生业务结果；只有收到匹配 id 的响应、调用失败、超时或页面退出才会结束 Promise。
 * @param {string} action 要调用的原生方法。
 * @param {Object} [params={}] 要传递的参数，不能包含函数或循环引用等 WebKit 不支持的值。
 * @param {BridgeCallOptions} [options={}] 当前调用的等待设置，不改变其他请求的默认超时。
 * @returns {Promise<unknown>} 原生成功时的 data，或包含失败原因的 rejected Promise。
 */
function call(action, params = {}, options = {}) {
    return new Promise((resolve, reject) => {
        // 第一步：检查通道、参数和当前页面是否已经注册响应入口。
        const handler = window.webkit?.messageHandlers?.nativeBridge;
        if (typeof handler?.postMessage !== "function") {
            reject(new Error("Native Bridge 不可用，请在 HybridLab 中打开本页。"));
            return;
        }
        if (installedEndpoint === null) {
            reject(new Error("Bridge 响应入口尚未安装，请先进入 Hybrid 实验页面。"));
            return;
        }
        if (typeof action !== "string" || action.trim() === "") {
            reject(new Error("Native 方法名不能为空。"));
            return;
        }
        if (params === null || typeof params !== "object" || Array.isArray(params)) {
            reject(new Error("Native 参数必须是一个对象。"));
            return;
        }
        if (options === null || typeof options !== "object" || Array.isArray(options)) {
            reject(new Error("Native 调用选项必须是一个对象。"));
            return;
        }
        const timeoutMs = options.timeoutMs ?? defaultTimeoutMilliseconds;
        // setTimeout 使用有范围限制的毫秒数。拒绝无效输入，避免计时器意外变成立即超时。
        if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2147483647) {
            reject(new Error("timeoutMs 必须是 1 到 2147483647 之间的整数毫秒数。"));
            return;
        }

        // 第二步：先登记回调，再发送。即使原生很快回复，也能通过 id 找到等待中的 Promise。
        sequence += 1;
        const id = `req-${Date.now()}-${sequence}`;
        const timer = setTimeout(() => {
            pending.delete(id);
            reject(new Error(`Native 调用超时（${timeoutMs / 1000} 秒）：${action}`));
        }, timeoutMs);
        pending.set(id, { resolve, reject, timer });

        // 第三步：真正跨过 WebKit 边界，保留方法接收者，避免丢失 postMessage 的 this。
        try {
            handler.postMessage({ id, action, params });
        } catch (error) {
            // 同步提交失败时，不能继续保留一个永远不会得到回复的回调和定时器。
            clearTimeout(timer);
            pending.delete(id);
            const failure = error instanceof Error ? error : new Error("Native 消息提交失败。");
            reject(failure);
        }
    });
}

/**
 * Native → H5 的结构化响应入口。回复顺序可以不同于发送顺序，匹配只看 id。
 * @param {BridgeResponse} response Swift 序列化后传入的对象。
 * @returns {void}
 */
function receiveResponse(response) {
    if (response === null || typeof response !== "object" || typeof response.id !== "string") {
        return;
    }
    const task = pending.get(response.id);
    if (!task) {
        // 超时后的迟到回复、重复回复或旧页面的回复，都不能再完成一个新的 Promise。
        return;
    }

    // 先清理再完成 Promise；resolve/reject 后，调用方的 await 代码会在后续微任务中继续。
    clearTimeout(task.timer);
    pending.delete(response.id);
    if (response.ok === true) {
        task.resolve(response.data);
    } else if (response.ok === false) {
        const message = typeof response.error === "string" ? response.error : "Native 调用失败。";
        task.reject(new Error(message));
    } else {
        task.reject(new Error("Native 响应格式错误：ok 必须是布尔值。"));
    }
}

/**
 * 页面挂载时安装全局入口。这里不自动发握手，也不把 Vue 组件的方法直接暴露给 Swift。
 * 当前挂载的 Hybrid 实验是唯一的生命周期所有者；导航实验由父布局覆盖其全部子页，
 * 其他实验由各自的页面管理，实验之间通过路由切换，不同时拥有入口。
 * 业务代码只需调用 nativeBridge.call。
 * @returns {void}
 */
function install() {
    if (installedEndpoint !== null) {
        return;
    }
    previousEndpoint = Object.getOwnPropertyDescriptor(window, "HybridBridge");
    installedEndpoint = { receiveResponse };
    window.HybridBridge = installedEndpoint;
}

/**
 * 离开页面时取消所有等待、清除定时器，并恢复原有全局属性；不会删除后来由别人替换的入口。
 * @returns {void}
 */
function dispose() {
    for (const task of pending.values()) {
        clearTimeout(task.timer);
        task.reject(new Error("Hybrid 页面已退出，Native 请求已取消。"));
    }
    pending.clear();
    if (installedEndpoint !== null && window.HybridBridge === installedEndpoint) {
        if (previousEndpoint) {
            Object.defineProperty(window, "HybridBridge", previousEndpoint);
        } else {
            delete window.HybridBridge;
        }
    }
    installedEndpoint = null;
    previousEndpoint = undefined;
}

/**
 * 读取真实等待数量。工具层不依赖 Vue，页面在请求开始和结束时把数量同步给自己的 ref。
 * @returns {number} 目前仍在回调表中的请求数。
 */
function getPendingCount() {
    return pending.size;
}

/**
 * Promise Bridge 工具；call 是业务调用入口，其余方法供当前实验页管理生命周期与展示等待数。
 * @type {{call: typeof call, install: typeof install, dispose: typeof dispose, getPendingCount: typeof getPendingCount}}
 */
export const nativeBridge = { call, install, dispose, getPendingCount };
