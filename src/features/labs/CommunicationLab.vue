<script setup>
/**
 * 组件通信的状态所有者：title、count、theme 都由父级创建和更新。
 * 子级提交事件，父级决定是否接收；兄弟摘要直接使用同一父级状态，孙级通过注入读取主题。
 * 父级只依赖子级公开的 focus 方法，而不把子组件内部草稿当作可随意改动的公共状态。
 */
import { ref, provide, useTemplateRef } from "vue";
import CommunicationChild from "./components/CommunicationChild.vue";
import LabLog from "./LabLog.vue";
import { useLabLog } from "./useLabLog";
const title = ref("学习组件通信"),
    count = ref(0),
    theme = ref("森林绿"),
    childKey = ref(0);
// 模板引用指向子实例公开接口，3.5+ 可通过 useTemplateRef 与 ref="child" 的名字关联。
const child = useTemplateRef("child");
// 直接提供 ref 而不是 theme.value 的普通快照，后代才能随主题变化；本页约定由父级修改。
provide("lab-theme", theme);
const { entries, log, clear } = useLabLog();
// 子事件是一次请求，状态最终由这里更新；真实业务可以在这一层加权限或领域校验。
function updateTitle(value) {
    title.value = value;
    log(`父级收到 update-title(${JSON.stringify(value)})，更新自己拥有的 title。`);
}
function reset() {
    title.value = "学习组件通信";
    count.value = 0;
    theme.value = "森林绿";
    // 更换实例清空子级局部草稿；仅将父级 title 恢复也不代表所有子级状态都会自动重置。
    childKey.value++;
    clear();
}
</script>
<template>
    <div class="vue-experiment">
        <div class="demo-row demo-toolbar"
            ><button
                class="button primary"
                @click="
                    child?.focus();
                    log('通过 defineExpose 的 focus 接口聚焦输入框。');
                "
                >父级调用子组件 focus()</button
            ><button class="button secondary" @click="reset">重置</button></div
        >
        <div class="demo-grid"
            ><section class="demo-card"
                ><h3>父组件 · 状态所有者</h3><div class="demo-result">title：{{ title }}<br />count：{{ count }}</div
                ><label class="demo-field"
                    >提供跨层主题<select v-model="theme"
                        ><option>森林绿</option
                        ><option>深海蓝</option
                        ><option>暖橙色</option></select
                    ></label
                ><p class="demo-note">兄弟组件需要的信息由共同父级协调；孙组件通过 inject 获取主题。</p
                ><div class="demo-result">兄弟摘要：当前标题「{{ title }}」，累计 {{ count }} 次。</div></section
            ><CommunicationChild
                :key="childKey"
                ref="child"
                :title="title"
                :count="count"
                @update-title="updateTitle"
                @increment="
                    count++;
                    log('父级收到 increment，更新共享计数。');
                "
        /></div>
        <LabLog :entries="entries" @clear="clear" />
    </div>
</template>
