<script setup>
/**
 * 表单双向绑定实验：父级持有 model，子级通过更新事件把输入同步回来。
 * 同时演示多个具名 model、组件自定义修饰符与原生表单修饰符；这些机制的实现层次不同。
 * defineModel 是 Vue 3.4+ 编译宏，对默认 model 生成 modelValue / update:modelValue 协议。
 */
import { ref, watch } from "vue";
import ModelInput from "./components/ModelInput.vue";
import DualModelEditor from "./components/DualModelEditor.vue";
import LabLog from "./LabLog.vue";
import { useLabLog } from "./useLabLog";
// 父级提供明确初值，避免组件 defineModel 默认值与父级 undefined 形成不同步。
const customValue = ref("Vue"),
    title = ref("拆解 v-model"),
    priority = ref("重要"),
    trimmed = ref(""),
    number = ref(0),
    lazy = ref("");
const { entries, log, clear } = useLabLog();
// 侦听多个 ref，用于展示父级最终收到的值；同步的一组变更可能合并在一轮回调中。
watch([customValue, title, priority], (value) => log(`父级 model 更新：${JSON.stringify(value)}`));
// 原生 .number 在清空输入时仍可能得到空字符串；它并不承诺所有输入都始终是 number。
function reset() {
    customValue.value = "Vue";
    title.value = "拆解 v-model";
    priority.value = "重要";
    trimmed.value = lazy.value = "";
    number.value = 0;
    clear();
}
</script>
<template>
    <div class="vue-experiment"
        ><div class="demo-row demo-toolbar"
            ><span class="tag">defineModel · Vue 3.4+</span
            ><button class="button secondary small" @click="reset">重置</button></div
        >
        <div class="demo-grid"
            ><section class="demo-card"
                ><h3>多个具名 model</h3><DualModelEditor v-model:title="title" v-model:priority="priority" /><div
                    class="demo-result"
                    >父级：{{ title }} / {{ priority }}</div
                ></section
            ><section class="demo-card"
                ><h3>组件自定义修饰符</h3><ModelInput v-model.capitalize="customValue" /><div class="demo-result"
                    >父级 customValue：{{ customValue }}</div
                ><p class="demo-note">修饰符由子组件的 set 转换处理。</p></section
            ><section class="demo-card"
                ><h3>原生表单修饰符</h3
                ><label class="demo-field">.trim<input v-model.trim="trimmed" placeholder="输入前后空格" /></label
                ><label class="demo-field">.number<input v-model.number="number" type="number" /></label
                ><label class="demo-field">.lazy<input v-model.lazy="lazy" placeholder="失焦或 change 后同步" /></label
                ><div class="demo-result"
                    >trim：{{ JSON.stringify(trimmed) }}<br />number：{{ number }}（{{ typeof number }}）<br />lazy：{{
                        JSON.stringify(lazy)
                    }}</div
                ></section
            ></div
        >
        <pre class="demo-code" style="margin-top: 20px">
&lt;ModelInput v-model="value" /&gt;
// 等价的默认组件协议：
&lt;ModelInput :model-value="value"
  @update:model-value="value = $event" /&gt;</pre>
        <LabLog :entries="entries" @clear="clear" />
    </div>
</template>
