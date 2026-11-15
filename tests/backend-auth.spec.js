import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useBackendAuthStore } from "../src/stores/backendAuth";

const mocks = vi.hoisted(() => ({
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    clear: vi.fn(),
    listeners: new Set()
}));
vi.mock("../src/services/backendLabService", () => ({
    backendApi: { me: mocks.me, login: mocks.login, register: mocks.register, logout: mocks.logout },
    clearBackendSession: mocks.clear,
    subscribeSessionInvalidated: (callback) => {
        mocks.listeners.add(callback);
        return () => mocks.listeners.delete(callback);
    }
}));

const reader = { id: 4, username: "reader", displayName: "阅读用户", role: "USER" };
const admin = { id: 5, username: "admin", displayName: "管理员", role: "ADMIN" };
let store;
function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
}
beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetAllMocks();
    mocks.listeners.clear();
    store = useBackendAuthStore();
});
afterEach(() => {
    store.$dispose();
});

describe("后端登录身份Store", () => {
    it("恢复当前身份，复用已初始化结果并支持force重新验证", async () => {
        mocks.me.mockResolvedValue(reader);
        expect(await store.initialize()).toEqual(reader);
        expect(store.initialized).toBe(true);
        expect(store.isAdmin).toBe(false);
        expect(store.user).toEqual(reader);
        await store.initialize();
        expect(mocks.me).toHaveBeenCalledOnce();
        mocks.me.mockResolvedValue(admin);
        await store.initialize({ force: true });
        expect(store.isAdmin).toBe(true);
        expect(store.revision).toBe(2);
    });

    it("匿名初始化401是正常未登录，真正网络故障保留错误", async () => {
        mocks.me.mockRejectedValueOnce(Object.assign(new Error("未登录"), { status: 401 }));
        expect(await store.initialize()).toBe(null);
        expect(store.initialized).toBe(true);
        expect(store.user).toBe(null);
        expect(store.error).toBe(null);
        const unavailable = Object.assign(new Error("暂时不可用"), { status: 503 });
        mocks.me.mockRejectedValueOnce(unavailable);
        await expect(store.initialize({ force: true })).rejects.toBe(unavailable);
        expect(store.error).toBe(unavailable);
        expect(store.loading).toBe(false);
    });

    it("晚到的初始化不能覆盖后发生的登录", async () => {
        const old = deferred();
        mocks.me.mockReturnValue(old.promise);
        const older = store.initialize();
        const oldSignal = mocks.me.mock.calls[0][0].signal;
        mocks.login.mockResolvedValue(admin);
        await store.login({ username: "admin", password: "only-in-memory" });
        expect(oldSignal.aborted).toBe(true);
        old.resolve(reader);
        expect(await older).toBeUndefined();
        expect(store.user).toEqual(admin);
        expect(store.error).toBe(null);
    });

    it("页面退出取消登录，忽略不遵守signal的迟到响应", async () => {
        const pending = deferred();
        const controller = new AbortController();
        mocks.login.mockReturnValue(pending.promise);
        const run = store.login({ username: "reader", password: "password" }, { signal: controller.signal });
        expect(store.loading).toBe(true);
        controller.abort();
        expect(mocks.login.mock.calls[0][1].signal.aborted).toBe(true);
        expect(store.loading).toBe(false);
        pending.resolve(reader);
        expect(await run).toBeUndefined();
        expect(store.user).toBe(null);
    });

    it("已经取消的调用不发请求", async () => {
        const controller = new AbortController();
        controller.abort();
        expect(await store.initialize({ signal: controller.signal })).toBeUndefined();
        expect(mocks.me).not.toHaveBeenCalled();
        expect(store.loading).toBe(false);
    });

    it("注册只返回资料，不建立登录身份或提升角色", async () => {
        const record = { id: 7, username: "new_reader", displayName: "新用户", status: 1 };
        mocks.register.mockResolvedValue(record);
        expect(
            await store.register({ username: "new_reader", displayName: "新用户", password: "temporary-password" })
        ).toEqual(record);
        expect(store.user).toBe(null);
        expect(store.isAdmin).toBe(false);
        expect(mocks.login).not.toHaveBeenCalled();
    });

    it("退出清空身份，旧登录完成也不能恢复已退出身份", async () => {
        const old = deferred();
        mocks.login.mockReturnValueOnce(old.promise);
        const older = store.login({ username: "reader", password: "password" });
        mocks.logout.mockResolvedValue();
        expect(await store.logout()).toBe(null);
        old.resolve(reader);
        await older;
        expect(store.user).toBe(null);
        expect(store.initialized).toBe(true);
        expect(store.loading).toBe(false);
    });

    it("会话失效通知取消正在恢复的身份并递增revision", async () => {
        mocks.me.mockResolvedValue(reader);
        await store.initialize();
        const before = store.revision;
        const pending = deferred();
        mocks.me.mockReturnValue(pending.promise);
        const run = store.initialize({ force: true });
        for (const listener of mocks.listeners) listener();
        expect(store.user).toBe(null);
        expect(store.loading).toBe(false);
        expect(store.revision).toBeGreaterThan(before);
        pending.resolve(reader);
        await run;
        expect(store.user).toBe(null);
    });

    it("身份共享只保存在内存，密码与Session不写入localStorage", async () => {
        const set = vi.spyOn(Storage.prototype, "setItem");
        mocks.login.mockResolvedValue(reader);
        await store.login({ username: "reader", password: "do-not-persist" });
        expect(set).not.toHaveBeenCalled();
        set.mockRestore();
    });

    it("销毁Store取消请求并移除订阅，不让后台结果更新废弃状态", async () => {
        const pending = deferred();
        mocks.me.mockReturnValue(pending.promise);
        const run = store.initialize();
        const signal = mocks.me.mock.calls[0][0].signal;
        store.$dispose();
        expect(signal.aborted).toBe(true);
        expect(mocks.listeners.size).toBe(0);
        pending.resolve(admin);
        await run;
        expect(store.user).toBe(null);
    });
});
