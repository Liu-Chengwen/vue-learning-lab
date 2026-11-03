<script setup>
/**
 * 插槽与属性透传实验：父级决定内容，SlotCard 决定结构并提供 slot props。
 * parentText 属于父级词法作用域，task / label 通过子级插槽参数提供，不会自动混成一个作用域。
 * slotName 用动态插槽名选择扩展位置；accent 通过子组件的 CSS v-bind 控制局部样式。
 */
import { ref, reactive } from "vue";
import SlotCard from "./components/SlotCard.vue";
import LabLog from "./LabLog.vue";
import { useLabLog } from "./useLabLog";
const parentText = ref("这段内容属于父组件作用域"),
    slotName = ref("actions"),
    accent = ref("#267857");
// 父级把 task 作为 prop 交给子级，再从作用域插槽接回它；业务数据仍由父级拥有。
const task = reactive({ title: "封装一个可扩展卡片", priority: "重要" });
const { entries, log, clear } = useLabLog();
// 保留同一个 reactive task，仅更新字段；换插槽名只改变内容出口，不创建另一套业务状态。
function reset() {
    parentText.value = "这段内容属于父组件作用域";
    slotName.value = "actions";
    accent.value = "#267857";
    task.title = "封装一个可扩展卡片";
    clear();
}
</script>
<template>
    <div class="vue-experiment"
        ><div class="demo-row demo-toolbar"
            ><button class="button secondary small" @click="reset">重置</button
            ><label class="demo-row demo-note"
                >动态插槽位置<select v-model="slotName"
                    ><option value="actions">actions</option
                    ><option value="footer">footer</option></select
                ></label
            ><label class="demo-row demo-note">CSS v-bind 颜色<input v-model="accent" type="color" /></label
        ></div>
        <label class="demo-field">父级作用域文案<input v-model="parentText" /></label>
        <SlotCard
            id="attrs-demo"
            class="business-card"
            :task="task"
            :accent="accent"
            data-origin="来自父级 attrs"
            @click="log(`attrs 中的 click 监听器在卡片根节点触发；data-origin 已透传。`)"
        >
            <template #header
                ><span class="slot-label">具名 header · {{ parentText }}</span></template
            >
            <template #default="{ task: item, label }"
                ><b>{{ item.title }}</b
                ><br />子级提供的 slot props：{{ label }}<br />父级词法变量：{{ parentText }}</template
            >
            <template #[slotName]="scope"
                ><button
                    class="button small primary"
                    @click.stop="
                        log(`动态 ${slotName} 插槽点击；接收到 task：${scope.task?.title ?? '此插槽没有 task 参数'}`)
                    "
                    >动态插槽 → {{ slotName }}</button
                ></template
            >
        </SlotCard>
        <div class="demo-result"
            >组件有两个根节点；inheritAttrs: false 后通过 v-bind="attrs" 选择透传位置。点击卡片空白区与按钮，比较
            @click.stop 的传播行为。</div
        >
        <LabLog :entries="entries" @clear="clear" />
    </div>
</template>
