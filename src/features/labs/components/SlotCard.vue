<script setup>
/**
 * 可扩展卡片：结构由子级定义，默认/具名/作用域插槽的内容由父级提供。
 * 组件具有两个根节点，因此显式选择 attrs 接收节点；事件和样式透传的目标都应可追踪。
 * 配套 CSS 展示 v-bind、:slotted 和 :deep 的作用范围，不依赖全局覆盖所有同名标签。
 */
import { useAttrs, useSlots } from "vue";
// defineOptions 是编译宏（3.3+）；显式关闭自动继承，避免多根节点时透传位置不确定。
defineOptions({ inheritAttrs: false });
defineProps({ task: { type: Object, required: true }, accent: { type: String, default: "#267857" } });
// 包含未声明的属性/监听器（如 class、style、click），但不包含已声明的 task/accent props。
// useAttrs 反映最新传入内容，但不是适合直接当作 watch 来源的普通响应式对象。
const attrs = useAttrs();
// 插槽是父级提供的渲染函数集合。调用时由子级交出 slot props，内容仍在父级作用域求值。
const slots = useSlots();
</script>
<template>
    <section v-bind="attrs" class="slot-card">
        <header><slot name="header">默认标题</slot></header>
        <main><slot :task="task" :label="`优先级：${task.priority}`">默认内容</slot></main>
        <div><slot name="actions" :task="task">没有传入 actions 插槽。</slot></div>
        <footer><slot name="footer">默认页脚</slot></footer>
    </section>
    <p class="demo-note"
        >我是第二个根节点；未声明属性只透传到上方 section。实际插槽：{{ Object.keys(slots).join(" / ") }}</p
    >
</template>
<style scoped>
.slot-card {
    border: 1px solid var(--border, #dce3d8);
    /* SFC CSS v-bind 编译为该组件实例关联的 CSS 变量，不把颜色写成全局固定值。 */
    border-top: 3px solid v-bind(accent);
    border-radius: 10px;
    padding: 20px;
    background: var(--surface, #fff);
}
header {
    font-weight: 600;
    margin-bottom: 16px;
}
main {
    font-size: 14px;
    line-height: 1.9;
    margin-bottom: 16px;
}
footer {
    border-top: 1px solid var(--border, #eee);
    padding-top: 12px;
    margin-top: 16px;
    font-size: 12px;
    color: var(--text-secondary, #768071);
}
/* :slotted 针对父级提供的插槽内容；普通 scoped 选择器与插槽内容的归属不能混为一谈。 */
:slotted(.slot-label) {
    padding: 3px 6px;
    border-radius: 4px;
    background: var(--surface-soft, #eef5ef);
}
/* :deep 明确跨越后代作用域边界；规则仍从当前卡片作用域出发，避免全站按钮被覆盖。 */
:deep(button) {
    font-size: 12px;
}
</style>
