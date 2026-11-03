<script setup>
import { computed, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { ElButton, ElMessage, ElMessageBox, ElOption, ElSelect, ElTag } from "element-plus";
import { ArrowLeft, CalendarDays, Pencil, Trash2 } from "lucide-vue-next";
import { useTasksStore } from "@/stores/tasks";
import { taskPriorities, taskStatuses } from "@/services/taskService";
import TaskFormDialog from "@/components/business/TaskFormDialog.vue";

/**
 * 以路由 ID 为入口的任务详情页，可直接打开，也能响应同一组件内 params.id 的变化。
 * 详情读取 store 的同一个任务对象；编辑交给草稿弹窗，轻量状态切换直接调用 action。
 * 页面负责确认、消息与导航，store 不依赖这些界面能力。
 */
const store = useTasksStore();
const route = useRoute();
const router = useRouter();
// 在 computed 内访问 route.params，避免提前解构成一个不会随路由更新的普通字符串。
const task = computed(() => store.tasks.find((entry) => entry.id === route.params.id));
const open = ref(false);
const priority = computed(() => taskPriorities.find((entry) => entry.value === task.value?.priority));
async function remove() {
    try {
        await ElMessageBox.confirm("删除后无法恢复这条任务，是否继续？", "删除学习任务", {
            type: "warning",
            confirmButtonText: "删除",
            cancelButtonText: "取消"
        });
        // 确认通过后先改数据，再返回列表；删除后的详情通过 v-if 同样有缺失状态兜底。
        store.deleteTask(task.value.id);
        ElMessage.success("任务已删除");
        router.push("/tasks");
    } catch {
        // 确认框取消会进入 catch；当前实现也在这里结束删除流程中的其他抛错。
    }
}
</script>

<template>
    <!-- 旧链接、已删除任务都可能没有匹配项；先判断 task 再访问字段及其枚举元数据。 -->
    <section v-if="task" class="task-detail">
        <RouterLink to="/tasks" class="back-link"><ArrowLeft :size="15" /> 返回学习工作台</RouterLink>
        <div class="page-heading"
            ><div
                ><p class="eyebrow">ONE STEP AT A TIME</p><h1>{{ task.title }}</h1
                ><p class="muted">让每一次练习，都有明确的完成标准。</p></div
            ><ElButton @click="open = true"><Pencil :size="15" /> 编辑任务</ElButton></div
        >
        <div class="detail-layout"
            ><div class="panel detail-main"
                ><h2>学习说明</h2
                ><p class="description">{{
                    task.description || "还没有填写说明。点击编辑，记录你的学习问题与完成标准。"
                }}</p
                ><div class="task-detail-tags"
                    ><ElTag v-for="tag in task.tags" :key="tag" effect="plain">{{ tag }}</ElTag></div
                ><div class="callout"
                    ><strong>把知识变成自己的表达</strong
                    ><p>完成实验后，试着回答：我观察到了什么？为什么会这样？还有哪些使用边界？</p
                    ><RouterLink to="/interview">去面试复习区练习 →</RouterLink></div
                ></div
            ><aside class="panel detail-sidebar"
                ><h2>任务信息</h2><label>学习状态</label
                ><ElSelect :model-value="task.status" @update:model-value="store.updateStatus(task.id, $event)"
                    ><ElOption
                        v-for="status in taskStatuses"
                        :key="status.value"
                        :label="status.label"
                        :value="status.value" /></ElSelect
                ><label>优先级</label><ElTag :type="priority.color" effect="light">{{ priority.label }}</ElTag
                ><label>截止日期</label
                ><div class="row"
                    ><CalendarDays :size="15" /><span>{{ task.dueDate || "尚未设置" }}</span></div
                ><label>创建日期</label><p>{{ task.createdAt.slice(0, 10) }}</p
                ><ElButton type="danger" plain @click="remove"><Trash2 :size="14" /> 删除任务</ElButton></aside
            ></div
        >
        <!-- 与工作台复用同一编辑器和保存 action，详情页无需复制表单/校验实现。 -->
        <TaskFormDialog
            v-model:open="open"
            :task="task"
            :submit="store.saveTask"
            :existing-tasks="store.tasks"
            @saved="ElMessage.success('任务已保存')"
        />
    </section>
    <section v-else class="panel empty-state"
        ><h1>没有找到这个任务</h1><p>它可能已经被删除，或任务链接不完整。</p
        ><RouterLink to="/tasks" class="button primary">返回任务工作台</RouterLink></section
    >
</template>

<style scoped>
.back-link {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 12px;
    color: var(--text-secondary, #6e7c72);
    text-decoration: none;
    margin-bottom: 20px;
}
.task-detail .page-heading h1 {
    font-size: 27px;
}
.detail-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 260px;
    gap: 22px;
}
.detail-main,
.detail-sidebar {
    padding: 28px;
}
.task-detail h2 {
    font-size: 15px;
    margin: 0 0 22px;
}
.description {
    font-size: 14px;
    line-height: 2;
    white-space: pre-wrap;
    color: var(--text-secondary, #637267);
    min-height: 90px;
}
.task-detail-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 30px;
}
.detail-main .callout {
    margin-top: 30px;
}
.detail-main .callout p {
    font-size: 12px;
}
.detail-main .callout a {
    font-size: 12px;
    color: var(--el-color-primary);
}
.detail-sidebar label {
    display: block;
    margin: 22px 0 10px;
    font-size: 11px;
    color: var(--text-secondary, #738176);
}
.detail-sidebar p,
.detail-sidebar .row {
    font-size: 13px;
}
.detail-sidebar > .el-button {
    margin-top: 28px;
}
@media (max-width: 800px) {
    .detail-layout {
        grid-template-columns: 1fr;
    }
    .task-detail .page-heading h1 {
        font-size: 22px;
    }
}
</style>
