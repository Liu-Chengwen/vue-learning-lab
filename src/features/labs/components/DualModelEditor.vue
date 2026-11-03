<script setup>
/**
 * 多字段组件 model：title 与 priority 各自拥有独立的属性和更新事件。
 * 父级通过 v-model:title / v-model:priority 绑定；对子级 model ref 赋值会发出对应更新。
 * required 要求使用方提供初值，避免父子对默认值的理解不一致；两个字段不需要手动合成对象。
 */
// 具名模型分别生成 title/update:title 与 priority/update:priority，不是默认 modelValue 协议。
const title = defineModel("title", { type: String, required: true });
const priority = defineModel("priority", { type: String, required: true });
</script>
<template>
    <div
        ><label class="demo-field">v-model:title<input v-model="title" /></label
        ><label class="demo-field"
            >v-model:priority<select v-model="priority"
                ><option>普通</option
                ><option>重要</option
                ><option>紧急</option></select
            ></label
        ></div
    >
</template>
