<script setup>
/**
 * 默认组件 model 示例：Vue 3.4+ 的 defineModel 编译为属性与更新事件。
 * 返回的 value 是与 model 协议相连的 ref，modifiers 对应父级传入的修饰符信息。
 * capitalize 是本组件自定义的转换规则，仅演示首字符大写，不是 Vue 内置表单修饰符。
 */
// 写入 value 会走 model 更新协议；它不是绕过只读 props 直接改父级变量的入口。
const [value, modifiers] = defineModel({
    type: String,
    // 转换发生在子级提交值时。父级传入的首字母不会仅因首次渲染就自动被改写。
    set(input) {
        return modifiers.capitalize && input ? input[0].toUpperCase() + input.slice(1) : input;
    }
});
</script>
<template>
    <label class="demo-field"
        >自定义 .capitalize 修饰符<input v-model="value" placeholder="输入 vue，观察父级变为 Vue"
    /></label>
</template>
