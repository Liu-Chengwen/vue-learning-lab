<script setup>
/**
 * CSS 专题入口：只解析路由和元数据，把布局计算交给 CssExperiments。
 * lesson.id 作为实验 key；专题变化会重建实例，释放旧观察器并恢复该专题的初始状态。
 */
import { computed } from "vue";
import { useRoute } from "vue-router";
import LessonFrame from "@/components/learning/LessonFrame.vue";
import { cssLessons } from "@/data/foundationLessons";
import CssExperiments from "./css/CssExperiments.vue";

const route = useRoute();
// 参数缺省或不在目录中时展示首个 Flex 实验，避免把未知字符串直接当作渲染分支。
const lesson = computed(() => cssLessons.find((item) => item.topic === route.params.topic) || cssLessons[0]);
</script>

<template>
    <LessonFrame :lesson="lesson">
        <CssExperiments :key="lesson.id" :topic="lesson.topic" />
    </LessonFrame>
</template>
