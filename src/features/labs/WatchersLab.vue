<script setup>
/**
 * 更新调度与副作用实验：computed 负责纯派生值，watch / watchEffect 负责记录和异步工作。
 * 总价、姓名、搜索结果与侦听沙盒分别拥有自己的状态，避免把副作用写进 computed getter。
 * 所有 watcher 都在当前组件或显式 effectScope 中创建，失效和卸载时都有对应清理。
 */
import {
    ref,
    reactive,
    computed,
    watch,
    watchEffect,
    onWatcherCleanup,
    useTemplateRef,
    nextTick,
    effectScope,
    onScopeDispose
} from "vue";
import LabLog from "./LabLog.vue";
import { useLabLog } from "./useLabLog";
const { entries, log, clear } = useLabLog();
const quantity = ref(1),
    price = ref(19),
    query = ref(""),
    result = ref("等待输入"),
    loading = ref(false);
const firstName = ref("Vue"),
    lastName = ref("Learner");
// 总价可完全由数量与单价计算，不需要再维护一个可变 total 或用 watch 手动同步。
const total = computed(() => quantity.value * price.value);
// 可写 computed 的 setter 把一次文本输入分发回两个源字段；getter 保持纯读取。
const fullName = computed({
    get: () => `${firstName.value} ${lastName.value}`,
    set: (value) => {
        const [first, ...last] = value.split(" ");
        firstName.value = first;
        lastName.value = last.join(" ");
    }
});
// Vue 3.5+ 的模板引用：挂载前/卸载后可能为 null，读取 DOM 时使用可选链。
const quantityElement = useTemplateRef("quantityElement");
const deepState = reactive({ settings: { score: 0 } });
const onceSource = ref(0);
let sandboxScope;
function armWatchers() {
    // 将这一组演示侦听器放入独立作用域，重置时整体停止并重新注册。
    sandboxScope?.stop();
    // 按钮也能调用此函数；事件阶段新建的作用域不能只依赖 setup 时的隐式父子归属。
    sandboxScope = effectScope();
    sandboxScope.run(() => {
        // getter 返回根代理后，deep 数字限定遍历层级：1 追踪 settings，2 才继续到 score（3.5+）。
        watch(
            () => deepState,
            () => log("deep:1：观察到根层 settings 被替换。"),
            { deep: 1 }
        );
        watch(
            () => deepState,
            () => log(`deep:2：观察到 settings.score = ${deepState.settings.score}`),
            { deep: 2 }
        );
        // once 是一次“变更回调”后停止（3.4+）；本例不加 immediate，避免注册时就消耗观察机会。
        watch(onceSource, (value) => log(`once:true：只响应首次变更 ${value}，随后自动停止。`), { once: true });
        watch(
            () => deepState.settings.score,
            (value) => log(`immediate:true：注册时及 score 变化时运行，当前 ${value}。`),
            { immediate: true }
        );
    });
}
armWatchers();
// 显式停止当前沙盒作用域，也覆盖通过按钮重新创建的 watcher 组。
onScopeDispose(() => sandboxScope?.stop());
// 首次立即执行，并自动收集同步读取的依赖；logger 不读取自己的响应式日志，避免意外依赖。
watchEffect(() => log(`watchEffect：数量 ${quantity.value} × 单价 ${price.value} = ${total.value}`));
// 默认 flush:pre 回调在所属组件 DOM 更新前运行；日志中的状态与 DOM 可能暂时不同。
watch(quantity, (value, old, onCleanup) => {
    log(`默认 watch：${old} → ${value}；此时 DOM 文本 ${quantityElement.value?.textContent ?? "尚未挂载"}`);
    const timer = setTimeout(() => log(`onCleanup 演示：数量 ${value} 稳定了 700ms。`), 700);
    // 回调失效或侦听停止时清理上次资源；新一轮执行前，旧的延迟记录已被取消。
    onCleanup(() => {
        clearTimeout(timer);
    });
});
// post 回调在所属组件 DOM 更新后执行，适合观察更新后的元素，而不是所有副作用都默认选 post。
watch(quantity, () => log(`flush:post：此时 DOM 文本 ${quantityElement.value?.textContent}`), { flush: "post" });
let requestId = 0;
// requestId 这里只是诊断标签；真正防止过期结果覆盖的是每轮注册的定时器清理。
watch(query, (value) => {
    const id = ++requestId;
    // 新回调前 Vue 已先调用上一轮清理，所以清空关键词也会使上一次模拟请求失效。
    if (!value.trim()) {
        loading.value = false;
        result.value = "等待输入";
        return;
    }
    loading.value = true;
    log(`请求 #${id}：${value}`);
    // 已完成请求仍会在下次失效时运行清理；这个标记避免把已完成工作误记成“取消”。
    let settled = false;
    const timer = setTimeout(
        () => {
            settled = true;
            loading.value = false;
            result.value = `“${value}” 的匹配结果（请求 #${id}）`;
            log(`完成 #${id}：只展示当前请求。`);
        },
        value.length <= 2 ? 1100 : 400
    );
    // 必须同步注册；不能先 await 再调用 onWatcherCleanup。
    onWatcherCleanup(() => {
        clearTimeout(timer);
        if (!settled) log(`清理 #${id}：失效请求已取消。`);
    });
});
// 多次同步写入会进入同一轮更新队列；nextTick 等待相关 DOM 刷新，不保证浏览器已完成绘制。
async function batch() {
    quantity.value++;
    quantity.value++;
    quantity.value++;
    log(`同步修改 3 次，状态 ${quantity.value}，立即读取 DOM ${quantityElement.value?.textContent}`);
    await nextTick();
    log(`await nextTick 后：DOM ${quantityElement.value?.textContent}`);
}
function reset() {
    quantity.value = 1;
    price.value = 19;
    query.value = "";
    firstName.value = "Vue";
    lastName.value = "Learner";
    deepState.settings = { score: 0 };
    onceSource.value = 0;
    clear();
    // 重置后创建全新 once 侦听器；已自动停止的旧 watcher 不会因为把值改回去就重新激活。
    armWatchers();
}
</script>
<template>
    <div class="vue-experiment">
        <div class="demo-row demo-toolbar"
            ><button class="button primary" @click="batch">同步 +3，然后读取 DOM</button
            ><button class="button secondary" @click="reset">重置</button></div
        >
        <div class="demo-grid">
            <section class="demo-card"
                ><h3>computed · 纯派生状态</h3
                ><label class="demo-field">数量<input v-model.number="quantity" type="number" min="0" /></label
                ><label class="demo-field">单价<input v-model.number="price" type="number" min="0" /></label
                ><div class="demo-result"
                    >DOM 中数量：<b ref="quantityElement">{{ quantity }}</b
                    ><br />总价：¥ {{ total }}</div
                ><p class="demo-note">同步多次变更合并后，watch 通常只观察到本轮最终值。</p></section
            >
            <section class="demo-card"
                ><h3>watch · 可清理的副作用</h3
                ><label class="demo-field"
                    >模拟搜索<input v-model="query" placeholder="先输入 V，再快速输入 Vue" /></label
                ><div class="demo-result" aria-live="polite">{{ loading ? "请求处理中…" : result }}</div
                ><p class="demo-note">短关键词故意更慢；每次输入都取消上一轮定时器。离开页面也会清理。</p
                ><label class="demo-field">可写 computed：姓名<input v-model="fullName" /></label
                ><p class="demo-note">firstName = {{ firstName }} / lastName = {{ lastName }}</p></section
            >
        </div>
        <section class="demo-card" style="margin-top: 20px"
            ><h3>侦听深度与执行次数</h3
            ><div class="demo-result">settings.score：{{ deepState.settings.score }} · onceSource：{{ onceSource }}</div
            ><div class="demo-row"
                ><button class="button small secondary" @click="deepState.settings.score++">修改嵌套 score</button
                ><button
                    class="button small secondary"
                    @click="deepState.settings = { score: deepState.settings.score + 1 }"
                    >替换根层 settings</button
                ><button class="button small primary" @click="onceSource++">触发 once +1</button
                ><button class="button small secondary" @click="armWatchers">重新注册这组 watcher</button></div
            ><p class="demo-note"
                >Vue 3.5+ 的 deep 数字控制遍历深度。修改 score 不触发 deep:1，替换 settings 则触发两种深度；once
                只有第一次变化触发。effectScope 把这组副作用一起管理。</p
            ></section
        >
        <LabLog :entries="entries" @clear="clear" />
    </div>
</template>
