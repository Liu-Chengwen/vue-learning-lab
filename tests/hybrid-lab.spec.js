import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { useNativeBridge } from "../src/features/hybrid/useNativeBridge";
import HybridLabView from "../src/features/hybrid/HybridLabView.vue";

// 只替换 WebKit 边界，实际挂载生命周期和 Vue 文本渲染仍然运行。
const BridgeProbe = defineComponent({
    setup: useNativeBridge,
    template: '<div><p class="received">{{ nativeMessage }}</p><p role="status">{{ feedback.message }}</p></div>'
});
let wrapper;
const originalReceiver = Object.getOwnPropertyDescriptor(window, "receiveNativeMessage");
const originalWebkit = Object.getOwnPropertyDescriptor(window, "webkit");

function restoreProperty(name, descriptor) {
    if (descriptor) Object.defineProperty(window, name, descriptor);
    else delete window[name];
}

function mountProbe(bridge) {
    if (bridge !== undefined) {
        Object.defineProperty(window, "webkit", {
            configurable: true,
            value: { messageHandlers: { nativeBridge: bridge } }
        });
    }
    wrapper = mount(BridgeProbe);
    return wrapper.vm;
}

afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    restoreProperty("receiveNativeMessage", originalReceiver);
    restoreProperty("webkit", originalWebkit);
    document.body.innerHTML = "";
});

describe("Hybrid 实验页面交互", () => {
    it("真实提交按钮发送默认消息，编辑后保留原文并通过 WebKit 边界发送", async () => {
        const postMessage = vi.fn();
        Object.defineProperty(window, "webkit", {
            configurable: true,
            value: { messageHandlers: { nativeBridge: { postMessage } } }
        });
        wrapper = mount(HybridLabView, { attachTo: document.body });

        await wrapper.get('button[type="submit"]').trigger("click");
        expect(postMessage).toHaveBeenCalledExactlyOnceWith("你好，我是 Vue Lab");
        expect(wrapper.text()).toContain("已提交 WebKit 通道，尚未确认 Native 处理结果");

        const edited = "  Swift 的 '问候'\n来自 Vue Lab  ";
        await wrapper.get("#hybrid-outgoing-message").setValue(edited);
        await wrapper.get('button[type="submit"]').trigger("click");

        expect(postMessage).toHaveBeenNthCalledWith(2, edited);
        expect(wrapper.get("#hybrid-outgoing-message").element.value).toBe(edited);
        expect(wrapper.get(".bridge-log").text()).toContain("H5 → Native · 已提交 WebKit 通道");
    });

    it("接收入口更新页面文本，清空记录按钮清除日志并保留接收消息", async () => {
        wrapper = mount(HybridLabView, { attachTo: document.body });
        const message = "来自 Native\n<strong>只作为文本显示</strong>";

        window.receiveNativeMessage(message);
        await nextTick();

        expect(wrapper.get(".message-display .received-message").element.textContent).toBe(message);
        expect(wrapper.find(".message-display strong").exists()).toBe(false);
        expect(wrapper.get(".bridge-log").text()).toContain("Native → H5 · 收到字符串");
        const clearButton = wrapper.findAll("button").find((button) => button.text() === "清空记录");
        expect(clearButton.element.disabled).toBe(false);
        await clearButton.trigger("click");

        expect(wrapper.find(".bridge-log").exists()).toBe(false);
        expect(wrapper.text()).toContain("还没有通信记录");
        expect(clearButton.element.disabled).toBe(true);
        expect(wrapper.get(".message-display .received-message").element.textContent).toBe(message);
    });
});

describe("第 04 课 WebKit 字符串通道", () => {
    it("挂载接收入口，保留引号、换行和 HTML 文本，并在离开时清理", async () => {
        const state = mountProbe();
        expect(state.nativeMessage).toBeNull();
        expect(typeof window.receiveNativeMessage).toBe("function");

        const message = "Swift 的 '问候'\n<script>alert(1)</script>";
        window.receiveNativeMessage(message);
        await nextTick();

        expect(wrapper.get(".received").element.textContent).toBe(message);
        expect(wrapper.find("script").exists()).toBe(false);
        expect(state.receiveSource).toBe("Native");
        expect(state.receiveCount).toBe(1);
        expect(state.feedback.type).toBe("success");

        wrapper.unmount();
        wrapper = undefined;
        expect(Object.hasOwn(window, "receiveNativeMessage")).toBe(false);
    });

    it("拒绝非字符串消息，保留最后一条有效内容和真实调用次数", () => {
        const state = mountProbe();
        window.receiveNativeMessage("有效消息");
        window.receiveNativeMessage({ message: "不属于本课协议" });
        window.receiveNativeMessage(null);

        expect(state.nativeMessage).toBe("有效消息");
        expect(state.receiveCount).toBe(1);
        expect(state.feedback.type).toBe("warning");
        expect(state.feedback.message).toContain("字符串");
    });

    it("发送原始字符串并保留 WebKit 方法的接收者，不声称 Native 已处理", () => {
        const bridge = { postMessage: vi.fn() };
        const state = mountProbe(bridge);
        const text = "  你好，我是 Vue Lab\n'quoted'  ";

        expect(state.bridgeAvailable).toBe(true);
        expect(state.sendMessage(text)).toBe(true);
        expect(bridge.postMessage).toHaveBeenCalledExactlyOnceWith(text);
        expect(bridge.postMessage.mock.contexts[0]).toBe(bridge);
        expect(state.feedback.type).toBe("info");
        expect(state.feedback.message).toBe("已提交 WebKit 通道，尚未确认 Native 处理结果");
        expect(state.receiveCount).toBe(0);
    });

    it("拒绝空白输入，不调用 Native", () => {
        const bridge = { postMessage: vi.fn() };
        const state = mountProbe(bridge);

        expect(state.sendMessage(" \n\t ")).toBe(false);
        expect(bridge.postMessage).not.toHaveBeenCalled();
        expect(state.feedback.type).toBe("warning");
    });

    it.each([undefined, {}, { postMessage: "不可调用" }])("无可调用通道时给出提示：%j", (bridge) => {
        delete window.webkit;
        const state = mountProbe(bridge);

        expect(state.bridgeAvailable).toBe(false);
        expect(state.sendMessage("你好，我是 Vue Lab")).toBe(false);
        expect(state.feedback.message).toContain("没有可用的 nativeBridge");
        expect(state.feedback.type).toBe("warning");
    });

    it("发送异常有失败反馈，通道恢复后可重试", () => {
        const bridge = {
            postMessage: vi.fn().mockImplementationOnce(() => {
                throw new Error("WebKit 已断开");
            })
        };
        const state = mountProbe(bridge);

        expect(state.sendMessage("第一次")).toBe(false);
        expect(state.feedback.type).toBe("error");
        expect(state.feedback.message).toContain("WebKit 已断开");
        expect(state.sendMessage("重试")).toBe(true);
        expect(state.feedback.type).toBe("info");
        expect(bridge.postMessage).toHaveBeenCalledTimes(2);
    });

    it("每次发送重新检测通道，也允许手动刷新状态", () => {
        delete window.webkit;
        const state = mountProbe();
        const bridge = { postMessage: vi.fn() };
        Object.defineProperty(window, "webkit", {
            configurable: true,
            value: { messageHandlers: { nativeBridge: bridge } }
        });

        expect(state.sendMessage("新通道")).toBe(true);
        expect(state.bridgeAvailable).toBe(true);
        delete window.webkit;
        expect(state.refreshBridge()).toBe(false);
        expect(state.bridgeAvailable).toBe(false);
    });

    it("浏览器模拟明确标记来源，不伪造通道或真实联调成功", () => {
        delete window.webkit;
        const state = mountProbe();

        state.simulateReceive();

        expect(state.nativeMessage).toContain("浏览器模拟");
        expect(state.receiveSource).toBe("浏览器模拟");
        expect(state.feedback.type).toBe("info");
        expect(state.receiveCount).toBe(0);
        expect(state.bridgeAvailable).toBe(false);
        expect(window.webkit).toBeUndefined();
        expect(state.logs[0].message).toContain("浏览器模拟");
    });

    it("卸载恢复原有全局入口和描述符", () => {
        const existing = vi.fn();
        Object.defineProperty(window, "receiveNativeMessage", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: existing
        });
        const previous = Object.getOwnPropertyDescriptor(window, "receiveNativeMessage");
        mountProbe();
        expect(window.receiveNativeMessage).not.toBe(existing);

        wrapper.unmount();
        wrapper = undefined;

        expect(Object.getOwnPropertyDescriptor(window, "receiveNativeMessage")).toEqual(previous);
    });

    it("卸载不删除其他调用方后来注册的入口", () => {
        mountProbe();
        const replacement = vi.fn();
        window.receiveNativeMessage = replacement;

        wrapper.unmount();
        wrapper = undefined;

        expect(window.receiveNativeMessage).toBe(replacement);
    });

    it("通信日志有界，清空日志保留消息", () => {
        const state = mountProbe();
        for (let index = 0; index < 35; index++) window.receiveNativeMessage("消息 " + index);
        expect(state.logs).toHaveLength(30);
        state.clearLogs();
        expect(state.logs).toHaveLength(0);
        expect(state.nativeMessage).toBe("消息 34");
    });
});
