import { ref } from "vue";

/**
 * 为一个实验实例保存有限条可见日志，避免长时间操作让页面与内存持续增长。
 * log(message, value?) 把最新记录放在前面；value 限于字符串或可 JSON 序列化的简单演示值。
 * logs 是响应式数组，clear 只清空记录；它不是替代浏览器 Console 的任意对象调试器。
 */
export function useEventLog(limit = 30) {
    const logs = ref([]);
    // ID 与时间分开：同一秒可能产生多条日志，不能拿格式化时间作 v-for 的唯一 key。
    let sequence = 0;
    function log(message, value) {
        const suffix = value === undefined ? "" : " " + (typeof value === "string" ? value : JSON.stringify(value));
        logs.value.unshift({
            id: ++sequence,
            time: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
            message: message + suffix
        });
        logs.value = logs.value.slice(0, limit);
    }
    function clear() {
        // 保留递增序号，清空后新产生的记录仍有独立身份。
        logs.value = [];
    }
    return { logs, log, clear };
}
