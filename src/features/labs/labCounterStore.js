/**
 * 实验用 setup store：在同一个 Pinia 实例中，多个 useLabCounterStore 消费者共享一个状态容器。
 * 本例仅验证内存共享，不自动写入 localStorage；刷新后重新创建状态，不等于持久化失败。
 */
import { ref, computed } from "vue";
import { defineStore } from "pinia";

// setup store 返回的 ref、computed、函数分别形成 state、getter、action。
// 这些响应式值在创建 store 时初始化，不是在每个消费组件调用 useStore 时各建一份。
export const useLabCounterStore = defineStore("vue-lab-counter", () => {
    const count = ref(0);
    const doubled = computed(() => count.value * 2);
    // 修改状态通过小型 action 表达；消费者不需要知道 getter 如何派生。
    function increment() {
        count.value++;
    }
    // setup store 按自身数据结构提供 reset；这里不是依赖 options store 的自动 $reset。
    function reset() {
        count.value = 0;
    }
    return { count, doubled, increment, reset };
});
