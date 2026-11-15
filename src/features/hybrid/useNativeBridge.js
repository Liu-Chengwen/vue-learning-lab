// ref 保存会影响界面的状态；生命周期钩子负责让全局入口与页面的存在时间保持一致。
import { onMounted, onUnmounted, ref } from "vue";
// 复用项目已有的有限长度日志，避免在 Bridge 中重复管理时间、ID 和日志裁剪。
import { useEventLog } from "@/composables/useEventLog";
import { nativeBridge } from "@/utils/nativeBridge";

/**
 * 基础实验使用的字符串发送入口；结构化请求由独立的 nativeBridge 工具处理。
 * @typedef {Object} NativeBridgeChannel
 * @property {function(string): void} postMessage 向 Native 提交字符串，不提供处理结果确认。
 */

/**
 * 最近一次通信操作的界面提示。
 * @typedef {Object} BridgeFeedback
 * @property {"info" | "success" | "warning" | "error"} type Element Plus 提示类型。
 * @property {string} message 提示内容；提交成功不代表 Native 已处理。
 */

/**
 * 一条页面内存日志，按时间倒序展示，最多保留 30 条。
 * @typedef {Object} BridgeLogEntry
 * @property {number} id 递增唯一标识，同一秒的记录也不会冲突。
 * @property {string} time 用于展示的本地时间。
 * @property {string} message 操作说明及可选的消息内容。
 */

/**
 * 页面可使用的响应式状态与通信操作；属性说明可随返回类型传递给调用方。
 * @typedef {Object} NativeBridgeState
 * @property {import("vue").Ref<string | null>} nativeMessage 最新接收消息；null 表示尚未收到，空字符串合法。
 * @property {import("vue").Ref<string>} receiveSource 展示来源标签，不验证调用者身份。
 * @property {import("vue").Ref<number>} receiveCount 全局入口收到的有效字符串次数，不包含模拟接收。
 * @property {import("vue").Ref<boolean>} bridgeAvailable 最近一次检测到的通道可调用状态，不代表握手完成。
 * @property {import("vue").Ref<BridgeFeedback>} feedback 最近一次操作的提示类型与内容。
 * @property {import("vue").Ref<BridgeLogEntry[]>} logs 当前页面最近 30 条记录，最新在前。
 * @property {function(): void} clearLogs 清空日志，保留最新消息和接收次数。
 * @property {function(string): boolean} sendMessage 提交原始字符串；返回本地提交结果，不是 Native 回复。
 * @property {function(): void} simulateReceive 模拟页面接收展示，不调用 Swift 或全局入口，也不增加接收次数。
 * @property {function(): boolean} refreshBridge 重新检测 postMessage 是否可调用，并更新通道状态。
 * @property {import("vue").Ref<Object | null>} deviceInfo 原生返回的实际设备信息。
 * @property {import("vue").Ref<string>} greeting 原生返回的带参问候。
 * @property {import("vue").Ref<string>} rpcError 最近一次 Promise 练习的错误信息。
 * @property {import("vue").Ref<string>} rpcStatus 最近一次 Promise 练习的执行状态。
 * @property {import("vue").Ref<boolean>} rpcLoading 是否有一个练习正在执行。
 * @property {import("vue").Ref<Object | null>} rpcResults Promise.all 返回的两组业务结果。
 * @property {import("vue").Ref<number>} pendingCount 还在等待原生响应的请求数量。
 * @property {function(): Promise<void>} requestDeviceInfo 调用 getDeviceInfo。
 * @property {function(string): Promise<void>} requestGreeting 调用 greet 并传入 name。
 * @property {function(): Promise<void>} requestUnknownAction 调用未实现的方法，观察 rejected。
 * @property {function(): Promise<void>} requestTimeout 调用仅调试版提供的无回复分支，等待 5 秒超时。
 * @property {function(string): Promise<void>} requestConcurrent 用 Promise.all 并发调用设备信息和问候。
 */

/**
 * 封装第 04 课的页面级 WebKit 字符串通信逻辑。
 * 在组件 setup 阶段同步调用，每个组件实例创建独立状态，并随该组件注册、清理全局入口。
 * 字符串发送只表示提交成功；Promise 请求则由工具层匹配 id 后完成。本阶段仍不实现就绪握手。
 * @returns {NativeBridgeState} 供页面解构使用的 ref 状态与操作函数。
 * @example
 * const { nativeMessage, sendMessage } = useNativeBridge();
 * sendMessage("你好，我是 Vue Lab");
 */
export function useNativeBridge() {
    /**
     * 最新接收消息；null 表示尚未收到，空字符串表示收到了一条内容为空的合法消息。
     * @type {import("vue").Ref<string | null>}
     */
    const nativeMessage = ref(null);
    /**
     * 当前展示消息的来源标签；只是教学记录，不是身份验证，控制台也能调用全局入口。
     * @type {import("vue").Ref<string>}
     */
    const receiveSource = ref("");
    /**
     * 全局入口收到的有效字符串次数，不计浏览器模拟，也不能证明调用一定来自 Swift。
     * @type {import("vue").Ref<number>}
     */
    const receiveCount = ref(0);
    /**
     * 最近一次通道可调用性检测结果；不会自动轮询，也不是 Native 就绪握手结果。
     * @type {import("vue").Ref<boolean>}
     */
    const bridgeAvailable = ref(false);
    /**
     * 接收、发送及校验共用的界面提示；type 控制 ElAlert 样式，message 提供说明。
     * @type {import("vue").Ref<BridgeFeedback>}
     */
    const feedback = ref({ type: "info", message: "等待 Native 发送消息，也可以先在浏览器中模拟接收。" });
    /**
     * 日志工具：logs 供模板循环，log 添加记录，clear 重命名为 clearLogs；最多保留 30 条。
     * 对外各属性的悬停说明由 NativeBridgeState 提供。
     */
    const { logs, log, clear: clearLogs } = useEventLog(30);
    /**
     * 原有全局接收入口的属性描述符；用于卸载时恢复其值及 writable、enumerable 等属性。
     * @type {PropertyDescriptor | undefined}
     */
    let previousReceiver;

    // Promise 区域的状态与上方字符串接收状态独立；普通操作记录仍共用同一个日志面板。
    /** @type {import("vue").Ref<Object | null>} 最近一次 getDeviceInfo 返回的实际设备信息。 */
    const deviceInfo = ref(null);
    /** @type {import("vue").Ref<string>} 最近一次 greet 返回的问候内容。 */
    const greeting = ref("");
    /** @type {import("vue").Ref<string>} 最近一次练习的错误原因，成功重试前清空。 */
    const rpcError = ref("");
    /** @type {import("vue").Ref<string>} 用户可读的请求中、成功或失败说明。 */
    const rpcStatus = ref("等待调用");
    /** @type {import("vue").Ref<boolean>} 当前练习的提交锁，不等于底层 pending 的条目数。 */
    const rpcLoading = ref(false);
    /** @type {import("vue").Ref<Object | null>} 并发练习完成后的两组结果，按请求用途命名。 */
    const rpcResults = ref(null);
    /** @type {import("vue").Ref<number>} 当前回调表中仍在等待 Native 的请求数。 */
    const pendingCount = ref(0);
    /** 页面退出后，异步 catch/finally 只完成清理，不再更新这个已离开的页面。 */
    let pageDisposed = false;

    /**
     * 调用工具层，并在开始、结束时同步真实等待数；工具层不依赖 Vue 的 ref。
     * await 只暂停此异步函数，浏览器主线程仍能处理点击和渲染。
     * @param {string} action 原生方法名。
     * @param {Object} [params={}] 传入原生的参数。
     * @returns {Promise<unknown>} 与 action 对应的原生业务结果。
     */
    async function callNative(action, params = {}) {
        const request = nativeBridge.call(action, params);
        pendingCount.value = nativeBridge.getPendingCount();
        log("Promise · 发起请求", action);
        try {
            return await request;
        } finally {
            // 成功、失败、超时都经过 finally；并发时每个请求结束都会更新数量。
            if (!pageDisposed) {
                pendingCount.value = nativeBridge.getPendingCount();
            }
        }
    }

    /**
     * 为五个练习统一管理 loading、错误和日志，具体调用步骤仍写在各自的函数中。
     * operation 是传入的异步操作，只有这里调用它才开始执行；不是原生方法名。
     * @param {string} title 当前练习名称。
     * @param {function(): Promise<void>} operation 本次练习的具体步骤。
     * @returns {Promise<void>}
     */
    async function runExperiment(title, operation) {
        if (rpcLoading.value || pageDisposed) {
            return;
        }
        rpcLoading.value = true;
        rpcError.value = "";
        rpcResults.value = null;
        rpcStatus.value = title + " · 等待 Native 回复";
        try {
            await operation();
            if (!pageDisposed) {
                rpcStatus.value = title + " · 成功";
                log("Promise · 练习成功", title);
            }
        } catch (error) {
            if (!pageDisposed) {
                const message = error instanceof Error ? error.message : "Native 调用失败。";
                rpcError.value = message;
                rpcStatus.value = title + " · 失败";
                log("Promise · 练习失败", message);
            }
        } finally {
            if (!pageDisposed) {
                rpcLoading.value = false;
                pendingCount.value = nativeBridge.getPendingCount();
            }
        }
    }

    /** 获取 UIDevice 的实际系统信息；不会使用浏览器模拟值冒充原生返回结果。 */
    async function requestDeviceInfo() {
        await runExperiment("获取设备信息", async () => {
            const result = await callNative("getDeviceInfo");
            if (result === null || typeof result !== "object") {
                throw new Error("Native 设备信息响应必须是对象。");
            }
            if (!pageDisposed) {
                deviceInfo.value = result;
            }
        });
    }

    /**
     * 传入姓名并获取 Swift 生成的问候，保留输入的引号和换行。
     * @param {string} name 姓名参数。
     * @returns {Promise<void>}
     */
    async function requestGreeting(name) {
        await runExperiment("原生问候", async () => {
            const result = await callNative("greet", { name });
            if (result === null || typeof result !== "object" || typeof result.message !== "string") {
                throw new Error("Native 问候响应缺少 message 字符串。");
            }
            if (!pageDisposed) {
                greeting.value = result.message;
            }
        });
    }

    /** 调用不存在的方法，确认 Swift 的失败响应会让对应 Promise 进入 rejected。 */
    async function requestUnknownAction() {
        await runExperiment("未知方法", async () => {
            await callNative("notImplementedAction");
        });
    }

    /** 调试版 Native 故意不回复；5 秒后由工具层清理回调并 reject。 */
    async function requestTimeout() {
        await runExperiment("超时模拟", async () => {
            await callNative("debugNoReply");
        });
    }

    /**
     * 两次 call 先发出，再一起 await；Promise.all 结果顺序与传入数组一致，按 id 匹配由工具层负责。
     * @param {string} name 问候请求使用的姓名。
     * @returns {Promise<void>}
     */
    async function requestConcurrent(name) {
        await runExperiment("并发请求", async () => {
            const deviceRequest = callNative("getDeviceInfo");
            const greetingRequest = callNative("greet", { name });
            const results = await Promise.all([deviceRequest, greetingRequest]);
            if (!pageDisposed) {
                rpcResults.value = { deviceInfo: results[0], greeting: results[1] };
            }
        });
    }

    /**
     * 读取 Native 以 nativeBridge 名称注册的消息处理器；普通浏览器缺少路径时返回 undefined。
     * 名称由双方约定，返回后仍需检查 postMessage，而不是仅检查对象是否存在。
     * @returns {NativeBridgeChannel | undefined} WebKit 通道的预期接口，缺失时为 undefined。
     */
    function getBridge() {
        return window.webkit?.messageHandlers?.nativeBridge;
    }

    /**
     * 重新检测 postMessage 是否可调用，并更新 bridgeAvailable。
     * 在挂载、手动点击和发送前调用，不会持续轮询；检测成功不代表 Swift 已处理过消息。
     * @returns {boolean} 本次检测到的通道可调用状态。
     */
    function refreshBridge() {
        bridgeAvailable.value = typeof getBridge()?.postMessage === "function";
        return bridgeAvailable.value;
    }

    /**
     * 处理 Native → H5 消息：Swift 经 evaluateJavaScript 调用全局入口后进入此函数。
     * 仅接受字符串；有效消息会更新展示、来源、计数、反馈和日志，其他值只触发警告。
     * @param {unknown} message 全局入口传入的值；本课约定为字符串，运行时仍校验类型。
     * @returns {void}
     */
    function receiveNativeMessage(message) {
        // 此阶段与 Swift 的 String 协议保持一致；不把对象隐式转成字符串隐藏契约错误。
        if (typeof message !== "string") {
            feedback.value = { type: "warning", message: "接收失败：本课只接受 Native 传入的字符串。" };
            log("Native → H5 · 已拒绝非字符串消息");
            return;
        }
        // JavaScript 中通过 .value 读写 ref；修改它会让依赖该状态的 Vue 模板安排更新。
        // 模板访问这些顶层 ref 时会自动解包，所以页面不需要写 nativeMessage.value。
        nativeMessage.value = message;
        receiveSource.value = "Native";
        receiveCount.value += 1;
        feedback.value = { type: "success", message: "H5 已通过全局入口收到 Native 消息。" };
        log("Native → H5 · 收到字符串", message);
    }

    /**
     * 处理 H5 → Native：校验并将原始字符串交给 WebKit，保留有效输入的空格与换行。
     * 返回值只描述本地校验和同步提交，不能确认 Swift 已处理，也不是 Promise。
     * @param {string} text 要提交的消息；拒绝空字符串、纯空白或运行时传入的非字符串。
     * @returns {boolean} 校验通过且 postMessage 未同步抛错时为 true，否则为 false。
     */
    function sendMessage(text) {
        // trim 只用于判断是否全是空白；真正发送时仍用 text，保留用户原文的空格与换行。
        if (typeof text !== "string" || !text.trim()) {
            feedback.value = { type: "warning", message: "请先输入一条非空消息。" };
            return false;
        }
        // 发送时重新取通道状态，避免仅依赖进入页面时的旧检测结果。
        refreshBridge();
        if (!bridgeAvailable.value) {
            feedback.value = {
                type: "warning",
                message: "当前没有可用的 nativeBridge 通道。请在注册该处理器的 WKWebView 中打开此页面。"
            };
            log("H5 → Native · 未发送：nativeBridge 不可用");
            return false;
        }
        try {
            // 以 bridge.postMessage(...) 的形式调用，保留该原生方法需要的接收者（this）。
            // 不将 postMessage 单独解构后调用，也不把这次无同步异常的提交当作 Native 已收到的确认。
            getBridge().postMessage(text);
            feedback.value = { type: "info", message: "已提交 WebKit 通道，尚未确认 Native 处理结果" };
            log("H5 → Native · 已提交 WebKit 通道", text);
            return true;
        } catch (error) {
            // 这里只能捕获调用过程中同步抛出的异常，无法捕获提交之后 Swift 内部的异步处理失败。
            feedback.value = {
                type: "error",
                message: "提交失败：" + (error instanceof Error ? error.message : "WebKit 通道调用异常。")
            };
            log("H5 → Native · 提交失败", feedback.value.message);
            return false;
        }
    }

    /**
     * 模拟接收展示，让普通浏览器也能练习 Vue 状态更新。
     * 不调用全局入口或 Swift，不伪造 WebKit 通道，不增加真实入口计数，来源标记为浏览器模拟。
     * @returns {void}
     */
    function simulateReceive() {
        // 直接更新展示状态，明确标注来源；不伪造 window.webkit，也不累计真实入口调用次数。
        nativeMessage.value = "你好，我是 Swift（浏览器模拟）";
        receiveSource.value = "浏览器模拟";
        feedback.value = { type: "info", message: "浏览器模拟接收完成；请在 HybridLab 中验证真实的 Native 调用。" };
        log("浏览器模拟 · Native → H5", nativeMessage.value);
    }

    // <script setup> 和本函数中的局部方法不会自动成为 window 属性。
    // 页面挂载后显式暴露入口，Swift 才能用 window.receiveNativeMessage(...) 找到它。
    onMounted(() => {
        pageDisposed = false;
        nativeBridge.install();
        previousReceiver = Object.getOwnPropertyDescriptor(window, "receiveNativeMessage");
        window.receiveNativeMessage = receiveNativeMessage;
        refreshBridge();
        log("H5 · 全局接收入口已注册");
    });

    // 离开路由导致页面卸载时，移除全局对象对本页面闭包的引用，避免保留已经失效的页面状态。
    onUnmounted(() => {
        // 先阻止异步更新，再拒绝 pending 请求并清定时器，最后清理旧的字符串接收入口。
        pageDisposed = true;
        nativeBridge.dispose();
        // 先核对当前函数是否仍由本实例注册：如果别人后来替换了入口，这里不能误删或覆盖它。
        if (window.receiveNativeMessage !== receiveNativeMessage) return;
        // 原来存在属性时恢复整个描述符；原来不存在时删除此次新增的入口。
        if (previousReceiver) Object.defineProperty(window, "receiveNativeMessage", previousReceiver);
        else delete window.receiveNativeMessage;
    });

    // 页面通过返回对象显式取得状态与操作；字符串通信与 Promise 练习分别展示，避免混淆结果含义。
    // 返回 ref 本身而不是它们的 .value，使页面解构后仍能保持响应式关联。
    return {
        nativeMessage,
        receiveSource,
        receiveCount,
        bridgeAvailable,
        feedback,
        logs,
        clearLogs,
        sendMessage,
        simulateReceive,
        refreshBridge,
        deviceInfo,
        greeting,
        rpcError,
        rpcStatus,
        rpcLoading,
        rpcResults,
        pendingCount,
        requestDeviceInfo,
        requestGreeting,
        requestUnknownAction,
        requestTimeout,
        requestConcurrent
    };
}
