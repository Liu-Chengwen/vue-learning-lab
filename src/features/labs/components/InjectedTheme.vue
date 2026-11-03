<script setup>
/**
 * 跨层通信的孙组件：读取上层按同一个 key 提供的主题 ref。
 * inject 不会自动把普通值变成响应式；这里能持续更新，是因为父级提供的本来就是 ref。
 * 当前组件只读取注入值，主题变更仍由父级负责，中间组件无需逐层声明主题 props。
 */
import { inject } from "vue";
// 注入得到的是 ref 本身，脚本里应读 theme.value；模板中的顶层绑定会自动解包。
const theme = inject("lab-theme");
</script>
<template>
    <div class="demo-result"
        >孙组件 inject：<b>{{ theme }}</b
        ><br /><small>provide 的 ref 保留响应性，模板会自动解包。</small></div
    >
</template>
