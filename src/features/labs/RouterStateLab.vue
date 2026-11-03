<script setup>
/**
 * 路由与共享状态实验：把 URL 查询条件、页面草稿和 Pinia 状态放在各自合适的位置。
 * route 是当前导航结果，queryDraft 是输入过程；store 承担两个消费者共享的计数状态。
 * 嵌套路由通过独立父布局演示；“/tasks/:id 动态参数”本身并不等于父子 RouterView。
 */
import { ref, watch } from "vue";
import { useRoute, useRouter, onBeforeRouteLeave } from "vue-router";
import { storeToRefs } from "pinia";
import { useLabCounterStore } from "./labCounterStore";
import StoreConsumer from "./components/StoreConsumer.vue";
import LabLog from "./LabLog.vue";
import { useLabLog } from "./useLabLog";
// URL 是路由状态的真实来源；查询变更不会凭空新建一个页面实例。
const route = useRoute(),
    router = useRouter();
const store = useLabCounterStore();
// store 代理读取时会解包 ref；先用 storeToRefs 再解构，保留两个消费者的更新连接。
const { count, doubled } = storeToRefs(store);
const guard = ref(false),
    queryDraft = ref(String(route.query.chapter ?? "ref"));
const { entries, log, clear } = useLabLog();
// 侦听实际导航结果，同步浏览器前进/后退带来的条件；不把输入草稿当成已经完成的导航。
watch(
    () => route.fullPath,
    (value) => {
        queryDraft.value = String(route.query.chapter ?? "ref");
        log(`导航完成：${value}`);
    }
);
// 保留无关 query 键；undefined 让路由器移除 chapter，push 则新增一条历史记录。
function updateQuery() {
    router.push({ query: { ...route.query, chapter: queryDraft.value || undefined } });
}
// 只有用户主动开启保护才弹确认；默认导航自由进行。
// 此守卫处理离开当前路由记录，不是每次 query 更新都必须触发；返回 false 会取消导航。
onBeforeRouteLeave(() => {
    if (!guard.value) return true;
    return window.confirm("这是路由离开守卫实验。确定离开当前实验吗？");
});
function reset() {
    guard.value = false;
    store.reset();
    // 重置用 replace 替换当前历史项，避免为一次清空操作额外增加浏览器后退步骤。
    router.replace({ query: {} });
    queryDraft.value = "ref";
    clear();
}
</script>
<template>
    <div class="vue-experiment"
        ><div class="demo-row demo-toolbar"
            ><button class="button secondary small" @click="reset">重置 store 与 query</button
            ><label class="demo-row demo-note"><input v-model="guard" type="checkbox" />开启离开守卫确认</label></div
        >
        <section class="demo-card"
            ><h3>真实路由状态</h3
            ><div class="demo-result"
                >path：{{ route.path }}<br />params：{{ JSON.stringify(route.params) }}<br />query：{{
                    JSON.stringify(route.query)
                }}<br />fullPath：{{ route.fullPath }}</div
            ><label class="demo-field"
                >把章节保存进 query<input v-model="queryDraft" @keyup.enter="updateQuery" /></label
            ><div class="demo-row"
                ><button class="button primary small" @click="updateQuery">router.push 更新 URL</button
                ><RouterLink class="button secondary small" to="/tasks">离开并查看任务工作台</RouterLink
                ><RouterLink class="button secondary small" to="/routing-demo/profile"
                    >进入真实嵌套路由实验</RouterLink
                ></div
            ><p class="demo-note"
                >复制更新后的 URL，可分享同一查询条件。嵌套路由实验通过父布局中的第二层 RouterView 切换 profile/settings
                子面板，并保留父级草稿；区别于只有路径参数的详情路由。</p
            ></section
        >
        <div class="demo-grid" style="margin-top: 20px"
            ><section class="demo-card"
                ><h3>组件 A · Pinia setup store</h3><div class="demo-value">{{ count }}</div
                ><p>getter doubled：{{ doubled }}</p
                ><button
                    class="button primary small"
                    @click="
                        store.increment();
                        log(`组件 A action：count = ${store.count}`);
                    "
                    >组件 A +1</button
                ><p class="demo-note"
                    >离开再回来仍是同一内存 store；刷新重置。任务业务的持久化由另一层明确实现。</p
                ></section
            ><StoreConsumer
        /></div>
        <LabLog :entries="entries" @clear="clear" />
    </div>
</template>
