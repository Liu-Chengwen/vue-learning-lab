<script setup>
/**
 * 异步实验：分开观察浏览器任务调度、Promise 聚合与请求结果归属。
 * setTimeout 模拟可控延迟，日志来自真实回调；它不是网络性能测试或 Node 调度规则模拟器。
 */
import { nextTick, onBeforeUnmount, ref } from "vue";
import ConsoleOutput from "./ConsoleOutput.vue";
import { useExperimentLog } from "./useExperimentLog";

const { logs, running, log, later, cancelTimer, clear, currentGeneration, isCurrent } = useExperimentLog();
// mode/aggregate 是实验选择；jobs 只显示底层任务状态，聚合 Promise 可能比所有 jobs 更早结束。
const mode = ref("loop");
const aggregate = ref("allSettled");
const withFailure = ref(true);
const jobs = ref([]);
const protect = ref(true);
const abortPrevious = ref(false);
const search = ref("");
const result = ref("尚未查询");
const searchLoading = ref(false);
// 请求序号区分同一轮内的新旧搜索，generation 区分重置/卸载前后的实验轮次，两层保护职责不同。
const controllers = new Set();
let lastController;
let requestId = 0;

/**
 * 返回一个可取消的模拟异步任务：value 为成功值，milliseconds 为延迟，fail 决定是否拒绝。
 * AbortController 是宿主 API；这里只让模拟工作响应 signal，不是 Promise 自带取消能力。
 */
function delayedTask(value, milliseconds, fail, signal) {
    return new Promise((resolve, reject) => {
        const onAbort = () => {
            cancelTimer(timer);
            reject(new DOMException("任务已取消", "AbortError"));
        };
        const timer = later(() => {
            // 正常结束时移除 abort 监听，避免已完成任务继续持有无用回调。
            signal?.removeEventListener("abort", onAbort);
            fail ? reject(new Error(`${value} 请求失败`)) : resolve(value);
        }, milliseconds);
        if (signal?.aborted) onAbort();
        else signal?.addEventListener("abort", onAbort, { once: true });
    });
}
function reset() {
    // 先终止任务，再使旧代次失效，所有旧 promise 的结果都不能写入新实验。
    controllers.forEach((controller) => controller.abort());
    controllers.clear();
    lastController = undefined;
    requestId++;
    // clear 递增 generation。上面的 abort 会异步触发 rejection 回调，随后这些回调因轮次失效被忽略。
    clear();
    jobs.value = [];
    searchLoading.value = false;
    result.value = "尚未查询";
}
function runLoop() {
    reset();
    const token = currentGeneration();
    running.value = true;
    log("同步 ①", "script start");
    // 已 fulfilled 的 Promise 也不会让 then 同步执行；reaction 要进入微任务队列。
    Promise.resolve().then(() => {
        if (isCurrent(token)) log("Promise reaction", "Promise.then 微任务");
    });
    queueMicrotask(() => {
        if (isCurrent(token)) log("queueMicrotask", "显式微任务");
    });
    // await 暂停当前 async 函数的后续部分，不阻塞整段脚本；恢复逻辑由后续调度执行。
    (async () => {
        await Promise.resolve();
        if (isCurrent(token)) log("await 之后", "async 函数恢复执行");
    })();
    later(() => {
        log("计时器任务", "setTimeout(..., 0)", "success");
        running.value = false;
    }, 0);
    log("同步 ②", "script end");
    // 日志修改会触发 Vue 更新；这里观察 Vue 的刷新承诺，不能将其解释为“所有微任务结束”。
    nextTick(() => {
        if (isCurrent(token)) log("Vue nextTick", "与此轮相关的 Vue DOM 更新已完成；不保证已经绘制");
    });
}
async function runAggregation() {
    reset();
    const token = currentGeneration();
    running.value = true;
    jobs.value = [
        { name: "A", delay: 450, fail: false, status: "pending" },
        { name: "B", delay: 180, fail: withFailure.value, status: "pending" },
        { name: "C", delay: 720, fail: false, status: "pending" }
    ];
    const started = performance.now();
    log(`Promise.${aggregate.value}`, "三个模拟任务同时开始，B 最先结束");
    // 每次运行都创建一组新任务，避免拿上轮已经 settled 的 Promise 去比较完成策略。
    const promises = jobs.value.map((job) => {
        const controller = new AbortController();
        controllers.add(controller);
        return delayedTask(`结果 ${job.name}`, job.delay, job.fail, controller.signal)
            .then(
                (value) => {
                    if (isCurrent(token)) {
                        job.status = "fulfilled";
                        log(`${job.name} fulfilled`, `${value} · ${Math.round(performance.now() - started)}ms`);
                    }
                    return value;
                },
                (error) => {
                    if (isCurrent(token)) {
                        job.status = "rejected";
                        log(`${job.name} rejected`, error, "error");
                    }
                    // 必须重新抛出：只记日志后吞掉错误，会把该输入变成 fulfilled，掩盖聚合差异。
                    throw error;
                }
            )
            .finally(() => controllers.delete(controller));
    });
    try {
        const value = await Promise[aggregate.value](promises);
        if (isCurrent(token)) log(`聚合 fulfilled · ${Math.round(performance.now() - started)}ms`, value, "success");
    } catch (error) {
        if (isCurrent(token)) log(`聚合 rejected · ${Math.round(performance.now() - started)}ms`, error, "error");
    }
    // all / race / any 先结束时，其他任务仍继续。额外等待只为展示完整执行过程。
    // running 在全部底层任务结束后才复位，日志因此能展示“聚合已结束，但其他任务还继续”。
    await Promise.allSettled(promises);
    if (isCurrent(token)) {
        running.value = false;
        log("所有底层任务已结束", "聚合结果不会自动取消其余任务");
    }
}
async function runSearch(value, milliseconds) {
    const token = currentGeneration();
    const id = ++requestId;
    // 取消上一轮实际工作与丢弃过期结果是两种机制，控件允许分别开启进行对比。
    if (abortPrevious.value) lastController?.abort();
    const controller = new AbortController();
    lastController = controller;
    controllers.add(controller);
    searchLoading.value = true;
    log(`发起 #${id}`, `${value} · 模拟 ${milliseconds}ms`);
    try {
        const valueResult = await delayedTask(value, milliseconds, false, controller.signal);
        if (!isCurrent(token)) return;
        // protect 关闭是刻意保留的错误示例：旧查询晚返回时会覆盖新查询，不应照搬到业务。
        if (protect.value && id !== requestId) {
            log(`忽略过期 #${id}`, valueResult);
            return;
        }
        result.value = `查询结果：${valueResult}`;
        log(`写入页面 #${id}`, valueResult, id === requestId ? "success" : "error");
    } catch (error) {
        if (isCurrent(token)) log(`请求 #${id}`, error, error.name === "AbortError" ? "info" : "error");
    } finally {
        controllers.delete(controller);
        // 保护不仅应用于 data；旧请求也不能错误地把新请求的 loading 提前关闭。
        if (isCurrent(token) && (!protect.value || id === requestId)) searchLoading.value = false;
    }
}
function simulateRace() {
    // 先发慢旧查询，再发快新查询，稳定复现“发起顺序与完成顺序不同”，而非依赖随机网络。
    reset();
    search.value = "Vue 3";
    void runSearch("Vue（旧条件）", 900);
    later(() => {
        void runSearch("Vue 3（新条件）", 180);
    }, 60);
}
function manualSearch() {
    if (search.value.trim()) void runSearch(search.value.trim(), 400 + search.value.length * 40);
}
onBeforeUnmount(() => {
    // 本组件释放控制器，useExperimentLog 释放其登记的计时器并失效轮次；两者共同防止离开后的更新。
    controllers.forEach((controller) => controller.abort());
    controllers.clear();
});
</script>

<template>
    <section class="stack async-lab">
        <div class="row lab-toolbar"
            ><div class="tabs"
                ><button
                    class="tab"
                    :class="{ active: mode === 'loop' }"
                    @click="
                        mode = 'loop';
                        reset();
                    "
                    >执行顺序</button
                ><button
                    class="tab"
                    :class="{ active: mode === 'aggregate' }"
                    @click="
                        mode = 'aggregate';
                        reset();
                    "
                    >Promise 聚合</button
                ><button
                    class="tab"
                    :class="{ active: mode === 'race' }"
                    @click="
                        mode = 'race';
                        reset();
                    "
                    >请求竞态</button
                ></div
            ><button class="button secondary small" @click="reset">重置 / 取消</button></div
        >
        <template v-if="mode === 'loop'">
            <pre class="code-block">
log('script start');
Promise.resolve().then(() => log('Promise.then'));
queueMicrotask(() => log('queueMicrotask'));
(async () => { await Promise.resolve(); log('await 之后'); })();
setTimeout(() => log('timer'), 0);
log('script end');</pre
            ><p class="callout"
                >先写下预测顺序。实验额外记录 nextTick，观察 Vue 的 DOM 更新与原生 JavaScript 微任务的关系。</p
            ><button class="button primary" :disabled="running" @click="runLoop">运行执行顺序实验</button>
        </template>
        <template v-else-if="mode === 'aggregate'">
            <div class="row"
                ><label class="field"
                    >聚合策略<select v-model="aggregate" class="control"
                        ><option>all</option
                        ><option>allSettled</option
                        ><option>race</option
                        ><option>any</option></select
                    ></label
                ><label class="check"
                    ><input v-model="withFailure" type="checkbox" :disabled="running" /> B 请求失败</label
                ></div
            ><div class="jobs"
                ><article
                    v-for="job in jobs.length
                        ? jobs
                        : [
                              { name: 'A', delay: 450 },
                              { name: 'B', delay: 180 },
                              { name: 'C', delay: 720 }
                          ]"
                    :key="job.name"
                    :class="job.status"
                    ><strong>{{ job.name }}</strong
                    ><span>{{ job.delay }}ms</span><small>{{ job.status || "等待运行" }}</small></article
                ></div
            ><button class="button primary" :disabled="running" @click="runAggregation">{{
                running ? "等待底层任务完成…" : `运行 Promise.${aggregate}`
            }}</button
            ><p class="muted small-note">all / race 为 ES2015，allSettled 为 ES2020，any 为 ES2021。</p>
        </template>
        <template v-else>
            <div class="row"
                ><label class="check"><input v-model="protect" type="checkbox" /> 仅最新请求可以写入结果</label
                ><label class="check"><input v-model="abortPrevious" type="checkbox" /> 额外取消上一个请求</label></div
            ><div class="row"
                ><input
                    v-model="search"
                    class="control search-input"
                    placeholder="查询关键词"
                    @keyup.enter="manualSearch"
                /><button class="button secondary" @click="manualSearch">查询</button
                ><button class="button primary" @click="simulateRace">模拟快速切换条件</button></div
            ><div class="search-result"
                ><span>{{ searchLoading ? "请求进行中…" : "当前页面结果" }}</span
                ><strong>{{ result }}</strong></div
            ><p class="callout"
                >旧查询延迟 900ms，新查询延迟 180ms。先关闭保护观察旧结果覆盖，再开启保护或取消，比较真实执行日志。</p
            >
        </template>
        <ConsoleOutput :logs="logs" />
    </section>
</template>

<style scoped>
.async-lab {
    gap: 22px;
}
.lab-toolbar {
    justify-content: space-between;
    flex-wrap: wrap;
}
.field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 12px;
    font-weight: 600;
}
.check {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
}
.check input {
    accent-color: #267857;
}
.small-note {
    font-size: 11px;
    line-height: 1.8;
}
.jobs {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
}
.jobs article {
    padding: 22px;
    background: var(--surface-soft, #f5f7f2);
    border: 1px solid var(--border, #e0e6dc);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.jobs strong {
    font-size: 24px;
    font-weight: 500;
}
.jobs span {
    font: 12px monospace;
    color: var(--muted, #7b887b);
}
.jobs small {
    font: 10px monospace;
    color: var(--muted, #7b887b);
}
.jobs .fulfilled {
    border-color: #8cb89a;
    background: #eef7ef;
    color: #267857;
}
.jobs .rejected {
    border-color: #d8a69e;
    background: #fcf0ed;
    color: #9c4f43;
}
.search-input {
    flex: 1;
    min-width: 120px;
}
.search-result {
    padding: 26px;
    border: 1px solid var(--border, #dfe7dc);
    border-radius: 10px;
    background: var(--surface-soft, #f5f8f1);
    display: flex;
    flex-direction: column;
    gap: 14px;
}
.search-result span {
    font-size: 11px;
    color: var(--muted, #778375);
}
.search-result strong {
    font-size: 19px;
    font-weight: 500;
}
@media (max-width: 600px) {
    .jobs article {
        padding: 15px;
    }
    .async-lab .row {
        flex-wrap: wrap;
    }
}
</style>
