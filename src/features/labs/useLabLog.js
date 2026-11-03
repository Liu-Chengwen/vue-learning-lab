/**
 * 实验日志的状态容器：每次调用创建独立缓冲区，组件之间不会意外共享日志。
 * 使用 shallowRef 只追踪整个数组的替换；日志元素都是展示用字符串，不需要深层代理。
 */
import { shallowRef } from "vue";

/**
 * @param {number} limit 保留的最新记录上限；实验调用方传入非负整数，默认 24 条。
 * @returns {{ entries: import("vue").ShallowRef<string[]>, log: Function, clear: Function }}
 * entries 交给观察区读取；调用者通过 log/clear 更新，避免依赖观察组件内部实现。
 */
export function useLabLog(limit = 24) {
    const entries = shallowRef([]);
    // 非响应式缓冲区：在 watchEffect 中记录日志时，不会意外把日志本身收集为依赖。
    const buffer = [];
    function log(message) {
        // 只读取普通 buffer，不读取 entries.value；即使从 watchEffect 调用也不追踪日志 ref。
        // 最新记录放在前面，并及时截断，计时器实验运行较久也不会让观察区无限增长。
        buffer.unshift(`${new Date().toLocaleTimeString("zh-CN", { hour12: false })}  ${message}`);
        buffer.splice(limit);
        // 新数组同时使浅层 ref 失效，并避免把同一个可变缓冲区直接交给外部。
        entries.value = buffer.slice();
    }
    function clear() {
        // 普通缓冲区与可见快照一起清空；未来副作用仍可继续写入新日志。
        buffer.length = 0;
        entries.value = [];
    }
    return { entries, log, clear };
}
