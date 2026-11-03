<script setup>
/**
 * 纯展示组件：接收已经格式化的日志，不推断实验结果，也不持有计时器或请求。
 * 文本通过插值输出，不把日志当 HTML 执行；保存的是可阅读快照，不是浏览器控制台的对象引用视图。
 */
defineProps({ logs: { type: Array, default: () => [] }, title: { type: String, default: "执行结果" } });
</script>

<template>
    <div class="console-output" aria-live="polite" aria-atomic="false">
        <div class="console-heading"
            ><span><i></i>{{ title }}</span
            ><small>{{ logs.length }} 条记录 · 实际执行</small></div
        >
        <div v-if="!logs.length" class="console-empty">先预测结果，再点击运行。输出会出现在这里。</div>
        <ol v-else
            ><li v-for="(entry, index) in logs" :key="entry.id" :class="entry.type"
                ><span class="line-number">{{ String(index + 1).padStart(2, "0") }}</span
                ><div
                    ><span class="entry-label">{{ entry.label }}</span
                    ><pre>{{ entry.value }}</pre>
                </div></li
            ></ol
        >
    </div>
</template>

<style scoped>
/* 输出区独立滚动，限制长日志对实验布局的影响；编号仅表示当前列表顺序，不代表任务调度优先级。 */
.console-output {
    background: #19251f;
    color: #dce8df;
    border: 1px solid #2c3d32;
    border-radius: 12px;
    overflow: hidden;
}
.console-heading {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 18px;
    border-bottom: 1px solid #334338;
    font-size: 12px;
}
.console-heading > span {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}
.console-heading i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #90c6a2;
}
.console-heading small {
    font-size: 10px;
    color: #8d9e91;
}
.console-empty {
    color: #8d9e91;
    font-size: 12px;
    padding: 32px 22px;
}
ol {
    list-style: none;
    padding: 8px 0;
    margin: 0;
    max-height: 410px;
    overflow: auto;
}
li {
    display: grid;
    grid-template-columns: 30px 1fr;
    gap: 9px;
    padding: 9px 18px;
    font-size: 12px;
}
.line-number {
    color: #657c6c;
    font: 10px/1.7 monospace;
}
.entry-label {
    color: #9eb4a6;
    font-size: 10px;
}
pre {
    margin: 4px 0 0;
    white-space: pre-wrap;
    word-break: break-word;
    font:
        12px/1.7 "SFMono-Regular",
        Consolas,
        monospace;
    color: #e0ece3;
}
li.error pre {
    color: #edb2a9;
}
li.success pre {
    color: #a5d7b3;
}
</style>
