<script setup>
/**
 * 样式实验的独立子组件：内部按钮属于本组件，slot 内容由父组件提供。
 * 它们可以继承同一个 CSS 变量，但 :deep 和 :slotted 的选择目标不同。
 */
defineProps({ title: { type: String, default: "组件内部按钮" } });
</script>

<template>
    <div class="style-sample">
        <button class="sample-button" type="button">{{ title }}</button>
        <slot />
    </div>
</template>

<style scoped>
/* 自定义属性沿真实 DOM 继承，scoped 不会把 CSS 变量隔离成另一套环境。 */
.style-sample {
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
    padding: 24px;
    border: 1px dashed var(--sample-color, #267857);
    border-radius: 12px;
}
.sample-button {
    border: 0;
    background: var(--sample-color, #267857);
    color: white;
    padding: 12px 20px;
    border-radius: 10px;
    transition:
        border-radius 0.2s,
        background 0.2s;
}
/* 插槽内容在父级作用域编译；子组件用 :slotted 明确声明对传入内容的样式契约。 */
:slotted(.slot-label) {
    font-weight: 700;
    color: var(--sample-color, #267857);
}
</style>
