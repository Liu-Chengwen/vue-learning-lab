<script setup>
/**
 * 列表身份探针：接收当前 task，同时保留一份属于子组件实例的本地草稿。
 * 故意不 watch task.title，才能看到索引 key 复用组件时“新 props + 旧草稿”的错位。
 * 这是实验设计；实际编辑组件是否随 props 重置草稿，需要按业务的状态归属决定。
 */
import { ref } from "vue";
const props = defineProps({ task: { type: Object, required: true } });
// 故意只取一次初值，模拟子组件的本地编辑状态，观察 key 对组件身份的影响。
const draft = ref(props.task.title);
</script>
<template>
    <label class="draft-row"
        ><span>{{ task.id }} · {{ task.title }}</span
        ><input v-model="draft" aria-label="本地草稿"
    /></label>
</template>
<style scoped>
.draft-row {
    display: grid;
    gap: 6px;
    margin: 10px 0;
    font-size: 12px;
}
.draft-row input {
    padding: 9px 11px;
    border: 1px solid var(--border, #dce3d9);
    border-radius: 7px;
    font: inherit;
    color: inherit;
    background: var(--surface, #fff);
}
</style>
