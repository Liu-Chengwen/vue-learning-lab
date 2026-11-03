<script setup>
import { computed, onMounted, ref } from "vue";
import { ElButton, ElOption, ElSelect } from "element-plus";
import { searchTags } from "@/services/taskService";
import { useRequest } from "@/composables/useRequest";
import { useDebounce } from "@/composables/useDebounce";

/**
 * 可注入查询函数的远程选择器：父级拥有选中值，本组件拥有候选项、搜索词、加载与错误状态。
 * loader(query,{signal,fail}) 返回 Promise<Array<{label,value}>>，默认为本地异步标签服务。
 * multiple 默认多选，对应数组 model；单选时调用方传单个值。选中值与候选项是两种不同状态。
 * query/loaded/error 是观察事件，更新 model 仍沿标准 update:modelValue 协议流向父级。
 */
defineOptions({ inheritAttrs: false });
const model = defineModel({ default: () => [] });
const props = defineProps({
    loader: { type: Function, default: searchTags },
    multiple: { type: Boolean, default: true },
    placeholder: { type: String, default: "搜索学习标签" },
    simulateFailure: Boolean,
    disabled: Boolean
});
const emit = defineEmits(["query", "loaded", "error"]);
const select = ref();
const query = ref("");
// 解构得到的仍然是 ref；在脚本里读取 .value，在模板中由 Vue 自动解包。
// 请求调度与防抖分别复用 composable，避免把通用资源清理逻辑埋进界面事件。
const { data, loading, error, execute, cancel } = useRequest((value, { signal }) =>
    props.loader(value, { signal, fail: props.simulateFailure })
);
const options = computed(() => {
    const found = data.value || [];
    const selected = Array.isArray(model.value) ? model.value : model.value ? [model.value] : [];
    // 搜索结果不包含已选项时，也保留其标签，避免选中值显示成无法识别的 ID。
    return [
        ...selected
            .filter((value) => !found.some((option) => option.value === value))
            .map((value) => ({ label: value, value })),
        ...found
    ];
});
async function load(value = query.value) {
    query.value = value;
    emit("query", value);
    try {
        const result = await execute(value);
        // useRequest 对被取消/过期的调用返回 undefined；只有本次有效结果才通知 loaded。
        if (result) emit("loaded", result);
    } catch (reason) {
        emit("error", reason.message);
    }
}
const { run, cancel: cancelDebounce } = useDebounce(load, 300);
function search(value) {
    query.value = value;
    // 输入一变化即取消旧请求，不等防抖延迟结束后才处理旧响应。
    cancel();
    run(value);
}
// 初次获取候选项；空字符串表示全部。useRequest/useDebounce 会在所属作用域结束时清理资源。
onMounted(() => load(""));
// 父组件只需要重新查询、聚焦和取消这三个意图，不必拿到完整 ElSelect 实例。
defineExpose({
    reload: () => {
        cancelDebounce();
        return load();
    },
    focus: () => select.value?.focus(),
    cancel: () => {
        cancelDebounce();
        cancel();
    }
});
</script>

<template>
    <div class="remote-select">
        <!-- attrs 给内部 ElSelect：id/aria 属性和未封装的公开配置应作用到真正控件。
             FormItem 仍能通过内部 Select 注册的 input id 正确关联标签。 -->
        <ElSelect
            ref="select"
            v-model="model"
            v-bind="$attrs"
            :multiple="multiple"
            filterable
            remote
            :remote-method="search"
            :loading="loading"
            :placeholder="placeholder"
            :disabled="disabled"
            :no-data-text="error ? '搜索失败，请重试' : '没有匹配标签'"
            clearable
            style="width: 100%"
        >
            <ElOption v-for="option in options" :key="option.value" :label="option.label" :value="option.value" />
        </ElSelect>
        <!-- 错误由组件自己展示，并保留重试；取消旧查询不进入这个错误分支。 -->
        <div v-if="error" class="remote-select__error" role="alert"
            ><span>{{ error.message }}</span
            ><ElButton link type="primary" size="small" @click="load()">重试</ElButton></div
        >
    </div>
</template>

<style scoped>
.remote-select {
    width: 100%;
}
.remote-select__error {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--el-color-danger);
    font-size: 12px;
    margin-top: 5px;
}
</style>
