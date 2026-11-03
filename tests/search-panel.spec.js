import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { computed, defineComponent, h, ref } from "vue";
import SearchPanel from "../src/components/business/SearchPanel.vue";

let wrapper;
afterEach(() => {
    wrapper?.unmount();
    document.body.innerHTML = "";
});

const tasks = [
    { title: "学习 Vue 响应式", priority: "high", status: "doing" },
    { title: "复习 CSS 布局", priority: "low", status: "todo" }
];

// 用真实父组件回写 v-model，并单独持有已应用筛选 applied，复现受控 prop 在下一轮渲染才回传的时序。
// 若 reset 错读旧 props，就算输入框已清空，结果列表仍会保留旧条件；测试同时检查这两个层面。
function mountControlled(defaults) {
    const model = ref({ ...defaults, query: "不存在的学习任务QA" });
    const applied = ref({ ...model.value });
    const onReset = vi.fn((value) => {
        applied.value = { ...value };
    });
    const fields = [
        { key: "query", type: "input", label: "搜索任务" },
        {
            key: "priority",
            type: "select",
            label: "优先级",
            options: [
                { value: "high", label: "高" },
                { value: "low", label: "低" }
            ]
        }
    ];
    const Parent = defineComponent({
        setup() {
            const filtered = computed(() =>
                tasks.filter(
                    (task) =>
                        (!applied.value.query || task.title.includes(applied.value.query)) &&
                        (!applied.value.priority || task.priority === applied.value.priority)
                )
            );
            // 真正的父受控绑定：子组件发出更新后，父 ref 同步变化，但新的 props
            // 要等下一次渲染才传回子组件；这正是 defineModel 立即回读容易踩的边界。
            return () =>
                h("section", [
                    h(SearchPanel, {
                        "modelValue": model.value,
                        "onUpdate:modelValue": (value) => {
                            model.value = value;
                        },
                        defaults,
                        fields,
                        onReset
                    }),
                    h("output", { "data-testid": "count" }, String(filtered.value.length)),
                    h(
                        "output",
                        { "data-testid": "active" },
                        String(Object.values(applied.value).filter(Boolean).length)
                    )
                ]);
        }
    });
    wrapper = mount(Parent, { attachTo: document.body });
    return { model, applied, onReset };
}

describe("SearchPanel 的父受控重置", () => {
    it.each([
        ["任务工作台", { query: "", status: "", priority: "", dueDate: "" }],
        ["组件库复用页", { query: "", priority: "" }]
    ])("%s：输入值与已应用条件同时恢复默认，不发出旧查询", async (_name, defaults) => {
        const { model, applied, onReset } = mountControlled(defaults);
        expect(wrapper.get('[data-testid="count"]').text()).toBe("0");
        expect(wrapper.get('[data-testid="active"]').text()).toBe("1");

        await wrapper
            .findAll("button")
            .find((button) => button.text() === "重置")
            .trigger("click");

        expect(onReset).toHaveBeenCalledExactlyOnceWith(defaults);
        expect(model.value).toEqual(defaults);
        expect(applied.value).toEqual(defaults);
        expect(wrapper.get("#search-query").element.value).toBe("");
        expect(wrapper.get('[data-testid="count"]').text()).toBe("2");
        expect(wrapper.get('[data-testid="active"]').text()).toBe("0");
    });

    it("恢复非空默认条件，而不是把所有字段一律清空", async () => {
        const defaults = { query: "", priority: "high" };
        const { model, applied } = mountControlled(defaults);
        await wrapper
            .findAll("button")
            .find((button) => button.text() === "重置")
            .trigger("click");

        expect(model.value).toEqual(defaults);
        expect(applied.value).toEqual(defaults);
        expect(wrapper.get('[data-testid="count"]').text()).toBe("1");
        expect(wrapper.get('[data-testid="active"]').text()).toBe("1");
    });
});
