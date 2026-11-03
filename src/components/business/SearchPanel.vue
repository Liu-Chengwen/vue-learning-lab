<script setup>
import { ElButton, ElDatePicker, ElInput, ElOption, ElSelect } from "element-plus";

/**
 * 可复用搜索面板：父组件持有条件值，本组件组合控件并发出用户意图，不自行筛选/请求数据。
 * model 是整个条件对象；fields 描述 key/label/type/options/disabled，defaults 描述“重置到什么值”。
 * 输入修改仅更新 model；submit/reset 才通知父级应用条件，因此能区分编辑中与已提交状态。
 * 支持 field-{key}({value,update,disabled}) 和 actions 插槽；插槽控件由使用方绑定禁用状态。
 */
defineOptions({ inheritAttrs: false });
const model = defineModel({ type: Object, default: () => ({}) });
const props = defineProps({
    fields: { type: Array, default: () => [] },
    loading: Boolean,
    defaults: { type: Object, default: () => ({}) }
});
const emit = defineEmits(["submit", "reset"]);
// defineModel 是 modelValue + update:modelValue 的编译简写，不代表可以任意修改父对象内部。
// 替换 model 对象，而不是直接修改父组件传入对象的属性。
function update(key, value) {
    model.value = { ...model.value, [key]: value };
}
function submit() {
    // 发出当前条件的快照；使用方可以单独持有 appliedFilters，不与输入中的对象混用。
    emit("submit", { ...model.value });
}
function reset() {
    // 父受控 model 的新 props 要等下一次渲染才传回；赋值后立即回读
    // model.value 仍可能是旧条件，因此用同一份 next 快照更新值并通知查询。
    const next = { ...props.defaults };
    model.value = next;
    emit("reset", { ...next });
}
// 只暴露业务动作，外部不需要依赖内部某个 Input/Select 的具体实例结构。
defineExpose({ reset, submit });
</script>

<template>
    <!-- attrs 放在 form 上，保留使用方的 class/aria 属性；键盘 Enter 与查询按钮共用 submit。 -->
    <form class="search-panel" v-bind="$attrs" @submit.prevent="submit">
        <div
            v-for="field in fields"
            :key="field.key"
            class="search-panel__field"
            :class="{ 'search-panel__field--grow': field.type === 'input' }"
        >
            <label :for="`search-${field.key}`">{{ field.label }}</label>
            <!-- 特殊字段通过作用域插槽扩展，不继续堆叠配置分支。 -->
            <slot
                :name="`field-${field.key}`"
                :value="model[field.key]"
                :update="(value) => update(field.key, value)"
                :disabled="Boolean(field.disabled)"
            >
                <ElInput
                    v-if="field.type === 'input'"
                    :id="`search-${field.key}`"
                    :model-value="model[field.key]"
                    :disabled="Boolean(field.disabled)"
                    :placeholder="field.placeholder || '请输入关键词'"
                    clearable
                    @update:model-value="update(field.key, $event)"
                />
                <ElDatePicker
                    v-else-if="field.type === 'date'"
                    :id="`search-${field.key}`"
                    :model-value="model[field.key]"
                    :disabled="Boolean(field.disabled)"
                    type="date"
                    value-format="YYYY-MM-DD"
                    placeholder="选择日期"
                    clearable
                    @update:model-value="update(field.key, $event)"
                />
                <ElSelect
                    v-else
                    :id="`search-${field.key}`"
                    :model-value="model[field.key]"
                    :disabled="Boolean(field.disabled)"
                    :placeholder="field.placeholder || '全部'"
                    clearable
                    @update:model-value="update(field.key, $event)"
                >
                    <ElOption
                        v-for="option in field.options || []"
                        :key="option.value"
                        :label="option.label"
                        :value="option.value"
                    />
                </ElSelect>
            </slot>
        </div>
        <div class="search-panel__actions">
            <ElButton type="primary" native-type="submit" :loading="loading">查询</ElButton>
            <ElButton native-type="button" @click="reset">重置</ElButton>
            <slot name="actions" />
        </div>
    </form>
</template>

<style scoped>
.search-panel {
    display: flex;
    align-items: flex-end;
    gap: 14px;
    flex-wrap: wrap;
}
.search-panel__field {
    min-width: 140px;
    flex: 1 1 145px;
}
.search-panel__field--grow {
    flex: 2 1 240px;
}
.search-panel__field > label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 7px;
    color: var(--text-secondary, #67756b);
}
.search-panel__field :deep(.el-date-editor) {
    width: 100%;
}
.search-panel__actions {
    display: flex;
    gap: 8px;
    align-items: center;
}
.search-panel__actions :deep(.el-button + .el-button) {
    margin-left: 0;
}
</style>
