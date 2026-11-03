import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, disposePinia } from "pinia";
import { ElSelect, ElSwitch } from "element-plus";
import UiLibraryView from "../src/features/ui-library/UiLibraryView.vue";
import SearchPanel from "../src/components/business/SearchPanel.vue";

let wrapper;
let pinia;
afterEach(() => {
    wrapper?.unmount();
    if (pinia) disposePinia(pinia);
    localStorage.clear();
    document.body.innerHTML = "";
});

describe("组件库 SearchPanel 禁用示例", () => {
    it("开关控制内置输入框与真实插槽选择器，保留值且查询重置仍有效", async () => {
        pinia = createPinia();
        wrapper = mount(UiLibraryView, {
            attachTo: document.body,
            global: {
                plugins: [pinia],
                stubs: {
                    LessonFrame: { template: "<div><slot /></div>" },
                    RouterLink: true,
                    DataTable: true,
                    TaskFormDialog: true,
                    RemoteSelect: true
                }
            }
        });
        await wrapper
            .findAll("button")
            .find((button) => button.text() === "业务组件封装")
            .trigger("click");
        const panel = wrapper.getComponent(SearchPanel);
        await panel.get("#search-query").setValue("Vue");
        const select = panel.getComponent(ElSelect);
        select.vm.$emit("update:modelValue", "high");
        await wrapper.vm.$nextTick();
        const model = { query: "Vue", priority: "high" };
        const toggle = wrapper.findAllComponents(ElSwitch).find((item) => item.props("ariaLabel") === "禁用搜索字段");
        await toggle.trigger("click");
        expect(panel.get("#search-query").element.disabled).toBe(true);
        expect(select.props("disabled")).toBe(true);
        expect(select.get("input").element.disabled).toBe(true);
        expect(panel.props("modelValue")).toEqual(model);
        await panel.get("form").trigger("submit");
        expect(panel.emitted("submit").at(-1)).toEqual([model]);
        await toggle.trigger("click");
        expect(panel.get("#search-query").element.disabled).toBe(false);
        expect(select.props("disabled")).toBe(false);
        expect(panel.props("modelValue")).toEqual(model);
        await panel
            .findAll("button")
            .find((button) => button.text() === "重置")
            .trigger("click");
        expect(panel.props("modelValue")).toEqual({ query: "", priority: "" });
        expect(panel.emitted("reset").at(-1)).toEqual([{ query: "", priority: "" }]);
    });
});
