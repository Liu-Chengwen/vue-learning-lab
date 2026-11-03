import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { computed, defineComponent, h, nextTick, ref } from "vue";
import { ElDatePicker, ElInput, ElSelect } from "element-plus";
import SearchPanel from "../src/components/business/SearchPanel.vue";

let wrapper;
afterEach(() => {
    wrapper?.unmount();
    document.body.innerHTML = "";
});

// 保留真实 Element Plus 控件，检查原生 disabled 和父受控 model 的行为。
function mountFields(initialFields, slots) {
    const initial = { query: "Vue", priority: "high", dueDate: "2026-11-03", custom: "保留插槽值" };
    const model = ref({ ...initial });
    const fields = ref(initialFields);
    const onUpdate = vi.fn((value) => {
        model.value = value;
    });
    const onSubmit = vi.fn();
    const onReset = vi.fn();
    const defaults = { query: "默认关键词", priority: "", dueDate: "", custom: "" };
    const Parent = defineComponent({
        setup: () => () =>
            h(
                SearchPanel,
                {
                    "modelValue": model.value,
                    "onUpdate:modelValue": onUpdate,
                    "fields": fields.value,
                    defaults,
                    onSubmit,
                    onReset
                },
                slots
            )
    });
    wrapper = mount(Parent, { attachTo: document.body });
    return { initial, model, fields, onUpdate, onSubmit, onReset, defaults };
}

describe("SearchPanel 字段级 disabled", () => {
    it.each([
        ["Input", "query", "input", ElInput, "新的查询"],
        ["Select", "priority", "select", ElSelect, "low"],
        ["DatePicker", "dueDate", "date", ElDatePicker, "2026-12-01"]
    ])("%s 默认可用，动态禁用保留值且只影响指定字段，恢复后仍可更新", async (_name, key, type, Control, next) => {
        const state = mountFields([
            { key, type, label: "目标字段", options: [{ value: "high", label: "高" }] },
            { key: "custom", type: "input", label: "其他字段" }
        ]);
        const control = wrapper.getComponent(Control);
        expect(control.props("disabled")).toBe(false);
        expect(control.get("input").element.disabled).toBe(false);

        state.fields.value[0].disabled = true;
        await nextTick();
        expect(control.props("disabled")).toBe(true);
        expect(control.get("input").element.disabled).toBe(true);
        expect(control.props("modelValue")).toBe(state.initial[key]);
        expect(wrapper.get("#search-custom").element.disabled).toBe(false);
        expect(state.model.value).toEqual(state.initial);
        expect(state.onUpdate).not.toHaveBeenCalled();

        state.fields.value[0].disabled = false;
        await nextTick();
        expect(control.get("input").element.disabled).toBe(false);
        // 更新事件仍生成完整的新对象，不直接改写父级旧对象。
        const previous = state.model.value;
        control.vm.$emit("update:modelValue", next);
        await nextTick();
        expect(state.model.value).toEqual({ ...state.initial, [key]: next });
        expect(state.model.value).not.toBe(previous);
        expect(previous).toEqual(state.initial);
    });

    it("禁用字段仍参与查询，按钮和 expose 重置仍发出默认快照", async () => {
        const state = mountFields([
            { key: "query", type: "input", disabled: true },
            { key: "priority", type: "select", disabled: true },
            { key: "dueDate", type: "date", disabled: true }
        ]);
        await wrapper.get("form").trigger("submit");
        expect(state.onSubmit).toHaveBeenCalledExactlyOnceWith(state.initial);
        expect(state.onSubmit.mock.calls[0][0]).not.toBe(state.model.value);
        await wrapper
            .findAll("button")
            .find((button) => button.text() === "重置")
            .trigger("click");
        expect(state.onReset).toHaveBeenCalledExactlyOnceWith(state.defaults);
        expect(state.model.value).toEqual(state.defaults);
        expect(wrapper.get("#search-query").element.disabled).toBe(true);
        expect(wrapper.get("#search-query").element.value).toBe("默认关键词");
        const panel = wrapper.getComponent(SearchPanel);
        panel.vm.submit();
        expect(state.onSubmit).toHaveBeenLastCalledWith(state.defaults);
        panel.vm.reset();
        await nextTick();
        expect(state.onReset).toHaveBeenCalledTimes(2);
        expect(state.onReset).toHaveBeenLastCalledWith(state.defaults);
    });

    it("字段插槽获得默认及动态 disabled，控件遵守禁用状态且保留更新协议", async () => {
        const state = mountFields([{ key: "custom", type: "input" }], {
            "field-custom": ({ value, update, disabled }) =>
                h("input", {
                    "data-testid": "custom-field",
                    value,
                    disabled,
                    "data-disabled": String(disabled),
                    "onInput": (event) => update(event.target.value)
                })
        });
        const input = wrapper.get('[data-testid="custom-field"]');
        expect(input.attributes("data-disabled")).toBe("false");
        await input.setValue("新的插槽值");
        expect(state.model.value.custom).toBe("新的插槽值");
        state.onUpdate.mockClear();
        state.fields.value[0].disabled = true;
        await nextTick();
        expect(input.attributes("data-disabled")).toBe("true");
        expect(input.element.disabled).toBe(true);
        expect(input.element.value).toBe("新的插槽值");
        expect(state.onUpdate).not.toHaveBeenCalled();
        state.fields.value[0].disabled = false;
        await nextTick();
        await input.setValue("恢复编辑");
        expect(state.model.value.custom).toBe("恢复编辑");
    });
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
