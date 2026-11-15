<script setup>
import { computed, onMounted, onScopeDispose, ref, shallowRef, watch } from "vue";
import { ElButton, ElMessageBox, ElTableColumn, ElTag } from "element-plus";
import { ArrowRight, Database, Plus, Server } from "lucide-vue-next";
import { useBackendAuthStore } from "@/stores/backendAuth";
import { backendApi } from "@/services/backendLabService";
import { useRequest } from "@/composables/useRequest";
import SearchPanel from "@/components/business/SearchPanel.vue";
import DataTable from "@/components/business/DataTable.vue";
import BackendAuthPanel from "./BackendAuthPanel.vue";
import BackendUserDialog from "./BackendUserDialog.vue";
import BackendEventPanel from "./BackendEventPanel.vue";
import BackendErrorAlert from "./BackendErrorAlert.vue";

const auth = useBackendAuthStore();
const emptyFilters = () => ({ keyword: "", status: "" });
// 身份是真正跨页面的领域状态，由Pinia持有；筛选草稿、分页、响应和弹窗属于此页。
const draftFilters = ref(emptyFilters());
const filters = ref(emptyFilters());
const page = ref(1);
const pageSize = ref(10);
const notice = ref("");
const operationError = shallowRef(null);
const response = shallowRef(null);
const formattedResponse = computed(() => {
    if (!response.value) return "";
    return response.value.body === null
        ? "请求成功，无响应体（204 No Content）。"
        : JSON.stringify(response.value.body, null, 2);
});
const mutationBusy = ref(false);
const editorOpen = ref(false);
const editingUser = shallowRef(null);
const list = useRequest(backendApi.listUsers);
const details = useRequest(backendApi.getUser);
const health = useRequest(backendApi.health);
const items = computed(() => list.data.value?.items || []);
const total = computed(() => list.data.value?.total || 0);
const queryError = computed(() => operationError.value || list.error.value);
const healthReady = computed(() => health.data.value?.status === "UP");
const columns = [
    { prop: "id", label: "ID", width: 76 },
    { prop: "username", label: "用户名", minWidth: 150 },
    { prop: "displayName", label: "显示名称", minWidth: 140 },
    { prop: "status", label: "状态", width: 92 }
];
const searchFields = [
    { key: "keyword", label: "关键词", type: "input", placeholder: "搜索用户名或显示名称" },
    {
        key: "status",
        label: "状态",
        type: "select",
        options: [
            { label: "全部状态", value: "" },
            { label: "启用", value: 1 },
            { label: "禁用", value: 0 }
        ]
    }
];
let active = true;
let mutationController;
let initializeController;
let queryVersion = 0;
let confirmPending = false;

function inspect(value) {
    if (active) response.value = value;
}
function notify(message) {
    if (active) notice.value = message;
}
function clearPage() {
    // 身份切换先取消旧请求，再清数据；即使底层忽略abort，版本号也不允许旧结果回写。
    queryVersion++;
    list.cancel();
    details.cancel();
    list.data.value = null;
    list.error.value = null;
    mutationController?.abort();
    if (confirmPending) {
        ElMessageBox.close();
        confirmPending = false;
    }
    mutationBusy.value = false;
    editorOpen.value = false;
    editingUser.value = null;
    response.value = null;
    operationError.value = null;
    notice.value = "";
    draftFilters.value = emptyFilters();
    filters.value = emptyFilters();
    page.value = 1;
}
async function loadUsers() {
    if (!auth.user || !active) return;
    operationError.value = null;
    const identity = auth.revision;
    const current = ++queryVersion;
    const query = { page: page.value, size: pageSize.value, ...filters.value };
    try {
        const result = await list.execute(query);
        if (!result || !active || identity !== auth.revision || current !== queryVersion) return;
        const lastPage = Math.max(1, Math.ceil(result.total / result.size));
        if (page.value > lastPage) {
            page.value = lastPage;
            await loadUsers();
            return;
        }
        inspect({ method: "GET", path: "/api/v1/users", status: 200, body: result });
    } catch (reason) {
        if (active && current === queryVersion) recordError(reason);
    }
}
function applyFilters(value) {
    filters.value = { ...value };
    page.value = 1;
    loadUsers();
}
function changePage(value) {
    if (page.value === value) return;
    page.value = value;
    loadUsers();
}
function changeSize(value) {
    if (pageSize.value === value) return;
    pageSize.value = value;
    page.value = 1;
    loadUsers();
}
function recordError(error) {
    if (error?.name === "AbortError") return;
    operationError.value = error;
    if (error?.status)
        inspect({
            method: "HTTP",
            path: error.body?.path || "接口请求",
            status: error.status,
            body: error.body || { message: error.message }
        });
}
function openEditor(user = null) {
    if (!auth.isAdmin || mutationBusy.value) return;
    editingUser.value = user;
    editorOpen.value = true;
}
async function write(operation, meta, { signal } = {}) {
    if (mutationBusy.value || !auth.isAdmin) throw new Error("当前不能提交写操作，请稍后重试。");
    const identity = auth.revision;
    const controller = new AbortController();
    mutationController = controller;
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) controller.abort();
    mutationBusy.value = true;
    operationError.value = null;
    try {
        const result = await operation({ signal: controller.signal });
        if (!active || controller.signal.aborted || identity !== auth.revision)
            throw new DOMException("页面或登录身份已变化", "AbortError");
        inspect({ ...meta, body: result ?? null });
        return result;
    } catch (reason) {
        if (active && identity === auth.revision && !controller.signal.aborted) recordError(reason);
        throw reason;
    } finally {
        signal?.removeEventListener("abort", abort);
        if (active && mutationController === controller) {
            mutationBusy.value = false;
            mutationController = null;
        }
    }
}
function saveUser(draft, options) {
    const user = editingUser.value;
    return write(
        user
            ? (request) => backendApi.updateUser(user.id, { displayName: draft.displayName }, request)
            : (request) => backendApi.createUser({ username: draft.username, displayName: draft.displayName }, request),
        {
            method: user ? "PUT" : "POST",
            path: user ? `/api/v1/users/${user.id}` : "/api/v1/users",
            status: user ? 200 : 201
        },
        options
    );
}
async function saved() {
    notify("用户资料已保存。审计和Outbox与资料写入在同一事务中提交。");
    await loadUsers();
}
async function changeStatus(user) {
    if (mutationBusy.value) return;
    try {
        await write((request) => backendApi.changeUserStatus(user.id, user.status === 1 ? 0 : 1, request), {
            method: "PATCH",
            path: `/api/v1/users/${user.id}/status`,
            status: 200
        });
        notify(`已${user.status === 1 ? "禁用" : "启用"} ${user.username}。`);
        await loadUsers();
    } catch {
        /* write拥有当前错误状态，取消/离开页面不再弹出提示。 */
    }
}
async function removeUser(user) {
    if (!auth.isAdmin || mutationBusy.value || confirmPending) return;
    const identity = auth.revision;
    try {
        confirmPending = true;
        await ElMessageBox.confirm(
            `确定删除用户「${user.username}」？资料和关联登录凭证将被删除，此操作无法撤销。`,
            "删除用户",
            { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" }
        );
        confirmPending = false;
        if (!active || identity !== auth.revision || !auth.isAdmin) return;
        await write((request) => backendApi.deleteUser(user.id, request), {
            method: "DELETE",
            path: `/api/v1/users/${user.id}`,
            status: 204
        });
        notify(`用户 ${user.username} 已删除，审计与事件仍保留。`);
        await loadUsers();
    } catch {
        /* 取消确认或请求失败不会乐观删除当前列表。 */
    } finally {
        confirmPending = false;
    }
}
async function showUser(user) {
    const identity = auth.revision;
    try {
        const result = await details.execute(user.id);
        if (result && active && identity === auth.revision && auth.user) {
            inspect({ method: "GET", path: `/api/v1/users/${user.id}`, status: 200, body: result });
        }
    } catch (error) {
        if (active && identity === auth.revision) recordError(error);
    }
}

async function logout() {
    if (mutationBusy.value || auth.loading) return;
    try {
        const result = await auth.logout({ signal: initializeController?.signal });
        if (result === undefined) return;
        if (active) {
            inspect({ method: "POST", path: "/api/v1/auth/logout", status: 204, body: null });
            notify("已退出登录。");
        }
    } catch (error) {
        if (active) recordError(error);
    }
}
watch(
    () => auth.revision,
    () => {
        clearPage();
        if (auth.user) loadUsers();
    }
);
onMounted(async () => {
    initializeController = new AbortController();
    health.execute().catch(() => {
        /* 健康状态单独展示，不挡住认证重试入口。 */
    });
    try {
        await auth.initialize({ signal: initializeController.signal, force: true });
        if (active && auth.user && !list.loading.value && !list.data.value) await loadUsers();
    } catch (error) {
        if (active) recordError(error);
    }
});
onScopeDispose(() => {
    active = false;
    queryVersion++;
    initializeController?.abort();
    mutationController?.abort();
    if (confirmPending) ElMessageBox.close();
});
</script>

<template>
    <section class="backend-lab" aria-labelledby="backend-lab-title">
        <div class="page-heading">
            <div
                ><p class="eyebrow">SPRING BOOT WORKSPACE</p
                ><h1 id="backend-lab-title">后端学习控制台<span class="heading-dot">.</span></h1
                ><p class="page-description"
                    >在 Vue Lab 中操作真实接口，沿着请求理解权限、事务、缓存与异步消息。</p
                ></div
            >
            <div class="heading-actions"
                ><a class="doc-link" href="/swagger-ui/index.html" target="_blank" rel="noopener">接口文档 ↗</a
                ><ElTag :type="healthReady ? 'success' : 'info'" effect="plain"
                    ><Server :size="14" />
                    {{ health.loading.value ? "检查服务中" : healthReady ? "服务就绪" : "服务待检查" }}</ElTag
                ></div
            >
        </div>
        <div class="request-flow" aria-label="前后端请求链路"
            ><span>Vue 页面</span><ArrowRight :size="15" /><span>同源代理</span><ArrowRight :size="15" /><span
                >Spring Boot</span
            ><ArrowRight :size="15" /><span><Database :size="14" /> MySQL · Redis · RabbitMQ</span></div
        >
        <p v-if="notice" class="success-notice" role="status">{{ notice }}</p>
        <BackendErrorAlert :error="queryError" />
        <div v-show="!auth.user" class="auth-grid">
            <BackendAuthPanel @response="inspect" @notice="notify" />
            <aside class="panel overview"
                ><div class="panel-header"><h2>从一次请求开始阅读</h2></div
                ><div class="panel-body"
                    ><ol
                        ><li
                            ><strong>先认证，再访问</strong
                            ><p>Cookie携带会话标识，Redis保存登录态；写请求还要通过CSRF校验。</p></li
                        ><li
                            ><strong>用接口管理资料</strong
                            ><p>查询支持筛选分页。管理员写入用户、审计与Outbox，由数据库事务共同保护。</p></li
                        ><li
                            ><strong>观察异步处理</strong
                            ><p>消息发布确认与消费完成分开记录，用eventId实现重复消费幂等。</p></li
                        ></ol
                    ><p class="muted">页面与状态在 vue-lab；业务与数据访问在 springboot-lab。</p></div
                ></aside
            >
        </div>
        <template v-if="auth.user">
            <div class="identity-bar"
                ><div
                    ><strong>{{ auth.user.displayName }} · {{ auth.user.username }}</strong
                    ><ElTag :type="auth.isAdmin ? 'success' : 'info'">{{ auth.user.role }}</ElTag
                    ><span class="muted">{{
                        auth.isAdmin ? "可管理资料与查看异步记录" : "只读访问 · 写操作需要管理员权限"
                    }}</span></div
                ><ElButton
                    data-testid="backend-logout"
                    :disabled="mutationBusy || auth.loading"
                    :loading="auth.loading"
                    @click="logout"
                    >退出登录</ElButton
                ></div
            >
            <section class="panel" aria-labelledby="backend-users-title">
                <div class="panel-header"
                    ><h2 id="backend-users-title">用户资料</h2
                    ><ElButton
                        v-if="auth.isAdmin"
                        data-testid="backend-create-user"
                        type="primary"
                        :disabled="mutationBusy"
                        @click="openEditor()"
                        ><Plus :size="15" /> 新增资料</ElButton
                    ></div
                >
                <div class="panel-body">
                    <SearchPanel
                        v-model="draftFilters"
                        aria-label="筛选用户"
                        :fields="searchFields"
                        :defaults="emptyFilters()"
                        :loading="list.loading.value"
                        @submit="applyFilters"
                        @reset="applyFilters"
                    />
                    <p class="muted list-hint">按ID从新到旧排列。点击“读取详情”可观察单用户缓存查询。</p>
                    <DataTable
                        :data="items"
                        :columns="columns"
                        :selectable="false"
                        :loading="list.loading.value"
                        :total="total"
                        :page="page"
                        :page-size="pageSize"
                        empty-text="暂无符合条件的用户，试试调整筛选条件。"
                        @update:page="changePage"
                        @update:page-size="changeSize"
                    >
                        <template #cell-status="{ value }"
                            ><ElTag :type="value === 1 ? 'success' : 'info'" size="small">{{
                                value === 1 ? "启用" : "禁用"
                            }}</ElTag></template
                        >
                        <ElTableColumn label="操作" :min-width="auth.isAdmin ? 280 : 110"
                            ><template #default="{ row }"
                                ><div class="row-actions"
                                    ><ElButton size="small" @click="showUser(row)">读取详情</ElButton
                                    ><template v-if="auth.isAdmin"
                                        ><ElButton
                                            :data-testid="`backend-edit-${row.id}`"
                                            size="small"
                                            :disabled="mutationBusy"
                                            @click="openEditor(row)"
                                            >编辑</ElButton
                                        ><ElButton
                                            :data-testid="`backend-status-${row.id}`"
                                            size="small"
                                            :disabled="mutationBusy || row.id === auth.user.id"
                                            @click="changeStatus(row)"
                                            >{{ row.status === 1 ? "禁用" : "启用" }}</ElButton
                                        ><ElButton
                                            :data-testid="`backend-delete-${row.id}`"
                                            size="small"
                                            type="danger"
                                            plain
                                            :disabled="mutationBusy || row.id === auth.user.id"
                                            @click="removeUser(row)"
                                            >删除</ElButton
                                        ></template
                                    ></div
                                ></template
                            ></ElTableColumn
                        >
                    </DataTable>
                </div>
            </section>
            <BackendEventPanel v-if="auth.isAdmin" :key="auth.revision" @response="inspect" />
            <BackendUserDialog v-model:open="editorOpen" :user="editingUser" :submit="saveUser" @saved="saved" />
        </template>
        <section class="panel response-panel" aria-labelledby="backend-response-title"
            ><div class="panel-header"
                ><h2 id="backend-response-title">最近一次接口响应</h2
                ><ElTag v-if="response" effect="plain">HTTP {{ response.status }}</ElTag></div
            ><div class="panel-body"
                ><div v-if="response">
                    <p class="muted response-path">{{ response.method }} {{ response.path }}</p>
                    <pre class="response-json" tabindex="0" v-text="formattedResponse"></pre>
                </div>
                <p v-else class="muted">操作接口后显示真实响应，不记录密码或Cookie。</p></div
            ></section
        >
    </section>
</template>

<style scoped>
.backend-lab {
    display: grid;
    gap: 24px;
}
.page-heading {
    margin-bottom: 0;
    flex-wrap: wrap;
    gap: 20px;
}
.heading-actions,
.request-flow,
.request-flow span,
.identity-bar > div {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}
.doc-link {
    color: var(--primary);
    font-size: 13px;
}
.request-flow {
    gap: 10px;
    color: var(--text-secondary);
    font-size: 12px;
}
.request-flow span {
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
}
.auth-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 24px;
}
.overview ol {
    padding-left: 20px;
    margin: 0 0 20px;
    display: grid;
    gap: 16px;
}
.overview strong {
    font-size: 14px;
}
.overview p {
    margin: 8px 0 0;
    color: var(--text-secondary);
    line-height: 1.8;
    font-size: 13px;
}
.identity-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    flex-wrap: wrap;
}
.identity-bar strong {
    font-size: 14px;
    overflow-wrap: anywhere;
}
.success-notice {
    margin: 0;
    padding: 14px 18px;
    border: 1px solid var(--primary);
    border-radius: 8px;
    color: var(--primary);
    background: var(--surface);
    font-size: 13px;
}
.panel-header {
    flex-wrap: wrap;
    gap: 16px;
}
.list-hint {
    margin: 18px 0 6px;
}
.row-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}
.row-actions .el-button + .el-button {
    margin-left: 0;
}
.response-json {
    margin: 0;
    padding: 16px;
    max-height: 420px;
    overflow: auto;
    background: var(--surface-soft);
    border-radius: 8px;
    font-size: 12px;
    line-height: 1.7;
    color: var(--text);
}
.response-path {
    overflow-wrap: anywhere;
}
@media (max-width: 900px) {
    .auth-grid {
        grid-template-columns: 1fr;
    }
}
</style>
