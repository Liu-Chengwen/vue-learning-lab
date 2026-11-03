<script setup>
/**
 * 三种 API 风格的运行对照：OptionsCounter、SetupCounter 与本组件各有独立计数状态。
 * 本组件使用 script setup，顶层绑定可直接用于模板；脚本中仍需用 .value 访问 ref。
 * Options API 在 Vue 3 中仍可使用，Composition API 也并非 Vue 3 独占（Vue 2.7 已内置）。
 */
import { ref, computed } from "vue";
import OptionsCounter from "./components/OptionsCounter.vue";
import SetupCounter from "./components/SetupCounter.vue";
import LabLog from "./LabLog.vue";
import { useLabLog } from "./useLabLog";
// 这份 count 仅属于 script setup 示例；两个子组件另建自己的状态，不通过 props 共享。
const count = ref(0);
// 派生值读取依赖并缓存；不在 getter 中写状态或记录会引起更新的副作用。
const doubled = computed(() => count.value * 2);
const instanceKey = ref(0);
const { entries, log, clear } = useLabLog();
// 子组件不暴露重置内部状态的接口，这里通过更换 key 销毁旧实例、创建新实例。
function reset() {
    count.value = 0;
    instanceKey.value++;
    clear();
    log("通过 key 重建子组件，各实例状态恢复为 0。");
}
</script>
<template>
    <div class="vue-experiment">
        <div class="demo-row demo-toolbar"
            ><span class="tag">同一需求 · 三种实现</span
            ><button class="button small secondary" @click="reset">重置实验</button></div
        >
        <div class="demo-grid">
            <section class="demo-card"
                ><h3>01 · Options API</h3><p class="muted">data / computed / methods</p
                ><OptionsCounter :key="instanceKey"
            /></section>
            <section class="demo-card"
                ><h3>02 · Composition API</h3><p class="muted">setup() + 显式 return</p
                ><SetupCounter :key="instanceKey"
            /></section>
            <section class="demo-card"
                ><h3>03 · script setup</h3><p class="muted">顶层声明，直接用于模板</p
                ><div class="demo-value">{{ count }}</div
                ><p>双倍：{{ doubled }}</p
                ><button
                    class="button primary"
                    @click="
                        count++;
                        log(`script setup 实例：${count}`);
                    "
                    >+1 · count.value</button
                ></section
            >
        </div>
        <div class="demo-result"
            >三个计数器各自管理状态。Composition API
            的优势主要是按功能组织与复用逻辑，而不是让三个计数器共享同一份数据。</div
        >
        <pre class="demo-code">
const count = ref(0)
const doubled = computed(() =&gt; count.value * 2)
// ref/computed 是运行时 API；defineProps/defineEmits/defineModel 是编译宏。</pre>
        <LabLog :entries="entries" @clear="clear" />
    </div>
</template>
