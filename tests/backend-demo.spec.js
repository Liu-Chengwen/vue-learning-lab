import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import BackendDemoView from "../src/features/backend/BackendDemoView.vue";

let wrapper;
let fetchMock;

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json;charset=UTF-8" }
    });
}

beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
});

// 保留真实表单和 Element Plus 控件；只替换网络边界，覆盖页面请求与反馈。
describe("Spring Boot 接口联调", () => {
    it("编码姓名参数，并展示后端返回的问候语和 JSON", async () => {
        fetchMock.mockResolvedValue(jsonResponse({ message: "Hello, 阿文 & Alice!" }));
        wrapper = mount(BackendDemoView, { attachTo: document.body });
        await flushPromises();

        await wrapper.get("#greeting-name").setValue(" 阿文 & Alice ");
        await wrapper.get("form").trigger("submit");
        await flushPromises();

        expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/v1/demo/hello?name=%E9%98%BF%E6%96%87+%26+Alice", {
            signal: expect.any(AbortSignal)
        });
        expect(wrapper.get(".greeting-message").text()).toBe("Hello, 阿文 & Alice!");
        expect(JSON.parse(wrapper.get(".response-json").text())).toEqual({ message: "Hello, 阿文 & Alice!" });
        expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    });

    it("请求期间禁用控件，连续提交只发送一次请求", async () => {
        let resolve;
        fetchMock.mockReturnValue(
            new Promise((done) => {
                resolve = done;
            })
        );
        wrapper = mount(BackendDemoView, { attachTo: document.body });

        await wrapper.get("form").trigger("submit");
        await wrapper.get("form").trigger("submit");

        expect(fetchMock).toHaveBeenCalledOnce();
        expect(wrapper.get("#greeting-name").element.disabled).toBe(true);
        expect(wrapper.get('button[type="submit"]').element.disabled).toBe(true);
        expect(wrapper.text()).toContain("正在等待 Spring Boot 响应");

        resolve(jsonResponse({ message: "Hello, Awen!" }));
        await flushPromises();

        expect(wrapper.get("#greeting-name").element.disabled).toBe(false);
        expect(wrapper.get('button[type="submit"]').element.disabled).toBe(false);
        expect(wrapper.get(".greeting-message").text()).toBe("Hello, Awen!");
    });

    it("HTTP 失败展示状态码，重试成功后清除错误", async () => {
        fetchMock
            .mockResolvedValueOnce(jsonResponse({ error: "unavailable" }, 503))
            .mockResolvedValueOnce(jsonResponse({ message: "Hello, Awen!" }));
        wrapper = mount(BackendDemoView, { attachTo: document.body });

        await wrapper.get("form").trigger("submit");
        await flushPromises();

        expect(wrapper.get('[role="alert"]').text()).toContain("HTTP 503");
        expect(wrapper.get('button[type="submit"]').element.disabled).toBe(false);
        expect(wrapper.find(".greeting-message").exists()).toBe(false);

        await wrapper.get("form").trigger("submit");
        await flushPromises();

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(wrapper.find('[role="alert"]').exists()).toBe(false);
        expect(wrapper.get(".greeting-message").text()).toBe("Hello, Awen!");
    });

    it.each([
        [
            "开发服务器返回 200 HTML",
            () =>
                new Response("<!doctype html><title>Vue Lab</title>", {
                    status: 200,
                    headers: { "content-type": "text/html" }
                }),
            "接口未返回 JSON"
        ],
        ["JSON 缺少 message", () => jsonResponse({ status: "UP" }), "缺少字符串类型的 message"]
    ])("%s 时显示响应错误", async (_name, createResponse, expectedError) => {
        fetchMock.mockResolvedValue(createResponse());
        wrapper = mount(BackendDemoView, { attachTo: document.body });

        await wrapper.get("form").trigger("submit");
        await flushPromises();

        expect(wrapper.get('[role="alert"]').text()).toContain(expectedError);
        expect(wrapper.find(".greeting-message").exists()).toBe(false);
        expect(wrapper.get('button[type="submit"]').element.disabled).toBe(false);
    });

    it("网络不可达时给出启动服务提示，并恢复提交按钮", async () => {
        fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
        wrapper = mount(BackendDemoView, { attachTo: document.body });

        await wrapper.get("form").trigger("submit");
        await flushPromises();

        expect(wrapper.get('[role="alert"]').text()).toContain("无法连接接口");
        expect(wrapper.get('[role="alert"]').text()).toContain("Spring Boot 已启动");
        expect(wrapper.get('button[type="submit"]').element.disabled).toBe(false);
    });

    it("离开页面会取消尚未完成的网络请求", async () => {
        fetchMock.mockImplementation(
            (_url, { signal }) =>
                new Promise((_resolve, reject) => {
                    signal.addEventListener("abort", () => reject(new DOMException("请求取消", "AbortError")), {
                        once: true
                    });
                })
        );
        wrapper = mount(BackendDemoView, { attachTo: document.body });

        await wrapper.get("form").trigger("submit");
        const signal = fetchMock.mock.calls[0][1].signal;
        expect(signal.aborted).toBe(false);

        wrapper.unmount();
        wrapper = undefined;
        await flushPromises();

        expect(signal.aborted).toBe(true);
    });
});
