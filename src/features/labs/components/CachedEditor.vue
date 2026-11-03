<script setup>
/**
 * 缓存身份探针：draft 属于当前组件实例，name 只用于标识这个编辑页。
 * 父级用 tab 作为 key；KeepAlive 缓存的是不同 key 的实例，而不是自动把 draft 写入全局状态。
 * 停用与卸载是不同阶段，读取日志时应区分 activated/deactivated 和 mounted/unmounted。
 */
import { ref, onMounted, onUnmounted, onActivated, onDeactivated } from "vue";
// 每个 key 对应一个独立实例；KeepAlive 决定离开时保留还是销毁该实例。
const props = defineProps({ name: String });
const emit = defineEmits(["log"]);
const draft = ref("");
onMounted(() => emit("log", `${props.name} mounted`));
onUnmounted(() => emit("log", `${props.name} unmounted`));
// 被 KeepAlive 管理时，首次挂载也会激活；之后每次从缓存进入都会再次触发。
onActivated(() => emit("log", `${props.name} activated`));
// 停用不等于销毁作用域，计时器不会仅因停用自动停止；真实业务需要按激活/停用另行管理。
onDeactivated(() => emit("log", `${props.name} deactivated`));
</script>
<template>
    <div
        ><label class="demo-field"
            >{{ name }} 的本地草稿<input v-model="draft" :placeholder="`在 ${name} 输入后切换页签`" /></label
        ><p class="demo-note">当前实例内容：{{ draft || "空" }}</p></div
    >
</template>
