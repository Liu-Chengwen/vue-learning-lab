import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { Task, TimedTask, ValidationError, formatTask } from "../src/features/foundations/javascript/classModels";
import { es2015Examples, modernExamples } from "../src/features/foundations/javascript/apiExamples";
import JavaScriptBasics from "../src/features/foundations/javascript/JavaScriptBasics.vue";
import AsyncLab from "../src/features/foundations/javascript/AsyncLab.vue";

// 直接断言语言行为与对象身份，避免只检查“页面能显示一行说明”却没有真正验证实验结论。
describe("类与继承实验的行为契约", () => {
    it("私有状态属于各实例，公共原型方法共享，箭头函数字段独立", () => {
        const first = new Task("Vue");
        const second = new Task("CSS");
        first.complete();
        expect(first.status).toBe("已完成");
        expect(second.status).toBe("待学习");
        expect(first.describe).toBe(second.describe);
        expect(first.describeBound).not.toBe(second.describeBound);
        expect(Object.keys(first)).not.toContain("#status");
    });

    it("派生类重写保留父类行为，继承的工厂创建子类实例", () => {
        const task = TimedTask.create("继承");
        expect(task).toBeInstanceOf(TimedTask);
        expect(task).toBeInstanceOf(Task);
        expect(task.describe()).toContain("继承，计划 25 分钟");
        expect(TimedTask.category).toBe("学习任务");
        expect(task.category).toBeUndefined();
        expect(Object.getPrototypeOf(TimedTask.prototype)).toBe(Task.prototype);
        expect(Object.getPrototypeOf(TimedTask)).toBe(Task);
    });

    it("提取原型方法会丢失接收者，绑定和箭头字段保持正确行为", () => {
        const task = new TimedTask("回调", 10);
        const detached = task.describe;
        const boundField = task.describeBound;
        expect(() => detached()).toThrow(TypeError);
        expect(detached.bind(task)()).toBe("任务：回调，计划 10 分钟");
        expect(boundField()).toBe("任务：回调，计划 10 分钟");
    });

    it("业务错误保留 Error 继承语义，组合策略可替换而不修改任务", () => {
        const error = new ValidationError("必填", "title");
        expect(error).toBeInstanceOf(Error);
        expect(error).toMatchObject({ name: "ValidationError", message: "必填", field: "title" });
        const task = new Task("Vue");
        expect(formatTask(task, (item) => `完成 ${item.title}`)).toBe("完成 Vue");
        expect(formatTask(task, (item) => item.title.toUpperCase())).toBe("VUE");
        expect(task.title).toBe("Vue");
    });
});

describe("可执行 API 示例", () => {
    it("复制排序返回排序结果且保留源数组", () => {
        const example = modernExamples.find((item) => item.id === "toSorted");
        if (!example.supported()) return;
        const result = example.run("");
        expect(result.sorted).toEqual([1, 2, 3]);
        expect(result.reversed).toEqual([2, 1, 3]);
        expect(result.values).toEqual([3, 1, 2]);
        expect(result.sorted).not.toBe(result.values);
    });

    it("allSettled 示例完整保留部分失败，而不是整个示例抛错", async () => {
        const result = await modernExamples.find((item) => item.id === "settled").run();
        expect(result).toEqual([
            { status: "fulfilled", value: "任务列表" },
            { status: "rejected", reason: "统计失败" }
        ]);
    });

    it("Proxy 通过 Reflect receiver 保持 getter 内部读取也被拦截", () => {
        const operations = [];
        const result = es2015Examples
            .find((item) => item.id === "proxy")
            .run("初始标题", (label, value) => operations.push([label, value]));
        expect(result).toEqual({ before: "初始标题", after: "新的标题", rawTitle: "新的标题" });
        expect(operations).toContainEqual(["get 拦截", "label"]);
        expect(operations).toContainEqual(["get 拦截", "title"]);
    });
});

describe("异步实验的重置与资源归属", () => {
    it("动态导入等待期间重置后，旧结果不会重新写入日志", async () => {
        const wrapper = mount(JavaScriptBasics, { props: { topic: "modules" } });
        try {
            const run = wrapper.findAll("button").find((button) => button.text().includes("执行静态"));
            const reset = wrapper.findAll("button").find((button) => button.text() === "重置实验");
            void run.trigger("click");
            await reset.trigger("click");
            await flushPromises();
            expect(wrapper.find(".console-empty").exists()).toBe(true);
            expect(wrapper.text()).not.toContain("动态 import 同一模块的 sharedCount");
        } finally {
            wrapper.unmount();
        }
    });

    it("取消进行中的聚合实验会终止所有定时器且不显示过期错误", async () => {
        vi.useFakeTimers();
        const wrapper = mount(AsyncLab);
        try {
            await wrapper
                .findAll("button")
                .find((button) => button.text() === "Promise 聚合")
                .trigger("click");
            await wrapper
                .findAll("button")
                .find((button) => button.text().includes("运行 Promise."))
                .trigger("click");
            expect(vi.getTimerCount()).toBe(3);
            await wrapper
                .findAll("button")
                .find((button) => button.text() === "重置 / 取消")
                .trigger("click");
            await vi.runAllTimersAsync();
            expect(vi.getTimerCount()).toBe(0);
            expect(wrapper.find(".console-empty").exists()).toBe(true);
            expect(wrapper.text()).not.toContain("聚合 rejected");
        } finally {
            wrapper.unmount();
            vi.useRealTimers();
        }
    });
});
