<script setup>
/**
 * 版本迁移复盘：真实输入框运行 Vue 3 协议，Vue 2 内容只作为对照文本。
 * 选择题刻意包含错误选项，用于区分版本、API 风格和生态库，而非把三者绑定为一组。
 * 回答和展开状态由本页管理，不影响其他实验或全局学习进度。
 */
import { ref } from "vue";
import ModelInput from "./components/ModelInput.vue";
import LabLog from "./LabLog.vue";
import { useLabLog } from "./useLabLog";
// 页面只运行 Vue 3；Vue 2 代码作为版本明确的迁移参考显示。
const title = ref("Vue 3"),
    answer = ref(""),
    revealed = ref(false);
const { entries, log, clear } = useLabLog();
const options = ["Vue 3 不再支持 Options API", "Vue 2.7 也支持 Composition API", "所有 Vue 3 页面都需要 Pinia"];
// 答案索引只服务于这道固定单选题；展开解析与运行输入框是彼此独立的局部状态。
function verify() {
    revealed.value = true;
    log(
        answer.value === options[1]
            ? "判断正确：版本差异不等于两种 API 风格互斥。"
            : "再想一想：API 风格、Vue 版本与生态库是不同维度。"
    );
}
function reset() {
    title.value = "Vue 3";
    answer.value = "";
    revealed.value = false;
    clear();
}
</script>
<template>
    <div class="vue-experiment"
        ><div class="demo-row demo-toolbar"
            ><RouterLink class="button primary" to="/migration">打开完整迁移对照</RouterLink
            ><button class="button secondary" @click="reset">重置</button></div
        ><div class="demo-grid"
            ><section class="demo-card"
                ><h3>组件 model 协议</h3><ModelInput v-model="title" /><div class="demo-result"
                    >父级 title：{{ title }}</div
                ><pre class="demo-code">
Vue 2：value + input
Vue 3：modelValue + update:modelValue
Vue 3.4+：defineModel()</pre
                ><p class="demo-note"
                    >实际输入框运行 Vue 3 默认协议；不要把源码中的 Vue 2 片段当作当前实现。</p
                ></section
            ><section class="demo-card"
                ><h3>先判断，再解释</h3><p>下面哪句话成立？</p
                ><label v-for="item in options" :key="item" class="demo-row demo-note" style="margin: 14px 0"
                    ><input v-model="answer" type="radio" :value="item" />{{ item }}</label
                ><button class="button primary small" :disabled="!answer" @click="verify">验证回答</button
                ><p v-if="revealed" class="demo-result"
                    >正确项：Vue 2.7 也支持 Composition API。Vue 3 同时支持 Options API；Pinia
                    适合需要共享状态的场景。</p
                ></section
            ></div
        ><LabLog :entries="entries" @clear="clear"
    /></div>
</template>
