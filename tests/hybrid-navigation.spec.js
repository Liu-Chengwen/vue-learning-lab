import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import { router as appRouter } from "../src/router";
import { nativeBridge } from "../src/utils/nativeBridge";

const base = "/hybrid/navigation";
const previousWebkit = Object.getOwnPropertyDescriptor(window, "webkit");
let wrapper;
let router;

// 使用真实子路由、组件和 Bridge，只替换 Native 的 WebKit 传输边界。
async function mountExperiment(path = base) {
    router = createRouter({
        history: createMemoryHistory("/#"),
        // 复用正式路由记录与懒加载入口，避免测试自己配出的另一套页面。
        routes: appRouter.options.routes.filter((record) => record.path === base)
    });
    await router.push(path);
    await router.isReady();
    wrapper = mount({ components: { RouterView }, template: "<RouterView />" }, { global: { plugins: [router] } });
    await flushPromises();
}

function installNativeChannel() {
    const postMessage = vi.fn();
    Object.defineProperty(window, "webkit", {
        configurable: true,
        value: { messageHandlers: { nativeBridge: { postMessage } } }
    });
    return postMessage;
}

// 首次进入 A/B 还要等待真实的异步路由 import；flushPromises 只清已有微任务，不能代替导航完成。
async function clickAndWaitForNavigation(selector) {
    let removeHook;
    const completed = new Promise((resolve) => {
        removeHook = router.afterEach((to, from, failure) => resolve(failure));
    });
    try {
        await wrapper.get(selector).trigger("click");
        // afterEach 在路由成功或明确失败后执行；失败会在这里被保留为真实断言信息。
        expect(await completed).toBeUndefined();
        await flushPromises();
    } finally {
        removeHook();
    }
}

afterEach(async () => {
    wrapper?.unmount();
    wrapper = undefined;
    await flushPromises();
    if (previousWebkit) Object.defineProperty(window, "webkit", previousWebkit);
    else delete window.webkit;
});

describe("Hybrid 导航实验基础交互", () => {
    it("路由切页保持 JS 环境和 Bridge，返回入口时局部草稿与次数重新创建", async () => {
        await mountExperiment();
        const environment = wrapper.get('[data-testid="js-environment"]').text();
        const originalInstance = wrapper.get('[data-testid="page-instance"]').text();
        const endpoint = window.HybridBridge;
        await wrapper.get("#navigation-home-draft").setValue("这段草稿仅属于入口页");
        await wrapper.get(".increment-count").trigger("click");

        await clickAndWaitForNavigation(".open-demo-page");
        expect(router.currentRoute.value.path).toBe(`${base}/page-a`);
        expect(wrapper.get('[data-testid="js-environment"]').text()).toBe(environment);
        expect(window.HybridBridge).toBe(endpoint);
        expect(wrapper.get(".router-back").text()).toBe("H5 路由返回");

        await clickAndWaitForNavigation(".router-back");
        expect(router.currentRoute.value.path).toBe(base);
        expect(wrapper.get("#navigation-home-draft").element.value).toBe("");
        expect(wrapper.get(".increment-count").text()).toContain("0");
        expect(wrapper.get('[data-testid="page-instance"]').text()).not.toBe(originalInstance);
        expect(wrapper.text()).toContain("实验入口 卸载");
    });

    it("新容器模式发送完整 hash 地址与标题，原路由和草稿保留", async () => {
        const postMessage = installNativeChannel();
        await mountExperiment(`${base}?note=Vue%20Lab`);
        await wrapper.get("#navigation-home-draft").setValue("保留在旧容器");
        await wrapper.get('[role="switch"]').trigger("click");
        await wrapper.get(".open-demo-page").trigger("click");

        expect(postMessage).toHaveBeenCalledTimes(1);
        const request = postMessage.mock.calls[0][0];
        expect(request.action).toBe("openWebView");
        expect(request.params.title).toBe("导航实验 · 页面 A");
        expect(new URL(request.params.url).hash).toBe(`#${base}/page-a?note=Vue+Lab&navMode=container`);
        expect(router.currentRoute.value.path).toBe(base);
        expect(wrapper.get(".open-demo-page").element.disabled).toBe(true);

        window.HybridBridge.receiveResponse({ id: request.id, ok: true, data: { opened: true } });
        await flushPromises();
        expect(wrapper.get("#navigation-home-draft").element.value).toBe("保留在旧容器");
        expect(wrapper.text()).toContain("新容器已打开");
        expect(wrapper.get(".open-demo-page").element.disabled).toBe(false);
    });

    it("原生错误与缺少通道都明确显示失败并结束等待，不自动切成路由跳转", async () => {
        const postMessage = installNativeChannel();
        await mountExperiment(`${base}?navMode=container`);
        await wrapper.get(".open-demo-page").trigger("click");
        window.HybridBridge.receiveResponse({
            id: postMessage.mock.calls[0][0].id,
            ok: false,
            error: "导航转场中，请稍后重试"
        });
        await flushPromises();
        expect(wrapper.text()).toContain("导航转场中，请稍后重试");
        expect(wrapper.get(".open-demo-page").element.disabled).toBe(false);

        delete window.webkit;
        await wrapper.get(".open-demo-page").trigger("click");
        await flushPromises();
        expect(wrapper.text()).toContain("Native Bridge 不可用");
        expect(router.currentRoute.value.path).toBe(base);
        expect(nativeBridge.getPendingCount()).toBe(0);
    });

    it("直达页在容器内安全回到入口，退出整个实验清理请求和迟到响应", async () => {
        const postMessage = installNativeChannel();
        await mountExperiment(`${base}/page-a?navMode=container`);
        expect(wrapper.get(".router-back").text()).toBe("容器内回到实验入口");
        await clickAndWaitForNavigation(".router-back");
        expect(router.currentRoute.value.path).toBe(base);

        await wrapper.get(".open-demo-page").trigger("click");
        const receiver = window.HybridBridge.receiveResponse;
        const oldId = postMessage.mock.calls[0][0].id;
        expect(nativeBridge.getPendingCount()).toBe(1);
        wrapper.unmount();
        wrapper = undefined;
        await flushPromises();
        expect(nativeBridge.getPendingCount()).toBe(0);

        await mountExperiment();
        receiver({ id: oldId, ok: true, data: { opened: true } });
        await flushPromises();
        expect(wrapper.text()).not.toContain("新容器已打开");
        expect(wrapper.get("#navigation-home-draft").element.value).toBe("");
    });
});
