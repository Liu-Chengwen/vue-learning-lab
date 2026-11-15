import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DOMWrapper, flushPromises, mount } from "@vue/test-utils";
import { createPinia, disposePinia } from "pinia";
import { nextTick } from "vue";
import { ElMessageBox } from "element-plus";
import BackendLabView from "../src/features/backend/BackendLabView.vue";
import BackendUserDialog from "../src/features/backend/BackendUserDialog.vue";
import BackendEventPanel from "../src/features/backend/BackendEventPanel.vue";
import { useBackendAuthStore } from "../src/stores/backendAuth";

const mocks = vi.hoisted(() => ({
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    listUsers: vi.fn(),
    getUser: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    changeUserStatus: vi.fn(),
    deleteUser: vi.fn(),
    fetchOutbox: vi.fn(),
    fetchNotifications: vi.fn(),
    fetchAuditLogs: vi.fn(),
    health: vi.fn(),
    listeners: new Set()
}));
vi.mock("../src/services/backendLabService", () => ({
    backendApi: mocks,
    clearBackendSession: vi.fn(),
    subscribeSessionInvalidated: (callback) => {
        mocks.listeners.add(callback);
        return () => mocks.listeners.delete(callback);
    }
}));
const reader = { id: 1, username: "reader", displayName: "阅读用户", role: "USER" };
const admin = { id: 2, username: "admin", displayName: "学习管理员", role: "ADMIN" };
const row = () => ({ id: 10, username: "alice", displayName: "Alice原名称", status: 1 });
const page = (items = [row()]) => ({ items, total: items.length, page: 1, size: 10 });
let wrapper, pinia, auth;
function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
}
async function settle() {
    await flushPromises();
    await nextTick();
    await flushPromises();
}
async function mountPage(identity = null) {
    mocks.me.mockImplementation(() =>
        identity ? Promise.resolve(identity) : Promise.reject(Object.assign(new Error("请先登录"), { status: 401 }))
    );
    pinia = createPinia();
    wrapper = mount(BackendLabView, {
        attachTo: document.body,
        global: { plugins: [pinia], stubs: { transition: false } }
    });
    auth = useBackendAuthStore(pinia);
    await settle();
    return wrapper;
}
async function input(id, value) {
    const element = document.getElementById(id);
    expect(element, `输入框 ${id} 应存在`).not.toBeNull();
    await new DOMWrapper(element).setValue(value);
}
async function submitUser() {
    const form = document.querySelector('[data-testid="backend-user-form"]');
    expect(form).not.toBeNull();
    await new DOMWrapper(form).trigger("submit");
    await settle();
}
function buttonWithText(component, text) {
    const button = component.findAll("button").find((item) => item.text() === text);
    expect(button, `按钮 ${text} 应存在`).toBeTruthy();
    return button;
}

beforeEach(() => {
    vi.resetAllMocks();
    mocks.listeners.clear();
    mocks.health.mockResolvedValue({ status: "UP" });
    mocks.listUsers.mockResolvedValue(page());
    mocks.fetchOutbox.mockResolvedValue([]);
    mocks.fetchNotifications.mockResolvedValue([]);
    mocks.fetchAuditLogs.mockResolvedValue([]);
    mocks.logout.mockResolvedValue();
});
afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    if (pinia) disposePinia(pinia);
    pinia = undefined;
    vi.restoreAllMocks();
    document.body.innerHTML = "";
});

describe("Vue后端学习控制台", () => {
    it("空列表使用用户领域的提示，不复用任务页面文案", async () => {
        mocks.listUsers.mockResolvedValue(page([]));
        await mountPage(reader);
        expect(wrapper.text()).toContain("暂无符合条件的用户");
        expect(wrapper.text()).not.toContain("暂无符合条件的任务");
    });

    it("匿名登录恢复身份后加载列表，密码不进入响应面板", async () => {
        await mountPage();
        expect(wrapper.get('[data-testid="backend-login-form"]').exists()).toBe(true);
        expect(mocks.listUsers).not.toHaveBeenCalled();
        mocks.login.mockResolvedValue(reader);
        await input("backend-login-username", "reader");
        await input("backend-login-password", "private_password_123");
        await wrapper.get('[data-testid="backend-login-form"]').trigger("submit");
        await settle();
        expect(mocks.login).toHaveBeenCalledWith(
            { username: "reader", password: "private_password_123" },
            { signal: expect.any(AbortSignal) }
        );
        expect(mocks.listUsers).toHaveBeenCalledWith(expect.objectContaining({ page: 1, size: 10 }), {
            signal: expect.any(AbortSignal)
        });
        expect(wrapper.text()).toContain("Alice原名称");
        expect(wrapper.text()).toContain("只读访问");
        expect(wrapper.text()).not.toContain("private_password_123");
        expect(document.getElementById("backend-login-password").value).toBe("");
    });

    it("USER只读显示资料，没有新增、编辑、启停、删除或消息管理按钮", async () => {
        await mountPage(reader);
        expect(wrapper.text()).toContain("Alice原名称");
        expect(wrapper.find('[data-testid="backend-create-user"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="backend-edit-10"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="backend-status-10"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="backend-delete-10"]').exists()).toBe(false);
        expect(wrapper.findComponent(BackendEventPanel).exists()).toBe(false);
    });

    it("ADMIN新增资料走真实弹窗，提交期间防重复且成功后重新加载服务器列表", async () => {
        await mountPage(admin);
        const pending = deferred();
        mocks.createUser.mockReturnValue(pending.promise);
        await wrapper.get('[data-testid="backend-create-user"]').trigger("click");
        await settle();
        await input("backend-user-username", "new_reader");
        await input("backend-user-display-name", "新增资料");
        await submitUser();
        await submitUser();
        expect(mocks.createUser).toHaveBeenCalledOnce();
        expect(mocks.createUser).toHaveBeenCalledWith(
            { username: "new_reader", displayName: "新增资料" },
            { signal: expect.any(AbortSignal) }
        );
        expect(document.getElementById("backend-user-display-name").disabled).toBe(true);
        mocks.listUsers.mockResolvedValue(
            page([row(), { id: 11, username: "new_reader", displayName: "新增资料", status: 1 }])
        );
        pending.resolve({ id: 11, username: "new_reader", displayName: "新增资料", status: 1 });
        await settle();
        expect(wrapper.getComponent(BackendUserDialog).props("open")).toBe(false);
        expect(wrapper.text()).toContain("用户资料已保存");
        expect(wrapper.text()).toContain("新增资料");
    });

    it("编辑使用独立草稿，取消不改变列表；保存只提交displayName", async () => {
        const original = row();
        mocks.listUsers.mockResolvedValue(page([original]));
        await mountPage(admin);
        await wrapper.get('[data-testid="backend-edit-10"]').trigger("click");
        await settle();
        await input("backend-user-display-name", "未提交的草稿");
        expect(original.displayName).toBe("Alice原名称");
        await buttonWithText(wrapper.getComponent(BackendUserDialog), "取消").trigger("click");
        await settle();
        expect(mocks.updateUser).not.toHaveBeenCalled();
        expect(wrapper.text()).toContain("Alice原名称");
        await wrapper.get('[data-testid="backend-edit-10"]').trigger("click");
        await settle();
        expect(document.getElementById("backend-user-display-name").value).toBe("Alice原名称");
        await input("backend-user-display-name", "已修改的显示名称");
        mocks.updateUser.mockResolvedValue({ ...original, displayName: "已修改的显示名称" });
        mocks.listUsers.mockResolvedValue(page([{ ...original, displayName: "已修改的显示名称" }]));
        await submitUser();
        expect(mocks.updateUser).toHaveBeenCalledWith(
            10,
            { displayName: "已修改的显示名称" },
            { signal: expect.any(AbortSignal) }
        );
        expect(wrapper.text()).toContain("已修改的显示名称");
    });

    it("启停成功后刷新，删除必须等确认而非点击后立即移除", async () => {
        await mountPage(admin);
        mocks.changeUserStatus.mockResolvedValue({ ...row(), status: 0 });
        mocks.listUsers.mockResolvedValue(page([{ ...row(), status: 0 }]));
        await wrapper.get('[data-testid="backend-status-10"]').trigger("click");
        await settle();
        expect(mocks.changeUserStatus).toHaveBeenCalledWith(10, 0, { signal: expect.any(AbortSignal) });
        expect(wrapper.get('[data-testid="backend-status-10"]').text()).toBe("启用");
        const confirmation = deferred();
        vi.spyOn(ElMessageBox, "confirm").mockReturnValue(confirmation.promise);
        await wrapper.get('[data-testid="backend-delete-10"]').trigger("click");
        await wrapper.get('[data-testid="backend-delete-10"]').trigger("click");
        await settle();
        expect(ElMessageBox.confirm).toHaveBeenCalledOnce();
        expect(mocks.deleteUser).not.toHaveBeenCalled();
        mocks.deleteUser.mockResolvedValue(null);
        mocks.listUsers.mockResolvedValue(page([]));
        confirmation.resolve("confirm");
        await settle();
        expect(mocks.deleteUser).toHaveBeenCalledWith(10, { signal: expect.any(AbortSignal) });
        expect(wrapper.find('[data-testid="backend-delete-10"]').exists()).toBe(false);
        expect(wrapper.text()).toContain("用户 alice 已删除");
    });

    it("400字段错误在弹窗可读显示，保留草稿和重试入口", async () => {
        await mountPage(admin);
        await wrapper.get('[data-testid="backend-create-user"]').trigger("click");
        await settle();
        await input("backend-user-username", "taken_user");
        await input("backend-user-display-name", "待校验名称");
        mocks.createUser.mockRejectedValue(
            Object.assign(new Error("参数校验失败"), {
                status: 400,
                body: {
                    code: "VALIDATION_FAILED",
                    path: "/api/v1/users",
                    fieldErrors: { displayName: "显示名称不合法" }
                },
                fieldErrors: { displayName: "显示名称不合法" }
            })
        );
        await submitUser();
        const dialog = wrapper.getComponent(BackendUserDialog);
        expect(dialog.props("open")).toBe(true);
        expect(dialog.text()).toContain("displayName：显示名称不合法");
        expect(document.getElementById("backend-user-display-name").value).toBe("待校验名称");
        expect(document.getElementById("backend-user-display-name").disabled).toBe(false);
        expect(wrapper.get(".response-json").text()).toContain("VALIDATION_FAILED");
    });

    it("身份切换后旧列表和旧事件响应不能重新出现", async () => {
        const oldList = deferred(),
            oldEvents = deferred();
        mocks.listUsers
            .mockReturnValueOnce(oldList.promise)
            .mockResolvedValue(page([{ id: 12, username: "new_identity", displayName: "新身份可见", status: 1 }]));
        await mountPage(admin);
        const oldListSignal = mocks.listUsers.mock.calls[0][1].signal;
        mocks.fetchOutbox.mockReturnValue(oldEvents.promise);
        await wrapper.get('[data-testid="backend-refresh-events"]').trigger("click");
        const oldEventSignal = mocks.fetchOutbox.mock.calls[0][0].signal;
        auth.clearIdentity();
        await settle();
        mocks.login.mockResolvedValue(reader);
        await auth.login({ username: "reader", password: "password" });
        await settle();
        expect(oldListSignal.aborted).toBe(true);
        expect(oldEventSignal.aborted).toBe(true);
        oldList.resolve(page([{ id: 99, username: "old_private_user", displayName: "旧身份专属资料", status: 1 }]));
        oldEvents.resolve([{ eventId: "old-event", eventType: "OLD_SECRET_EVENT", userId: 99, status: "SENT" }]);
        await settle();
        expect(wrapper.text()).toContain("新身份可见");
        expect(wrapper.text()).not.toContain("旧身份专属资料");
        expect(wrapper.text()).not.toContain("OLD_SECRET_EVENT");
        expect(wrapper.findComponent(BackendEventPanel).exists()).toBe(false);
    });

    it("离开页面取消待完成查询，消息面板不再emit迟到结果", async () => {
        await mountPage(admin);
        const oldEvents = deferred();
        mocks.fetchOutbox.mockReturnValue(oldEvents.promise);
        await wrapper.get('[data-testid="backend-refresh-events"]').trigger("click");
        const panel = wrapper.getComponent(BackendEventPanel);
        const signal = mocks.fetchOutbox.mock.calls[0][0].signal;
        wrapper.unmount();
        wrapper = undefined;
        expect(signal.aborted).toBe(true);
        oldEvents.resolve([{ eventId: "old-event", eventType: "USER_CREATED", userId: 10, status: "SENT" }]);
        await settle();
        expect(panel.emitted("response")).toBeUndefined();
    });
});
