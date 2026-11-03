<script setup>
/**
 * 渲染机制实验：对比普通节点、v-once、v-memo、key 身份与 h 渲染函数。
 * v-memo 故意遗漏 count 依赖来制造过期显示，目的是观察边界，不是推荐这种优化写法。
 * 模板编译器只用于展示真实生成代码；开发调试钩子的记录与可运行的业务状态分开管理。
 */
import { ref, defineComponent, h, onRenderTracked, onRenderTriggered } from "vue";
import RenderIdentity from "./components/RenderIdentity.vue";
import LabLog from "./LabLog.vue";
import { useLabLog } from "./useLabLog";
// count 是普通动态状态；memoVersion 刻意成为 memo 的唯一依赖；identity 控制另一个子组件的 key。
const count = ref(0),
    memoVersion = ref(0),
    identity = ref(0);
const { entries, log, clear } = useLabLog();
// render 函数不依赖字符串模板；传入 props 后由 h 创建虚拟节点。
const RenderBadge = defineComponent({
    props: { value: Number },
    setup: (props) => () => h("span", { class: "render-badge" }, `h() 渲染：${props.value}`)
});
// 编译示例来自固定字符串列表，只读生成代码，不把任意用户文本作为 JS 执行。
const compileCase = ref("dynamic"),
    compiled = ref(""),
    compiling = ref(false);
const templates = {
    dynamic: '<section><h2>静态标题</h2><p>{{ message }}</p><button :disabled="busy">保存</button></section>',
    list: '<ul><li v-for="item in items" :key="item.id">{{ item.title }}</li></ul>'
};
// dynamic import 延迟加载教学工具；function 模式适合浏览器编译器，不能在此改用模块模式或 prefixIdentifiers。
async function inspectCompile() {
    compiling.value = true;
    try {
        // 显式使用浏览器版开发编译器：既不依赖 Node 环境，又能在生产预览中保留 patch flag 注释。
        // 这块较大的教学工具按需加载；仅显示生成代码，不 eval 任意代码。
        const { compile } = await import("@vue/compiler-dom/dist/compiler-dom.esm-browser.js");
        // 静态提升/缓存与 patch flag 的具体形态取决于实际编译器版本，不与手写“固定输出”绑定。
        compiled.value = compile(templates[compileCase.value], { mode: "function", hoistStatic: true }).code;
        log("已用 @vue/compiler-dom 编译模板；检查 TEXT/PROPS、KEYED_FRAGMENT 等输出。");
    } catch (error) {
        compiled.value = `编译失败：${error.message}`;
    } finally {
        compiling.value = false;
    }
}
// 调试钩子只在开发模式触发；不在钩子中修改响应式日志，避免制造额外渲染。
const debugEvents = [];
onRenderTracked((event) => {
    if (debugEvents.length < 30) debugEvents.push(`tracked ${event.type}:${String(event.key)}`);
});
onRenderTriggered((event) => {
    debugEvents.push(`triggered ${event.type}:${String(event.key)}`);
    if (debugEvents.length > 30) debugEvents.shift();
});
// 主动读取普通数组快照才同步到可见日志；调试回调本身不写响应式状态，避免干扰被观察的渲染。
function inspectDebug() {
    log(debugEvents.length ? debugEvents.slice(-8).join(" | ") : "生产环境不触发调试钩子；使用开发模式观察。");
}
// v-once 不会因 count 被重置而重新计算；只有重建所属渲染实例才会重新取得初始快照。
function reset() {
    count.value = 0;
    memoVersion.value++;
    identity.value++;
    compiled.value = "";
    clear();
}
</script>
<template>
    <div class="vue-experiment"
        ><div class="demo-row demo-toolbar"
            ><button class="button primary" @click="count++">count +1</button
            ><button class="button secondary" @click="memoVersion++">使 memo 依赖变化</button
            ><button class="button secondary" @click="reset">重置</button></div
        >
        <div class="demo-grid"
            ><section class="demo-card"
                ><h3>普通动态节点</h3><div class="demo-value">{{ count }}</div
                ><RenderBadge :value="count" /></section
            ><section class="demo-card"
                ><h3>v-once · 一次性快照</h3><div v-once class="demo-value">{{ count }}</div
                ><p class="demo-note">始终保留首次渲染的 0；重置按钮也不会重新创建此节点。</p></section
            ><section class="demo-card"
                ><h3>v-memo · 显式依赖</h3
                ><div v-memo="[memoVersion]" class="demo-result"
                    >被 memo 的 count：{{ count }}<br />memoVersion：{{ memoVersion }}</div
                ><p class="demo-note"
                    >刻意只依赖 memoVersion。count 变化不会更新该子树；这是遗漏依赖导致过期显示的例子。</p
                ></section
            ></div
        >
        <section class="demo-card" style="margin-top: 20px"
            ><h3>key · 实例身份</h3><RenderIdentity :key="identity" @log="log" /><button
                class="button secondary small"
                @click="identity++"
                >改变 key，重建实例</button
            ><button class="button secondary small" @click="inspectDebug">读取开发调试钩子记录</button></section
        >
        <section class="demo-card" style="margin-top: 20px"
            ><h3>真实模板编译结果</h3
            ><div class="demo-row"
                ><select v-model="compileCase" aria-label="编译示例"
                    ><option value="dynamic">静态与动态节点</option
                    ><option value="list">带 key 的列表</option></select
                ><button class="button primary small" :disabled="compiling" @click="inspectCompile">{{
                    compiling ? "正在加载编译器…" : "编译并查看输出"
                }}</button></div
            ><pre class="demo-code">{{ templates[compileCase] }}</pre
            ><pre v-if="compiled" class="demo-code compiler-output">{{ compiled }}</pre
            ><p class="demo-note"
                >输出随实际编译器版本变化。patch flag、静态缓存/提升和 block
                是优化信息，不是所有内容都在每次更新时重新比较。</p
            ></section
        >
        <LabLog :entries="entries" @clear="clear" />
    </div>
</template>
<style scoped>
.compiler-output {
    max-height: 340px;
    overflow: auto;
}
:deep(.render-badge) {
    display: inline-block;
    color: var(--primary, #267857);
    padding: 6px 10px;
    border-radius: 6px;
    background: var(--primary-soft, #e8f4eb);
    font-size: 12px;
}
</style>
