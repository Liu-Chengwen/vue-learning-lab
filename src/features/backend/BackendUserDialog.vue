<script setup>
import { onScopeDispose, reactive, ref, watch } from "vue";
import { ElButton, ElDialog, ElInput } from "element-plus";
import BackendErrorAlert from "./BackendErrorAlert.vue";
const open = defineModel("open", { type: Boolean, default: false });
const props = defineProps({ user: { type: Object, default: null }, submit: { type: Function, required: true } });
const emit = defineEmits(["saved"]);
const draft = reactive({ username: "", displayName: "" });
const error = ref(null);
const busy = ref(false);
let controller;
let active = true;
watch(
    () => [open.value, props.user?.id],
    () => {
        if (!open.value) return;
        // 每次打开建立独立草稿，输入时不会修改列表中的同一个用户对象。
        draft.username = props.user?.username || "";
        draft.displayName = props.user?.displayName || "";
        error.value = null;
    }
);
function close(done) {
    if (!busy.value) {
        open.value = false;
        if (typeof done === "function") done();
    }
}
async function save() {
    if (busy.value) return;
    busy.value = true;
    error.value = null;
    controller = new AbortController();
    try {
        const result = await props.submit(
            { username: draft.username, displayName: draft.displayName },
            { signal: controller.signal }
        );
        if (!active || controller.signal.aborted) return;
        open.value = false;
        emit("saved", result);
    } catch (reason) {
        if (active && reason?.name !== "AbortError") error.value = reason;
    } finally {
        if (active) busy.value = false;
    }
}
onScopeDispose(() => {
    active = false;
    controller?.abort();
});
</script>
<template>
    <ElDialog
        :model-value="open"
        :title="user ? '修改显示名称' : '新增用户资料'"
        width="min(520px, calc(100vw - 32px))"
        :before-close="close"
        :close-on-click-modal="!busy"
        :close-on-press-escape="!busy"
        :show-close="!busy"
        @update:model-value="open = $event"
    >
        <p class="muted">{{
            user
                ? `编辑 ${user.username}（ID ${user.id}）。用户名保持不变。`
                : "这里只创建资料，不设置密码；需要登录的账户请使用注册入口。"
        }}</p>
        <BackendErrorAlert :error="error" />
        <form class="user-form" data-testid="backend-user-form" @submit.prevent="save">
            <template v-if="!user">
                <label for="backend-user-username">用户名</label>
                <ElInput
                    id="backend-user-username"
                    v-model="draft.username"
                    :disabled="busy"
                    required
                    minlength="3"
                    maxlength="50"
                    pattern="[a-zA-Z0-9_]+"
                />
            </template>
            <label for="backend-user-display-name">显示名称</label>
            <ElInput
                id="backend-user-display-name"
                v-model="draft.displayName"
                :disabled="busy"
                required
                maxlength="100"
            />
            <div class="dialog-actions"
                ><ElButton :disabled="busy" @click="close">取消</ElButton
                ><ElButton type="primary" native-type="submit" :loading="busy" :disabled="busy">保存资料</ElButton></div
            >
        </form>
    </ElDialog>
</template>
<style scoped>
.user-form {
    display: grid;
    gap: 10px;
}
label {
    font-size: 13px;
}
.dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
}
.dialog-actions .el-button + .el-button {
    margin-left: 0;
}
</style>
