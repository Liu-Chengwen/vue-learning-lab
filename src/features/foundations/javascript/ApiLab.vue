<script setup>
/**
 * API 工具箱容器：负责筛选、选择与执行，具体语言行为放在 apiExamples 的可审阅函数中。
 * 输入只是字符串数据；展示代码不会被 eval，也不会当模板编译执行。
 */
import { computed, ref, watch } from "vue";
import { es2015Examples, modernExamples } from "./apiExamples";
import { useExperimentLog } from "./useExperimentLog";
import ConsoleOutput from "./ConsoleOutput.vue";

const props = defineProps({ topic: { type: String, default: "es2015" } });
// 切换专题由外层 key 创建新实例；当前组件只从两组固定目录中派生筛选结果。
const allExamples = computed(() => (props.topic === "modern" ? modernExamples : es2015Examples));
const selectedId = ref(props.topic === "modern" ? "nullish" : "destructure");
const query = ref("");
const group = ref("全部");
const input = ref("Vue,JS,Vue");
const { logs, running, log, clear, currentGeneration, isCurrent } = useExperimentLog();
const groups = computed(() => ["全部", ...new Set(allExamples.value.map((item) => item.group))]);
const filtered = computed(() =>
    allExamples.value.filter(
        (item) =>
            (group.value === "全部" || item.group === group.value) &&
            `${item.title} ${item.year} ${item.note}`.toLowerCase().includes(query.value.toLowerCase())
    )
);
const selected = computed(() => allExamples.value.find((item) => item.id === selectedId.value) || allExamples.value[0]);
// 只有部分较新的方法声明 supported 存在性检测。这不是对旧浏览器全部语法/API 的兼容保证。
const supported = computed(() => !selected.value.supported || selected.value.supported());
// 换例子会使旧执行轮次失效，避免慢 Promise 的结果写到另一个 API 示例下面。
watch(selectedId, clear);

async function run() {
    clear();
    const token = currentGeneration();
    // 在 await 前保存当前条目；操作过程中即使选中项变化，也不会把旧结果误标成新 API。
    const item = selected.value;
    running.value = true;
    if (!supported.value) {
        log("当前环境未支持", "可查看对应源码，并用复制后排序等替代方案。语法转换不会自动补齐标准库 API。", "error");
        running.value = false;
        return;
    }
    try {
        log("当前输入", input.value);
        // 同一入口支持普通返回值与 Promise。第二个参数是可选中间日志回调，便于观察 get/set 等过程。
        const result = await item.run(input.value, (label, value) => {
            if (isCurrent(token)) log(label, value);
        });
        if (isCurrent(token)) log(item.title, result, "success");
    } catch (error) {
        if (isCurrent(token)) log("实际执行异常", error, "error");
    } finally {
        if (isCurrent(token)) running.value = false;
    }
}
</script>

<template>
    <section class="stack api-lab">
        <div class="api-intro"
            ><div
                ><span class="tag">{{ topic === "modern" ? "ES2016 → ES2023 + WEB API" : "ES2015 / ES6" }}</span
                ><h3>先选对工具，再写代码</h3><p class="muted">每个例子都有真实返回值、修改性说明与边界提示。</p></div
            ><span class="api-count">{{ allExamples.length }}<small>组可运行示例</small></span></div
        >
        <div class="api-filters"
            ><input v-model="query" class="control" placeholder="搜索 API、年份或关键字" aria-label="搜索 API" /><select
                v-model="group"
                class="control"
                aria-label="API 分类"
                ><option v-for="item in groups" :key="item">{{ item }}</option></select
            ></div
        >
        <div class="api-layout"
            ><nav class="api-list" aria-label="选择 API 示例"
                ><button
                    v-for="item in filtered"
                    :key="item.id"
                    :class="{ selected: item.id === selectedId }"
                    @click="selectedId = item.id"
                    ><span>{{ item.title }}</span
                    ><small>{{ typeof item.year === "number" ? `ES${item.year}` : item.year }}</small></button
                ><p v-if="!filtered.length" class="muted no-results">没有找到，试试其他关键词。</p></nav
            ><div class="api-detail stack"
                ><div class="api-title"
                    ><h4>{{ selected.title }}</h4
                    ><span class="tag">{{
                        typeof selected.year === "number" ? `ES${selected.year}` : selected.year
                    }}</span></div
                ><dl class="api-facts"
                    ><div
                        ><dt>返回值</dt><dd>{{ selected.returns }}</dd></div
                    ><div
                        ><dt>数据修改</dt><dd>{{ selected.mutates }}</dd></div
                    ><div
                        ><dt>当前环境</dt><dd>{{ supported ? "支持，可以直接运行" : "暂不支持此 API" }}</dd></div
                    ></dl
                ><pre class="code-block">{{ selected.code }}</pre
                ><label class="field"
                    >示例输入（部分例子使用固定数据）<input v-model="input" class="control" maxlength="80" /></label
                ><div class="row"
                    ><button class="button primary" :disabled="running" @click="run">{{
                        running ? "执行中…" : "运行这个例子"
                    }}</button
                    ><button class="button secondary" @click="clear">清空输出</button></div
                ><p v-if="selected.note" class="callout">{{ selected.note }}</p></div
            ></div
        >
        <ConsoleOutput :logs="logs" />
    </section>
</template>

<style scoped>
.api-lab {
    gap: 22px;
}
.api-intro {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
}
.api-intro h3 {
    font-size: 18px;
    margin: 12px 0 8px;
}
.api-intro p {
    font-size: 12px;
    margin: 0;
}
.api-count {
    font-size: 34px;
    font-variant-numeric: tabular-nums;
    color: var(--accent, #267857);
    text-align: right;
}
.api-count small {
    display: block;
    font-size: 10px;
    color: var(--muted, #7c897b);
    margin-top: 3px;
    white-space: nowrap;
}
.api-filters {
    display: grid;
    grid-template-columns: 1fr 170px;
    gap: 12px;
}
.api-layout {
    display: grid;
    grid-template-columns: 200px minmax(0, 1fr);
    gap: 24px;
}
.api-list {
    display: flex;
    flex-direction: column;
    gap: 5px;
    max-height: 630px;
    overflow: auto;
    padding-right: 6px;
}
.api-list button {
    text-align: left;
    border: 1px solid transparent;
    background: transparent;
    padding: 13px;
    border-radius: 7px;
    cursor: pointer;
    color: var(--text, #27392b);
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.api-list button:hover {
    background: var(--surface-soft, #f6f8f3);
}
.api-list button.selected {
    background: #edf5ed;
    border-color: #d2e3d3;
    color: #267857;
}
.api-list span {
    font-size: 12px;
}
.api-list small {
    font: 9px monospace;
    opacity: 0.6;
}
.api-detail {
    min-width: 0;
    gap: 16px;
}
.api-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
}
.api-title h4 {
    font-size: 15px;
    margin: 0;
}
.api-facts {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 11px;
}
.api-facts > div {
    display: grid;
    grid-template-columns: 65px 1fr;
    gap: 12px;
}
.api-facts dt {
    color: var(--muted, #829080);
}
.api-facts dd {
    margin: 0;
    line-height: 1.6;
}
.field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 11px;
    font-weight: 600;
}
.no-results {
    font-size: 12px;
    line-height: 1.8;
    padding: 12px;
}
@media (max-width: 740px) {
    .api-layout {
        grid-template-columns: 1fr;
    }
    .api-list {
        max-height: 160px;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
    }
    .api-filters {
        grid-template-columns: 1fr 120px;
    }
    .api-list button {
        padding: 10px;
    }
}
</style>
