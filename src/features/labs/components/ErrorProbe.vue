<script setup>
/**
 * 故意失败的后代组件：点击时抛错，交给父级 onErrorCaptured 展示处理结果。
 * Vue 会包装模板事件处理器，因此该同步异常进入组件错误传播链。
 * 该例不代表 onErrorCaptured 能拦截所有 window 错误，或捕获注册它的组件自身所有异常。
 */
function fail() {
    throw new Error("教学错误：后代组件操作失败");
}
</script>
<template><button class="button small secondary" @click="fail">触发后代组件错误</button></template>
