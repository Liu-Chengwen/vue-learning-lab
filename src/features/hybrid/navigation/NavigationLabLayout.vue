<script setup>
import { RouterView, useRoute } from "vue-router";
import { ElSwitch, ElTag } from "element-plus";
import { GitBranch, Layers } from "lucide-vue-next";
import { createNavigationLab } from "./useHybridNavigation";

/** 当前路由用于展示地址，以及为子出口提供明确的页面身份。 */
const route = useRoute();
/**
 * 父布局只持有实验模式、观察记录与 Bridge 生命周期。
 * 输入草稿放在下面 RouterView 渲染的子页中，便于看出单容器切页时的卸载与重建。
 */
const { mode, jsEnvironmentId, events } = createNavigationLab();
</script>

<template>
    <section class="navigation-lab" aria-labelledby="navigation-lab-title">
        <div class="page-heading">
            <div>
                <p class="eyebrow">IOS × VUE · NAVIGATION</p>
                <h1 id="navigation-lab-title">Hybrid 导航实验<span class="heading-dot">.</span></h1>
                <p class="page-description">打开同一组页面，比较 Vue 路由与原生 WebView 容器的导航方式。</p>
            </div>
            <ElTag effect="plain"><GitBranch :size="14" aria-hidden="true" /> 两层导航</ElTag>
        </div>

        <!-- 模式只在这个实验布局中共享，不改变侧栏、任务工作台或其他专题的导航。 -->
        <section class="panel" aria-labelledby="navigation-mode-title">
            <div class="panel-header">
                <h2 id="navigation-mode-title"><Layers :size="18" aria-hidden="true" /> 下一次如何打开</h2>
            </div>
            <div class="panel-body mode-body">
                <ElSwitch
                    v-model="mode"
                    class="navigation-mode-switch"
                    active-value="container"
                    inactive-value="router"
                    active-text="多容器"
                    inactive-text="单容器"
                    aria-label="使用新原生容器打开实验页面"
                />
                <p class="mode-description">
                    {{
                        mode === "router"
                            ? "单容器：router.push 切换当前 WebView 内的页面，JS 环境不变。"
                            : "多容器：通过 openWebView 新建原生页面，上一容器保留，新页面拥有独立的 JS 环境。"
                    }}
                </p>
                <p class="muted">普通浏览器可以体验单容器；多容器需要 HybridLab，缺少通道时会明确提示失败。</p>
                <dl class="environment-values">
                    <div
                        ><dt>当前路由</dt><dd data-testid="current-route">{{ route.fullPath }}</dd></div
                    >
                    <div
                        ><dt>JS 环境标记</dt><dd data-testid="js-environment">{{ jsEnvironmentId }}</dd></div
                    >
                </dl>
                <p class="muted">标记帮助观察网页运行环境，整页刷新也会改变它。模式通过 navMode 查询参数传给新页面。</p>
            </div>
        </section>

        <!-- key 按 path 区分 A/B 子页；没有 KeepAlive，因此路由返回会创建新的页面实例。 -->
        <RouterView v-slot="{ Component }"><component :is="Component" :key="route.path" /></RouterView>

        <section class="panel" aria-labelledby="navigation-events-title">
            <div class="panel-header"><h2 id="navigation-events-title">当前容器的观察记录</h2></div>
            <ol class="panel-body navigation-events" aria-live="polite">
                <li v-for="event in events" :key="event.id"
                    ><time>{{ event.time }}</time
                    ><span>{{ event.message }}</span></li
                >
            </ol>
        </section>
    </section>
</template>

<style scoped>
/* 继承公共面板与主题颜色，仅补充实验信息、状态草稿区和窄屏排列。 */
.navigation-lab,
.mode-body {
    display: grid;
    gap: 22px;
    min-width: 0;
}
.page-heading {
    margin-bottom: 0;
}
.panel-header h2 {
    display: flex;
    align-items: center;
    gap: 10px;
}
.mode-body {
    gap: 14px;
}
.mode-body p {
    margin: 0;
    line-height: 1.8;
}
.mode-body .muted {
    font-size: 12px;
}
.environment-values {
    display: grid;
    gap: 16px;
    padding: 16px;
    margin: 0;
    background: var(--surface-soft);
    border-radius: 8px;
}
.environment-values dt {
    font-size: 12px;
    color: var(--text-secondary);
}
.environment-values dd {
    margin: 6px 0 0;
    overflow-wrap: anywhere;
    font-family: var(--font-mono);
    font-size: 12px;
}
.navigation-events {
    display: grid;
    gap: 12px;
    list-style: none;
    margin: 0;
}
.navigation-events li {
    display: flex;
    align-items: baseline;
    gap: 14px;
    line-height: 1.7;
}
.navigation-events time {
    flex-shrink: 0;
    color: var(--text-secondary);
    font-size: 11px;
    font-family: var(--font-mono);
}
/* 子页共用的展示规则放在实验布局中；:deep 允许匹配子组件渲染出的节点。 */
.navigation-lab :deep(.navigation-page-body) {
    display: grid;
    gap: 18px;
}
.navigation-lab :deep(.navigation-page-body p) {
    margin: 0;
    line-height: 1.8;
}
.navigation-lab :deep(.navigation-actions) {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
}
.navigation-lab :deep(.page-instance) {
    color: var(--text-secondary);
    font-size: 12px;
}
.navigation-lab :deep(.navigation-input-label) {
    display: grid;
    gap: 8px;
}
@media (max-width: 760px) {
    .page-heading {
        flex-wrap: wrap;
        gap: 16px;
    }
    .navigation-events li {
        flex-direction: column;
        gap: 3px;
    }
}
</style>
