<script setup>
/**
 * 响应式边界实验：对比普通值快照、属性 ref、只读代理、浅层状态和响应式集合。
 * “深层修改没触发依赖”与“页面绝不会变”不同：其他依赖重渲染也可能顺带读到新值。
 * 这里借助 computed 的依赖缓存和独立检查值，把浅层追踪的边界显式展示出来。
 */
import {
    ref,
    reactive,
    readonly,
    computed,
    toRefs,
    shallowRef,
    shallowReactive,
    triggerRef,
    customRef,
    markRaw,
    toRaw,
    isReactive,
    isReadonly,
    unref,
    toValue,
    onScopeDispose
} from "vue";
import LabLog from "./LabLog.vue";
import { useLabLog } from "./useLabLog";
// reactive 返回代理；后面的 reset 修改属性而不替换这个代理，保持已建立的引用连接。
const state = reactive({ count: 0, nested: { score: 10 } });
// 普通解构拿到基本值快照；toRefs 则创建与源属性连通的 ref。此规则别与 Vue 3.5 的 props 解构编译行为混淆。
const { count: snapshot } = state;
const { count: linked } = toRefs(state);
// 只读代理阻止通过该入口写入，但源 state 仍可变；readonly 不等于冻结底层对象。
const readOnlyState = readonly(state);
const shallow = shallowRef({ count: 0 });
const shallowObject = shallowReactive({ nested: { count: 0 } });
// computed 只依赖浅层根入口。直接改内部普通对象不会使缓存失效，替换根入口才会。
const shallowComputed = computed(() => shallow.value.count);
const shallowObjectComputed = computed(() => shallowObject.nested.count);
// 这两个独立 ref 仅报告按钮手动读到的原始值；不能拿它们的更新证明深层字段被代理了。
const inspected = ref(0),
    inspectedObject = ref(0);
// 集合使用 Vue 的集合代理逻辑追踪 set/delete/遍历；不是给原生 Map 增加自有属性来模拟。
const scores = reactive(new Map([["ref", 1]]));
// 外层仍响应式，markRaw 标记的服务入口跳过代理；适合无需纳入响应系统的外部实例。
const skipped = reactive({ service: markRaw({ name: "无需代理的外部实例" }) });
// toRaw 取得代理对应的原对象，仅用于观察身份；不推荐长期混用两条入口来写业务状态。
const rawState = toRaw(state);
const { entries, log, clear } = useLabLog();
let timeout;
let resetDelayed = () => {};
// customRef 把依赖收集(track)与通知(trigger)交给调用方；下面故意把通知推迟到输入稳定后。
const delayed = customRef((track, trigger) => {
    let value = "";
    // 重置直接清空闭包里的值并通知，不再走 450ms 防抖，否则旧文本会在重置后短暂保留。
    resetDelayed = () => {
        clearTimeout(timeout);
        value = "";
        trigger();
    };
    return {
        // 只有在读取时调用 track，正在运行的渲染/computed 才能订阅这个自定义 ref。
        get() {
            track();
            return value;
        },
        // 防抖保留最后一次输入；清理旧定时器是取消模拟工作，而非给 Promise 添加“自动取消”。
        set(next) {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                value = next;
                trigger();
                log(`customRef 延迟生效：${next}`);
            }, 450);
        }
    };
});
// 离开专题时取消尚未执行的尾调用，避免组件销毁后仍写日志或触发依赖通知。
onScopeDispose(() => clearTimeout(timeout));
// 故意只改深层普通字段，再单独读取它；对比 computed 仍缓存旧值与原值已经改变两个事实。
function nestedMutation() {
    shallow.value.count++;
    inspected.value = shallow.value.count;
    log("只修改 shallowRef 的深层属性：下方 computed 缓存未失效。");
}
function reset() {
    state.count = 0;
    state.nested.score = 10;
    shallow.value = { count: 0 };
    shallowObject.nested = { count: 0 };
    inspected.value = inspectedObject.value = 0;
    scores.clear();
    scores.set("ref", 1);
    resetDelayed();
    clear();
}
</script>
<template>
    <div class="vue-experiment">
        <div class="demo-row demo-toolbar"
            ><button
                class="button primary"
                @click="
                    state.count++;
                    log(`代理属性更新：${state.count}`);
                "
                >响应式 count +1</button
            ><button class="button secondary" @click="reset">重置</button></div
        >
        <div class="demo-grid">
            <section class="demo-card"
                ><h3>同一个属性，三种引用</h3
                ><div class="demo-result"
                    >reactive.count：<b>{{ state.count }}</b
                    ><br />普通解构 snapshot：<b>{{ snapshot }}</b
                    ><br />toRefs 连接：<b>{{ linked }}</b
                    ><br />readonly 读取：<b>{{ readOnlyState.count }}</b></div
                ><p class="demo-note">snapshot 是初始基本值。修改 linked.value 也会更新 state.count。</p
                ><button class="button small secondary" @click="linked++">通过 toRefs +1</button></section
            >
            <section class="demo-card"
                ><h3>shallowRef · 深层不追踪</h3
                ><div class="demo-result">手动检查原值：{{ inspected }}<br />computed 观察值：{{ shallowComputed }}</div
                ><div class="demo-row"
                    ><button class="button small secondary" @click="nestedMutation">深层 +1</button
                    ><button
                        class="button small primary"
                        @click="
                            triggerRef(shallow);
                            log('triggerRef：显式使依赖失效。');
                        "
                        >triggerRef</button
                    ><button
                        class="button small secondary"
                        @click="
                            shallow = { count: shallow.count + 1 };
                            inspected = shallow.count;
                        "
                        >替换对象</button
                    ></div
                ></section
            >
            <section class="demo-card"
                ><h3>shallowReactive · 只代理根层</h3
                ><div class="demo-result"
                    >嵌套原值：{{ inspectedObject }}<br />computed：{{ shallowObjectComputed }}</div
                ><button
                    class="button small secondary"
                    @click="
                        shallowObject.nested.count++;
                        inspectedObject = shallowObject.nested.count;
                    "
                    >改嵌套字段</button
                ><button
                    class="button small primary"
                    @click="
                        shallowObject.nested = { count: inspectedObject };
                        log('替换根层 nested：计算值更新。');
                    "
                    >替换根层属性</button
                ></section
            >
            <section class="demo-card"
                ><h3>响应式集合</h3
                ><div class="demo-result"
                    >Map.size：{{ scores.size }}<br /><span v-for="[key, value] in scores" :key="key"
                        >{{ key }} → {{ value }}<br /></span></div
                ><button
                    class="button small secondary"
                    @click="
                        scores.set(`主题${scores.size + 1}`, scores.size + 1);
                        log('Map.set 已驱动页面更新。');
                    "
                    >Map.set</button
                ><button class="button small secondary" @click="scores.delete('ref')">删除 ref</button></section
            >
        </div>
        <label class="demo-field"
            >customRef 防抖输入（450ms）<input v-model="delayed" placeholder="连续输入，稍后观察"
        /></label>
        <div class="demo-result"
            >防抖后的值：{{ delayed || "等待输入" }}<br />isReadonly：{{ isReadonly(readOnlyState) }} ·
            Object.isFrozen：{{ Object.isFrozen(readOnlyState) }}<br />toRaw(state) === 原始对象：{{
                rawState === toRaw(state)
            }}
            · markRaw 服务被代理：{{ isReactive(skipped.service) }}<br />unref(linked)：{{ unref(linked) }} · toValue(()
            =&gt; state.count)：{{ toValue(() => state.count) }}</div
        >
        <LabLog :entries="entries" @clear="clear" />
    </div>
</template>
