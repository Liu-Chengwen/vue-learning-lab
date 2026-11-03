<script setup>
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import {
    ElButton,
    ElConfigProvider,
    ElDatePicker,
    ElDialog,
    ElDrawer,
    ElInput,
    ElMessage,
    ElOption,
    ElPagination,
    ElProgress,
    ElRadioButton,
    ElRadioGroup,
    ElSelect,
    ElSlider,
    ElSwitch,
    ElTag
} from "element-plus";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import en from "element-plus/es/locale/lang/en";
import { ArrowUpRight, Boxes, Check, Code2, Globe2, Palette, Plus } from "lucide-vue-next";
import LessonFrame from "@/components/learning/LessonFrame.vue";
import SearchPanel from "@/components/business/SearchPanel.vue";
import DataTable from "@/components/business/DataTable.vue";
import TaskFormDialog from "@/components/business/TaskFormDialog.vue";
import RemoteSelect from "@/components/business/RemoteSelect.vue";
import { usePreferencesStore } from "@/stores/preferences";
import { useTasksStore } from "@/stores/tasks";
import { taskPriorities, taskStatuses } from "@/services/taskService";
import { uiLesson as lesson } from "@/data/uiLesson";

/**
 * 组件库学习工作台：应用/主题/业务封装是真实可操作案例，Ant Design Vue 区域是参考代码。
 * 基础组件显式导入，便于沿依赖追踪；四个业务封装与任务页面共用，不另写“只为演示”的替身。
 * 任务修改写入同一 Pinia store；主题与尺寸是全局偏好，语言和预览状态仅属于本页。
 */
const prefs = usePreferencesStore();
const tasks = useTasksStore();
const section = ref("applications");
const language = ref("zh-cn");
// locale 是组件库提供的配置对象，由局部 ConfigProvider 注入；与 CSS 变量主题是两条机制。
const locale = computed(() => (language.value === "zh-cn" ? zhCn : en));
const previewText = ref("下一步，理解组件的边界");
const previewDate = ref("");
const previewPage = ref(1);
const dialogOpen = ref(false);
const drawerOpen = ref(false);
const editorOpen = ref(false);
const failSearch = ref(false);
const selectedTags = ref(["Vue 3"]);
// radius 只映射到预览容器的变量；不会改写全局偏好或全部页面的圆角。
const radius = ref(8);
// 与业务页一致，编辑中的搜索条件和已应用条件分开保存，重置走相同的 apply 契约。
const filters = ref({ query: "", priority: "" });
const fieldsDisabled = ref(false);
const appliedFilters = ref({ query: "", priority: "" });
const page = ref(1);
const pageSize = ref(5);
const selectedContract = ref("DataTable");
const remoteSelect = ref();
const logs = ref([]);
const comparison = ref("form");

const tabs = [
    { id: "applications", title: "应用与配置", icon: Boxes },
    { id: "themes", title: "主题定制", icon: Palette },
    { id: "wrappers", title: "业务组件封装", icon: Code2 },
    { id: "ant", title: "Ant Design Vue 对照", icon: Globe2 }
];
const fields = computed(() => [
    {
        key: "query",
        label: "任务标题",
        type: "input",
        placeholder: "输入关键词，点击查询",
        disabled: fieldsDisabled.value
    },
    { key: "priority", label: "优先级", type: "select", options: taskPriorities, disabled: fieldsDisabled.value }
]);
// 第二个使用场景依然消费真实任务，只改变字段配置、列和插槽，检验封装的复用边界。
const rows = computed(() =>
    tasks.tasks.filter(
        (task) =>
            (!appliedFilters.value.query || task.title.includes(appliedFilters.value.query)) &&
            (!appliedFilters.value.priority || task.priority === appliedFilters.value.priority)
    )
);
const demoRows = computed(() => rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const columns = [
    { prop: "title", label: "任务 / 自定义单元格", minWidth: 240 },
    { prop: "status", label: "状态插槽", width: 130 },
    { prop: "action", label: "操作插槽", width: 100 }
];
function log(message) {
    logs.value = [message, ...logs.value].slice(0, 8);
}
function apply(value) {
    // 同时接收 submit/reset 的完整快照；不猜测子组件 props 是否已在当前 tick 同步。
    appliedFilters.value = { ...value };
    page.value = 1;
    log(`SearchPanel → submit ${JSON.stringify(value)}`);
}
function toggleStatus(row) {
    // 插槽属于使用方，因此在这里组织业务 action；DataTable 本身不认识 done/todo。
    const next = row.status === "done" ? "todo" : "done";
    tasks.updateStatus(row.id, next);
    log(`单元格插槽 → updateStatus(${row.id}, ${next})`);
}
// 文档与下方真实复用案例对应；阅读源码标签可检查每个接口的实现。
// 这里的文字只描述公开契约，不是运行时类型系统；输入约束仍由组件 props 与业务校验负责。
const contracts = {
    SearchPanel: {
        purpose: "组合搜索字段，值由使用方持有。",
        props: "modelValue: Object · fields: Array（字段可配置 disabled） · defaults: Object · loading: Boolean",
        events: "update:modelValue(value) · submit(value) · reset(value)",
        slots: "field-{key}({ value, update, disabled }) · actions",
        expose: "submit() · reset()"
    },
    DataTable: {
        purpose: "展示数据，发出交互事件，不绑定某个后端。",
        props: "data · columns · loading · total · page · pageSize · selectable · rowKey",
        events: "update:page · update:pageSize · selection-change(rows) · sort-change({ prop, order })",
        slots: "cell-{prop}({ row, value, index }) · default（额外列）",
        expose: "clearSelection()"
    },
    TaskFormDialog: {
        purpose: "隔离草稿与提交过程，统一关闭规则。",
        props: "open · task · submit: async Function · existingTasks · simulateFailure",
        events: "update:open · saved(result) · closed",
        slots: "特定业务表单，当前版本通过公开 props 完成复用",
        expose: "validate() · requestClose()"
    },
    RemoteSelect: {
        purpose: "封装远程加载和请求取消，值由使用方控制。",
        props: "modelValue · loader(query, { signal, fail }) · multiple · placeholder · simulateFailure",
        events: "update:modelValue · query(value) · loaded(options) · error(message)",
        slots: "当前版本提供标准标签选择，原生 Select 的其他需求可另行扩展",
        expose: "reload() · focus() · cancel()"
    }
};
// Ant Design Vue 4.x 是明确标识的参考代码，当前运行时没有装载第二套组件库。
// 片段中的 StatusTag 等名称是示意业务组件；字符串不会被当成模板编译或执行。
const antExamples = {
    form: {
        title: "同一个字段：值绑定与校验",
        element: `<el-form :model="form" :rules="rules" ref="formRef">\n  <el-form-item label="任务标题" prop="title">\n    <el-input v-model="form.title" />\n  </el-form-item>\n</el-form>\n\nawait formRef.value.validate()`,
        ant: `<a-form :model="form" :rules="rules" ref="formRef">\n  <a-form-item label="任务标题" name="title">\n    <a-input v-model:value="form.title" />\n  </a-form-item>\n</a-form>\n\nawait formRef.value.validate()`,
        note: "注意字段路径的 prop/name，以及不同组件的 v-model 参数；复杂组件应逐项核对当前版本 API。"
    },
    table: {
        title: "同一个单元格：列定义与作用域插槽",
        element: `<el-table :data="rows" row-key="id">\n  <el-table-column prop="status" label="状态">\n    <template #default="{ row }">\n      <StatusTag :status="row.status" />\n    </template>\n  </el-table-column>\n</el-table>`,
        ant: `<a-table :data-source="rows" :columns="columns" row-key="id">\n  <template #bodyCell="{ column, record }">\n    <StatusTag v-if="column.dataIndex === 'status'"\n      :status="record.status" />\n  </template>\n</a-table>\n// columns = [{ title: '状态', dataIndex: 'status' }]`,
        note: "Element Plus 常通过 TableColumn 组合列，Ant Design Vue 常使用 columns 与 bodyCell；两者都可以围绕明确的 props/events/slots 封装。"
    },
    dialog: {
        title: "同一个弹窗：控制打开与确认",
        element: `<el-dialog v-model="open" title="编辑任务"\n  :before-close="checkBeforeClose">\n  <TaskForm />\n  <template #footer>\n    <el-button @click="requestClose">取消</el-button>\n    <el-button :loading="saving" @click="save">保存</el-button>\n  </template>\n</el-dialog>`,
        ant: `<a-modal v-model:open="open" title="编辑任务"\n  :confirm-loading="saving"\n  @ok="save" @cancel="requestClose">\n  <TaskForm />\n</a-modal>`,
        note: "这里只对照基础 API。关闭前检查要根据具体版本的 model 更新与事件时机设计；需要严格阻止取消时，可受控传入 open 并统一管理关闭入口。"
    },
    theme: {
        title: "同一个主题：两套配置机制",
        element: `/* 全局变量作用于页面与 body 下的弹层 */\nhtml {\n  --el-color-primary: #2c7a58;\n  --el-color-primary-light-3: #6ba286;\n  --el-border-radius-base: 8px;\n}\n/* ConfigProvider 管理 size、locale 等配置 */`,
        ant: `<a-config-provider :theme="{\n  token: { colorPrimary: '#2c7a58', borderRadius: 8 },\n  algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm\n}">\n  <AppContent />\n</a-config-provider>\n// import { theme } from 'ant-design-vue'`,
        note: "Ant Design Vue 4.x 使用 Design Token 与 CSS-in-JS；静态反馈方法的配置上下文需要按官方文档单独处理，不能假设自动继承当前 Provider。"
    }
};
const currentExample = computed(() => antExamples[comparison.value]);
// 主线仍使用 JavaScript；这个接口对照帮助理解泛型与组件公开契约的关系。
// 它是供阅读的代码字符串，不会给下面的 JavaScript 组件自动增加静态类型检查。
const typeExample = `interface Column<Row> {
    prop: keyof Row | "actions";
    label: string;
    minWidth?: number;
}
interface DataTableProps<Row extends { id: string }> {
    data: Row[];
    columns: Column<Row>[];
    loading?: boolean;
    page: number;
    pageSize: number;
    total: number;
}
// 事件示意：selection-change(rows: Row[])
// 插槽示意：cell-title({ row: Row, value: unknown, index: number })`;
</script>

<template>
    <LessonFrame :lesson="lesson">
        <div class="library-nav"
            ><button v-for="tab in tabs" :key="tab.id" :class="{ active: section === tab.id }" @click="section = tab.id"
                ><component :is="tab.icon" :size="16" />{{ tab.title }}</button
            ></div
        >

        <!-- 通用应用：局部 Provider 演示语言，全局 prefs 演示尺寸；反馈/弹层使用公开 API。 -->
        <template v-if="section === 'applications'">
            <div class="library-intro"
                ><div class="library-mark">EP</div
                ><div><h2>从真实需求出发</h2><p>表单、表格与反馈组件，最终要协作完成一个可用的流程。</p></div
                ><RouterLink to="/tasks" class="button primary">打开任务工作台 <ArrowUpRight :size="15" /></RouterLink
            ></div>
            <div class="lab-grid">
                <div class="panel"
                    ><div class="panel-header"><h2>全局配置的局部实验</h2><span class="tag">ConfigProvider</span></div
                    ><div class="panel-body stack"
                        ><label class="field"
                            >预览语言<ElRadioGroup v-model="language"
                                ><ElRadioButton value="zh-cn">中文</ElRadioButton
                                ><ElRadioButton value="en">English</ElRadioButton></ElRadioGroup
                            ></label
                        ><label class="field"
                            >组件尺寸<ElRadioGroup v-model="prefs.density"
                                ><ElRadioButton value="small">紧凑</ElRadioButton
                                ><ElRadioButton value="default">默认</ElRadioButton
                                ><ElRadioButton value="large">宽松</ElRadioButton></ElRadioGroup
                            ></label
                        ><p class="muted">尺寸会同步到整个应用。下方语言仅作用于局部 Provider 中的组件。</p
                        ><ElConfigProvider :locale="locale" :size="prefs.density"
                            ><div class="stack"
                                ><ElInput v-model="previewText" clearable placeholder="Input something" /><ElDatePicker
                                    v-model="previewDate"
                                    type="date"
                                    placeholder="选择日期 / Select date" /><ElPagination
                                    v-model:current-page="previewPage"
                                    :page-size="10"
                                    :total="55"
                                    layout="total, prev, pager, next" /></div></ElConfigProvider></div
                ></div>
                <div class="panel"
                    ><div class="panel-header"><h2>反馈与弹层</h2><span class="tag">公开 API + 插槽</span></div
                    ><div class="panel-body stack"
                        ><p class="muted">调用消息提示、打开带自定义头尾的弹窗，观察主题与层级。</p
                        ><div class="row"
                            ><ElButton type="primary" @click="ElMessage.success('学习目标已记录，继续前进！')"
                                >成功提示</ElButton
                            ><ElButton @click="ElMessage.warning('先完成当前实验，再进入下一步。')"
                                >警告提示</ElButton
                            ></div
                        ><ElButton @click="dialogOpen = true">打开定制弹窗</ElButton
                        ><ElButton @click="drawerOpen = true">打开信息抽屉</ElButton
                        ><div class="callout"
                            ><strong>组件库解决通用交互，业务组件表达具体需求</strong
                            ><p>完整工作台还处理了字段校验、编辑取消、分页、选择、失败恢复和持久化。</p></div
                        ><div class="library-checklist"
                            ><span><Check :size="14" />Form / Input / Select / DatePicker</span
                            ><span><Check :size="14" />Table / Pagination / Tag</span
                            ><span><Check :size="14" />Dialog / Drawer / Message / Loading</span></div
                        ></div
                    ></div
                >
            </div>
        </template>

        <!-- 主题实验比较 html 全局变量与局部容器覆盖；Teleport 后继承哪一层由真实 DOM 决定。 -->
        <template v-else-if="section === 'themes'">
            <div class="lab-grid"
                ><div class="panel"
                    ><div class="panel-header"><h2>统一主题控制台</h2><span class="tag">实时生效 · 本地保存</span></div
                    ><div class="panel-body stack"
                        ><div class="field"
                            ><span>主题色</span
                            ><div class="accent-options"
                                ><button
                                    v-for="accent in [
                                        { value: 'green', label: '森林绿', color: '#2d7a58' },
                                        { value: 'blue', label: '湖水蓝', color: '#4278bb' },
                                        { value: 'violet', label: '鸢尾紫', color: '#8063af' }
                                    ]"
                                    :key="accent.value"
                                    :class="{ active: prefs.accent === accent.value }"
                                    @click="prefs.setAccent(accent.value)"
                                    ><i :style="{ background: accent.color }" />{{ accent.label
                                    }}<Check v-if="prefs.accent === accent.value" :size="13" /></button></div></div
                        ><label class="row"
                            ><ElSwitch
                                :model-value="prefs.theme === 'dark'"
                                @update:model-value="prefs.setTheme($event ? 'dark' : 'light')"
                            /><span>深色模式</span></label
                        ><label class="field"
                            >局部预览圆角：{{ radius }}px<ElSlider v-model="radius" :min="0" :max="20" /></label
                        ><div class="row"
                            ><ElButton type="primary" @click="dialogOpen = true">检查弹出层主题</ElButton
                            ><ElButton
                                @click="
                                    prefs.setAccent('green');
                                    prefs.setTheme('light');
                                    radius = 8;
                                "
                                >恢复默认</ElButton
                            ></div
                        ><p class="muted">全局变量在 html 上生效；圆角滑块只覆盖右侧预览容器。</p></div
                    ></div
                ><div class="panel"
                    ><div class="panel-header"><h2>组件状态预览</h2><span class="tag">CSS 变量映射</span></div
                    ><div class="panel-body stack" :style="{ '--el-border-radius-base': `${radius}px` }"
                        ><div class="row"
                            ><ElButton type="primary">主要按钮</ElButton
                            ><ElButton type="primary" plain>次级按钮</ElButton
                            ><ElButton type="primary" disabled>禁用</ElButton></div
                        ><ElInput v-model="previewText" /><div class="row"
                            ><ElTag>默认标签</ElTag><ElTag type="success">成功</ElTag
                            ><ElTag type="warning">进行中</ElTag></div
                        ><ElProgress :percentage="65" :stroke-width="8" /><div class="native-preview"
                            ><span>原生教学组件</span><strong>与组件库共享主题变量</strong
                            ><button class="button primary" @click="ElMessage.info('原生按钮也可以使用统一设计变量')"
                                >原生按钮</button
                            ></div
                        ><div class="local-brand"
                            ><span class="muted">局部主题：只影响此区域</span
                            ><ElButton type="primary" @click="dialogOpen = true">暖色局部按钮</ElButton></div
                        ></div
                    ></div
                ></div
            >
            <div class="callout"
                ><strong>为什么局部按钮是暖色，弹窗仍是全局主题？</strong
                ><p
                    >变量继承取决于实际 DOM。弹窗 append-to-body 后位于 body 下，不再继承这个局部容器的 CSS 变量。Vue
                    的逻辑组件关系仍然保留，CSS 继承关系却发生了变化。</p
                ></div
            >
        </template>

        <!-- 复用实验：值、请求和业务操作留在使用方，通过 model/events/slots 连接封装组件。 -->
        <template v-else-if="section === 'wrappers'">
            <div class="panel"
                ><div class="panel-header"
                    ><h2>同一套业务组件，第二个使用场景</h2
                    ><ElButton type="primary" @click="editorOpen = true"
                        ><Plus :size="14" /> 试用表单弹窗</ElButton
                    ></div
                ><div class="panel-body stack"
                    ><label class="row"
                        ><ElSwitch v-model="fieldsDisabled" aria-label="禁用搜索字段" />
                        禁用搜索字段（保留当前值）</label
                    ><p class="muted">开关同时控制任务标题和自定义优先级控件；查询仍提交当前条件，重置仍恢复默认值。</p
                    ><SearchPanel
                        v-model="filters"
                        :fields="fields"
                        :defaults="{ query: '', priority: '' }"
                        @submit="apply"
                        @reset="apply"
                        ><template #field-priority="{ value, update, disabled }"
                            ><ElSelect
                                id="search-priority"
                                :model-value="value"
                                :disabled="disabled"
                                placeholder="自定义字段插槽"
                                clearable
                                @update:model-value="update"
                                ><ElOption
                                    v-for="option in taskPriorities"
                                    :key="option.value"
                                    :label="option.label"
                                    :value="option.value" /></ElSelect></template></SearchPanel
                    ><DataTable
                        v-model:page="page"
                        v-model:page-size="pageSize"
                        :data="demoRows"
                        :columns="columns"
                        :total="rows.length"
                        @selection-change="log(`DataTable → selection-change：${$event.length} 项`)"
                        ><template #cell-title="{ row }"
                            ><RouterLink :to="`/tasks/${row.id}`" class="demo-task-link">{{ row.title }}</RouterLink
                            ><p class="demo-caption">{{ row.tags.join(" · ") }}</p></template
                        ><template #cell-status="{ row }"
                            ><ElTag
                                :type="taskStatuses.find((entry) => entry.value === row.status).color"
                                round
                                size="small"
                                >{{ taskStatuses.find((entry) => entry.value === row.status).label }}</ElTag
                            ></template
                        ><template #cell-action="{ row }"
                            ><ElButton link type="primary" @click="toggleStatus(row)">{{
                                row.status === "done" ? "重新学习" : "标记完成"
                            }}</ElButton></template
                        ></DataTable
                    ></div
                ></div
            >
            <div class="lab-grid"
                ><div class="panel"
                    ><div class="panel-header"><h2>远程选择器</h2><span class="tag">防抖 · 取消 · 竞态</span></div
                    ><div class="panel-body stack"
                        ><RemoteSelect
                            ref="remoteSelect"
                            v-model="selectedTags"
                            :simulate-failure="failSearch"
                            @query="log(`RemoteSelect → query：${$event || '全部'}`)"
                            @loaded="log(`RemoteSelect → loaded：${$event.length} 项`)"
                            @error="log(`RemoteSelect → error：${$event}`)"
                        /><label class="row"><ElSwitch v-model="failSearch" /> 模拟搜索失败（持续）</label
                        ><div class="row"
                            ><ElButton @click="remoteSelect?.reload()">重新请求</ElButton
                            ><ElButton @click="remoteSelect?.focus()">父组件调用 focus</ElButton></div
                        ><p class="muted">输入变化先取消旧请求，再等待 300ms 发起搜索。关闭模拟失败后可重试。</p
                        ><code class="selected-model">model = {{ JSON.stringify(selectedTags) }}</code></div
                    ></div
                ><div class="panel"
                    ><div class="panel-header"><h2>公开接口与数据归属</h2></div
                    ><div class="panel-body stack"
                        ><ElSelect v-model="selectedContract"
                            ><ElOption
                                v-for="(_value, key) in contracts"
                                :key="key"
                                :value="key"
                                :label="key" /></ElSelect
                        ><p class="muted">{{ contracts[selectedContract].purpose }}</p
                        ><dl class="contract-list"
                            ><dt>Props</dt><dd>{{ contracts[selectedContract].props }}</dd
                            ><dt>Events</dt><dd>{{ contracts[selectedContract].events }}</dd
                            ><dt>Slots</dt><dd>{{ contracts[selectedContract].slots }}</dd
                            ><dt>Expose</dt><dd>{{ contracts[selectedContract].expose }}</dd></dl
                        ></div
                    ></div
                ></div
            >
            <details class="panel type-contract">
                <summary>拓展：同一份 DataTable 公开契约的 TypeScript 表达</summary>
                <pre class="code-block"><code>{{ typeExample }}</code></pre>
            </details>
            <div class="panel"
                ><div class="panel-header"
                    ><h2>观察真实事件</h2
                    ><button class="button small secondary" @click="logs = []">清空日志</button></div
                ><div class="panel-body"
                    ><ol v-if="logs.length" class="event-log"
                        ><li v-for="(entry, index) in logs" :key="index">{{ entry }}</li></ol
                    ><div v-else class="muted">查询、选择行、切换任务状态或搜索标签，观察组件向外提供的事件。</div></div
                ></div
            >
        </template>

        <template v-else>
            <div class="callout"
                ><strong>Ant Design Vue 4.x · 参考对照</strong
                ><p
                    >这里展示同一需求的公开 API 写法。当前业务运行 Element Plus；下面的 Ant Design Vue
                    片段用作迁移阅读，不会在页面中执行。</p
                ><a href="https://antdv.com/components/overview" target="_blank" rel="noopener noreferrer"
                    >打开官方组件文档 ↗</a
                ></div
            >
            <div class="comparison-tabs"
                ><button
                    v-for="(example, key) in antExamples"
                    :key="key"
                    class="button small"
                    :class="comparison === key ? 'primary' : 'secondary'"
                    @click="comparison = key"
                    >{{ { form: "表单", table: "表格", dialog: "弹窗", theme: "主题" }[key] }}</button
                ></div
            ><div
                ><h2 class="comparison-title">{{ currentExample.title }}</h2
                ><div class="lab-grid"
                    ><div class="panel"
                        ><div class="panel-header"><h3>Element Plus</h3><span class="tag">项目主线</span></div
                        >><pre class="code-block"><code>{{ currentExample.element }}</code></pre></div
                    ><div class="panel"
                        ><div class="panel-header"><h3>Ant Design Vue 4.x</h3><span class="tag">API 对照</span></div
                        >><pre class="code-block"><code>{{ currentExample.ant }}</code></pre>
                    </div></div
                ><p class="comparison-note">{{ currentExample.note }}</p></div
            >
        </template>

        <ElDrawer v-model="drawerOpen" title="学习信息抽屉" size="min(420px, 95vw)" append-to-body>
            <div class="stack">
                <p class="muted"
                    >抽屉保留当前页面上下文，适合查看补充信息。完整任务使用独立详情路由，便于直接访问和分享链接。</p
                >
                <div class="callout"
                    ><strong>两种信息组织方式</strong
                    ><p
                        >Drawer 是页面局部打开状态；详情路由把任务 ID 放在 URL
                        中。根据用户是否需要保留列表上下文、直接访问和浏览历史选择。</p
                    ></div
                >
                <RouterLink
                    v-if="tasks.tasks.length"
                    :to="`/tasks/${tasks.tasks[0].id}`"
                    class="button primary"
                    @click="drawerOpen = false"
                    >查看任务详情路由 <ArrowUpRight :size="14"
                /></RouterLink>
                <ElButton @click="drawerOpen = false">关闭抽屉</ElButton>
            </div>
        </ElDrawer>
        <ElDialog v-model="dialogOpen" title="主题与插槽预览" width="min(460px,calc(100vw - 32px))" append-to-body
            ><template #header="{ titleId }"
                ><div class="custom-dialog-header"
                    ><span class="library-mark small">EP</span
                    ><div
                        ><h3 :id="titleId">定制弹窗，保留清晰边界</h3><p>header / default / footer 三个区域</p></div
                    ></div
                ></template
            ><div class="stack"
                ><p class="muted">这个弹窗传送到 body，使用全局主题变量。标题通过 titleId 保留可访问名称。</p
                ><ElInput v-model="previewText" /><ElProgress :percentage="65" /></div
            ><template #footer
                ><ElButton @click="dialogOpen = false">关闭预览</ElButton
                ><ElButton
                    type="primary"
                    @click="
                        ElMessage.success('插槽内容由使用方提供');
                        dialogOpen = false;
                    "
                    >体验完成</ElButton
                ></template
            ></ElDialog
        >
        <TaskFormDialog
            v-model:open="editorOpen"
            :submit="tasks.saveTask"
            :existing-tasks="tasks.tasks"
            @saved="ElMessage.success('已添加到真实任务工作台')"
        />
    </LessonFrame>
</template>

<style scoped>
.library-nav {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}
.library-nav button {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 12px;
    padding: 10px 15px;
    border: 1px solid var(--border, #e5ebe6);
    border-radius: 8px;
    background: var(--surface, #fff);
    color: var(--text-secondary, #6c7a70);
    cursor: pointer;
}
.library-nav button.active {
    background: var(--primary-soft, #e9f3ed);
    color: var(--primary, #2d7a58);
    border-color: var(--primary-border, #c6dfcf);
}
.library-intro {
    display: flex;
    align-items: center;
    gap: 17px;
    border: 1px solid var(--border, #e5ebe6);
    border-radius: 12px;
    padding: 24px;
    background: var(--surface, #fff);
}
.library-mark {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    background: var(--el-color-primary-light-9);
    border: 1px solid var(--el-color-primary-light-7);
    color: var(--el-color-primary);
    font-size: 17px;
    font-weight: 700;
    border-radius: 12px;
    letter-spacing: -1px;
}
.library-intro h2 {
    font-size: 17px;
    margin: 0 0 7px;
}
.library-intro p {
    font-size: 12px;
    color: var(--text-secondary, #6f7e73);
    margin: 0;
}
.library-intro > .button {
    margin-left: auto;
    white-space: nowrap;
}
.library-checklist {
    display: flex;
    flex-direction: column;
    gap: 12px;
    font-size: 12px;
    color: var(--text-secondary, #6d7a71);
}
.library-checklist span {
    display: flex;
    gap: 7px;
    align-items: center;
}
.library-checklist svg {
    color: var(--el-color-primary);
}
.accent-options {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}
.accent-options button {
    display: flex;
    align-items: center;
    gap: 7px;
    border: 1px solid var(--border, #e5ebe6);
    border-radius: 8px;
    background: var(--surface, #fff);
    padding: 10px 12px;
    font-size: 12px;
    color: var(--text-secondary, #6d7b72);
    cursor: pointer;
}
.accent-options button.active {
    border-color: var(--primary, #2d7a58);
    color: var(--primary, #2d7a58);
}
.accent-options i {
    width: 12px;
    height: 12px;
    border-radius: 50%;
}
.native-preview {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 20px;
    background: var(--primary-soft, #edf5ef);
    border: 1px solid var(--primary-border, #cfe3d5);
    border-radius: var(--el-border-radius-base);
}
.native-preview > span {
    font-size: 11px;
    color: var(--text-secondary, #6d7b72);
}
.native-preview > strong {
    font-size: 14px;
}
.local-brand {
    --el-color-primary: #ad6a35;
    --el-color-primary-light-3: #c6946b;
    --el-color-primary-light-5: #d6b395;
    --el-color-primary-light-7: #e6d1bf;
    --el-color-primary-light-9: #f7eee6;
    --el-color-primary-dark-2: #8a552a;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    border: 1px dashed var(--border, #e5ebe6);
    padding: 16px;
    border-radius: 8px;
    font-size: 12px;
}
.demo-task-link {
    font-size: 12px;
    font-weight: 550;
    color: var(--text, #263e30);
    text-decoration: none;
}
.demo-task-link:hover {
    color: var(--primary, #2d7a58);
}
.demo-caption {
    font-size: 10px;
    margin: 5px 0 0;
    color: var(--text-secondary, #7d8a80);
}
.selected-model {
    font-size: 11px;
    color: var(--primary, #2d7a58);
    background: var(--surface-soft, #f4f7f2);
    padding: 10px;
    border-radius: 6px;
    overflow-wrap: anywhere;
}
.contract-list {
    display: grid;
    grid-template-columns: 50px minmax(0, 1fr);
    gap: 12px;
    margin: 0;
    font-size: 11px;
    line-height: 1.8;
}
.contract-list dt {
    color: var(--primary, #2d7a58);
    font-weight: 600;
}
.contract-list dd {
    margin: 0;
    overflow-wrap: anywhere;
    color: var(--text-secondary, #6b7a70);
}
.comparison-tabs {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}
.comparison-title {
    font-size: 17px;
    margin: 0 0 18px;
}
.comparison-note {
    font-size: 12px;
    color: var(--text-secondary, #6e7d73);
    line-height: 1.9;
    margin: 18px 0 0;
}
.comparison-tabs + .comparison-title {
    margin-top: 10px;
}
.custom-dialog-header {
    display: flex;
    gap: 12px;
    align-items: center;
}
.library-mark.small {
    width: 38px;
    height: 38px;
    border-radius: 9px;
    font-size: 14px;
}
.custom-dialog-header h3 {
    font-size: 15px;
    margin: 0 0 5px;
}
.custom-dialog-header p {
    font-size: 11px;
    margin: 0;
    color: var(--text-secondary, #6e7c73);
}
.library-nav ~ .lab-grid .panel-body > .muted {
    font-size: 12px;
    line-height: 1.9;
}
.code-block {
    font-size: 11px;
    min-height: 250px;
    margin: 0;
    border-radius: 0 0 12px 12px;
}
.panel-body .row {
    flex-wrap: wrap;
}
.panel-body .el-date-editor {
    max-width: 100%;
}
.panel-body :deep(.el-pagination) {
    flex-wrap: wrap;
    gap: 4px;
}
.callout a {
    font-size: 12px;
    color: var(--primary, #2d7a58);
}
.type-contract summary {
    padding: 18px 22px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    color: var(--primary);
}
@media (max-width: 800px) {
    .library-intro {
        align-items: flex-start;
        flex-wrap: wrap;
    }
    .library-intro > .button {
        margin-left: 65px;
    }
    .library-nav button {
        padding: 9px 11px;
        font-size: 11px;
    }
    .local-brand {
        flex-wrap: wrap;
    }
    .contract-list {
        grid-template-columns: 1fr;
        gap: 3px;
    }
    .contract-list dd {
        margin-bottom: 9px;
    }
}
</style>
