import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { ElMessageBox, ElDialog, ElForm, ElFormItem, ElSelect, ElOption } from "element-plus";
import { defineComponent, h, nextTick, ref } from "vue";
import TaskFormDialog from "../src/components/business/TaskFormDialog.vue";
import { cloneTask, initialTasks } from "../src/services/taskService";

let wrapper;
// 弹层传送到 body，清理不仅要卸载组件，也要恢复消息框 mock 并移除残留节点。
afterEach(() => {
    wrapper?.unmount();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
});

// 保留真实 Teleport：全局 teleport stub 会把 Dialog 和 Select/Tooltip 的嵌套弹层
// 都替换成就地渲染，触发当前组件版本的 Select 递归更新。真实 Teleport 下没有该问题。
// 所以通过组件树寻找输入/按钮，而不是要求它们必须出现在 wrapper.element 下面。
// Dialog/Form/Input/Select/RemoteSelect 均未 stub，保存与校验使用真实组件。
describe("任务编辑弹窗", () => {
    function mountEditor(task, submit) {
        return mount(TaskFormDialog, {
            props: { open: true, task, submit, existingTasks: initialTasks },
            attachTo: document.body,
            global: { stubs: { transition: false } }
        });
    }
    it("修改与取消仅影响草稿，通过公开关闭接口通知父级", async () => {
        const task = cloneTask(initialTasks[0]);
        const submit = vi.fn();
        vi.spyOn(ElMessageBox, "confirm").mockResolvedValue("confirm");
        wrapper = mountEditor(task, submit);
        await flushPromises();
        await wrapper
            .findAllComponents({ name: "ElInput" })
            .find((component) => component.props("placeholder") === "例如：用自己的话解释 computed 与 watch")
            .find("input")
            .setValue("一个尚未保存的新标题");
        expect(task.title).toBe(initialTasks[0].title);
        await wrapper.vm.requestClose();
        expect(ElMessageBox.confirm).toHaveBeenCalledOnce();
        expect(wrapper.emitted("update:open").at(-1)).toEqual([false]);
        expect(submit).not.toHaveBeenCalled();
    });
    it("校验期间连续点击只提交一次，并保留父级原对象", async () => {
        const task = cloneTask(initialTasks[0]);
        const submit = vi.fn(async (draft) => ({ ...draft }));
        wrapper = mountEditor(task, submit);
        await flushPromises();
        await wrapper
            .findAllComponents({ name: "ElInput" })
            .find((component) => component.props("placeholder") === "例如：用自己的话解释 computed 与 watch")
            .find("input")
            .setValue("可以通过校验的新标题");
        const save = wrapper
            .findAllComponents({ name: "ElButton" })
            .find((button) => button.text().includes("保存任务"));
        await save.trigger("click");
        await save.trigger("click");
        await new Promise((resolve) => setTimeout(resolve, 250));
        await flushPromises();
        expect(submit).toHaveBeenCalledOnce();
        expect(submit.mock.calls[0][0].title).toBe("可以通过校验的新标题");
        expect(submit.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
        expect(task.title).toBe(initialTasks[0].title);
        expect(wrapper.emitted("saved")).toHaveLength(1);
        expect(wrapper.emitted("update:open").at(-1)).toEqual([false]);
    });
    it("异步校验期间离开页面，不再启动保存或发出成功事件", async () => {
        const submit = vi.fn(async (draft) => ({ ...draft }));
        wrapper = mountEditor(cloneTask(initialTasks[0]), submit);
        await flushPromises();
        await wrapper
            .findAllComponents({ name: "ElInput" })
            .find((component) => component.props("placeholder") === "例如：用自己的话解释 computed 与 watch")
            .find("input")
            .setValue("校验完成前就离开页面");
        const save = wrapper
            .findAllComponents({ name: "ElButton" })
            .find((button) => button.text().includes("保存任务"));
        await save.trigger("click");
        const editor = wrapper;
        editor.unmount();
        wrapper = undefined;
        await new Promise((resolve) => setTimeout(resolve, 230));
        await flushPromises();
        expect(submit).not.toHaveBeenCalled();
        expect(editor.emitted("saved")).toBeUndefined();
    });
    it("表单 label 关联可标记的原生控件，优先级组通过 aria-labelledby 命名", async () => {
        wrapper = mountEditor(cloneTask(initialTasks[0]), vi.fn());
        await flushPromises();
        const labelableTags = new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON", "METER", "OUTPUT", "PROGRESS"]);
        const invalidLabels = [...document.querySelectorAll("label[for]")]
            .filter((label) => label.htmlFor)
            .map((label) => ({
                text: label.textContent.trim(),
                target: document.getElementById(label.htmlFor)?.tagName
            }))
            .filter((label) => !labelableTags.has(label.target));
        expect(invalidLabels).toEqual([]);

        const group = document.querySelector('[role="radiogroup"]');
        expect(group).not.toBeNull();
        expect(document.getElementById(group.getAttribute("aria-labelledby"))?.textContent).toContain("优先级");
    });
});

it("真实 Dialog/Form/Select 在真实 Teleport 下能切换禁用状态", async () => {
    const disabled = ref(false);
    wrapper = mount(
        defineComponent({
            setup() {
                return () =>
                    h(ElDialog, { modelValue: true }, () =>
                        h(ElForm, { model: { status: "todo" }, disabled: disabled.value }, () =>
                            h(ElFormItem, { prop: "status" }, () =>
                                h(ElSelect, { modelValue: "todo" }, () => [
                                    h(ElOption, { value: "todo", label: "待学习" }),
                                    h(ElOption, { value: "done", label: "已完成" })
                                ])
                            )
                        )
                    );
            }
        }),
        { attachTo: document.body, global: { stubs: { transition: false } } }
    );
    await flushPromises();
    const input = wrapper.findComponent(ElSelect).find("input");
    disabled.value = true;
    await nextTick();
    await flushPromises();
    expect(input.element.disabled).toBe(true);
    disabled.value = false;
    await flushPromises();
    expect(input.element.disabled).toBe(false);
});
