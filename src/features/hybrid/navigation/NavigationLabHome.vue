<script setup>
import { ref } from "vue";
import { ElAlert, ElButton, ElInput, ElTag } from "element-plus";
import { useHybridNavigation } from "./useHybridNavigation";

/**
 * 草稿与计数属于当前入口页实例。Vue 路由切走会卸载本页，返回后重新从初值创建。
 * Native 新建容器时，本页仍在原 WebView 中，原生返回后可继续看到这份局部状态。
 * @type {import("vue").Ref<string>}
 */
const draft = ref("");
/** @type {import("vue").Ref<number>} 点击后再导航，对照返回时是否仍保留这次修改。 */
const count = ref(0);
/** 页面只绑定交互；路由/Native 的选择、错误处理和卸载保护由实验内的小封装负责。 */
const { instanceId, loading, error, status, openPage } = useHybridNavigation("实验入口");
</script>

<template>
    <section class="panel" aria-labelledby="navigation-home-title">
        <div class="panel-header">
            <h2 id="navigation-home-title">实验入口 · 先留下一个草稿</h2>
            <ElTag size="small" effect="plain">入口 → A → B</ElTag>
        </div>
        <div class="panel-body navigation-page-body" :aria-busy="loading">
            <p class="page-instance" data-testid="page-instance">页面实例：{{ instanceId }}</p>
            <label class="navigation-input-label" for="navigation-home-draft">
                本页草稿
                <ElInput id="navigation-home-draft" v-model="draft" placeholder="输入一段文字，再跳转并返回" />
            </label>
            <div class="navigation-actions">
                <ElButton class="increment-count" @click="count += 1">本页点击次数：{{ count }}</ElButton>
                <ElButton
                    class="open-demo-page"
                    type="primary"
                    :loading="loading"
                    :disabled="loading"
                    @click="openPage('/hybrid/navigation/page-a', '导航实验 · 页面 A')"
                    >打开页面 A</ElButton
                >
            </div>
            <p role="status">{{ status }}</p>
            <ElAlert v-if="error" :title="error" type="error" :closable="false" show-icon />
            <div class="callout">
                <strong>先做这三个观察</strong>
                <ol class="observation-steps">
                    <li>单容器打开 A，再点 H5 路由返回：入口会重新挂载，草稿与次数重置。</li>
                    <li>多容器打开 A，再用原生导航栏返回：旧入口没有卸载，草稿与次数保留。</li>
                    <li>在新容器中的 A 把模式切为单容器，再打开 B：观察同一容器内部还能继续切路由。</li>
                </ol>
                <p class="muted">原生返回处理容器栈，页面里的返回按钮处理当前容器的 Vue 路由历史。</p>
            </div>
        </div>
    </section>
</template>

<style scoped>
.observation-steps {
    margin: 12px 0;
    padding-left: 20px;
    line-height: 1.9;
}
</style>
