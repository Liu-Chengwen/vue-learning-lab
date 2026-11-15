import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import LocationLabView from "../src/features/hybrid/LocationLabView.vue";
import { nativeBridge } from "../src/utils/nativeBridge";

const previousWebkit = Object.getOwnPropertyDescriptor(window, "webkit");
let wrapper;

// 只替换 WebKit 边界，仍运行真实组件、Bridge 请求表和 Promise 响应逻辑。
function mountLocationPage() {
    const postMessage = vi.fn();
    Object.defineProperty(window, "webkit", {
        configurable: true,
        value: { messageHandlers: { nativeBridge: { postMessage } } }
    });
    wrapper = mount(LocationLabView);
    return postMessage;
}

afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    if (previousWebkit) {
        Object.defineProperty(window, "webkit", previousWebkit);
    } else {
        delete window.webkit;
    }
});

describe("原生定位实验基础交互", () => {
    it("点击后发送定位请求并锁定按钮，收到响应后展示四个定位字段", async () => {
        const postMessage = mountLocationPage();
        expect(postMessage).not.toHaveBeenCalled();

        await wrapper.get(".get-location-button").trigger("click");
        expect(postMessage).toHaveBeenCalledExactlyOnceWith({
            id: expect.any(String),
            action: "getLocation",
            params: {}
        });
        expect(wrapper.get(".get-location-button").element.disabled).toBe(true);

        window.HybridBridge.receiveResponse({
            id: postMessage.mock.calls[0][0].id,
            ok: true,
            data: {
                latitude: 31.230416,
                longitude: 121.473701,
                horizontalAccuracy: 18.5,
                timestamp: "2026-11-15T02:00:00Z"
            }
        });
        await flushPromises();

        expect(wrapper.get('[data-testid="latitude"]').text()).toBe("31.230416°");
        expect(wrapper.get('[data-testid="longitude"]').text()).toBe("121.473701°");
        expect(wrapper.get('[data-testid="accuracy"]').text()).toBe("18.5 米");
        expect(wrapper.get("time").attributes("datetime")).toBe("2026-11-15T02:00:00Z");
        expect(wrapper.get(".request-status").text()).toBe("已获取原生定位");
        expect(wrapper.get(".get-location-button").element.disabled).toBe(false);
    });

    it("展示原生授权错误并允许重试，普通浏览器点击时给出无通道提示", async () => {
        const postMessage = mountLocationPage();
        await wrapper.get(".get-location-button").trigger("click");
        window.HybridBridge.receiveResponse({
            id: postMessage.mock.calls[0][0].id,
            ok: false,
            error: "未授予定位权限"
        });
        await flushPromises();

        expect(wrapper.text()).toContain("未授予定位权限");
        expect(wrapper.get(".get-location-button").text()).toBe("重试定位");
        expect(wrapper.get(".get-location-button").element.disabled).toBe(false);

        delete window.webkit;
        await wrapper.get(".get-location-button").trigger("click");
        await flushPromises();
        expect(wrapper.text()).toContain("Native Bridge 不可用");
        expect(postMessage).toHaveBeenCalledTimes(1);
    });

    it("离开路由清理等待请求，迟到回复不会成为重新进入页面后的结果", async () => {
        const postMessage = mountLocationPage();
        await wrapper.get(".get-location-button").trigger("click");
        const oldReceiver = window.HybridBridge.receiveResponse;
        const oldId = postMessage.mock.calls[0][0].id;
        expect(nativeBridge.getPendingCount()).toBe(1);

        wrapper.unmount();
        wrapper = undefined;
        await flushPromises();
        expect(nativeBridge.getPendingCount()).toBe(0);

        mountLocationPage();
        oldReceiver({
            id: oldId,
            ok: true,
            data: { latitude: 31, longitude: 121, horizontalAccuracy: 20, timestamp: "2026-11-15T02:00:00Z" }
        });
        await flushPromises();
        expect(wrapper.find('[data-testid="latitude"]').exists()).toBe(false);
        expect(wrapper.text()).toContain("尚未获取位置");
    });
});
