<script setup>
/**
 * 嵌套路由子面板：section 由路由 props 注入，路径/query/matched 从真实 route 读取。
 * childDraft 属于当前子实例；父布局草稿通过只读注入展示，子页不直接修改它。
 * 父出口使用 path 作为 key，因此更换子路径重建本页；只改 query 时保留当前局部状态。
 */
import { computed, ref, inject, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";

// 同一个组件可被不同子路由复用，section 由路由 props 提供，避免把业务组件写死在路径判断中。
const props = defineProps({ section: { type: String, default: "profile" } });
const route = useRoute();
const router = useRouter();
const childDraft = ref("");
const parentNote = inject("routing-demo-parent-note", ref("未找到父布局上下文"));
const log = inject("routing-demo-log", () => {});
const title = computed(() => ({ profile: "资料子面板", settings: "设置子面板" })[props.section] || props.section);
// matched 是本次导航匹配到的多层路由记录，能直接观察父记录与当前子记录。
const matchedPaths = computed(() => route.matched.map((record) => record.path));

// 生命周期记录交给父布局持有；子面板销毁后，旧日志仍存在。
onMounted(() => log(`${props.section} 子组件 mounted；父布局保留原实例。`));
onUnmounted(() => log(`${props.section} 子组件 unmounted；清理此子面板的局部状态。`));

// 使用路由器提交 URL 变化；不直接给 route.query 赋值，也不会另建一个与 URL 脱节的 mode。
function toggleQuery() {
    // path 不变，仅修改 query；父布局和本例按 path 标识的子实例都会保留。
    router.push({ query: { ...route.query, mode: route.query.mode === "preview" ? undefined : "preview" } });
}
</script>

<template>
    <div class="panel-body child-route-panel">
        <div class="child-title"
            ><h3>{{ title }}</h3
            ><span class="tag">route props：{{ section }}</span></div
        >
        <p class="muted"
            >来自父布局的只读注入：<strong>{{ parentNote }}</strong></p
        >
        <label class="field"
            >子面板草稿（本例按子路由 path 重建）<input
                v-model="childDraft"
                class="control"
                :placeholder="`在 ${section} 中输入，再切换子路由`"
        /></label>
        <dl class="route-inspector">
            <div
                ><dt>path</dt><dd>{{ route.path }}</dd></div
            >
            <div
                ><dt>params</dt><dd>{{ JSON.stringify(route.params) }}</dd></div
            >
            <div
                ><dt>query</dt><dd>{{ JSON.stringify(route.query) }}</dd></div
            >
            <div
                ><dt>matched</dt><dd v-for="path in matchedPaths" :key="path">{{ path }}</dd></div
            >
        </dl>
        <button class="button small secondary" @click="toggleQuery">切换 query.mode，观察草稿仍保留</button>
    </div>
</template>

<style scoped>
.child-title {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
}
.child-title h3 {
    font-size: 15px;
    margin: 0;
}
.child-route-panel .field {
    margin-top: 18px;
}
.route-inspector {
    display: grid;
    gap: 10px;
    margin: 20px 0;
    font-size: 12px;
}
.route-inspector > div {
    display: grid;
    grid-template-columns: 70px minmax(0, 1fr);
    gap: 5px 12px;
}
.route-inspector dt {
    font-family: var(--font-mono);
    color: var(--text-secondary);
}
.route-inspector dd {
    margin: 0;
    overflow-wrap: anywhere;
    font-family: var(--font-mono);
}
.route-inspector dd + dd {
    grid-column: 2;
}
</style>
