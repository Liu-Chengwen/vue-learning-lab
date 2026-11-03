import { afterEach, describe, expect, it } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia } from "pinia";
import { createRouter, createMemoryHistory } from "vue-router";
import App from "../src/App.vue";
import { router as projectRouter } from "../src/router";
import { learningPlugin } from "../src/plugins/learningPlugin";

let wrapper;
// 挂载会创建 store 侦听器和全局键盘监听，unmount 触发对应清理；存储与 body 也需隔离。
afterEach(() => {
    wrapper?.unmount();
    localStorage.clear();
    document.body.innerHTML = "";
});

// 这是 DOM 环境中的路由集成检查，不代替真实浏览器的布局与视觉验收。
describe("应用入口与路由集成", () => {
    it("主页面、实验、详情、嵌套路由和404均能渲染", async () => {
        // 复用真实路由记录，仅替换内存 history，避免测试导航改变实际浏览器 hash。
        const router = createRouter({ history: createMemoryHistory(), routes: projectRouter.options.routes });
        const errors = [];
        await router.push("/");
        wrapper = mount(App, {
            attachTo: document.body,
            global: {
                plugins: [createPinia(), router, learningPlugin],
                config: { errorHandler: (error) => errors.push(error) }
            }
        });
        const paths = [
            "/",
            "/tasks",
            "/tasks/task-101",
            "/ui-library",
            "/migration",
            "/interview",
            "/labs/setup",
            "/labs/reactivity",
            "/labs/communication",
            "/labs/models",
            "/labs/watchers",
            "/labs/builtins",
            "/labs/lifecycle",
            "/labs/slots",
            "/labs/rendering",
            "/labs/router-state",
            "/css/flex",
            "/css/bfc",
            "/javascript/this",
            "/javascript/classes",
            "/javascript/es2015",
            "/javascript/modern",
            "/javascript/async",
            "/tooling/overview",
            "/tooling/modules",
            "/tooling/config",
            "/tooling/bundling",
            "/routing-demo/profile",
            "/routing-demo/settings",
            "/missing-page"
        ];
        for (const path of paths) {
            await router.push(path);
            await flushPromises();
            await flushPromises();
            expect(wrapper.find("main h1").exists(), path).toBe(true);
        }
        expect(errors.map((error) => error.message)).toEqual([]);
    }, 15000);
    it("切换嵌套子页面保持父布局中的本地输入", async () => {
        const router = createRouter({ history: createMemoryHistory(), routes: projectRouter.options.routes });
        await router.push("/routing-demo/profile");
        wrapper = mount(App, { global: { plugins: [createPinia(), router, learningPlugin] } });
        await flushPromises();
        const input = wrapper.find("main input");
        await input.setValue("父级状态应当保留");
        await router.push("/routing-demo/settings");
        await flushPromises();
        expect(wrapper.find("main input").element.value).toBe("父级状态应当保留");
        expect(wrapper.text()).toContain("学习偏好");
    });
});
