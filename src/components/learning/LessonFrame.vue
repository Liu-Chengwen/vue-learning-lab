<script setup>
// 所有专题共用学习框架；实验本身保留独立组件，便于直接在 IDE 阅读和修改。
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
    Check,
    CheckCircle2,
    Code2,
    FlaskConical,
    MessageCircle,
    ArrowUpRight,
    Lightbulb,
    BookOpen
} from "lucide-vue-next";
import { useLearningStore } from "@/stores/learning";
import SourceViewer from "./SourceViewer.vue";

// lesson 统一约定 id/title/source/goals/explanation/interview 等字段；只读元数据由父级提供。
// 默认 slot 放真实实验，code 具名 slot 可以替换默认源码面板，外层仍负责学习记录和页签。
const props = defineProps({ lesson: { type: Object, required: true } });
const learning = useLearningStore();
const route = useRoute();
// 页签属于当前框架实例；专题完成状态属于全局学习 store，切换页面后仍可恢复。
const tab = ref("experiment");
const isComplete = computed(() => learning.completed.includes(props.lesson.id));
// 兼容数组段落与换行文本，模板只消费规范化后的数组，不在 v-for 中反复处理字符串。
const explanations = computed(() =>
    Array.isArray(props.lesson.explanation)
        ? props.lesson.explanation
        : String(props.lesson.explanation || "")
              .split("\n")
              .filter(Boolean)
);
const questions = computed(() => props.lesson.interview || []);
// 侦听 getter 才能追踪父级替换 lesson 后的 id；const { id } = props.lesson 只得到这次读取的普通值。
// 这里是嵌套对象的普通解构，不是 Vue 3.5 对 defineProps 顶层解构的编译转换。
// 当前路径由路由提供，记录可直接返回的入口；记录本身不持有组件实例。
watch(
    () => props.lesson.id,
    () => {
        tab.value = "experiment";
        learning.visit(props.lesson.title, route.path);
    },
    { immediate: true }
);
</script>

<template>
    <article class="lesson-page">
        <div class="page-heading">
            <div>
                <div class="eyebrow"
                    >{{ lesson.category || "交互实验室" }}<span class="eyebrow-divider">/</span
                    >{{ lesson.level || "基础 → 进阶" }}</div
                >
                <h1>{{ lesson.title }}</h1>
                <p class="page-description">{{ lesson.subtitle }}</p>
            </div>
            <button
                class="button"
                :class="isComplete ? 'secondary' : 'primary'"
                @click="learning.toggleCompleted(lesson.id)"
            >
                <CheckCircle2 v-if="isComplete" :size="17" /><Check v-else :size="17" />{{
                    isComplete ? "已完成 · 取消标记" : "标记学完"
                }}
            </button>
        </div>
        <div v-if="lesson.goals?.length" class="learning-goals">
            <span class="goals-label"><BookOpen :size="15" />本节目标</span>
            <span v-for="goal in lesson.goals" :key="goal" class="goal-item"><Check :size="13" />{{ goal }}</span>
        </div>
        <nav class="lesson-tabs" aria-label="实验内容">
            <button :class="{ active: tab === 'experiment' }" @click="tab = 'experiment'"
                ><FlaskConical :size="16" />动手实验</button
            >
            <button :class="{ active: tab === 'source' }" @click="tab = 'source'"><Code2 :size="16" />阅读源码</button>
            <button :class="{ active: tab === 'interview' }" @click="tab = 'interview'"
                ><MessageCircle :size="16" />面试追问<span class="tab-count">{{ questions.length }}</span></button
            >
        </nav>
        <!-- 切换到源码/问答时保持当前实验；离开专题才由路由卸载并触发清理。 -->
        <section v-show="tab === 'experiment'" class="lesson-experiment">
            <slot />
            <div v-if="explanations.length || lesson.vue2" class="panel lesson-notes">
                <div class="panel-header"
                    ><h2><Lightbulb :size="17" />理解这一步</h2><span class="tag">知其所以然</span></div
                >
                <div class="panel-body reading-copy">
                    <p v-for="(paragraph, index) in explanations" :key="index">{{ paragraph }}</p>
                    <div v-if="lesson.vue2" class="callout"
                        ><strong>Vue 2 → Vue 3</strong><p>{{ lesson.vue2 }}</p></div
                    >
                </div>
            </div>
            <div v-if="lesson.exercise" class="exercise-box">
                <span class="exercise-icon"><ArrowUpRight :size="20" /></span>
                <div
                    ><span class="eyebrow">YOUR NEXT CHALLENGE</span><h3>留给你的小练习</h3
                    ><p>{{ lesson.exercise }}</p></div
                >
            </div>
        </section>
        <section v-if="tab === 'source'" class="panel">
            <slot name="code"><SourceViewer :source="lesson.source" /></slot>
        </section>
        <section v-if="tab === 'interview'" class="panel">
            <div class="panel-header"><h2>先试着回答，再展开解析</h2><span class="muted">结合刚才的实验举例</span></div>
            <details v-for="(question, index) in questions" :key="index" class="question-detail">
                <summary
                    ><span class="question-number">{{ String(index + 1).padStart(2, "0") }}</span
                    >{{ typeof question === "string" ? question : question.question }}</summary
                >
                <p>{{
                    typeof question === "string"
                        ? "回到实验中验证你的回答，并参考下方源码定位对应行为。"
                        : question.answer
                }}</p>
            </details>
            <div v-if="!questions.length" class="empty-state">完成实验后，试着向别人解释实现过程。</div>
        </section>
    </article>
</template>

<style scoped>
.learning-goals {
    display: flex;
    align-items: center;
    gap: 12px 20px;
    flex-wrap: wrap;
    font-size: 12px;
    color: var(--text-secondary);
    margin: 0 0 24px;
}
.goals-label,
.goal-item {
    display: flex;
    align-items: center;
    gap: 6px;
}
.goals-label {
    font-weight: 600;
    color: var(--text);
}
.goal-item svg {
    color: var(--primary);
}
.lesson-tabs {
    display: flex;
    border-bottom: 1px solid var(--border);
    gap: 24px;
    margin-bottom: 24px;
}
.lesson-tabs button {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 0;
    border-bottom: 2px solid transparent;
    padding: 12px 0;
    color: var(--text-secondary);
    background: transparent;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
}
.lesson-tabs button.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
}
.tab-count {
    font-size: 10px;
    background: var(--surface-soft);
    padding: 1px 6px;
    border-radius: 4px;
}
.lesson-experiment {
    display: flex;
    flex-direction: column;
    gap: 24px;
}
.lesson-notes p {
    line-height: 1.9;
}
.exercise-box {
    display: flex;
    gap: 16px;
    background: var(--primary-soft);
    border: 1px solid var(--primary-border);
    padding: 22px;
    border-radius: 12px;
}
.exercise-icon {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    border-radius: 10px;
    background: var(--surface);
    color: var(--primary);
}
.exercise-box h3 {
    margin: 6px 0;
    font-size: 15px;
}
.exercise-box p {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.8;
}
.question-detail {
    padding: 20px 24px;
    border-bottom: 1px solid var(--border);
}
.question-detail:last-child {
    border-bottom: 0;
}
.question-detail summary {
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.7;
}
.question-number {
    font-family: var(--font-mono);
    color: var(--primary);
    margin-right: 12px;
}
.question-detail p {
    margin: 14px 0 0 30px;
    font-size: 13px;
    line-height: 1.9;
    color: var(--text-secondary);
    white-space: pre-line;
}
@media (max-width: 650px) {
    .lesson-tabs {
        gap: 18px;
    }
    .lesson-tabs button {
        font-size: 12px;
    }
    .question-detail {
        padding: 16px;
    }
    .question-detail p {
        margin-left: 0;
    }
}
</style>
