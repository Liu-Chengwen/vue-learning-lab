<script setup>
import { computed, onScopeDispose, reactive, ref } from "vue";
import { ElButton, ElInput } from "element-plus";
import { useBackendAuthStore } from "@/stores/backendAuth";
import BackendErrorAlert from "./BackendErrorAlert.vue";
const emit = defineEmits(["response", "notice"]);
const auth = useBackendAuthStore();
const mode = ref("login");
const draft = reactive({ username: "", displayName: "", password: "" });
const error = ref(null);
const submitting = ref(false);
const locked = computed(() => submitting.value || auth.loading);
let controller;
let active = true;

async function submit() {
    if (locked.value) return;
    submitting.value = true;
    error.value = null;
    controller = new AbortController();
    const registering = mode.value === "register";
    try {
        // 密码只存在当前表单和本次请求中；不进入localStorage，也不进入响应观察面板。
        const body = registering ? { ...draft } : { username: draft.username, password: draft.password };
        const result = await (registering
            ? auth.register(body, { signal: controller.signal })
            : auth.login(body, { signal: controller.signal }));
        if (!active || controller.signal.aborted || result === undefined) return;
        emit("response", {
            method: "POST",
            path: `/api/v1/auth/${registering ? "register" : "login"}`,
            status: registering ? 201 : 200,
            body: result
        });
        emit(
            "notice",
            registering ? "注册成功，请使用新账户登录。" : `欢迎，${auth.user?.displayName || draft.username}。`
        );
        if (registering) mode.value = "login";
    } catch (reason) {
        if (active && reason?.name !== "AbortError") error.value = reason;
    } finally {
        // 成功或失败都清除密码，页面销毁后不再写界面状态。
        draft.password = "";
        if (active) submitting.value = false;
    }
}
function selectMode(value) {
    if (!locked.value) {
        mode.value = value;
        error.value = null;
        draft.password = "";
    }
}
onScopeDispose(() => {
    active = false;
    controller?.abort();
    draft.password = "";
});
</script>
<template>
    <div class="backend-auth panel">
        <div class="panel-header"><h2>账户入口</h2><span class="muted">Redis Session</span></div>
        <div class="panel-body">
            <div class="auth-tabs" role="tablist" aria-label="账户操作">
                <ElButton
                    role="tab"
                    :aria-selected="mode === 'login'"
                    :type="mode === 'login' ? 'primary' : 'default'"
                    :disabled="locked"
                    @click="selectMode('login')"
                    >登录</ElButton
                >
                <ElButton
                    role="tab"
                    :aria-selected="mode === 'register'"
                    :type="mode === 'register' ? 'primary' : 'default'"
                    :disabled="locked"
                    @click="selectMode('register')"
                    >注册普通账户</ElButton
                >
            </div>
            <p class="muted" v-if="mode === 'login'"
                >管理员凭证保存在 springboot-lab/infra/.env。普通账户可查看用户资料。</p
            >
            <p class="muted" v-else>注册创建 USER 角色的登录账户；成功后需要再登录。</p>
            <BackendErrorAlert :error="error" />
            <form
                :data-testid="mode === 'login' ? 'backend-login-form' : 'backend-register-form'"
                @submit.prevent="submit"
            >
                <label :for="`backend-${mode}-username`">用户名</label>
                <ElInput
                    :id="`backend-${mode}-username`"
                    v-model="draft.username"
                    :disabled="locked"
                    autocomplete="username"
                    required
                    minlength="3"
                    maxlength="50"
                    pattern="[a-zA-Z0-9_]+"
                    placeholder="字母、数字或下划线"
                />
                <template v-if="mode === 'register'">
                    <label for="backend-register-display-name">显示名称</label>
                    <ElInput
                        id="backend-register-display-name"
                        v-model="draft.displayName"
                        :disabled="locked"
                        required
                        maxlength="100"
                        autocomplete="nickname"
                        placeholder="例如 Alice"
                    />
                </template>
                <label :for="`backend-${mode}-password`">密码</label>
                <ElInput
                    :id="`backend-${mode}-password`"
                    v-model="draft.password"
                    :disabled="locked"
                    type="password"
                    :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
                    required
                    :minlength="mode === 'register' ? 12 : undefined"
                    placeholder="注册密码至少12字符、最多72字节"
                />
                <ElButton type="primary" native-type="submit" :loading="submitting" :disabled="locked">{{
                    mode === "login" ? "登录控制台" : "注册账户"
                }}</ElButton>
            </form>
        </div>
    </div>
</template>
<style scoped>
.auth-tabs {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 18px;
}
.auth-tabs .el-button + .el-button {
    margin-left: 0;
}
form {
    display: grid;
    gap: 10px;
}
form label {
    font-size: 13px;
    color: var(--text-secondary);
}
form .el-button {
    margin-top: 10px;
    justify-self: start;
}
</style>
