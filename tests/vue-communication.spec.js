import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { h, nextTick, ref } from "vue";
import DualModelEditor from "../src/features/labs/components/DualModelEditor.vue";
import ModelInput from "../src/features/labs/components/ModelInput.vue";
import CommunicationChild from "../src/features/labs/components/CommunicationChild.vue";
import LifecycleProbe from "../src/features/labs/components/LifecycleProbe.vue";
import WatchersLab from "../src/features/labs/WatchersLab.vue";
import BuiltinsLab from "../src/features/labs/BuiltinsLab.vue";
import RenderingLab from "../src/features/labs/RenderingLab.vue";
import LifecycleLab from "../src/features/labs/LifecycleLab.vue";

afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
});

describe("Vue 组件通信与副作用实验", () => {
    // 渲染函数显式写出 model 的 prop/更新监听器，验证父级确实接收并回写，而非只检查子组件 emit。
    it("多个具名 model 分别更新父级对应状态", async () => {
        const title = ref("原始标题"),
            priority = ref("普通");
        const wrapper = mount({
            setup: () => () =>
                h(DualModelEditor, {
                    "title": title.value,
                    "priority": priority.value,
                    "onUpdate:title": (value) => {
                        title.value = value;
                    },
                    "onUpdate:priority": (value) => {
                        priority.value = value;
                    }
                })
        });
        await wrapper.find("input").setValue("新标题");
        expect(title.value).toBe("新标题");
        expect(priority.value).toBe("普通");
        await wrapper.find("select").setValue("紧急");
        expect(priority.value).toBe("紧急");
        expect(title.value).toBe("新标题");
        wrapper.unmount();
    });

    it("自定义 model 修饰符通过更新协议转换发送值", async () => {
        const wrapper = mount(ModelInput, {
            props: { "modelValue": "", "modelModifiers": { capitalize: true }, "onUpdate:modelValue": () => {} }
        });
        await wrapper.find("input").setValue("vue");
        expect(wrapper.emitted("update:modelValue")[0]).toEqual(["Vue"]);
        wrapper.unmount();
    });

    it("子组件只发出标题变更，并通过公开 focus 接口聚焦", async () => {
        const wrapper = mount(CommunicationChild, {
            props: { title: "原始标题", count: 0 },
            attachTo: document.body,
            global: { provide: { "lab-theme": ref("森林绿") } }
        });
        wrapper.vm.focus();
        expect(document.activeElement).toBe(wrapper.find("input").element);
        await wrapper.find("input").setValue("编辑后的标题");
        await wrapper.find("button").trigger("click");
        expect(wrapper.emitted("update-title")[0]).toEqual(["编辑后的标题"]);
        expect(wrapper.props("title")).toBe("原始标题");
        wrapper.unmount();
    });

    it("卸载后释放计时器和 window 事件监听", async () => {
        vi.useFakeTimers();
        const logs = [];
        const wrapper = mount(LifecycleProbe, { props: { onLog: (value) => logs.push(value) } });
        vi.advanceTimersByTime(2000);
        await nextTick();
        expect(wrapper.text()).toContain("2 秒");
        wrapper.unmount();
        expect(logs.some((value) => value.includes("onScopeDispose"))).toBe(true);
        const lastCount = logs.length;
        vi.advanceTimersByTime(5000);
        window.dispatchEvent(new Event("resize"));
        expect(logs).toHaveLength(lastCount);
        expect(vi.getTimerCount()).toBe(0);
    });

    it("快速搜索取消旧请求，旧结果不能覆盖最新结果", async () => {
        vi.useFakeTimers();
        const wrapper = mount(WatchersLab);
        const search = wrapper.find('input[placeholder="先输入 V，再快速输入 Vue"]');
        await search.setValue("V");
        vi.advanceTimersByTime(100);
        await search.setValue("Vue");
        vi.advanceTimersByTime(400);
        await nextTick();
        expect(wrapper.text()).toContain("“Vue” 的匹配结果");
        vi.advanceTimersByTime(1500);
        await nextTick();
        expect(wrapper.text()).not.toContain("“V” 的匹配结果");
        expect(wrapper.text()).toContain("失效请求已取消");
        wrapper.unmount();
        expect(vi.getTimerCount()).toBe(0);
    });

    it("KeepAlive 保留对应 key 的草稿，关闭缓存后切换会重建实例", async () => {
        const wrapper = mount(BuiltinsLab);
        const switchTab = async (name) =>
            wrapper
                .findAll("button")
                .find((button) => button.text() === name)
                .trigger("click");
        const draft = () => wrapper.find('input[placeholder="在 笔记 A 输入后切换页签"]');
        await draft().setValue("需要缓存的笔记");
        await switchTab("笔记 B");
        await switchTab("笔记 A");
        expect(draft().element.value).toBe("需要缓存的笔记");
        await wrapper.find('input[type="checkbox"]').setValue(false);
        await draft().setValue("未缓存的笔记");
        await switchTab("笔记 B");
        await switchTab("笔记 A");
        expect(draft().element.value).toBe("");
        wrapper.unmount();
    });

    it("浏览器编译器生成真实动态标记与带 key 列表的编译输出", async () => {
        const wrapper = mount(RenderingLab);
        const compileButton = () =>
            wrapper.findAll("button").find((button) => button.text().includes("编译并查看输出"));
        await compileButton().trigger("click");
        await vi.waitFor(() => expect(wrapper.find(".compiler-output").text()).toContain("function render"));
        expect(wrapper.find(".compiler-output").text()).toContain("TEXT");
        await wrapper.find("select").setValue("list");
        await compileButton().trigger("click");
        await vi.waitFor(() => expect(wrapper.find(".compiler-output").text()).toContain("KEYED_FRAGMENT"));
        wrapper.unmount();
    });

    it("指令只在绑定值变化时记录，不因日志更新反复触发", async () => {
        const wrapper = mount(LifecycleLab);
        await wrapper.find('input[type="checkbox"]').setValue(true);
        await nextTick();
        const directiveLogs = wrapper.findAll(".lab-log li").filter((item) => item.text().includes("指令 updated"));
        expect(directiveLogs).toHaveLength(1);
        wrapper.unmount();
    });
});
