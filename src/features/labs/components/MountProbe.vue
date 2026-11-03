<script setup>
/**
 * 最小挂载探针：组件只负责向父级报告 mounted / unmounted。
 * v-if 会让这个实例离开组件树，v-show 只控制根元素 display，不会触发同样的卸载过程。
 * 根节点使用真实 span，便于 v-show 将样式应用到确定的 DOM 元素。
 */
import { onMounted, onUnmounted } from "vue";
const props = defineProps({ name: String });
const emit = defineEmits(["log"]);
onMounted(() => emit("log", `${props.name}：mounted`));
onUnmounted(() => emit("log", `${props.name}：unmounted`));
</script>
<template>
    <span class="probe">我是 {{ name }} 分支中的真实组件</span>
</template>
<style scoped>
.probe {
    display: block;
    padding: 12px;
    border-radius: 8px;
    background: var(--surface-soft, #edf6ef);
    font-size: 13px;
    margin: 12px 0;
}
</style>
