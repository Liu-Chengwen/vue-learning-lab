<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import {
    ElAlert,
    ElButton,
    ElDatePicker,
    ElDialog,
    ElForm,
    ElFormItem,
    ElInput,
    ElMessageBox,
    ElOption,
    ElRadioButton,
    ElRadioGroup,
    ElSelect
} from "element-plus";
import RemoteSelect from "./RemoteSelect.vue";
import { cloneTask, taskPriorities, taskStatuses, waitForResponse } from "@/services/taskService";

/**
 * 任务专用表单弹窗：父级用 v-model:open 控制显示，task 是待编辑原数据或 null（新建）。
 * 草稿、校验、保存锁与错误属于本组件；submit(draft,{signal,fail}) 属于业务层，成功应返回保存后的任务。
 * saved 只在保存成功后发出；closed 表示弹窗关闭动画结束，两者不是同一个事件。
 * 这是有明确字段的业务表单，不向外开放任意表单插槽；复用点是任务数据和异步保存契约。
 */
const open = defineModel("open", { type: Boolean, default: false });
const props = defineProps({
    task: { type: Object, default: null },
    submit: { type: Function, required: true },
    existingTasks: { type: Array, default: () => [] },
    simulateFailure: Boolean
});
const emit = defineEmits(["saved", "closed"]);
// 工厂函数让每次新建都获得独立 tags 数组，不共享上一次编辑的对象。
const blank = () => ({ title: "", description: "", status: "todo", priority: "medium", tags: [], dueDate: "" });
const draft = ref(blank());
const snapshot = ref("");
const form = ref();
const submitting = ref(false);
const submitError = ref("");
let saveController;
// active 是非响应式生命周期守卫；它只参与异步恢复判断，不需要驱动模板渲染。
let active = true;
let confirmingClose = false;
// 字段可能因 blur、整表校验等触发多个异步调用，集合负责在关闭/卸载时统一中止。
const validationControllers = new Set();
// 这里只比较本表单可序列化的简单字段，不把 JSON.stringify 当成任意对象的通用相等判断。
const dirty = computed(() => JSON.stringify(draft.value) !== snapshot.value);
// Element FormItem 依据 prop 路径读取 draft 字段；规则触发时机与最终服务校验各有职责。
const rules = computed(() => ({
    title: [
        { required: true, message: "请输入任务标题", trigger: "blur" },
        { min: 3, max: 80, message: "标题需要 3～80 个字符", trigger: "blur" },
        {
            async validator(_rule, value) {
                const controller = new AbortController();
                validationControllers.add(controller);
                try {
                    await waitForResponse(null, { delay: 180, signal: controller.signal });
                    // 编辑时排除自己的 id；这是交互反馈，store 保存前还会再检查冲突。
                    if (
                        props.existingTasks.some(
                            (task) => task.id !== draft.value.id && task.title.trim() === String(value).trim()
                        )
                    )
                        throw new Error("已有同名任务，请换一个标题");
                } finally {
                    validationControllers.delete(controller);
                }
            },
            trigger: "blur"
        }
    ],
    status: [{ required: true, message: "请选择学习状态", trigger: "change" }],
    priority: [{ required: true, message: "请选择优先级", trigger: "change" }]
}));

// 每次打开重新建立草稿，取消时只丢弃草稿，不回写列表对象。
// destroy-on-close 只销毁 Dialog 内容，外层业务组件可继续存在，因此关闭时也要主动取消工作。
watch(
    open,
    async (value) => {
        if (!value) {
            saveController?.abort();
            validationControllers.forEach((controller) => controller.abort());
            return;
        }
        draft.value = props.task ? cloneTask(props.task) : blank();
        snapshot.value = JSON.stringify(draft.value);
        submitError.value = "";
        // 第一次打开时 Form 可能尚未挂载，等本轮 DOM/组件更新完成再访问实例方法。
        await nextTick();
        form.value?.clearValidate();
    },
    { immediate: true }
);

// 所有关闭入口共享这个判断；before-close 不会自动覆盖自定义页脚按钮。
// 返回 Promise<boolean>，不直接关闭，供 Dialog 的 done 回调与自定义取消按钮共同使用。
async function canClose() {
    if (submitting.value || confirmingClose || !active) return false;
    if (!dirty.value) return true;
    confirmingClose = true;
    try {
        await ElMessageBox.confirm("尚有未保存的修改，关闭后会放弃这些修改。", "放弃修改？", {
            confirmButtonText: "放弃修改",
            cancelButtonText: "继续编辑",
            type: "warning"
        });
        return active && !submitting.value;
    } catch {
        return false;
    } finally {
        confirmingClose = false;
    }
}
async function requestClose() {
    if (await canClose()) open.value = false;
}
async function beforeClose(done) {
    // 库管理自己的关闭流程：确认通过后交回 done，避免绕开其动画和事件。
    if (await canClose()) done();
}
function onVisibility(value) {
    // Dialog 已完成相应关闭检查后才同步 open，不在这里再次弹出确认框。
    if (!value) open.value = false;
}

/** 校验与保存组成同一个互斥流程：任一步失败都保留草稿，用户可以修正或重试。 */
async function save() {
    if (submitting.value || !active || !open.value || !form.value) return;
    // 校验也是异步阶段：在 await 之前加锁，避免双击同时通过校验并重复创建。
    submitting.value = true;
    submitError.value = "";
    saveController = new AbortController();
    let validated = false;
    try {
        const valid = await form.value.validate();
        if (valid === false) return;
        validated = true;
        // 校验期间路由可能已离开；不能在组件销毁后才启动保存。
        if (!active || !open.value || saveController.signal.aborted) return;
        // emit 不返回父组件异步结果，使用明确的 submit 契约等待保存成功。
        const result = await props.submit(cloneTask(draft.value), {
            signal: saveController.signal,
            fail: props.simulateFailure
        });
        if (!active || saveController.signal.aborted) return;
        // 标记已保存后再通知父级/关闭，这样本次成功提交不会被当成未保存修改。
        snapshot.value = JSON.stringify(draft.value);
        emit("saved", result);
        open.value = false;
    } catch (error) {
        // validate 的字段错误由 FormItem 展示；只有保存阶段的错误显示为服务错误。
        if (active && validated && error?.name !== "AbortError")
            submitError.value = error?.message || "保存失败，请重试。";
    } finally {
        if (active) submitting.value = false;
    }
}
// 路由切走时同时停止异步校验和保存；两种等待都不能继续写入或触发成功事件。
onBeforeUnmount(() => {
    active = false;
    saveController?.abort();
    validationControllers.forEach((controller) => controller.abort());
    validationControllers.clear();
});
// 暴露校验与受保护关闭；不暴露 draft，避免父组件从外部绕过保存事务修改草稿。
defineExpose({ validate: () => form.value?.validate(), requestClose });
</script>

<template>
    <!-- append-to-body 使弹层脱离局部布局；全局主题变量放在 html，传送后仍可继承。
         submitting 期间禁用关闭入口，保护校验与保存这一完整流程。 -->
    <ElDialog
        :model-value="open"
        :title="task ? '编辑学习任务' : '新建学习任务'"
        width="min(560px, calc(100vw - 32px))"
        append-to-body
        destroy-on-close
        :before-close="beforeClose"
        :close-on-click-modal="!submitting"
        :close-on-press-escape="!submitting"
        :show-close="!submitting"
        @update:model-value="onVisibility"
        @closed="emit('closed')"
    >
        <p class="dialog-hint">把目标拆成一个可以完成的小步骤。</p>
        <ElAlert
            v-if="submitError"
            :title="submitError"
            type="error"
            :closable="false"
            show-icon
            class="submit-error"
        />
        <ElForm
            ref="form"
            :model="draft"
            :rules="rules"
            label-position="top"
            :disabled="submitting"
            @submit.prevent="save"
        >
            <ElFormItem label="任务标题" prop="title"
                ><ElInput
                    v-model="draft.title"
                    placeholder="例如：用自己的话解释 computed 与 watch"
                    maxlength="80"
                    show-word-limit
            /></ElFormItem>
            <ElFormItem label="学习说明" prop="description"
                ><ElInput
                    v-model="draft.description"
                    type="textarea"
                    :rows="3"
                    placeholder="记录你想验证的问题与完成标准"
                    maxlength="500"
                    show-word-limit
            /></ElFormItem>
            <div class="form-columns">
                <ElFormItem label="学习状态" prop="status"
                    ><ElSelect v-model="draft.status"
                        ><ElOption
                            v-for="status in taskStatuses"
                            :key="status.value"
                            :label="status.label"
                            :value="status.value" /></ElSelect
                ></ElFormItem>
                <ElFormItem label="截止日期" prop="dueDate"
                    ><ElDatePicker
                        v-model="draft.dueDate"
                        type="date"
                        value-format="YYYY-MM-DD"
                        placeholder="选择日期（可选）"
                        style="width: 100%"
                /></ElFormItem>
            </div>
            <!-- RadioGroup 是 div，不能作为原生 label 的 for 目标。
                 空 for 明确启用组语义，组件继续用 aria-labelledby 关联可见标题。 -->
            <ElFormItem label="优先级" prop="priority" for=""
                ><ElRadioGroup v-model="draft.priority"
                    ><ElRadioButton v-for="priority in taskPriorities" :key="priority.value" :value="priority.value">{{
                        priority.label
                    }}</ElRadioButton></ElRadioGroup
                ></ElFormItem
            >
            <ElFormItem label="学习标签" prop="tags"
                ><RemoteSelect v-model="draft.tags" :disabled="submitting"
            /></ElFormItem>
            <button type="submit" style="display: none" aria-hidden="true" tabindex="-1">提交</button>
        </ElForm>
        <template #footer
            ><div class="dialog-footer"
                ><span class="muted">{{ dirty ? "有未保存的修改" : "修改保存在本地浏览器" }}</span
                ><div
                    ><ElButton :disabled="submitting" @click="requestClose">取消</ElButton
                    ><ElButton type="primary" :loading="submitting" @click="save">{{
                        submitting ? "正在保存" : "保存任务"
                    }}</ElButton></div
                ></div
            ></template
        >
    </ElDialog>
</template>

<style scoped>
.dialog-hint {
    margin: 0 0 22px;
    color: var(--text-secondary, #6e7a72);
    font-size: 13px;
}
.submit-error {
    margin-bottom: 18px;
}
.form-columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}
.dialog-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
}
.dialog-footer > .muted {
    font-size: 12px;
}
@media (max-width: 520px) {
    .form-columns {
        grid-template-columns: 1fr;
        gap: 0;
    }
    .dialog-footer {
        align-items: flex-start;
        flex-direction: column;
    }
    .dialog-footer > div {
        align-self: flex-end;
    }
}
</style>
