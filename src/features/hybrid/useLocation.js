import { onMounted, onUnmounted, ref } from "vue";
import { nativeBridge } from "@/utils/nativeBridge";

/**
 * Swift 单次定位成功后返回的业务数据；数值来自 Core Location，不由浏览器推算。
 * @typedef {Object} NativeLocation
 * @property {number} latitude 纬度，范围为 -90 到 90 度。
 * @property {number} longitude 经度，范围为 -180 到 180 度。
 * @property {number} horizontalAccuracy 水平精度，单位为米；数值越小，估计范围越小。
 * @property {string} timestamp 系统采集这次位置的时间，采用 ISO 8601 字符串。
 */

/**
 * 定位页面持有的临时状态与操作，离开路由后不保存。
 * @typedef {Object} LocationState
 * @property {import("vue").Ref<NativeLocation | null>} location 最近一次成功定位，尚未成功时为 null。
 * @property {import("vue").Ref<boolean>} loading 是否正在等待原生授权或定位结果。
 * @property {import("vue").Ref<string>} error 最近一次失败原因，每次重试前清空。
 * @property {import("vue").Ref<string>} status 当前操作状态，供页面展示与辅助阅读工具播报。
 * @property {import("vue").Ref<boolean>} bridgeAvailable 最近检测到的 WebKit 通道状态，不代表定位已授权。
 * @property {function(): Promise<void>} requestLocation 主动调用 getLocation，并保存成功结果或错误。
 */

/**
 * 为定位实验管理页面状态；请求匹配、超时与响应入口仍由共享 nativeBridge 工具负责。
 * 在组件 setup 中调用，随该路由挂载和卸载管理 Bridge，避免页面离开后继续更新旧状态。
 * @returns {LocationState} 可直接在 script setup 中解构使用的 ref 与请求函数。
 */
export function useLocation() {
    /** @type {import("vue").Ref<NativeLocation | null>} 最近一次成功结果；重试失败时仍保留并明确标注。 */
    const location = ref(null);
    /** @type {import("vue").Ref<boolean>} 一次请求期间禁用重复点击，防止并发弹出授权或争用定位服务。 */
    const loading = ref(false);
    /** @type {import("vue").Ref<string>} Promise rejected 后用于页面展示的错误说明。 */
    const error = ref("");
    /** @type {import("vue").Ref<string>} 当前状态只描述本次操作，不代替系统的定位授权状态。 */
    const status = ref("等待获取定位");
    /** @type {import("vue").Ref<boolean>} 挂载和点击时检测通道；普通浏览器中通常为 false。 */
    const bridgeAvailable = ref(false);
    /** 页面卸载后，catch/finally 仍可能执行；这个标记阻止它们修改已经离开的页面。 */
    let pageDisposed = false;

    /**
     * 只在用户点击时请求位置，挂载页面不会自动触发 iOS 授权弹窗。
     * await 等待的是匹配请求 id 的响应，不是 postMessage 的同步返回值。
     * @returns {Promise<void>} 错误在本函数中转换为页面状态，供用户查看并重试。
     */
    async function requestLocation() {
        if (loading.value || pageDisposed) {
            return;
        }
        loading.value = true;
        error.value = "";
        status.value = "等待原生授权或定位结果…";
        bridgeAvailable.value = typeof window.webkit?.messageHandlers?.nativeBridge?.postMessage === "function";

        try {
            // 定位还可能等待用户处理授权，因此单独设置 60 秒；其他能力仍保留默认 5 秒。
            // Native 自身另有 45 秒截止时间（含授权等待），通常会先返回明确结果。
            const result = await nativeBridge.call("getLocation", {}, { timeoutMs: 60000 });
            if (pageDisposed) {
                return;
            }
            // 跨端数据仍需做基础校验，避免把错误结构直接渲染成一组无意义的数值。
            location.value = readLocation(result);
            status.value = "已获取原生定位";
        } catch (failure) {
            if (!pageDisposed) {
                error.value = failure instanceof Error ? failure.message : "获取定位失败，请重试。";
                status.value = "定位未完成";
            }
        } finally {
            if (!pageDisposed) {
                loading.value = false;
            }
        }
    }

    // 当前路由是响应入口的所有者，与原有 Hybrid 实验页互斥挂载，不同时共享页面生命周期。
    onMounted(() => {
        pageDisposed = false;
        nativeBridge.install();
        bridgeAvailable.value = typeof window.webkit?.messageHandlers?.nativeBridge?.postMessage === "function";
    });

    onUnmounted(() => {
        pageDisposed = true;
        // dispose 清理 H5 回调表和定时器，让等待中的 Promise rejected。
        // 这不等于通知 Swift 停止定位；原生任务由自己的截止时间或原生页面退出负责清理。
        nativeBridge.dispose();
    });

    return { location, loading, error, status, bridgeAvailable, requestLocation };
}

/**
 * 把跨端的未知值校验为约定的数据形状，再明确返回展示所需的四个字段。
 * @param {unknown} value Native 响应中的 data。
 * @returns {NativeLocation} 通过校验的定位数据。
 * @throws {Error} 返回值缺少字段、超出范围或包含无效采集时间时抛出。
 */
function readLocation(value) {
    if (value === null || typeof value !== "object") {
        throw new Error("Native 定位响应必须是对象。");
    }
    const { latitude, longitude, horizontalAccuracy, timestamp } = value;
    if (
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180 ||
        !Number.isFinite(horizontalAccuracy) ||
        horizontalAccuracy < 0 ||
        typeof timestamp !== "string" ||
        !Number.isFinite(Date.parse(timestamp))
    ) {
        throw new Error("Native 定位响应中的经纬度、精度或时间无效。");
    }
    return { latitude, longitude, horizontalAccuracy, timestamp };
}
