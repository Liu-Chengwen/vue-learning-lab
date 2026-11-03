<script setup>
// 题库是静态元数据；筛选/抽题是页面局部状态，收藏和自评则由全局学习 store 持久化。
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import { Search, Bookmark, CheckCircle2, ArrowUpRight, SlidersHorizontal, Shuffle, CircleHelp } from "lucide-vue-next";
import { questions } from "@/data/questions";
import { useLearningStore } from "@/stores/learning";
const learning = useLearningStore();
const category = ref("全部");
const keyword = ref("");
const mode = ref("全部题目");
// Set 保留首次出现顺序并去重，避免手动维护分类后与题目中的分类脱节。
const categories = ["全部", ...new Set(questions.map((v) => v.category))];
// 只存抽中题目的稳定 ID，不复制题目；后续显示仍从当前筛选结果中寻找它。
const focused = ref(null);
// 多个条件以 AND 组合；computed 只负责派生列表，不在 getter 内修改收藏或发起请求。
// 搜索覆盖题干/答案/来源专题，trim 后的空字符串表示不限制关键词。
const filtered = computed(() =>
    questions.filter(
        (q) =>
            (category.value === "全部" || q.category === category.value) &&
            (mode.value !== "我的收藏" || learning.favorites.includes(q.id)) &&
            (mode.value !== "待复习" || !learning.mastered.includes(q.id)) &&
            (!keyword.value.trim() ||
                (q.question + q.answer + q.lesson).toLowerCase().includes(keyword.value.trim().toLowerCase()))
    )
);
// filtered 保持完整候选池，visible 才限制为抽中的一题，因此可以连续从同一池再次抽题。
const visible = computed(() => (focused.value ? filtered.value.filter((q) => q.id === focused.value) : filtered.value));
// 抽题从当前筛选结果取样；题目为空时显示空状态，不创建假的占位题。
function pick() {
    if (filtered.value.length) focused.value = filtered.value[Math.floor(Math.random() * filtered.value.length)].id;
}
function resetFilter() {
    // 一起清空 focused，防止筛选条件恢复后仍被旧的“单题视图”限制。
    category.value = "全部";
    keyword.value = "";
    mode.value = "全部题目";
    focused.value = null;
}
</script>
<template>
    <section
        ><div class="page-heading"
            ><div
                ><div class="eyebrow">TURN KNOWLEDGE INTO ANSWERS</div><h1>不止会写，也能讲清楚</h1
                ><p class="page-description">先尝试回答，再展开解析。用实验中的现象和源码，支撑你的每一个结论。</p></div
            ><button class="button primary" :disabled="!filtered.length" @click="pick"
                ><Shuffle :size="15" />随机抽一题</button
            ></div
        >
        <div class="review-summary"
            ><span
                ><CircleHelp :size="17" /><strong>{{ questions.length }}</strong> 道关联题</span
            ><span
                ><Bookmark :size="16" /><strong>{{ learning.favorites.length }}</strong> 已收藏</span
            ><span
                ><CheckCircle2 :size="16" /><strong>{{ learning.mastered.length }}</strong> 自评掌握</span
            ><small>标记用于个人复习，不代表自动测评</small></div
        >
        <div class="panel interview-filter"
            ><div class="category-tabs"
                ><button
                    v-for="item in categories"
                    :key="item"
                    :class="{ active: category === item }"
                    @click="
                        category = item;
                        focused = null;
                    "
                    >{{ item }}<span v-if="item === '全部'">{{ questions.length }}</span></button
                ></div
            ><div class="filter-row"
                ><div class="interview-search"
                    ><Search :size="15" /><input
                        v-model="keyword"
                        placeholder="搜索问题、知识点或答案…"
                        aria-label="搜索面试题"
                        @input="focused = null" /></div
                ><label class="review-mode"
                    ><SlidersHorizontal :size="14" /><select
                        v-model="mode"
                        aria-label="题目范围"
                        @change="focused = null"
                        ><option>全部题目</option
                        ><option>我的收藏</option
                        ><option>待复习</option></select
                    ></label
                ><span class="muted">共 {{ filtered.length }} 题</span
                ><button v-if="focused" class="button small link" @click="focused = null">显示全部</button></div
            ></div
        >
        <div v-if="!visible.length" class="panel empty-state"
            ><CircleHelp :size="30" /><p>当前条件下没有题目</p
            ><button class="button small" @click="resetFilter">清除筛选</button></div
        >
        <div class="question-list"
            ><!-- 列表身份使用 q.id，序号只负责显示；收藏/筛选变化时不要用序号代替业务身份。 -->
            <article v-for="(q, index) in visible" :key="q.id" class="panel review-question"
                ><div class="review-question-top"
                    ><span class="question-id">{{ String(index + 1).padStart(2, "0") }}</span
                    ><span class="tag green">{{ q.category }}</span
                    ><span class="tag">{{ q.level }}</span
                    ><button
                        class="icon-button favorite-button"
                        :class="{ selected: learning.favorites.includes(q.id) }"
                        :aria-label="learning.favorites.includes(q.id) ? '取消收藏' : '收藏题目'"
                        @click="learning.toggleFavorite(q.id)"
                        ><Bookmark
                            :size="16"
                            :fill="learning.favorites.includes(q.id) ? 'currentColor' : 'none'" /></button></div
                ><h2>{{ q.question }}</h2
                ><details
                    ><summary>展开回答要点<span>先给自己 30 秒</span></summary
                    ><div class="answer-copy">{{ q.answer }}</div></details
                ><div class="question-footer"
                    ><RouterLink :to="q.path">{{ q.lesson }}<ArrowUpRight :size="12" /></RouterLink
                    ><button
                        class="button small"
                        :class="learning.mastered.includes(q.id) ? 'primary' : 'secondary'"
                        @click="learning.toggleMastered(q.id)"
                        ><CheckCircle2 :size="13" />{{
                            learning.mastered.includes(q.id) ? "已掌握 · 取消标记" : "标记掌握"
                        }}</button
                    ></div
                ></article
            ></div
        >
        <p v-if="learning.storageError" class="callout">{{ learning.storageError }}</p>
    </section>
</template>
<style scoped>
.review-summary {
    display: flex;
    align-items: center;
    gap: 25px;
    margin-bottom: 22px;
    font-size: 11px;
    color: var(--text-secondary);
    flex-wrap: wrap;
}
.review-summary > span {
    display: flex;
    align-items: center;
    gap: 7px;
}
.review-summary svg {
    color: var(--primary);
}
.review-summary strong {
    color: var(--text);
    font: 600 16px var(--font-mono);
}
.review-summary small {
    font-size: 10px;
    color: var(--muted);
    margin-left: auto;
}
.interview-filter {
    margin-bottom: 20px;
}
.category-tabs {
    display: flex;
    gap: 6px;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
}
.category-tabs button {
    border: 0;
    background: transparent;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 12px;
    color: var(--text-secondary);
}
.category-tabs button.active {
    background: var(--primary-soft);
    color: var(--primary);
    font-weight: 600;
}
.category-tabs button span {
    font-size: 9px;
    margin-left: 6px;
    opacity: 0.7;
}
.filter-row {
    display: flex;
    align-items: center;
    gap: 17px;
    padding: 15px 20px;
    flex-wrap: wrap;
}
.interview-search {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 180px;
    color: var(--muted);
}
.interview-search input {
    border: 0;
    outline: none;
    background: transparent;
    color: var(--text);
    font-size: 12px;
    width: 100%;
}
.review-mode {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
}
.review-mode select {
    background: transparent;
    border: 0;
    color: var(--text-secondary);
    font-size: 11px;
    max-width: 110px;
}
.question-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    align-items: start;
}
.review-question {
    padding: 20px 22px;
}
.review-question-top {
    display: flex;
    align-items: center;
    gap: 7px;
}
.question-id {
    font: 10px var(--font-mono);
    color: var(--muted);
    margin-right: 4px;
}
.favorite-button {
    margin-left: auto;
}
.favorite-button.selected {
    color: var(--primary);
}
.review-question h2 {
    font-size: 14px;
    line-height: 1.9;
    font-weight: 600;
    margin: 14px 0;
}
.review-question details {
    border-top: 1px solid var(--border);
    padding-top: 12px;
}
.review-question summary {
    font-size: 11px;
    color: var(--primary);
    cursor: pointer;
}
.review-question summary span {
    color: var(--muted);
    font-size: 9px;
    margin-left: 12px;
}
.answer-copy {
    font-size: 12px;
    line-height: 1.95;
    color: var(--text-secondary);
    margin: 14px 0;
    white-space: pre-line;
    overflow-wrap: anywhere;
}
.question-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-top: 18px;
}
.question-footer a {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    color: var(--muted);
}
.question-footer a:hover {
    color: var(--primary);
}
.question-footer button {
    font-size: 10px;
}
.empty-state p {
    margin-top: 12px;
}
@media (max-width: 1000px) {
    .question-list {
        grid-template-columns: 1fr;
    }
    .review-summary small {
        margin-left: 0;
    }
}
@media (max-width: 520px) {
    .review-summary {
        gap: 13px;
    }
    .review-question {
        padding: 17px;
    }
    .question-footer {
        flex-wrap: wrap;
    }
    .filter-row {
        gap: 12px;
        padding: 14px 16px;
    }
    .category-tabs {
        padding: 12px;
    }
}
</style>
