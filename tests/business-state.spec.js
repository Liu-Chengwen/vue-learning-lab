import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { effectScope } from "vue";
import { useRequest } from "../src/composables/useRequest";
import { useDebounce } from "../src/composables/useDebounce";
import { useTasksStore } from "../src/stores/tasks";
import { cloneTask, initialTasks, waitForResponse } from "../src/services/taskService";

// 将 resolve/reject 交给用例控制，能精确制造“旧请求比新请求更晚结束”，无需依赖随机网络延迟。
function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
}

beforeEach(() => {
    // 每个测试使用全新 Pinia 实例，避免 setup store 单例状态在用例间泄漏。
    localStorage.clear();
    setActivePinia(createPinia());
});
afterEach(() => {
    vi.useRealTimers();
});

describe("异步状态与资源归属", () => {
    it("不遵守 AbortSignal 的旧请求也不能覆盖新结果或结束新请求的 loading", async () => {
        const older = deferred(),
            latest = deferred();
        const request = useRequest(vi.fn().mockReturnValueOnce(older.promise).mockReturnValueOnce(latest.promise));
        const oldRun = request.execute("旧查询");
        const newRun = request.execute("新查询");
        older.resolve("过期结果");
        await oldRun;
        expect(request.data.value).toBe(null);
        expect(request.loading.value).toBe(true);
        latest.resolve("最新结果");
        await newRun;
        expect(request.data.value).toBe("最新结果");
        expect(request.loading.value).toBe(false);
    });
    it("旧请求失败不污染最新查询的 error", async () => {
        const older = deferred(),
            latest = deferred();
        const request = useRequest(vi.fn().mockReturnValueOnce(older.promise).mockReturnValueOnce(latest.promise));
        const oldRun = request.execute();
        const newRun = request.execute();
        older.reject(new Error("旧错误"));
        await oldRun;
        expect(request.error.value).toBe(null);
        latest.resolve("成功");
        await newRun;
        expect(request.error.value).toBe(null);
    });
    it("作用域结束会取消防抖尾调用，同时保留正常调用的 this 与最后参数", () => {
        vi.useFakeTimers();
        const callback = vi.fn();
        const scope = effectScope();
        const debounce = scope.run(() => useDebounce(callback, 200));
        const receiver = { id: 3, run: debounce.run };
        receiver.run("first");
        receiver.run("last");
        vi.advanceTimersByTime(200);
        expect(callback).toHaveBeenCalledOnce();
        expect(callback).toHaveBeenCalledWith("last");
        expect(callback.mock.contexts[0]).toBe(receiver);
        receiver.run("invalid");
        scope.stop();
        vi.advanceTimersByTime(500);
        expect(callback).toHaveBeenCalledOnce();
    });
    it("模拟服务响应前取消，清除定时器并返回 AbortError", async () => {
        vi.useFakeTimers();
        const controller = new AbortController();
        const promise = waitForResponse("结果", { signal: controller.signal, delay: 1000 });
        const assertion = expect(promise).rejects.toMatchObject({ name: "AbortError" });
        controller.abort();
        await assertion;
        expect(vi.getTimerCount()).toBe(0);
    });
});

describe("任务草稿与持久化", () => {
    it("编辑草稿的标签不改变原始任务，直到显式保存成功", async () => {
        const store = useTasksStore();
        const task = store.tasks[0];
        const originalTitle = task.title;
        const draft = cloneTask(task);
        draft.title = "新的完整学习目标";
        draft.tags.push("独立草稿");
        expect(task.title).toBe(originalTitle);
        expect(task.tags).not.toContain("独立草稿");
        await store.saveTask(draft, { delay: 0 });
        expect(store.tasks[0].title).toBe(draft.title);
        expect(store.tasks[0].tags).toContain("独立草稿");
        const persisted = JSON.parse(localStorage.getItem("vue-interview-lab:tasks:v1"));
        expect(persisted[0].title).toBe(draft.title);
    });
    it("保存中取消不插入半条任务，失败重试后只新增一次", async () => {
        const store = useTasksStore();
        const total = store.tasks.length;
        const controller = new AbortController();
        const draft = {
            title: "验证取消与重试流程",
            description: "",
            tags: [],
            dueDate: "",
            status: "todo",
            priority: "medium"
        };
        const aborted = store.saveTask(draft, { delay: 1000, signal: controller.signal });
        const assertion = expect(aborted).rejects.toMatchObject({ name: "AbortError" });
        controller.abort();
        await assertion;
        expect(store.tasks).toHaveLength(total);
        await expect(store.saveTask(draft, { fail: true, delay: 0 })).rejects.toThrow();
        expect(store.tasks).toHaveLength(total);
        await store.saveTask(draft, { delay: 0 });
        expect(store.tasks).toHaveLength(total + 1);
        await expect(store.saveTask(draft, { delay: 0 })).rejects.toThrow("同名");
    });
    it("存储结构损坏或重复ID会恢复可用示例，并给出提示", () => {
        localStorage.setItem("vue-interview-lab:tasks:v1", JSON.stringify([initialTasks[0], initialTasks[0]]));
        const store = useTasksStore();
        expect(store.tasks).toHaveLength(initialTasks.length);
        expect(store.storageError).toContain("恢复");
        expect(new Set(store.tasks.map((v) => v.id)).size).toBe(store.tasks.length);
    });
    it("清空日期保存为规范空字符串，刷新后不会误恢复整批示例", async () => {
        const store = useTasksStore();
        await store.saveTask({ ...cloneTask(store.tasks[0]), dueDate: null }, { delay: 0 });
        expect(store.tasks[0].dueDate).toBe("");
        setActivePinia(createPinia());
        const restored = useTasksStore();
        expect(restored.tasks[0].dueDate).toBe("");
        expect(restored.storageError).toBe("");
    });
});
