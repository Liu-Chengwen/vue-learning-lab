<script setup>
/**
 * 内置组件实验：分别观察动态组件缓存、列表动画、异步依赖和弹层 DOM 位置。
 * 缓存草稿属于 CachedEditor 实例；本页只管理当前页签、缓存开关和实例 key。
 * 弹窗的焦点/滚动处理是单弹窗教学实现，不能等同于具备完整弹层栈能力的组件库。
 */
import { ref, defineAsyncComponent, watch, onScopeDispose, useTemplateRef, nextTick } from "vue";
import CachedEditor from "./components/CachedEditor.vue";
import LabLog from "./LabLog.vue";
import { useLabLog } from "./useLabLog";
// 异步导入负责组件定义的延迟加载，Suspense 同时等待 AsyncReport 内的 async setup。
const AsyncReport = defineAsyncComponent(() => import("./components/AsyncReport.vue"));
// tab 是被缓存子组件的 key；cacheKey 重建整个缓存容器，reportKey 则重新开始一次异步边界。
const tab = ref("笔记 A"),
    cache = ref(true),
    cacheKey = ref(0),
    modal = ref(false),
    showReport = ref(false),
    reportKey = ref(0);
const items = ref([1, 2, 3]);
// 递增 ID 不随列表位置改变，用于让 TransitionGroup 识别移动/进入/离开的节点。
let sequence = 3;
const { entries, log, clear } = useLabLog();
const closeButton = useTemplateRef("closeButton");
// 保存打开前的页面状态；本实验只有一个弹层，不承担多个弹层之间的焦点/滚动锁协调。
let previousFocus;
let oldOverflow;
// 普通关闭时恢复原滚动样式与焦点；打开后先等 v-if + Teleport 创建按钮，再聚焦。
watch(modal, async (value) => {
    if (value) {
        previousFocus = document.activeElement;
        oldOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        await nextTick();
        closeButton.value?.focus();
        log("Teleport：弹层 DOM 已放到 body，组件逻辑关系保持。");
    } else {
        document.body.style.overflow = oldOverflow ?? "";
        previousFocus?.focus?.();
    }
});
function onKey(event) {
    if (!modal.value) return;
    if (event.key === "Escape") modal.value = false;
    // 这个教学弹层只有一个可聚焦操作，循环焦点以避免 Tab 进入背景。
    if (event.key === "Tab") {
        event.preventDefault();
        closeButton.value?.focus();
    }
}
// 当前应用是浏览器 SPA。全局 DOM 监听不属于 Vue 自动回收的 watcher，必须成对移除。
document.addEventListener("keydown", onKey);
// 路由离开时即使弹层仍打开，也不能把 document 的滚动锁或监听器遗留给下一页。
onScopeDispose(() => {
    document.removeEventListener("keydown", onKey);
    if (modal.value) document.body.style.overflow = oldOverflow ?? "";
});
// 重建 KeepAlive 会销毁其中的缓存实例；未渲染的编辑页也会执行最终卸载，而非仅清空当前页。
function reset() {
    modal.value = false;
    cache.value = true;
    cacheKey.value++;
    tab.value = "笔记 A";
    items.value = [1, 2, 3];
    sequence = 3;
    showReport.value = false;
    clear();
}
</script>
<template>
    <div class="vue-experiment"
        ><div class="demo-row demo-toolbar"
            ><button class="button primary" @click="modal = true">打开 Teleport 弹层</button
            ><button class="button secondary" @click="reset">重置</button></div
        >
        <div class="demo-grid"
            ><section class="demo-card"
                ><h3>动态组件 + KeepAlive</h3
                ><div class="demo-row"
                    ><button
                        v-for="name in ['笔记 A', '笔记 B']"
                        :key="name"
                        class="button small"
                        :class="tab === name ? 'primary' : 'secondary'"
                        @click="tab = name"
                        >{{ name }}</button
                    ><label class="demo-row demo-note"><input v-model="cache" type="checkbox" />缓存实例</label></div
                ><KeepAlive v-if="cache" :key="cacheKey"
                    ><component :is="CachedEditor" :key="tab" :name="tab" @log="log" /></KeepAlive
                ><CachedEditor v-else :key="tab" :name="tab" @log="log" /><p class="demo-note"
                    >勾选缓存时，切换回原页签仍保留草稿；停用不等于卸载。</p
                ></section
            >
            <section class="demo-card"
                ><h3>TransitionGroup · 列表变化</h3
                ><div class="demo-row"
                    ><button class="button small primary" @click="items.push(++sequence)">添加</button
                    ><button class="button small secondary" @click="items.reverse()">反转</button></div
                ><TransitionGroup name="list" tag="ul" class="animated-list"
                    ><li v-for="item in items" :key="item"
                        >任务 {{ item
                        }}<button
                            class="button small secondary"
                            @click="items = items.filter((value) => value !== item)"
                            >移除</button
                        ></li
                    ></TransitionGroup
                ></section
            ></div
        >
        <section class="demo-card" style="margin-top: 20px"
            ><h3>异步组件 + Suspense <span class="tag">实验性 API</span></h3
            ><button
                class="button small secondary"
                @click="
                    showReport = true;
                    reportKey++;
                "
                >加载 / 重新加载报告</button
            ><Suspense
                v-if="showReport"
                :key="reportKey"
                @pending="log('Suspense pending：显示 fallback。')"
                @resolve="log('Suspense resolve：依赖完成。')"
                ><AsyncReport /><template #fallback
                    ><div class="demo-result" role="status">正在等待异步依赖（约 900ms）…</div></template
                ></Suspense
            ><p class="demo-note">Suspense 当前仍为实验性。实际业务中的普通 loading/error 状态不必依赖它。</p></section
        >
        <Teleport to="body"
            ><Transition name="modal"
                ><div v-if="modal" class="teaching-modal" @click.self="modal = false"
                    ><section role="dialog" aria-modal="true" aria-labelledby="teleport-title"
                        ><span class="tag">DOM 在 body，逻辑仍在原组件树</span
                        ><h2 id="teleport-title">我被传送到了外面</h2
                        ><p>可以在 DevTools 中检查位置。背景滚动已锁定，Esc 或点击遮罩可关闭。</p
                        ><button ref="closeButton" class="button primary" @click="modal = false"
                            >关闭并恢复焦点</button
                        ></section
                    ></div
                ></Transition
            ></Teleport
        >
        <LabLog :entries="entries" @clear="clear" />
    </div>
</template>
<style scoped>
.animated-list {
    list-style: none;
    padding: 0;
    position: relative;
}
.animated-list li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    background: var(--surface-soft, #f0f6ef);
    padding: 10px 12px;
    margin: 8px 0;
    border-radius: 8px;
    font-size: 13px;
}
.list-enter-active,
.list-leave-active,
.list-move {
    transition: all 0.3s;
}
.list-enter-from,
.list-leave-to {
    opacity: 0;
    transform: translateX(20px);
}
/* 离开项暂时脱离文档流，让其余项能在新布局位置之间执行 move 过渡。 */
.list-leave-active {
    position: absolute;
    width: 100%;
}
.teaching-modal {
    position: fixed;
    inset: 0;
    background: #10291fc0;
    z-index: 2500;
    display: grid;
    place-items: center;
    padding: 24px;
}
.teaching-modal section {
    background: var(--surface, #fff);
    color: var(--text, #1b2e25);
    padding: 32px;
    border-radius: 18px;
    max-width: 480px;
    box-shadow: 0 24px 80px #0003;
}
.teaching-modal h2 {
    font-size: 24px;
    margin: 18px 0 12px;
}
.teaching-modal p {
    font-size: 14px;
    line-height: 1.9;
    margin-bottom: 24px;
}
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.2s;
}
.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}
</style>
