<script setup>
/**
 * 基础机制实验集合：同一组件按 topic 展示作用域、this、闭包、拷贝、事件、防抖和模块化。
 * 当前文件运行在 ES module 严格模式中，所有结果来自真实调用；展示用代码字符串不会被执行。
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import ConsoleOutput from "./ConsoleOutput.vue";
import { useExperimentLog } from "./useExperimentLog";
import { sharedCount, incrementShared, resetShared, makeLocalCounter, loadedAt } from "./sharedCounter";

const props = defineProps({ topic: { type: String, default: "this" } });
const { logs, running, log, later, cancelTimer, clear, currentGeneration, isCurrent } = useExperimentLog();
// 这些 ref 是实验控件与可视化状态，不会因为来自同一组件就变成模块级共享数据。
const mode = ref("method");
const name = ref("Vue 学习者");
const query = ref("");
const delay = ref(500);
const triggers = ref(0);
const executions = ref(0);
const debounce = ref(true);
const stopBubble = ref(false);
const listenerEnabled = ref(true);
const eventButton = ref(null);
const draftMode = ref("shallow");
const captureListener = ref(false);
// Vue 只负责把数字显示出来；计数器真正的私有状态保存在 createCounter 创建的词法环境中。
const stateA = ref(0);
const stateB = ref(0);
function createCounter() {
    // 每次调用创建一个新 value，返回的 next/read 共享这一轮工厂调用的环境。
    let value = 0;
    return { next: () => ++value, read: () => value };
}
let counterA = createCounter();
let counterB = createCounter();
let localA = makeLocalCounter();
let localB = makeLocalCounter();
let debounceTimer;
let lastExecution = -Infinity; // 首次节流事件可立即通过，后续按 performance.now 的时间窗口判断。

// 以下字符串是便于预测的摘录。实际实验分别由 runScope、runThis 等函数执行，并记录真实返回值。
const scopeCode = `const callbacks = [];
for (var i = 0; i < 3; i++) callbacks.push(() => i);
callbacks.map(fn => fn()); // 先预测

const callbacksWithLet = [];
for (let j = 0; j < 3; j++) callbacksWithLet.push(() => j);
callbacksWithLet.map(fn => fn());`;
const thisCode = computed(
    () =>
        ({
            method: `const user = { name: "${name.value}", read() { return this?.name; } };
user.read();`,
            detached: `const read = user.read;
read(); // ES module：独立调用`,
            explicit: `user.read.call({ name: "另一个接收者" });
user.read.apply({ name: "apply 接收者" }, []);
const bound = user.read.bind(user);
bound.call({ name: "无法覆盖 bind" });`,
            arrow: `function makeReader() {
  return () => this?.name;
}
const arrow = makeReader.call({ name: "词法 this" });
arrow.call({ name: "新的接收者" });`
        })[mode.value]
);
const basicsCode = computed(() => {
    if (props.topic === "scope") return scopeCode;
    if (props.topic === "this") return thisCode.value;
    if (props.topic === "closures")
        return `function createCounter() {
  let count = 0;
  return () => ++count;
}
const counterA = createCounter();
const counterB = createCounter(); // 不同的词法环境`;
    if (props.topic === "arrays")
        return `const original = { title: "学习 Vue", detail: { hours: 2 } };
const draft = { ...original }; // 只复制一层
draft.detail.hours = 8;
// original.detail.hours 会变成什么？`;
    if (props.topic === "functions")
        return `let timer;
function debouncedSearch(value) {
  clearTimeout(timer);
  timer = setTimeout(() => search(value), ${delay.value});
}
// 卸载和取消时也要 clearTimeout(timer)`;
    if (props.topic === "events")
        return `parent.addEventListener("click", captureHandler, true);
button.addEventListener("click", buttonHandler);
parent.addEventListener("click", bubbleHandler);
// removeEventListener 要匹配函数引用与 capture`;
    return `// sharedCounter.js
export let sharedCount = 0;
export function incrementShared() { sharedCount++; }

// 当前模块
import { sharedCount, incrementShared } from "./sharedCounter";
incrementShared(); // 导入方读取到 live binding 的新值`;
});

function runScope() {
    clear();
    const callbacks = [];
    // var 刻意保留，用于比较函数作用域与每轮迭代绑定。
    for (var i = 0; i < 3; i++) callbacks.push(() => i);
    const callbacksWithLet = [];
    for (let j = 0; j < 3; j++) callbacksWithLet.push(() => j);
    log(
        "var：三个回调共享绑定",
        callbacks.map((fn) => fn())
    );
    log(
        "let：每轮独立绑定",
        callbacksWithLet.map((fn) => fn()),
        "success"
    );
    const settings = { theme: "green" };
    // const 限制重新赋值绑定，不会递归冻结绑定所指向的对象。
    settings.theme = "purple";
    log("const 对象的内容仍能修改", settings);
    try {
        {
            // 刻意在初始化前访问 let；异常是本实验要观察的 TDZ，不是遗漏的业务错误处理。
            log("初始化前读取 let", notInitialized);
            let notInitialized = 1;
        }
    } catch (error) {
        log("暂时性死区：真实捕获的异常", error, "error");
    }
}

function runThis() {
    clear();
    const user = {
        name: name.value,
        read() {
            // 使用可选链使“独立调用”的 undefined 接收者显示为 undefined；并非默认绑定到了 window。
            return this?.name;
        }
    };
    if (mode.value === "method") log("user.read()", user.read(), "success");
    if (mode.value === "detached") {
        // 赋值只取得函数引用，不会携带原来的 user 接收者；严格模式下独立调用 this 为 undefined。
        const read = user.read;
        log("提取后的独立 read()", read());
        log("此处 read 内 this", "undefined；可选链使读取返回 undefined，而不是抛错");
    }
    if (mode.value === "explicit") {
        // call/apply 改变本次普通调用的接收者；bind 返回一个新的绑定函数，不是立即调用。
        log("call 改变本次接收者", user.read.call({ name: "另一个接收者" }));
        log("apply 接收者", user.read.apply({ name: "apply 接收者" }, []));
        const bound = user.read.bind(user);
        log("bind 后再 call", bound.call({ name: "无法覆盖 bind" }), "success");
    }
    if (mode.value === "arrow") {
        // 箭头函数捕获 makeReader 被调用时的 this，后续 call/bind 不会改写它自己的 this 绑定。
        function makeReader() {
            return () => this?.name;
        }
        const arrow = makeReader.call({ name: "词法 this" });
        log("arrow.call(新的接收者)", arrow.call({ name: "新的接收者" }));
        log("arrow.bind(新的接收者)()", arrow.bind({ name: "新的接收者" })(), "success");
    }
}

function incrementCounter(which) {
    const value = which === "a" ? counterA.next() : counterB.next();
    if (which === "a") stateA.value = value;
    else stateB.value = value;
    log(`counter${which.toUpperCase()}()`, value);
}
function captureSnapshot() {
    // snapshot 保存一次普通值读取；readCurrent 延迟到调用时读取当前 counterA，不是同一个观察时机。
    const snapshot = counterA.read();
    const readCurrent = () => counterA.read();
    stateA.value = counterA.next();
    log("捕获的普通值快照", snapshot);
    log("闭包此时读取当前环境", readCurrent(), "success");
}
function runCopies() {
    clear();
    const original = { title: "学习 Vue", detail: { hours: 2 }, tags: ["Vue", "JS"] };
    // shallow 分支刻意共享 detail/tags；另一分支只按当前数据结构复制需要编辑的层级。
    // 这不是对任意对象都适用的深拷贝算法。
    const draft =
        draftMode.value === "shallow"
            ? { ...original }
            : { ...original, detail: { ...original.detail }, tags: [...original.tags] };
    log("修改前 original", structuredClone(original));
    draft.detail.hours = 8;
    draft.tags.push("CSS");
    log("修改后的 draft", draft);
    log("此时 original", original, draftMode.value === "shallow" ? "error" : "success");
    log("original.detail === draft.detail", original.detail === draft.detail);
}
function runArrays() {
    clear();
    const original = [3, 1, 2];
    // 先复制数组容器再排序，与直接 sort 原数组对照；若元素是对象，展开仍会共享元素引用。
    const copied = [...original].sort((a, b) => a - b);
    log("复制后 sort 的结果", copied);
    log("此时原数组", [...original]);
    const returned = original.sort((a, b) => a - b);
    log("直接 sort 后原数组", original);
    log("sort 返回同一个数组", returned === original);
    const ids = new Set([1, 2, 2, 3]);
    log("Set 去重", [...ids]);
    const first = { id: 1 };
    const second = { id: 1 };
    // 内容相同不等于引用相同，Set 不会自动按 id 去重业务对象。
    log("相同内容的两个对象放入 Set", new Set([first, second]).size);
    log(
        "map/filter/reduce",
        [1, 2, 3, 4]
            .filter((n) => n % 2 === 0)
            .map((n) => n * 2)
            .reduce((sum, n) => sum + n, 0)
    );
}

function onInput(event) {
    query.value = event.target.value;
    triggers.value++;
    const value = query.value;
    if (debounce.value) {
        // trailing 防抖：每次输入先取消旧计时器；闭包保留本轮 value，直到停止输入后再执行。
        cancelTimer(debounceTimer);
        log("收到输入，重新等待", value);
        debounceTimer = later(() => executeSearch(value), delay.value);
    } else {
        // leading 节流：窗口内直接忽略，不补尾调用；本例刻意把策略写清，避免与防抖混淆。
        const now = performance.now();
        if (now - lastExecution >= delay.value) {
            lastExecution = now;
            executeSearch(value);
        } else log("节流窗口内忽略", value);
    }
}
function executeSearch(value) {
    // 这里只记录一次真正获准执行的“搜索动作”，没有把日志次数伪装成真实 HTTP 请求次数。
    executions.value++;
    log(`实际执行 #${executions.value}`, value || "（空查询）", "success");
}
function cancelPending() {
    cancelTimer(debounceTimer);
    log("取消尾调用", "等待中的防抖计时器已取消");
}
function changeStrategy() {
    // 新策略不能继承旧防抖尾调用或旧节流窗口，否则切换控件会产生难以解释的额外执行。
    cancelTimer(debounceTimer);
    lastExecution = -Infinity;
    log("切换策略", debounce.value ? "trailing debounce" : "leading throttle");
}

function nativeListener(event) {
    // target 可能是按钮里的 span；currentTarget 才是这次注册监听器的按钮节点。
    log("原生 addEventListener", { target: event.target.tagName, currentTarget: event.currentTarget.tagName });
}
function updateListener() {
    // 使用同一个命名函数引用，并匹配 capture。重新创建一个内容相同的匿名函数无法移除旧监听。
    eventButton.value?.removeEventListener("click", nativeListener, captureListener.value);
    listenerEnabled.value = !listenerEnabled.value;
    if (listenerEnabled.value) eventButton.value?.addEventListener("click", nativeListener, captureListener.value);
    log("监听状态", listenerEnabled.value ? "已添加：同一个函数引用" : "已移除：同一个函数引用");
}
function eventPhase(event, phase) {
    log(phase, {
        target: event.target.dataset.name || event.target.tagName,
        currentTarget: event.currentTarget.dataset.name || event.currentTarget.tagName,
        eventPhase: event.eventPhase
    });
    // 刻意只停止传播：它不等于 preventDefault，也不会阻止同一节点上的其他监听器继续执行。
    if (phase === "目标按钮" && stopBubble.value) event.stopPropagation();
}
async function runModules() {
    const token = currentGeneration();
    running.value = true;
    // 这一步已同步修改模块真源；动态 import 只是再次取得同一模块，并非复制模块中的数字。
    incrementShared();
    log("静态导入读取 sharedCount", sharedCount);
    try {
        const imported = await import("./sharedCounter");
        // import() 本身不能用 AbortController 取消。重置或卸载后忽略旧轮次的结果。
        if (!isCurrent(token)) return;
        log("动态 import 同一模块的 sharedCount", imported.sharedCount);
        log("静态和动态读取的模块加载时间相同", loadedAt === imported.loadedAt);
        log("两个局部计数器", { a: localA(), b: localB() });
        log("只递增局部 A", { a: localA(), shared: sharedCount }, "success");
    } catch (error) {
        if (isCurrent(token)) log("动态导入失败", error, "error");
    } finally {
        if (isCurrent(token)) running.value = false;
    }
}
function reset() {
    // 重建工厂闭包才能恢复其内部 value；仅把界面上的 stateA/stateB 归零不会重置闭包环境。
    clear();
    counterA = createCounter();
    counterB = createCounter();
    stateA.value = 0;
    stateB.value = 0;
    triggers.value = 0;
    executions.value = 0;
    query.value = "";
    lastExecution = -Infinity;
    resetShared();
    localA = makeLocalCounter();
    localB = makeLocalCounter();
}
onMounted(() => {
    // 只有事件专题挂载额外的原生监听；Vue 模板中绑定的监听由 Vue 管理，这个手动监听需自行清理。
    if (props.topic === "events") eventButton.value?.addEventListener("click", nativeListener, false);
});
onBeforeUnmount(() => eventButton.value?.removeEventListener("click", nativeListener, false));
</script>

<template>
    <section class="stack basic-lab">
        <div class="row lab-toolbar"
            ><span class="tag">PREDICT → RUN → EXPLAIN</span
            ><button class="button secondary small" @click="reset">重置实验</button></div
        >
        <template v-if="topic === 'this'">
            <div class="lab-grid"
                ><label class="field"
                    >调用方式<select v-model="mode" class="control"
                        ><option value="method">对象方法调用</option
                        ><option value="detached">提取后独立调用</option
                        ><option value="explicit">call / apply / bind</option
                        ><option value="arrow">箭头函数词法 this</option></select
                    ></label
                ><label class="field">对象名称<input v-model="name" class="control" maxlength="30" /></label
            ></div>
            <pre class="code-block">{{ basicsCode }}</pre
            ><div class="row"
                ><button class="button primary" @click="runThis">运行当前调用</button
                ><span class="muted small-note">ES module · 严格模式</span></div
            >
        </template>
        <template v-else-if="topic === 'scope'">
            <pre class="code-block">{{ basicsCode }}</pre
            ><p class="callout">先预测两个回调数组的结果：是 [0, 1, 2]，还是 [3, 3, 3]？</p
            ><button class="button primary" @click="runScope">运行作用域实验</button>
        </template>
        <template v-else-if="topic === 'closures'">
            <div class="counter-grid"
                ><article
                    ><span>独立词法环境 A</span><strong>{{ stateA }}</strong
                    ><button class="button secondary" @click="incrementCounter('a')">counterA + 1</button></article
                ><article
                    ><span>独立词法环境 B</span><strong>{{ stateB }}</strong
                    ><button class="button secondary" @click="incrementCounter('b')">counterB + 1</button></article
                ></div
            >
            <pre class="code-block">{{ basicsCode }}</pre
            ><button class="button primary" @click="captureSnapshot">捕获 A 的快照，再递增并读取</button>
        </template>
        <template v-else-if="topic === 'arrays'">
            <div class="row"
                ><label class="field"
                    >草稿复制方式<select v-model="draftMode" class="control"
                        ><option value="shallow">浅拷贝：{ ...original }</option
                        ><option value="explicit">按数据结构复制嵌套字段</option></select
                    ></label
                ></div
            ><pre class="code-block">{{ basicsCode }}</pre
            ><div class="row"
                ><button class="button primary" @click="runCopies">模拟编辑草稿</button
                ><button class="button secondary" @click="runArrays">运行排序与集合对照</button></div
            >
        </template>
        <template v-else-if="topic === 'functions'">
            <div class="lab-grid"
                ><label class="field"
                    >执行策略<select v-model="debounce" class="control" @change="changeStrategy"
                        ><option :value="true">防抖 · trailing</option
                        ><option :value="false">节流 · leading</option></select
                    ></label
                ><label class="field"
                    >时间窗口 {{ delay }}ms<input
                        v-model.number="delay"
                        type="range"
                        min="200"
                        max="1200"
                        step="100"
                        @change="changeStrategy" /></label
            ></div>
            <label class="field"
                >连续输入，观察实际执行次数<input
                    :value="query"
                    class="control"
                    placeholder="例如：Vue 组件通信"
                    @input="onInput" /></label
            ><div class="counter-grid compact"
                ><article
                    ><span>输入事件</span><strong>{{ triggers }}</strong></article
                ><article
                    ><span>实际执行</span><strong>{{ executions }}</strong></article
                ></div
            ><button class="button secondary" @click="cancelPending">取消待执行的防抖</button
            ><pre class="code-block">{{ basicsCode }}</pre>
        </template>
        <template v-else-if="topic === 'events'">
            <div class="row"
                ><label class="check"><input v-model="stopBubble" type="checkbox" /> 在目标按钮停止传播</label
                ><button class="button secondary small" @click="updateListener"
                    >{{ listenerEnabled ? "移除" : "添加" }}额外原生监听</button
                ></div
            >
            <div
                class="event-parent"
                data-name="父容器"
                @click.capture="eventPhase($event, '父级捕获')"
                @click="eventPhase($event, '父级冒泡')"
                ><span>父容器：点击内部按钮</span
                ><button
                    ref="eventButton"
                    class="button primary"
                    data-name="目标按钮"
                    @click="eventPhase($event, '目标按钮')"
                    ><span>点这里观察传播</span></button
                ></div
            ><pre class="code-block">{{ basicsCode }}</pre>
        </template>
        <template v-else>
            <pre class="code-block">{{ basicsCode }}</pre
            ><p class="callout"
                >连续运行两次：模块状态会继续累加，每个局部计数器也只更新自己的词法环境。重置按钮可以恢复本实验的计数。</p
            ><button class="button primary" :disabled="running" @click="runModules">{{
                running ? "加载模块中…" : "执行静态 / 动态导入对照"
            }}</button>
        </template>
        <ConsoleOutput :logs="logs" />
    </section>
</template>

<style scoped>
.basic-lab {
    gap: 22px;
}
.lab-toolbar {
    justify-content: space-between;
}
.field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 12px;
    font-weight: 600;
}
.small-note {
    font-size: 11px;
}
.counter-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 18px;
}
.counter-grid article {
    border: 1px solid var(--border, #e1e7df);
    border-radius: 12px;
    background: var(--surface-soft, #f6f8f4);
    padding: 24px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
}
.counter-grid span {
    color: var(--muted, #748075);
    font-size: 12px;
}
.counter-grid strong {
    font-size: 42px;
    line-height: 1;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    color: var(--accent, #267857);
}
.counter-grid.compact article {
    padding: 18px;
    gap: 8px;
}
.counter-grid.compact strong {
    font-size: 28px;
}
.check {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
}
.check input,
input[type="range"] {
    accent-color: #267857;
}
.event-parent {
    display: flex;
    flex-direction: column;
    gap: 24px;
    align-items: flex-start;
    padding: 30px;
    background: var(--surface-soft, #f4f7f1);
    border: 1px dashed #9eb69f;
    border-radius: 12px;
}
.event-parent > span {
    font-size: 12px;
    color: var(--muted, #6c7c6d);
}
@media (max-width: 500px) {
    .counter-grid article {
        padding: 18px;
    }
    .counter-grid strong {
        font-size: 32px;
    }
    .lab-toolbar {
        flex-wrap: wrap;
    }
}
</style>
