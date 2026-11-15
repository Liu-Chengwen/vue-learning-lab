<script setup>
import { computed, ref } from "vue";
import { ElAlert, ElButton, ElInput, ElTag } from "element-plus";
import { useHybridNavigation } from "./useHybridNavigation";

/** A/B 复用同一组件，路由 props 只决定文案；父出口的 path key 使它们拥有独立的组件实例。 */
const props = defineProps({ page: { type: String, required: true, validator: (value) => ["a", "b"].includes(value) } });
/** @type {import("vue").ComputedRef<string>} 当前展示的页面字母。 */
const pageTitle = computed(() => props.page.toUpperCase());
/** @type {import("vue").ComputedRef<string>} A 打开 B，B 可继续打开 A，供重复导航观察。 */
const nextPage = computed(() => (props.page === "a" ? "b" : "a"));
/** @type {import("vue").Ref<string>} 页面自己的临时输入，生命周期规则与入口页相同。 */
const draft = ref("");
/** @type {import("vue").Ref<number>} 当前组件实例中的点击次数。 */
const count = ref(0);
const { instanceId, loading, error, status, canGoBack, openPage, goBack } = useHybridNavigation(
    `页面 ${pageTitle.value}`
);
</script>

<template>
    <section class="panel" aria-labelledby="navigation-demo-title">
        <div class="panel-header">
            <h2 id="navigation-demo-title">页面 {{ pageTitle }} · 再走一步</h2>
            <ElTag size="small" effect="plain">局部状态</ElTag>
        </div>
        <div class="panel-body navigation-page-body" :aria-busy="loading">
            <p class="page-instance" data-testid="page-instance">页面实例：{{ instanceId }}</p>
            <label class="navigation-input-label" for="navigation-demo-draft">
                本页草稿
                <ElInput id="navigation-demo-draft" v-model="draft" placeholder="这里与入口页分别持有自己的草稿" />
            </label>
            <div class="navigation-actions">
                <ElButton class="increment-count" @click="count += 1">本页点击次数：{{ count }}</ElButton>
                <ElButton
                    class="open-demo-page"
                    type="primary"
                    :loading="loading"
                    :disabled="loading"
                    @click="
                        openPage(`/hybrid/navigation/page-${nextPage}`, `导航实验 · 页面 ${nextPage.toUpperCase()}`)
                    "
                    >打开页面 {{ nextPage.toUpperCase() }}</ElButton
                >
                <ElButton class="router-back" :disabled="loading" @click="goBack">
                    {{ canGoBack ? "H5 路由返回" : "容器内回到实验入口" }}
                </ElButton>
            </div>
            <p role="status">{{ status }}</p>
            <ElAlert v-if="error" :title="error" type="error" :closable="false" show-icon />
            <div class="callout">
                <strong>先分清两种返回</strong>
                <p>
                    H5
                    返回只处理当前容器内由本实验创建的路由历史；新容器直接进入此页时，按钮会在当前容器中替换为实验入口。
                    若要关闭这个原生容器、找回上一容器的草稿，请点原生导航栏的返回按钮。
                </p>
                <p class="muted"
                    >切换上方模式后可继续打开下一页。新容器拥有独立的 Vue/Pinia 内存，本实验不使用持久化草稿。</p
                >
            </div>
        </div>
    </section>
</template>
