<script setup>
/**
 * 父子通信的子级：props 提供只读输入，draft 保存本地编辑，emits 表达变更请求。
 * 父级提交新 title 时，本例选择同步覆盖草稿；它不是所有编辑器都必须采用的冲突处理策略。
 * defineExpose 只暴露聚焦方法，避免父级依赖内部 ref 或通过组件实例绕过数据流。
 */
import { ref, watch, useTemplateRef } from "vue";
import InjectedTheme from "./InjectedTheme.vue";
const props = defineProps({ title: { type: String, required: true }, count: Number });
// emits 的参数校验用于开发期诊断，并不会拦截事件；真正阻止空标题要靠下面 save 的显式判断。
const emit = defineEmits({
    "update-title": (value) => typeof value === "string" && value.trim().length > 0,
    "increment": null
});
// 从 prop 复制基本值建立可编辑草稿，输入过程不直接写 props.title。
const draft = ref(props.title);
// watch 需要 getter 作为来源；传入 props.title 的字符串快照无法持续侦听父级输入。
watch(
    () => props.title,
    (value) => {
        draft.value = value;
    }
);
// Vue 3.5+ 模板引用：只有输入节点已挂载时才能聚焦，reset 重建期间可为 null。
const editor = useTemplateRef("editor");
function focus() {
    editor.value?.focus();
}
// script setup 默认不把所有顶层绑定交给父级实例访问；只公开一个稳定的方法接口。
defineExpose({ focus });
// trim 后再提交，避免把开发期 emits 警告误当作业务校验。父级收到事件后才更新真正的 title。
function save() {
    if (draft.value.trim()) emit("update-title", draft.value.trim());
}
</script>
<template>
    <section class="demo-card"
        ><h3>子组件 · props + emits</h3
        ><div class="demo-result">父级输入 title：{{ title }}<br />共享计数：{{ count }}</div
        ><label class="demo-field">本地编辑草稿<input ref="editor" v-model="draft" @keyup.enter="save" /></label
        ><div class="demo-row"
            ><button class="button primary small" :disabled="!draft.trim()" @click="save">emit 更新标题</button
            ><button class="button secondary small" @click="emit('increment')">emit 计数 +1</button></div
        ><InjectedTheme
    /></section>
</template>
