import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SourceViewer from "../src/components/learning/SourceViewer.vue";

let wrapper;
afterEach(() => wrapper?.unmount());

// 直接经过 Vite 的 ?raw 导入验证读取，不模拟文件内容。
describe("真实源码阅读", () => {
    it("既能读取Vue源文件，也能切到独立Webpack配置", async () => {
        wrapper = mount(SourceViewer, {
            props: {
                source: ["src/features/labs/components/ModelInput.vue", "examples/webpack/webpack.config.cjs"]
            }
        });
        // 动态文本导入是异步的，等待可观察结果而非硬编码睡眠时长，降低运行环境速度差异的影响。
        await vi.waitFor(() => expect(wrapper.find("pre").text()).toContain("defineModel"));
        const configButton = wrapper.findAll("button").find((button) => button.text() === "webpack.config.cjs");
        await configButton.trigger("click");
        await vi.waitFor(() => expect(wrapper.find("pre").text()).toContain("HtmlWebpackPlugin"));
        expect(wrapper.find("pre").text()).toContain("module.exports");
    });
});
