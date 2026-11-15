import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nativeBridge } from "../src/utils/nativeBridge";

const previousWebkit = Object.getOwnPropertyDescriptor(window, "webkit");
const previousEndpoint = Object.getOwnPropertyDescriptor(window, "HybridBridge");
let sent;
let postMessage;

function restoreProperty(name, descriptor) {
    if (descriptor) {
        Object.defineProperty(window, name, descriptor);
    } else {
        delete window[name];
    }
}

beforeEach(() => {
    sent = [];
    postMessage = vi.fn((request) => sent.push(request));
    Object.defineProperty(window, "webkit", {
        configurable: true,
        value: { messageHandlers: { nativeBridge: { postMessage } } }
    });
    nativeBridge.install();
});

afterEach(() => {
    nativeBridge.dispose();
    restoreProperty("webkit", previousWebkit);
    restoreProperty("HybridBridge", previousEndpoint);
    vi.useRealTimers();
});

// 只替换 WebKit 传输边界，直接运行真实 Promise、Map 匹配和清理逻辑。
describe("Promise Native Bridge 基础协议", () => {
    it("保留参数原文，两个请求乱序回复时仍匹配各自的 Promise", async () => {
        const name = "Vue 的 '朋友'\n第二行";
        const device = nativeBridge.call("getDeviceInfo");
        const greeting = nativeBridge.call("greet", { name });
        expect(sent[0].id).not.toBe(sent[1].id);
        expect(sent[1]).toEqual({ id: expect.any(String), action: "greet", params: { name } });
        expect(nativeBridge.getPendingCount()).toBe(2);

        window.HybridBridge.receiveResponse({ id: sent[1].id, ok: true, data: { message: name } });
        window.HybridBridge.receiveResponse({ id: sent[0].id, ok: true, data: { platform: "iOS" } });

        expect(await Promise.all([device, greeting])).toEqual([{ platform: "iOS" }, { message: name }]);
        expect(nativeBridge.getPendingCount()).toBe(0);
    });

    it("原生未知方法的错误响应使对应 Promise rejected", async () => {
        const result = nativeBridge.call("notImplementedAction");
        window.HybridBridge.receiveResponse({ id: sent[0].id, ok: false, error: "不支持的方法" });
        await expect(result).rejects.toThrow("不支持的方法");
        expect(nativeBridge.getPendingCount()).toBe(0);
    });

    it("5 秒无回复后超时并清理，迟到响应不会影响下一次请求", async () => {
        vi.useFakeTimers();
        const result = nativeBridge.call("debugNoReply");
        const assertion = expect(result).rejects.toThrow("超时（5 秒）");
        await vi.advanceTimersByTimeAsync(5000);
        await assertion;
        expect(nativeBridge.getPendingCount()).toBe(0);
        expect(vi.getTimerCount()).toBe(0);

        const next = nativeBridge.call("getDeviceInfo");
        window.HybridBridge.receiveResponse({ id: sent[0].id, ok: true, data: "迟到回复" });
        expect(nativeBridge.getPendingCount()).toBe(1);
        window.HybridBridge.receiveResponse({ id: sent[1].id, ok: true, data: { platform: "iOS" } });
        await expect(next).resolves.toEqual({ platform: "iOS" });
        expect(vi.getTimerCount()).toBe(0);
    });

    it("无通道和同步提交失败都立即 rejected，不留下等待项", async () => {
        delete window.webkit;
        await expect(nativeBridge.call("getDeviceInfo")).rejects.toThrow("Native Bridge 不可用");
        expect(nativeBridge.getPendingCount()).toBe(0);

        Object.defineProperty(window, "webkit", {
            configurable: true,
            value: {
                messageHandlers: {
                    nativeBridge: {
                        postMessage() {
                            throw new Error("通道已断开");
                        }
                    }
                }
            }
        });
        await expect(nativeBridge.call("getDeviceInfo")).rejects.toThrow("通道已断开");
        expect(nativeBridge.getPendingCount()).toBe(0);
    });

    it("定位可独立等待 60 秒，其他请求仍按默认 5 秒超时", async () => {
        vi.useFakeTimers();
        const device = nativeBridge.call("getDeviceInfo");
        const location = nativeBridge.call("getLocation", {}, { timeoutMs: 60000 });
        const defaultAssertion = expect(device).rejects.toThrow("超时（5 秒）");
        const locationAssertion = expect(location).rejects.toThrow("超时（60 秒）");

        await vi.advanceTimersByTimeAsync(5000);
        await defaultAssertion;
        expect(nativeBridge.getPendingCount()).toBe(1);
        expect(sent[1]).toEqual({ id: expect.any(String), action: "getLocation", params: {} });

        await vi.advanceTimersByTimeAsync(55000);
        await locationAssertion;
        expect(nativeBridge.getPendingCount()).toBe(0);
        expect(vi.getTimerCount()).toBe(0);
    });

    it("无效超时选项不发送消息，也不留下等待项", async () => {
        await expect(nativeBridge.call("getLocation", {}, { timeoutMs: -1 })).rejects.toThrow("timeoutMs");
        await expect(nativeBridge.call("getLocation", {}, { timeoutMs: Infinity })).rejects.toThrow("timeoutMs");
        expect(sent).toHaveLength(0);
        expect(nativeBridge.getPendingCount()).toBe(0);
    });

    it("退出页面时取消所有等待、清理定时器并恢复旧入口", async () => {
        vi.useFakeTimers();
        nativeBridge.dispose();
        const previous = { owner: "其他页面" };
        Object.defineProperty(window, "HybridBridge", { configurable: true, writable: true, value: previous });
        nativeBridge.install();
        const first = nativeBridge.call("getDeviceInfo");
        const second = nativeBridge.call("greet");
        const firstAssertion = expect(first).rejects.toThrow("已取消");
        const secondAssertion = expect(second).rejects.toThrow("已取消");

        nativeBridge.dispose();
        await Promise.all([firstAssertion, secondAssertion]);
        expect(nativeBridge.getPendingCount()).toBe(0);
        expect(vi.getTimerCount()).toBe(0);
        expect(window.HybridBridge).toBe(previous);
    });
});
