<script setup>
/**
 * 生命周期探针：每次 setup 建立一次计时器 composable，并把钩子记录发给父级。
 * 日志在父级存活，所以当前实例卸载之后，用户仍能读到最后一条清理记录。
 * 钩子需要在 setup 同步阶段注册；日志不直接修改本组件的 seconds，避免更新钩子制造自循环。
 */
import { onBeforeMount, onMounted, onBeforeUpdate, onUpdated, onBeforeUnmount, onUnmounted } from "vue";
import { useScopedTicker } from "./useScopedTicker";
// 子组件发出的生命周期记录由父级持有，所以卸载后仍可阅读。
const emit = defineEmits(["log"]);
const log = (message) => emit("log", message);
log("setup：创建组件实例。");
// 每次调用创建当前实例自己的 ref 与资源；composable 的返回值不代表全局单例。
const { seconds } = useScopedTicker(log);
onBeforeMount(() => log("onBeforeMount"));
onMounted(() => log("onMounted"));
// seconds 变化先使组件更新，再触发这些钩子；不要在 updated 中无条件改本组件依赖。
onBeforeUpdate(() => log("onBeforeUpdate"));
onUpdated(() => log("onUpdated"));
// 真实卸载会停止组件作用域；useScopedTicker 还负责清理 Vue 不会自动回收的浏览器资源。
onBeforeUnmount(() => log("onBeforeUnmount"));
onUnmounted(() => log("onUnmounted"));
</script>
<template>
    <section class="demo-card"
        ><h3>拥有副作用的子组件</h3><div class="demo-value">{{ seconds }} <small style="font-size: 14px">秒</small></div
        ><p class="demo-note">每秒更新一次；卸载后不再计时。调整浏览器宽度可触发 resize 日志。</p></section
    >
</template>
