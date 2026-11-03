<script setup>
/**
 * Vue 实验入口：把路由 topic、章节元数据和可运行组件连接起来。
 * 章节目标/面试题来自 vueLessons，实验行为留在各专题组件，避免说明与实现混杂。
 * 切换 topic 时重建 LessonFrame 及其后代，所属作用域的 watcher、计时器等随之清理。
 */
import { computed, defineAsyncComponent } from "vue";
import { useRoute } from "vue-router";
import LessonFrame from "@/components/learning/LessonFrame.vue";
import { vueLessons } from "@/data/vueLessons";

const route = useRoute();
// 保存稳定的异步组件定义；仅在进入对应专题时加载其代码，不在 computed 中重复创建定义。
const pages = {
    "setup": defineAsyncComponent(() => import("./SetupLab.vue")),
    "templates": defineAsyncComponent(() => import("./TemplatesLab.vue")),
    "reactivity": defineAsyncComponent(() => import("./ReactivityLab.vue")),
    "watchers": defineAsyncComponent(() => import("./WatchersLab.vue")),
    "communication": defineAsyncComponent(() => import("./CommunicationLab.vue")),
    "models": defineAsyncComponent(() => import("./ModelsLab.vue")),
    "slots": defineAsyncComponent(() => import("./SlotsLab.vue")),
    "lifecycle": defineAsyncComponent(() => import("./LifecycleLab.vue")),
    "builtins": defineAsyncComponent(() => import("./BuiltinsLab.vue")),
    "router-state": defineAsyncComponent(() => import("./RouterStateLab.vue")),
    "rendering": defineAsyncComponent(() => import("./RenderingLab.vue")),
    "migration": defineAsyncComponent(() => import("./MigrationLab.vue"))
};
// 未提供或无法识别 topic 时回到起步实验，避免把 undefined 当作组件渲染。
const topic = computed(() => (pages[route.params.topic] ? route.params.topic : "setup"));
const lesson = computed(() => vueLessons.find((item) => item.topic === topic.value));
</script>
<template>
    <LessonFrame :key="topic" :lesson="lesson">
        <component :is="pages[topic]" />
    </LessonFrame>
</template>
<style>
/* 此处不使用 scoped，方便教学子组件共享样式；所有规则都以 .vue-experiment 限定作用范围。 */
.vue-experiment .demo-card {
    padding: 20px;
    border: 1px solid var(--border, #e4e8e2);
    border-radius: 12px;
    background: var(--surface, #fff);
    min-width: 0;
}
.vue-experiment .demo-card h3 {
    font-size: 15px;
    margin: 0 0 12px;
}
.vue-experiment .demo-card p {
    font-size: 13px;
    line-height: 1.8;
}
.vue-experiment .demo-value {
    font:
        600 34px/1.3 ui-monospace,
        SFMono-Regular,
        monospace;
    color: var(--primary, #267857);
    margin: 12px 0;
}
.vue-experiment .demo-row {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
}
.vue-experiment .demo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(225px, 1fr));
    gap: 16px;
}
.vue-experiment .demo-field {
    display: grid;
    gap: 8px;
    font-size: 13px;
    margin: 12px 0;
}
.vue-experiment .demo-field input,
.vue-experiment .demo-field select {
    width: 100%;
    min-width: 0;
    padding: 10px 12px;
    border: 1px solid var(--border, #d8ded6);
    border-radius: 8px;
    background: var(--surface, #fff);
    color: inherit;
    font: inherit;
}
.vue-experiment .demo-result {
    padding: 14px 16px;
    border-radius: 9px;
    background: var(--surface-soft, #f2f6f0);
    font-size: 13px;
    line-height: 1.9;
    margin: 12px 0;
    overflow-wrap: anywhere;
}
.vue-experiment .demo-note {
    font-size: 12px;
    color: var(--text-secondary, #687569);
    line-height: 1.8;
}
.vue-experiment .demo-section + .demo-section {
    margin-top: 24px;
}
.vue-experiment code {
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: 0.9em;
}
.vue-experiment .demo-toolbar {
    margin-bottom: 18px;
}
.vue-experiment .demo-code {
    white-space: pre-wrap;
    background: var(--surface-soft, #f4f7f2);
    padding: 16px;
    border-radius: 10px;
    font:
        12px/1.8 ui-monospace,
        monospace;
    overflow: auto;
}
</style>
