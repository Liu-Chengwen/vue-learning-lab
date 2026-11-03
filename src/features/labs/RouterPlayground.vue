<script setup>
/**
 * 真实嵌套路由的父布局：为 profile / settings 两个子页提供第二层 RouterView。
 * note 是父实例局部 ref，没有放入 store 或磁盘；子路由切换时父实例保留，因此草稿仍在。
 * 本例为子出口显式设置 path key，以区分子面板实例；父级是否重建也取决于上层路由出口的身份。
 */
import { ref, readonly, provide } from "vue";
import { useRoute, RouterLink, RouterView } from "vue-router";
import LabLog from "./LabLog.vue";
import { useLabLog } from "./useLabLog";

// 父路由布局持有编辑状态。切换它的 children 时，父实例不必重新创建。
const route = useRoute();
const note = ref("这段草稿属于父路由布局");
const { entries, log, clear } = useLabLog();
// 非响应式创建时间只作实例观察标记；草稿保留的依据是父实例身份，不是时间字符串。
const createdAt = new Date().toLocaleTimeString("zh-CN", { hour12: false });

// RouterView 渲染的后代仍沿着逻辑组件树注入上下文，无需把草稿放入全局 store。
// 只读注入仍保留 ref 连接；子级看到父级最新值，但不应通过该入口直接写入。
provide("routing-demo-parent-note", readonly(note));
provide("routing-demo-log", log);

// 改局部 ref 不等于销毁当前父组件；createdAt 不变可辅助观察这一点。
function reset() {
    note.value = "这段草稿属于父路由布局";
    clear();
    log("已重置父级草稿；父组件没有被重新创建。");
}
</script>

<template>
    <article class="nested-route-demo">
        <div class="page-heading">
            <div>
                <div class="eyebrow">VUE ROUTER / NESTED ROUTES</div>
                <h1>嵌套路由：布局留下，内容切换</h1>
                <p class="page-description">先修改父级草稿，再切换子路由。对照浏览器 URL、子面板与生命周期日志。</p>
            </div>
            <RouterLink class="button secondary" to="/labs/router-state">返回路由与状态实验</RouterLink>
        </div>

        <section class="panel parent-layout">
            <div class="panel-header"
                ><h2>父路由布局 · /routing-demo</h2><span class="tag green">父实例创建于 {{ createdAt }}</span></div
            >
            <div class="panel-body">
                <label class="field"
                    >父级草稿（切换子路由时保留，刷新后重置）<input v-model="note" class="control"
                /></label>
                <p class="muted">这是 RouterPlayground.vue 的局部 ref，当前没有使用 Pinia 或 localStorage。</p>
                <div class="nested-nav-row">
                    <nav class="tabs" aria-label="子路由切换">
                        <RouterLink
                            :to="{ path: '/routing-demo/profile', query: route.query }"
                            class="tab"
                            :class="{ active: route.path.endsWith('/profile') }"
                            >资料子页 /profile</RouterLink
                        >
                        <RouterLink
                            :to="{ path: '/routing-demo/settings', query: route.query }"
                            class="tab"
                            :class="{ active: route.path.endsWith('/settings') }"
                            >设置子页 /settings</RouterLink
                        >
                    </nav>
                    <button class="button small secondary" @click="reset">重置父级草稿与日志</button>
                </div>

                <div class="route-outlet-label"><span class="tag">父布局内部的 RouterView 出口</span></div>
                <section class="panel child-outlet">
                    <RouterView v-slot="{ Component }">
                        <!-- 这里按子路由 path 显式区分实例；query 改变不重建，父布局也不随子路由更换。 -->
                        <component :is="Component" :key="route.path" />
                    </RouterView>
                </section>

                <div class="callout nested-explanation">
                    <strong>观察的重点</strong>
                    <p
                        >children 配置对应第二层 RouterView。父布局的草稿保留，子面板在当前示例中按 path
                        更换实例。路由切换是否复用同一组件，还取决于组件类型与
                        key；不能一概认为每次导航都会卸载所有组件。</p
                    >
                </div>
                <LabLog :entries="entries" @clear="clear" />
            </div>
        </section>
    </article>
</template>

<style scoped>
.parent-layout {
    border-color: var(--primary-border);
}
.nested-nav-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    margin: 22px 0;
}
.route-outlet-label {
    margin: 18px 0 10px;
}
.child-outlet {
    background: var(--surface-soft);
    box-shadow: none;
}
.nested-explanation {
    margin-top: 20px;
}
.nested-route-demo .field {
    max-width: 650px;
}
</style>
