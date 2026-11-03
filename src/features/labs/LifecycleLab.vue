<script setup>
/**
 * 生命周期观察页：父级长期持有日志，v-if 仅创建/销毁被观察的子组件。
 * 同时展示局部指令、插件注入和后代错误捕获，区分 DOM 行为、应用扩展与组件实例职责。
 * 计时器等持续副作用在 useScopedTicker 中建立并清理，本页不直接替子组件管理资源。
 */
import { ref, inject, onErrorCaptured } from "vue";
import LifecycleProbe from "./components/LifecycleProbe.vue";
import ErrorProbe from "./components/ErrorProbe.vue";
import LabLog from "./LabLog.vue";
import { useLabLog } from "./useLabLog";
// 父级持有日志；v-if 仅控制被观察子组件，不销毁已有日志。
const mounted = ref(false),
    key = ref(0),
    focusVisible = ref(false),
    highlight = ref(false),
    caught = ref("");
// 插件通过 app.use 注册应用级服务；默认值 null 允许当前实验在未安装插件的测试环境中独立挂载。
const appService = inject("learning-app", null);
const { entries, log, clear } = useLabLog();
// script setup 中 vFocus 自动对应模板 v-focus；mounted 后才存在可聚焦的真实元素。
const vFocus = {
    mounted(element) {
        element.focus();
        log("v-focus mounted：DOM 已存在，执行 focus。");
    }
};
// 指令负责 DOM 层行为；外观开关仍由组件 state 驱动，不在指令里新建第二份业务状态。
const vHighlight = {
    mounted(element, binding) {
        element.style.outline = binding.value ? "2px solid #267857" : "none";
    },
    updated(element, binding) {
        // 指令 updated 随所属组件更新而执行。只在值改变时记日志，避免日志触发更新后再次记日志。
        if (binding.value === binding.oldValue) return;
        element.style.outline = binding.value ? "2px solid #267857" : "none";
        log(`指令 updated：highlight = ${binding.value}`);
    }
};
// 捕获后代的 Vue 错误传播链；error 为异常，instance 为来源实例，info 描述发生阶段。
onErrorCaptured((error, instance, info) => {
    caught.value = error.message;
    log(`onErrorCaptured：${error.message}（${info}）`);
    return false; // 当前教学边界已展示错误，阻止继续向应用级处理器传播。
});
// v-if 关闭会触发子级卸载与清理；那些最后的生命周期日志可能在当前同步清空之后才到达。
function reset() {
    mounted.value = false;
    focusVisible.value = false;
    highlight.value = false;
    caught.value = "";
    key.value++;
    clear();
}
</script>
<template>
    <div class="vue-experiment"
        ><div class="demo-row demo-toolbar"
            ><button class="button primary" @click="mounted = !mounted">{{ mounted ? "卸载组件" : "挂载组件" }}</button
            ><button class="button secondary" @click="reset">重置</button></div
        >
        <div class="demo-grid"
            ><LifecycleProbe v-if="mounted" :key="key" @log="log" /><section v-else class="demo-card"
                ><h3>组件尚未挂载</h3><p class="muted">点击“挂载组件”，等两秒，再卸载，观察最后的清理日志。</p></section
            ><section class="demo-card"
                ><h3>指令 · 可复用 DOM 行为</h3
                ><button class="button secondary small" @click="focusVisible = !focusVisible">切换自动聚焦输入框</button
                ><label v-if="focusVisible" class="demo-field"
                    >v-focus<input v-focus placeholder="挂载后自动聚焦" /></label
                ><label class="demo-row demo-note" style="margin-top: 16px"
                    ><input v-model="highlight" type="checkbox" />触发自定义指令 updated</label
                ><div v-highlight="highlight" class="demo-result">这个 DOM 的 outline 由指令更新。</div></section
            ></div
        >
        <div class="demo-grid" style="margin-top: 20px"
            ><section class="demo-card"
                ><h3>插件 · 应用级依赖</h3
                ><div class="demo-result">{{
                    appService
                        ? `实际注入服务：${appService.name} · v${appService.version}`
                        : "当前应用尚未提供 learning-app 服务。"
                }}</div
                ><p class="demo-note"
                    >查看 src/plugins/learningPlugin.js：app.use 安装插件，provide 注册服务，组件 inject 使用。</p
                ></section
            ><section class="demo-card"
                ><h3>后代错误边界</h3><ErrorProbe /><p v-if="caught" role="status" class="demo-result"
                    >已捕获：{{ caught }}</p
                ><p class="demo-note">错误被显示并阻止继续传播；其他实验仍可操作。</p></section
            ></div
        >
        <LabLog :entries="entries" @clear="clear" />
    </div>
</template>
