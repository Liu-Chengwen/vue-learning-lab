<script setup>
/**
 * 日志观察组件：接收父级 entries，仅管理“显示暂停”的局部状态。
 * 暂停会保存当前字符串数组的浅拷贝，不会停止计时器、请求或生命周期；继续时显示最新记录。
 * 清空通过事件交还父级处理，因此观察区不需要知道日志是由哪个实验产生的。
 */
import { computed, ref } from "vue";
const props = defineProps({ entries: { type: Array, default: () => [] } });
const emit = defineEmits(["clear"]);
// paused/snapshot 是观察器自身的 UI 状态，与实验父级拥有的 entries 分开。
const paused = ref(false);
const snapshot = ref([]);
// computed 只选择数据源，不在这里请求、计时或修改父级日志。
const displayed = computed(() => (paused.value ? snapshot.value : props.entries));
// 暂停仅冻结观察区，不暂停实验本身；便于阅读持续到来的生命周期/计时器记录。
function togglePause() {
    if (!paused.value) snapshot.value = [...props.entries];
    paused.value = !paused.value;
}
// 暂停状态下也先清空可见快照，再通知父级清空其缓冲区；保持单向数据流。
function clear() {
    snapshot.value = [];
    emit("clear");
}
</script>
<template>
    <div class="lab-log">
        <div class="row log-heading"
            ><strong>观察记录{{ paused ? " · 已暂停显示" : "" }}</strong
            ><div class="row"
                ><button class="button small secondary" @click="togglePause">{{
                    paused ? "继续观察" : "暂停观察"
                }}</button
                ><button class="button small secondary" @click="clear">清空</button></div
            ></div
        >
        <ol v-if="displayed.length" aria-live="polite"
            ><li v-for="(entry, index) in displayed" :key="`${index}-${entry}`">{{ entry }}</li></ol
        >
        <p v-else class="muted">操作上方示例，观察真实运行结果。</p>
    </div>
</template>
<style scoped>
.lab-log {
    margin-top: 20px;
    background: var(--lab-log-bg, #172b27);
    color: #d7e8df;
    border-radius: 12px;
    padding: 18px 20px;
}
.log-heading {
    justify-content: space-between;
    margin-bottom: 12px;
}
.lab-log ol {
    list-style: none;
    padding: 0;
    margin: 0;
    max-height: 230px;
    overflow: auto;
    font:
        12px/1.9 ui-monospace,
        SFMono-Regular,
        monospace;
}
.lab-log li {
    padding: 3px 0;
    border-bottom: 1px solid #ffffff0c;
    overflow-wrap: anywhere;
}
.lab-log .muted {
    color: #9cb5a9;
    font-size: 13px;
}
.log-heading .button {
    color: #d7e8df;
    border-color: #ffffff33;
    background: transparent;
}
</style>
