import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let api, BackendApiError, clearSession, subscribe, fetchMock;
const identity = { id: 7, username: "reader", displayName: "阅读用户", role: "USER" };
const token = (value = "token-one") => ({ headerName: "X-CSRF-TOKEN", token: value });
const response = (body, status = 200) =>
    new Response(status === 204 ? null : JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json;charset=UTF-8" }
    });
function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
}

beforeEach(async () => {
    vi.resetModules();
    const module = await import("../src/services/backendLabService");
    api = module.backendApi;
    BackendApiError = module.BackendApiError;
    clearSession = module.clearBackendSession;
    subscribe = module.subscribeSessionInvalidated;
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
    clearSession();
    vi.unstubAllGlobals();
});

describe("Java业务API客户端", () => {
    it("匿名身份恢复失败不会作废稍晚返回的公开健康状态", async () => {
        const health = deferred();
        fetchMock
            .mockReturnValueOnce(health.promise)
            .mockResolvedValueOnce(response({ code: "UNAUTHENTICATED", message: "请先登录" }, 401));
        const checking = api.health();
        await expect(api.me()).rejects.toMatchObject({ status: 401 });
        health.resolve(response({ status: "UP" }));
        await expect(checking).resolves.toEqual({ status: "UP" });
        const cancelled = new AbortController();
        cancelled.abort();
        await expect(api.health({ signal: cancelled.signal })).rejects.toMatchObject({ name: "AbortError" });
    });

    it("编码可选筛选并保留status=0，同源Cookie与取消信号传给fetch", async () => {
        const page = { items: [], total: 0, page: 1, size: 10 };
        fetchMock.mockResolvedValue(response(page));
        const controller = new AbortController();
        expect(
            await api.listUsers(
                { page: 1, size: 10, status: 0, keyword: "阿文 & Alice", empty: "", missing: null },
                { signal: controller.signal }
            )
        ).toEqual(page);
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/v1/users?page=1&size=10&status=0&keyword=%E9%98%BF%E6%96%87+%26+Alice",
            expect.objectContaining({ credentials: "same-origin", signal: controller.signal })
        );
    });

    it("写请求先取得CSRF，再按后端headerName提交JSON", async () => {
        fetchMock.mockResolvedValueOnce(response(token())).mockResolvedValueOnce(response({ id: 8 }, 201));
        await api.createUser({ username: "new_user", displayName: "新用户" });
        expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/auth/csrf");
        expect(fetchMock.mock.calls[1]).toEqual([
            "/api/v1/users",
            expect.objectContaining({
                method: "POST",
                credentials: "same-origin",
                headers: expect.objectContaining({ "X-CSRF-TOKEN": "token-one", "Content-Type": "application/json" }),
                body: JSON.stringify({ username: "new_user", displayName: "新用户" })
            })
        ]);
    });

    it("登录轮换CSRF，后续写入重新获取且不会自动重试失败写请求", async () => {
        fetchMock
            .mockResolvedValueOnce(response(token("before")))
            .mockResolvedValueOnce(response(identity))
            .mockResolvedValueOnce(response(token("after")))
            .mockResolvedValueOnce(response({ message: "字段错误", fieldErrors: { displayName: "不能为空" } }, 400));
        expect(await api.login({ username: "reader", password: "secret-in-memory" })).toEqual(identity);
        const failed = api.createUser({ username: "a", displayName: "" });
        await expect(failed).rejects.toMatchObject({ status: 400, fieldErrors: { displayName: "不能为空" } });
        expect(fetchMock).toHaveBeenCalledTimes(4);
        expect(fetchMock.mock.calls[3][1].headers["X-CSRF-TOKEN"]).toBe("after");
    });

    it("并发写请求共用CSRF，取消一个等待者不取消另一个", async () => {
        const pending = deferred();
        fetchMock.mockReturnValueOnce(pending.promise).mockResolvedValue(response({ id: 3 }, 201));
        const cancelled = new AbortController();
        const first = api.createUser({ username: "first" }, { signal: cancelled.signal });
        const firstCheck = expect(first).rejects.toMatchObject({ name: "AbortError" });
        const second = api.createUser({ username: "second" });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const sharedSignal = fetchMock.mock.calls[0][1].signal;
        cancelled.abort();
        await firstCheck;
        expect(sharedSignal.aborted).toBe(false);
        pending.resolve(response(token()));
        await expect(second).resolves.toEqual({ id: 3 });
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(JSON.parse(fetchMock.mock.calls[1][1].body).username).toBe("second");
    });

    it("全部等待者取消后终止token请求，忽略其晚到结果", async () => {
        const pending = deferred();
        fetchMock
            .mockReturnValueOnce(pending.promise)
            .mockResolvedValueOnce(response(token("fresh")))
            .mockResolvedValueOnce(response({ id: 4 }, 201));
        const controller = new AbortController();
        const cancelled = api.createUser({ username: "cancelled" }, { signal: controller.signal });
        const assertion = expect(cancelled).rejects.toMatchObject({ name: "AbortError" });
        controller.abort();
        await assertion;
        expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
        pending.resolve(response(token("stale")));
        await Promise.resolve();
        await api.createUser({ username: "latest" });
        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(fetchMock.mock.calls[2][1].headers["X-CSRF-TOKEN"]).toBe("fresh");
    });

    it("受保护接口401通知清身份，403保留身份但清掉CSRF", async () => {
        const listener = vi.fn();
        const unsubscribe = subscribe(listener);
        fetchMock.mockResolvedValueOnce(response({ code: "SESSION_INVALID", message: "登录失效" }, 401));
        await expect(api.me()).rejects.toBeInstanceOf(BackendApiError);
        expect(listener).toHaveBeenCalledOnce();
        fetchMock
            .mockResolvedValueOnce(response(token()))
            .mockResolvedValueOnce(response({ code: "FORBIDDEN", message: "无权操作" }, 403));
        await expect(api.deleteUser(1)).rejects.toMatchObject({ status: 403 });
        expect(listener).toHaveBeenCalledOnce();
        unsubscribe();
    });

    it("登录错误不会误触发会话撤销通知", async () => {
        const listener = vi.fn();
        subscribe(listener);
        fetchMock
            .mockResolvedValueOnce(response(token()))
            .mockResolvedValueOnce(response({ code: "LOGIN_FAILED", message: "登录失败" }, 401));
        await expect(api.login({ username: "no_user", password: "wrong" })).rejects.toMatchObject({ status: 401 });
        expect(listener).not.toHaveBeenCalled();
    });

    it("旧身份请求的迟到401不会把新登录身份清掉", async () => {
        const old = deferred();
        const listener = vi.fn();
        subscribe(listener);
        fetchMock
            .mockReturnValueOnce(old.promise)
            .mockResolvedValueOnce(response(token()))
            .mockResolvedValueOnce(response(identity));
        const older = api.me();
        const oldCheck = expect(older).rejects.toMatchObject({ name: "AbortError" });
        await api.login({ username: "reader", password: "password" });
        old.resolve(response({ code: "SESSION_INVALID" }, 401));
        await oldCheck;
        expect(listener).not.toHaveBeenCalled();
    });

    it("区别网络失败、取消、HTML代理响应和损坏JSON", async () => {
        fetchMock.mockRejectedValueOnce(new TypeError("offline"));
        await expect(api.me()).rejects.toMatchObject({ status: 0, body: { code: "NETWORK_ERROR" } });
        fetchMock.mockRejectedValueOnce(new DOMException("abort", "AbortError"));
        await expect(api.me()).rejects.toMatchObject({ name: "AbortError" });
        fetchMock.mockResolvedValueOnce(
            new Response("<html>wrong proxy</html>", { headers: { "content-type": "text/html" } })
        );
        await expect(api.me()).rejects.toMatchObject({ body: { code: "INVALID_RESPONSE" } });
        fetchMock.mockResolvedValueOnce(new Response("{broken", { headers: { "content-type": "application/json" } }));
        await expect(api.me()).rejects.toMatchObject({ body: { code: "INVALID_RESPONSE" } });
    });

    it("DELETE接受204空体，注销后的写入获取新token", async () => {
        fetchMock
            .mockResolvedValueOnce(response(token("one")))
            .mockResolvedValueOnce(response(null, 204))
            .mockResolvedValueOnce(response(token("logout")))
            .mockResolvedValueOnce(response(null, 204))
            .mockResolvedValueOnce(response(token("new")))
            .mockResolvedValueOnce(response({ id: 9 }, 201));
        expect(await api.deleteUser(8)).toBe(null);
        await api.logout();
        await api.createUser({ username: "new" });
        expect(fetchMock.mock.calls[5][1].headers["X-CSRF-TOKEN"]).toBe("new");
    });

    it("拒绝缺失分页结构或无效身份，而不将其作为成功数据", async () => {
        fetchMock.mockResolvedValueOnce(response({ items: [], total: "zero" }));
        await expect(api.listUsers()).rejects.toMatchObject({ body: { code: "INVALID_RESPONSE" } });
        fetchMock.mockResolvedValueOnce(response({ ...identity, role: "ROOT" }));
        await expect(api.me()).rejects.toMatchObject({ body: { code: "INVALID_RESPONSE" } });
    });
});
