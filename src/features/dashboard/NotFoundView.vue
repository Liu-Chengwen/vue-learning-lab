<script setup>
// 路由层的兜底页面：返回应用内已知入口，不在这里自动修改或猜测用户输入的路径。
// 未匹配的路径提供明确恢复入口，路由错误不会显示空白页。
import { RouterLink } from "vue-router";
import { Compass, ArrowLeft } from "lucide-vue-next";
</script>
<template>
    <div class="not-found panel"
        ><Compass :size="48" /><span class="eyebrow">404 · LOST IN THE LAB</span><h1>这个实验入口还不存在</h1
        ><p class="muted">从导航选择一个专题，或回到学习总览继续探索。</p
        ><RouterLink to="/" class="button primary"><ArrowLeft :size="15" />返回总览</RouterLink></div
    >
</template>
<style scoped>
.not-found {
    padding: 75px 20px;
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 16px;
    text-align: center;
}
.not-found > svg {
    color: var(--primary);
}
.not-found h1 {
    font-size: 24px;
    margin: 0;
}
</style>
