<script setup>
/**
 * 模板指令实验：用相同任务数据对比稳定 ID、索引 key，以及 v-if / v-show 的组件行为。
 * DraftRow 故意只读取一次 props 初值来保留本地草稿，重排列表时才能观察组件身份差异。
 * 任务与筛选条件由本页持有，子项只管理自己的草稿，不把演示中的错误用法当作业务默认方案。
 */
import { ref, computed } from "vue";
import DraftRow from "./components/DraftRow.vue";
import MountProbe from "./components/MountProbe.vue";
import LabLog from "./LabLog.vue";
import { useLabLog } from "./useLabLog";
// 工厂每次返回新数组/对象，避免 reverse 或编辑行为污染后续重置的基准数据。
const seed = () => [
    { id: "A", title: "理解 ref" },
    { id: "B", title: "练习插槽" },
    { id: "C", title: "复习 key" }
];
const tasks = ref(seed());
const keyword = ref("");
// 先派生筛选结果再 v-for；不在同一个元素上混用 v-if/v-for 的作用域与优先级。
const visible = computed(() => tasks.value.filter((item) => item.title.includes(keyword.value)));
const showIf = ref(true),
    showDisplay = ref(true),
    resetKey = ref(0),
    isGreen = ref(true);
const { entries, log, clear } = useLabLog();
// v-html 仅展示代码中定义的可信内容，不接收输入框或网络内容。
const trustedHtml = "<strong>可信静态片段</strong> · 不要直接渲染未知 HTML";
// 原地数组方法也能驱动 Vue 3 更新。列表的业务 ID 不变，改变的只是展示顺序。
function reverse() {
    tasks.value.reverse();
    log("列表已反转：比较输入草稿是否仍跟随对应 ID。");
}
function reset() {
    tasks.value = seed();
    keyword.value = "";
    showIf.value = true;
    showDisplay.value = true;
    // 仅恢复任务数据不足以清空 DraftRow 的局部 ref；更换外层 key 才会重建全部草稿实例。
    resetKey.value++;
    clear();
}
</script>
<template>
    <div class="vue-experiment">
        <div class="demo-row demo-toolbar"
            ><button class="button primary" @click="reverse">反转列表</button
            ><button class="button secondary" @click="reset">重置</button
            ><label class="demo-row demo-note"><input v-model="isGreen" type="checkbox" />动态 class/style</label></div
        >
        <label class="demo-field"
            >筛选（v-model.trim，回车记录）<input
                v-model.trim="keyword"
                placeholder="例如：ref"
                @keyup.enter="log(`提交关键词：${keyword || '全部'}`)"
        /></label>
        <div
            :key="resetKey"
            class="demo-grid"
            :class="{ 'green-demo': isGreen }"
            :style="{ '--demo-accent': isGreen ? '#267857' : '#667085' }"
        >
            <section class="demo-card"
                ><h3>稳定 ID 作为 key</h3><p class="demo-note">先改一个草稿，再反转列表。</p
                ><DraftRow v-for="task in visible" :key="task.id" :task="task" /><p v-if="!visible.length" class="muted"
                    >没有匹配任务。</p
                ></section
            >
            <section class="demo-card"
                ><h3>索引作为 key · 问题示例</h3><p class="demo-note">组件按位置复用，本地草稿可能错位。</p
                ><DraftRow v-for="(task, index) in visible" :key="index" :task="task" /><p
                    v-if="!visible.length"
                    class="muted"
                    >没有匹配任务。</p
                ></section
            >
        </div>
        <div class="demo-grid demo-section" style="margin-top: 20px">
            <section class="demo-card"
                ><h3>v-if · 创建与销毁</h3
                ><button class="button secondary small" @click="showIf = !showIf">切换 v-if</button
                ><MountProbe v-if="showIf" name="v-if" @log="log" /><p v-else class="demo-note"
                    >分支已卸载。</p
                ></section
            >
            <section class="demo-card"
                ><h3>v-show · 只改变显示</h3
                ><button class="button secondary small" @click="showDisplay = !showDisplay">切换 v-show</button
                ><MountProbe v-show="showDisplay" name="v-show" @log="log" /><p class="demo-note"
                    >节点仍在 DOM 中，观察是否产生卸载日志。</p
                ></section
            >
        </div>
        <div class="demo-result"><span v-text="'v-text：把内容当作文本。'" /><br /><span v-html="trustedHtml" /></div>
        <LabLog :entries="entries" @clear="clear" />
    </div>
</template>
<style scoped>
.green-demo .demo-card {
    border-top: 3px solid var(--demo-accent);
}
</style>
