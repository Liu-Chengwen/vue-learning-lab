<script setup>
/**
 * Pinia 的第二个消费者：通过同一 store id 取得共享状态，验证更新能跨组件同步。
 * storeToRefs 保留 state/getter 的响应性；直接从 store 解构基本值只会取得读取时的值。
 * action 由 Pinia 绑定到 store，可以直接作为事件处理器使用，无需为它调用 storeToRefs。
 */
import { storeToRefs } from "pinia";
import { useLabCounterStore } from "../labCounterStore";
// 第二个消费者取得同一个 store，storeToRefs 保留 state/getter 响应性。
const store = useLabCounterStore();
// 解构后得到 ref，脚本读取需 .value，模板自动解包；getter 同样保留与源状态的依赖关系。
const { count, doubled } = storeToRefs(store);
</script>
<template>
    <section class="demo-card"
        ><h3>组件 B · 独立消费者</h3><div class="demo-value">{{ count }}</div
        ><p>同一个 getter doubled：{{ doubled }}</p
        ><button class="button small secondary" @click="store.increment">组件 B +1</button></section
    >
</template>
