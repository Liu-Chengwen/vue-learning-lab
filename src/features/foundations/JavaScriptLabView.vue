<script setup>
/**
 * JavaScript 专题路由入口：根据 topic 选择实验组件，不在此处维护实验自己的状态。
 * 类、异步与 API 工具箱单独拆分，让源码阅读器能定位到真正执行机制的文件。
 */
import { computed } from "vue";
import { useRoute } from "vue-router";
import LessonFrame from "@/components/learning/LessonFrame.vue";
import { jsLessons } from "@/data/foundationLessons";
import JavaScriptBasics from "./javascript/JavaScriptBasics.vue";
import ClassLab from "./javascript/ClassLab.vue";
import AsyncLab from "./javascript/AsyncLab.vue";
import ApiLab from "./javascript/ApiLab.vue";

const route = useRoute();
// 默认进入 this 专题。元数据中的 id 用于学习记录，topic 用于路由，二者职责不同。
const lesson = computed(() => jsLessons.find((item) => item.topic === route.params.topic) || jsLessons[1]);
// 多个基础专题复用一个组件，通过 key 隔离实例；路由切换后不会沿用旧计时器和计数闭包。
const experiment = computed(() => {
    if (lesson.value.topic === "classes") return ClassLab;
    if (lesson.value.topic === "async") return AsyncLab;
    if (["es2015", "modern"].includes(lesson.value.topic)) return ApiLab;
    return JavaScriptBasics;
});
</script>

<template>
    <LessonFrame :lesson="lesson">
        <component :is="experiment" :key="lesson.id" :topic="lesson.topic" />
    </LessonFrame>
</template>
