<script>
/**
 * 普通 setup 计数器：在每次组件实例创建时建立自己的 ref 和 computed。
 * setup 中通过词法变量访问状态，没有组件实例 this；显式 return 才能把绑定交给模板使用。
 * 与 script setup 比较时，关注编译器减少的样板代码，而非假定两者拥有不同的数据流规则。
 */
import { ref, computed } from "vue";
export default {
    setup() {
        // 这里的箭头函数只捕获词法变量，不使用组件 this；与 Options 中错误使用箭头方法不是同一场景。
        const count = ref(0);
        const doubled = computed(() => count.value * 2);
        const increment = () => count.value++;
        // 普通 setup 需要显式 return，script setup 则由编译器处理模板暴露。
        // 返回 ref 本身而非 count.value 的普通快照，才能让模板继续订阅后续变化。
        return { count, doubled, increment };
    }
};
</script>
<template>
    <div
        ><div class="demo-value">{{ count }}</div
        ><p>双倍：{{ doubled }}</p
        ><button class="button secondary" @click="increment">+1 · count.value</button></div
    >
</template>
