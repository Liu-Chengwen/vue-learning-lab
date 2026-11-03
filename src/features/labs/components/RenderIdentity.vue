<script setup>
/**
 * 组件身份探针：本地草稿在 setup 初始化，父级改变 key 时会创建一个新实例。
 * instanceId 只用于观察实例，不作为列表 key；随机 key 会破坏需要保留的组件复用。
 * 两个生命周期事件由父级记录，便于同时看到旧实例销毁与新实例创建。
 */
import { ref, onMounted, onUnmounted } from "vue";
// 本地状态仅在 setup 初始化；改变 key 会销毁当前实例并重新运行 setup。
const emit = defineEmits(["log"]);
const draft = ref("我属于当前组件实例");
// 随机字符串只显示在诊断日志里，VNode 的 key 由父级稳定控制，不随普通更新随机变化。
const instanceId = Math.random().toString(36).slice(2, 8);
onMounted(() => emit("log", `实例 ${instanceId} mounted`));
onUnmounted(() => emit("log", `实例 ${instanceId} unmounted`));
</script>
<template>
    <div
        ><label class="demo-field">实例 {{ instanceId }} 的草稿<input v-model="draft" /></label
    ></div>
</template>
