import { onBeforeUnmount, ref } from "vue";

/**
 * 把当前实验值转为适合阅读的文本，避免在 UI 中只看到 [object Object]。
 * 这是面向已知示例数据的展示格式化，不是可逆序列化或通用深拷贝；嵌套函数等仍按 JSON 规则处理。
 */
export function formatValue(value) {
    if (value === undefined) return "undefined";
    if (typeof value === "number" && !Number.isFinite(value)) return String(value);
    if (typeof value === "bigint") return `${value}n`;
    if (typeof value === "symbol") return value.toString();
    if (typeof value === "function") return `[Function ${value.name || "anonymous"}]`;
    if (value instanceof Error) return `${value.name}: ${value.message}`;
    if (value instanceof Map) return `Map ${JSON.stringify([...value])}`;
    if (value instanceof Set) return `Set ${JSON.stringify([...value])}`;
    if (typeof value === "string") return value;
    try {
        return JSON.stringify(value, (_, item) => (typeof item === "bigint" ? `${item}n` : item), 2);
    } catch {
        return String(value);
    }
}

/**
 * 每次调用创建一套独立实验上下文：日志、执行状态、定时器集合和轮次标记都不跨组件共享。
 * running 由调用方决定何时开启；本工具只在清理时将它复位，不推断所有异步任务是否已完成。
 */
export function useExperimentLog() {
    const logs = ref([]);
    const running = ref(false);
    const timers = new Set();
    let sequence = 0; // 日志 ID 单调递增，清空后也不会把新记录误认为旧节点。
    let generation = 0; // 实验轮次；重置或卸载后，旧回调必须先通过 isCurrent 才能写结果。
    function log(label, value, type = "info") {
        // 在记录时就格式化成字符串，后续修改原对象不会悄悄改掉已展示的这一条输出。
        logs.value.push({ id: ++sequence, label, value: formatValue(value), type });
        if (logs.value.length > 70) logs.value.shift();
    }
    function later(callback, delay) {
        const token = generation;
        const timer = setTimeout(() => {
            timers.delete(timer);
            // 即使任务的回调已排队，旧轮次也不能继续影响重置后的实验。
            if (token === generation) callback();
        }, delay);
        timers.add(timer);
        return timer;
    }
    function cancelTimer(timer) {
        // 同时清理浏览器计时器和登记集合，避免重复取消已结束任务时留下无意义的 ID。
        clearTimeout(timer);
        timers.delete(timer);
    }
    function clear() {
        // 这里只取消通过 later 登记的计时器。AbortController、外部请求由各实验自己负责终止。
        // 不能因为日志清空，就推断一个任意外部 Promise 已经被取消或 settled。
        generation++;
        timers.forEach(clearTimeout);
        timers.clear();
        logs.value = [];
        running.value = false;
    }
    const currentGeneration = () => generation;
    const isCurrent = (token) => token === generation;
    // 每个使用该 composable 的组件都拥有自己的清理钩子，离开专题时自动失效旧轮次。
    onBeforeUnmount(clear);
    return { logs, running, log, later, cancelTimer, clear, currentGeneration, isCurrent };
}
