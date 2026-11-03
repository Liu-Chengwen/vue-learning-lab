<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import {
    ElAlert,
    ElButton,
    ElCheckbox,
    ElMessage,
    ElMessageBox,
    ElOption,
    ElSelect,
    ElSwitch,
    ElTag
} from "element-plus";
import { ArrowUpRight, Check, Columns3, List, Pencil, Plus, RotateCcw, Trash2 } from "lucide-vue-next";
import SearchPanel from "@/components/business/SearchPanel.vue";
import DataTable from "@/components/business/DataTable.vue";
import TaskFormDialog from "@/components/business/TaskFormDialog.vue";
import { useTasksStore } from "@/stores/tasks";
import { taskPriorities, taskStatuses } from "@/services/taskService";

/**
 * 完整业务编排页：把 SearchPanel、DataTable、TaskFormDialog 与任务 store 连接起来。
 * Store 持有任务真源；本页拥有筛选、分页、视图、选中行、编辑目标和演示开关。
 * 表格/看板共享 computed 结果，所以同一条状态变更会同步反映到两种视图及全局统计。
 */
const store = useTasksStore();
const emptyFilters = () => ({ query: "", status: "", priority: "", dueDate: "" });
// draftFilters 跟随输入变化；filters 只在查询/重置时应用，避免用户输入半截就改变结果。
const draftFilters = ref(emptyFilters());
const filters = ref(emptyFilters());
const view = ref("table");
const sort = ref("newest");
const page = ref(1);
const pageSize = ref(5);
const selection = ref([]);
const table = ref();
const editorOpen = ref(false);
// null 表示新建；编辑时传任务引用作为输入，但弹窗内部会建立独立草稿，不直接修改它。
const editingTask = ref(null);
// 列表失败是一次性注入，保存失败则是持续开关，分别练习重试与恢复操作。
const failNext = ref(false);
const failSave = ref(false);
const showLearning = ref(false);
const logs = ref([]);
let controller;

// 配置只描述通用字段/列；任务标题、标签和操作区仍由下面的作用域插槽表达业务。
const fields = [
    { key: "query", label: "搜索任务", type: "input", placeholder: "输入标题、说明或标签" },
    { key: "status", label: "学习状态", type: "select", options: taskStatuses },
    { key: "priority", label: "优先级", type: "select", options: taskPriorities },
    { key: "dueDate", label: "在此日期前截止", type: "date" }
];
const columns = [
    { prop: "title", label: "任务", minWidth: 260 },
    { prop: "status", label: "状态", width: 110 },
    { prop: "priority", label: "优先级", width: 110 },
    { prop: "dueDate", label: "截止日期", width: 120, sortable: "custom" },
    { prop: "actions", label: "操作", width: 115, align: "right" }
];
// 这些都是派生状态：不再手动维护第二份列表，也不在 watch 中重复同步筛选结果。
// filter 返回新数组，随后的 sort 不会改变 store.tasks 的原始顺序。
const filtered = computed(() => {
    const query = filters.value.query.trim().toLowerCase();
    const list = store.tasks.filter(
        (task) =>
            (!query || [task.title, task.description, ...task.tags].join(" ").toLowerCase().includes(query)) &&
            (!filters.value.status || task.status === filters.value.status) &&
            (!filters.value.priority || task.priority === filters.value.priority) &&
            (!filters.value.dueDate || (task.dueDate && task.dueDate <= filters.value.dueDate))
    );
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    // dueDate 统一为 YYYY-MM-DD，才能按字符串顺序比较；空日期用边界值放到后面。
    return list.sort((a, b) =>
        sort.value === "priority"
            ? priorityOrder[a.priority] - priorityOrder[b.priority]
            : sort.value === "date"
              ? (a.dueDate || "9999").localeCompare(b.dueDate || "9999")
              : sort.value === "date-desc"
                ? (b.dueDate || "").localeCompare(a.dueDate || "")
                : b.createdAt.localeCompare(a.createdAt)
    );
});
const pagedTasks = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
// 计数对应“已应用”条件，必须与列表使用同一份 filters，不能读取输入草稿。
const activeFilterCount = computed(() => Object.values(filters.value).filter(Boolean).length);
const statusMeta = (value) => taskStatuses.find((entry) => entry.value === value);
const priorityMeta = (value) => taskPriorities.find((entry) => entry.value === value);
function log(message) {
    // 页面日志记录真实动作，设置上限；它不参与请求或数据更新的判断。
    logs.value = [message, ...logs.value].slice(0, 8);
}

// 当前产品的选择语义是“当前页选择”：筛选或分页变化后清空选中行。
watch([filtered, page, pageSize], () => {
    // 删除最后一页数据、缩小结果集后，把当前页夹到仍然存在的页码范围。
    page.value = Math.min(page.value, Math.max(1, Math.ceil(filtered.value.length / pageSize.value)));
    selection.value = [];
    table.value?.clearSelection();
});

// 真实使用 AbortSignal 取消旧加载，失败开关只影响下一次列表请求。
// 服务仅模拟等待/错误，筛选与分页仍在本地 computed 完成，不能把它说成真实服务端分页。
async function reload() {
    controller?.abort();
    controller = new AbortController();
    const fail = failNext.value;
    failNext.value = false;
    log(`请求列表${fail ? "（本次模拟失败）" : ""} → loading`);
    try {
        await store.loadTasks({ signal: controller.signal, delay: 450, fail });
        log(`请求成功 → ${filtered.value.length} 条匹配结果`);
    } catch (error) {
        if (error.name !== "AbortError") log(`请求失败 → ${error.message}`);
    }
}
function applyFilters(value) {
    // 保存条件快照并回到第一页；异步 loading/error 只负责本次加载体验。
    filters.value = { ...value };
    page.value = 1;
    reload();
}
function resetFilters(value) {
    // 使用 SearchPanel 发出的 next 默认值快照，输入 model 的 props 回传可能尚未完成。
    filters.value = { ...value };
    page.value = 1;
    reload();
}
function createTask() {
    editingTask.value = null;
    editorOpen.value = true;
}
function editTask(task) {
    editingTask.value = task;
    editorOpen.value = true;
}
function onSaved(task) {
    // 弹窗等待 store.saveTask 成功后才发 saved，此处只处理页面反馈，不再次插入数据。
    log(`保存成功 → ${task.title}`);
    ElMessage.success("任务已保存");
}
async function removeTask(task) {
    // 破坏性意图由使用方确认，展示型 DataTable 不决定任务是否可以删除。
    try {
        await ElMessageBox.confirm(`删除「${task.title}」？`, "删除任务", {
            confirmButtonText: "删除",
            cancelButtonText: "取消",
            type: "warning"
        });
        store.deleteTask(task.id);
        log(`删除任务 → ${task.title}`);
        ElMessage.success("任务已删除");
    } catch {
        /* 用户取消时保持数据。 */
    }
}
function changeStatus(task, status) {
    store.updateStatus(task.id, status);
    log(`${task.title} → ${statusMeta(status).label}`);
}
function completeSelected() {
    // 先提取稳定 ID，再执行更新；更新后筛选结果与选择状态可能立即随之变化。
    store.bulkUpdate(
        selection.value.map((task) => task.id),
        "done"
    );
    log("批量更新 → 已完成");
    ElMessage.success("选中任务已标记完成");
    table.value?.clearSelection();
}
async function restore() {
    try {
        await ElMessageBox.confirm("当前任务将替换为初始示例，学习进度不受影响。", "恢复示例任务", {
            confirmButtonText: "恢复示例",
            cancelButtonText: "取消",
            type: "warning"
        });
        store.resetTasks();
        draftFilters.value = emptyFilters();
        filters.value = emptyFilters();
        page.value = 1;
        log("任务已恢复初始示例");
    } catch {
        /* 取消操作。 */
    }
}
function onSort({ prop, order }) {
    // 将组件库的排序事件翻译成页面已有策略，避免两套排序状态互相覆盖。
    if (prop === "dueDate")
        sort.value = order === "ascending" ? "date" : order === "descending" ? "date-desc" : "newest";
}
onMounted(reload);
// 离开路由时取消等待，避免旧页面在后台继续生成加载结果与日志。
onBeforeUnmount(() => controller?.abort());
</script>

<template>
    <section class="tasks-page">
        <div class="page-heading">
            <div
                ><p class="eyebrow">BUILD SOMETHING REAL</p><h1>学习任务工作台<span class="heading-dot">.</span></h1
                ><p class="muted">用一个完整业务闭环，把组件、状态和交互串起来。</p></div
            >
            <button class="button primary" @click="createTask"><Plus :size="17" /> 新建任务</button>
        </div>

        <!-- 统计由同一份 store 派生；不受当前筛选条件影响，表达的是全部学习任务。 -->
        <div class="task-metrics">
            <div class="task-metric"
                ><span>全部任务</span><strong>{{ store.stats.total }}<small>项学习目标</small></strong
                ><div class="metric-line"
            /></div>
            <div class="task-metric"
                ><span><i class="status-dot doing" /> 进行中</span
                ><strong>{{ store.stats.doing }}<small>保持专注</small></strong
                ><div class="metric-line doing"
            /></div>
            <div class="task-metric"
                ><span><i class="status-dot done" /> 已完成</span
                ><strong>{{ store.stats.done }}<small>每一步都算数</small></strong
                ><div class="metric-line done"
            /></div>
            <div class="task-metric"
                ><span>完成率</span><strong>{{ store.stats.completion }}<small>%</small></strong
                ><div class="metric-progress"><span :style="{ width: `${store.stats.completion}%` }" /></div
            ></div>
        </div>

        <!-- 组件 model 控制输入，submit/reset 控制何时应用条件，两个方向各有职责。 -->
        <div class="panel filter-panel"
            ><SearchPanel
                v-model="draftFilters"
                :fields="fields"
                :defaults="emptyFilters()"
                :loading="store.loading"
                @submit="applyFilters"
                @reset="resetFilters"
        /></div>
        <ElAlert
            v-if="store.storageError"
            :title="store.storageError"
            type="warning"
            :closable="false"
            show-icon
            class="task-alert"
        />
        <ElAlert
            v-if="store.loadError"
            :title="store.loadError"
            type="error"
            :closable="false"
            show-icon
            class="task-alert"
            ><template #default><ElButton link type="primary" @click="reload">重试请求</ElButton></template></ElAlert
        >

        <div class="panel task-list-panel">
            <div class="task-list-heading">
                <div class="task-list-title"
                    ><h2>我的学习清单</h2><span class="tag">{{ filtered.length }}</span
                    ><span v-if="activeFilterCount" class="muted">{{ activeFilterCount }} 项筛选</span></div
                >
                <div class="task-list-tools">
                    <ElSelect v-model="sort" aria-label="任务排序" style="width: 142px"
                        ><ElOption label="最近创建" value="newest" /><ElOption
                            label="优先级优先"
                            value="priority" /><ElOption label="截止日期优先" value="date" /><ElOption
                            label="截止日期倒序"
                            value="date-desc"
                    /></ElSelect>
                    <div class="view-switch"
                        ><button
                            :class="{ active: view === 'table' }"
                            title="表格视图"
                            aria-label="表格视图"
                            @click="view = 'table'"
                            ><List :size="17" /></button
                        ><button
                            :class="{ active: view === 'board' }"
                            title="看板视图"
                            aria-label="看板视图"
                            @click="view = 'board'"
                            ><Columns3 :size="17" /></button
                    ></div>
                </div>
            </div>
            <div v-if="selection.length && view === 'table'" class="selection-bar"
                ><span>已选择 {{ selection.length }} 项</span
                ><ElButton size="small" type="primary" plain @click="completeSelected"
                    ><Check :size="14" /> 标记完成</ElButton
                ></div
            >

            <DataTable
                v-if="view === 'table'"
                ref="table"
                v-model:page="page"
                v-model:page-size="pageSize"
                :data="pagedTasks"
                :columns="columns"
                :total="filtered.length"
                :loading="store.loading"
                @selection-change="selection = $event"
                @sort-change="onSort"
            >
                <template #cell-title="{ row }"
                    ><div class="task-title-cell"
                        ><RouterLink :to="`/tasks/${row.id}`">{{ row.title }}</RouterLink
                        ><div class="task-tags"
                            ><span v-for="tag in row.tags.slice(0, 3)" :key="tag">{{ tag }}</span></div
                        ></div
                    ></template
                >
                <template #cell-status="{ row }"
                    ><ElTag :type="statusMeta(row.status).color" effect="light" round size="small"
                        ><i class="status-dot" :class="row.status" />{{ statusMeta(row.status).label }}</ElTag
                    ></template
                >
                <template #cell-priority="{ row }"
                    ><span class="priority-label" :class="row.priority"
                        ><i />{{ priorityMeta(row.priority).label.replace("优先级", "") }}</span
                    ></template
                >
                <template #cell-dueDate="{ value }"
                    ><span class="date-cell">{{ value || "未设置" }}</span></template
                >
                <template #cell-actions="{ row }"
                    ><div class="row-actions"
                        ><button title="编辑任务" aria-label="编辑任务" @click="editTask(row)"
                            ><Pencil :size="15" /></button
                        ><RouterLink :to="`/tasks/${row.id}`" title="查看详情" aria-label="查看详情"
                            ><ArrowUpRight :size="16" /></RouterLink
                        ><button class="delete-action" title="删除任务" aria-label="删除任务" @click="removeTask(row)"
                            ><Trash2 :size="15" /></button></div
                ></template>
            </DataTable>

            <div v-else class="kanban">
                <div v-for="status in taskStatuses" :key="status.value" class="kanban-column"
                    ><div class="kanban-title"
                        ><i class="status-dot" :class="status.value" /><strong>{{ status.label }}</strong
                        ><span>{{ filtered.filter((task) => task.status === status.value).length }}</span></div
                    >
                    <div
                        v-for="task in filtered.filter((entry) => entry.status === status.value)"
                        :key="task.id"
                        class="kanban-card"
                        ><RouterLink :to="`/tasks/${task.id}`">{{ task.title }}</RouterLink
                        ><p>{{ task.description }}</p
                        ><div class="task-tags"
                            ><span v-for="tag in task.tags" :key="tag">{{ tag }}</span></div
                        ><div class="kanban-card-footer"
                            ><ElSelect
                                :model-value="task.status"
                                size="small"
                                aria-label="调整学习状态"
                                style="width: 104px"
                                @update:model-value="changeStatus(task, $event)"
                                ><ElOption
                                    v-for="entry in taskStatuses"
                                    :key="entry.value"
                                    :label="entry.label"
                                    :value="entry.value" /></ElSelect
                            ><button class="icon-button" title="编辑任务" aria-label="编辑任务" @click="editTask(task)"
                                ><Pencil :size="14" /></button></div
                    ></div>
                    <div v-if="!filtered.some((task) => task.status === status.value)" class="kanban-empty"
                        >这个阶段还没有任务</div
                    >
                </div>
            </div>
        </div>

        <div class="learning-strip"
            ><div
                ><span class="learning-strip__label">边做边学</span
                ><span>这个页面用到了 <strong>Pinia · 组件封装 · 插槽 · v-model · 异步管理</strong></span></div
            ><button @click="showLearning = !showLearning"
                >{{ showLearning ? "收起学习面板" : "观察数据流" }} <ArrowUpRight :size="14" /></button
        ></div>
        <div v-if="showLearning" class="panel task-learning-panel"
            ><div class="lab-grid"
                ><div class="stack"
                    ><h3>模拟服务与状态</h3
                    ><label class="row"><ElSwitch v-model="failNext" /> 下次列表请求失败（一次）</label
                    ><label class="row"><ElSwitch v-model="failSave" /> 保存时模拟失败（持续）</label
                    ><div class="row"
                        ><ElButton @click="reload">重新请求列表</ElButton
                        ><ElButton @click="restore"><RotateCcw :size="14" /> 恢复示例</ElButton></div
                    ><p class="muted"
                        >请求失败可重试；编辑草稿独立于列表对象；任务保存在当前浏览器。持久化由 store
                        负责，表格只负责展示。</p
                    ><RouterLink to="/ui-library" class="component-link">阅读业务组件的公开接口 →</RouterLink></div
                ><div
                    ><h3>真实事件日志</h3
                    ><ol class="event-log"
                        ><li v-for="(entry, index) in logs" :key="index">{{ entry }}</li></ol
                    ></div
                ></div
            ></div
        >
        <TaskFormDialog
            v-model:open="editorOpen"
            :task="editingTask"
            :submit="store.saveTask"
            :existing-tasks="store.tasks"
            :simulate-failure="failSave"
            @saved="onSaved"
        />
    </section>
</template>

<style scoped>
.task-metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}
.task-metric {
    background: var(--surface, #fff);
    border: 1px solid var(--border, #e6ebe6);
    border-radius: 12px;
    padding: 20px 22px;
}
.task-metric > span {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--text-secondary, #6c786f);
    font-size: 12px;
}
.task-metric > strong {
    display: flex;
    align-items: baseline;
    gap: 10px;
    font-size: 32px;
    font-weight: 650;
    letter-spacing: -1px;
    margin-top: 10px;
}
.task-metric small {
    font-size: 11px;
    font-weight: 400;
    color: var(--text-secondary, #6c786f);
    letter-spacing: 0;
}
.metric-line {
    height: 3px;
    background: var(--border, #e6ebe6);
    border-radius: 5px;
    margin-top: 15px;
}
.metric-line.doing {
    background: #efc16a;
    width: 55%;
}
.metric-line.done {
    background: #60a88a;
    width: 70%;
}
.metric-progress {
    height: 3px;
    background: var(--border, #e6ebe6);
    border-radius: 5px;
    margin-top: 15px;
    overflow: hidden;
}
.metric-progress span {
    display: block;
    height: 100%;
    background: var(--el-color-primary);
}
.filter-panel {
    padding: 22px;
    margin-bottom: 20px;
}
.task-alert {
    margin-bottom: 18px;
}
.task-list-panel {
    padding: 22px;
}
.task-list-heading,
.task-list-title,
.task-list-tools {
    display: flex;
    align-items: center;
    gap: 12px;
}
.task-list-heading {
    justify-content: space-between;
    margin-bottom: 22px;
    flex-wrap: wrap;
}
.task-list-title h2 {
    font-size: 16px;
    margin: 0;
}
.task-list-title > .muted {
    font-size: 12px;
}
.view-switch {
    display: flex;
    border: 1px solid var(--border, #e0e7e1);
    border-radius: 7px;
    padding: 3px;
    gap: 2px;
}
.view-switch button {
    display: grid;
    place-items: center;
    border: 0;
    background: transparent;
    color: var(--text-secondary, #6c786f);
    border-radius: 4px;
    width: 30px;
    height: 27px;
    cursor: pointer;
}
.view-switch button.active {
    background: var(--surface-soft, #edf3ee);
    color: var(--el-color-primary);
}
.task-title-cell > a {
    font-weight: 550;
    color: var(--text, #253c30);
    text-decoration: none;
    font-size: 13px;
}
.task-title-cell > a:hover {
    color: var(--el-color-primary);
}
.task-tags {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    margin-top: 7px;
}
.task-tags > span {
    font-size: 10px;
    line-height: 1.6;
    padding: 1px 6px;
    border-radius: 4px;
    background: var(--surface-soft, #f2f5f2);
    color: var(--text-secondary, #718077);
}
.status-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #98a49d;
    margin-right: 5px;
    flex-shrink: 0;
}
.status-dot.doing {
    background: #d8a347;
}
.status-dot.done {
    background: #399274;
}
.priority-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-secondary, #6d786e);
}
.priority-label i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #a5aea8;
}
.priority-label.high i {
    background: #e08d7e;
}
.priority-label.medium i {
    background: #d6b06b;
}
.date-cell {
    font-size: 12px;
    color: var(--text-secondary, #6c786f);
    font-variant-numeric: tabular-nums;
}
.row-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 4px;
}
.row-actions button,
.row-actions a,
.icon-button {
    display: grid;
    place-items: center;
    width: 27px;
    height: 27px;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--text-secondary, #7a877d);
    cursor: pointer;
}
.row-actions button:hover,
.row-actions a:hover,
.icon-button:hover {
    background: var(--surface-soft, #edf3ee);
    color: var(--el-color-primary);
}
.row-actions .delete-action:hover {
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
}
.selection-bar {
    display: flex;
    align-items: center;
    gap: 18px;
    margin-bottom: 16px;
    padding: 10px 14px;
    background: var(--el-color-primary-light-9);
    border-radius: 7px;
    font-size: 12px;
}
.kanban {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    align-items: start;
}
.kanban-column {
    background: var(--surface-soft, #f6f8f5);
    border-radius: 9px;
    padding: 13px;
}
.kanban-title {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 14px;
    font-size: 12px;
}
.kanban-title > span {
    margin-left: auto;
    color: var(--text-secondary, #6c786f);
}
.kanban-card {
    padding: 16px;
    background: var(--surface, #fff);
    border: 1px solid var(--border, #e5ebe4);
    border-radius: 8px;
    margin-bottom: 10px;
}
.kanban-card > a {
    text-decoration: none;
    color: var(--text, #253c30);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.7;
}
.kanban-card p {
    font-size: 12px;
    color: var(--text-secondary, #6c786f);
    line-height: 1.8;
    margin: 8px 0;
}
.kanban-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 16px;
}
.kanban-empty {
    text-align: center;
    padding: 30px 8px;
    font-size: 12px;
    color: var(--text-secondary, #7f8d82);
}
.learning-strip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 3px;
    font-size: 12px;
    gap: 12px;
    flex-wrap: wrap;
    color: var(--text-secondary, #738077);
}
.learning-strip > div {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}
.learning-strip__label {
    font-size: 10px;
    background: var(--surface-soft, #edf2eb);
    padding: 3px 7px;
    border-radius: 4px;
}
.learning-strip strong {
    font-weight: 500;
}
.learning-strip button {
    display: flex;
    align-items: center;
    gap: 5px;
    border: 0;
    background: none;
    font-size: 12px;
    color: var(--el-color-primary);
    cursor: pointer;
}
.task-learning-panel {
    padding: 24px;
}
.task-learning-panel h3 {
    font-size: 14px;
    margin: 0 0 16px;
}
.task-learning-panel .row {
    font-size: 12px;
}
.task-learning-panel p {
    font-size: 12px;
    line-height: 1.9;
}
.component-link {
    font-size: 12px;
    color: var(--el-color-primary);
    text-decoration: none;
}
.event-log {
    font-size: 11px;
    line-height: 1.9;
}
.heading-dot {
    color: var(--el-color-primary);
}
@media (max-width: 1050px) {
    .task-metrics {
        gap: 10px;
    }
    .task-metric {
        padding: 16px;
    }
    .kanban {
        grid-template-columns: 1fr;
    }
}
@media (max-width: 650px) {
    .task-metrics {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .task-list-panel {
        padding: 15px;
    }
    .task-metric > strong {
        font-size: 27px;
    }
    .filter-panel {
        padding: 16px;
    }
    .task-list-tools {
        width: 100%;
        justify-content: space-between;
    }
}
</style>
