import { getCurrentScope, onScopeDispose } from "vue";

/**
 * 尾部防抖工具：一段时间内的多次调用只执行最后一次，适合搜索输入。
 * callback 是实际工作函数，delay 是等待毫秒数；run 只安排任务，不返回 callback 的执行结果。
 * 每次调用得到独立的 timer 闭包，两个组件使用此 composable 不会互相取消。
 * 这里只实现尾部执行与 cancel；没有立即执行、最大等待时间或 flush 等扩展语义。
 */
export function useDebounce(callback, delay = 300) {
    let timer;
    // 手动取消和作用域清理共用同一入口，取消后允许重新安排下一次调用。
    function cancel() {
        clearTimeout(timer);
        timer = undefined;
    }
    function run(...args) {
        cancel();
        // 普通函数记录“本次调用”的 this；定时器中的箭头函数保留这个值与最后参数。
        // 因而把 run 放到对象上调用时，不会因 setTimeout 改变 callback 的接收者。
        const context = this;
        timer = setTimeout(() => {
            timer = undefined;
            callback.apply(context, args);
        }, delay);
    }
    // setup/组件拥有作用域，会自动取消尾调用；普通 JS 中使用时需由调用方手动 cancel。
    if (getCurrentScope()) onScopeDispose(cancel);
    return { run, cancel };
}
