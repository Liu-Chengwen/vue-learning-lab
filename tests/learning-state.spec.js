import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, disposePinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import { useLearningStore } from "../src/stores/learning";

const storageKey = "vue-lab:learning:v1";
const markers = [
    ["completed", "toggleCompleted"],
    ["favorites", "toggleFavorite"],
    ["mastered", "toggleMastered"]
];
let pinia;

beforeEach(() => {
    // 存储和 Pinia 均按用例隔离，真实 store 的读取、action 和持久化逻辑保持运行。
    const data = new Map();
    vi.stubGlobal("localStorage", {
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, value) => data.set(key, String(value))
    });
    pinia = createPinia();
    setActivePinia(pinia);
});

afterEach(() => {
    disposePinia(pinia);
    setActivePinia(undefined);
    vi.unstubAllGlobals();
});

describe("学习记录恢复与持久化", () => {
    it.each(markers)("%s 恢复时去重并保留合法字符串的首次顺序", (field) => {
        localStorage.setItem(
            storageKey,
            JSON.stringify({ [field]: ["vue-setup", "custom-id", "vue-setup", null, 42, "custom-id", ""] })
        );
        const store = useLearningStore();

        expect(store[field]).toEqual(["vue-setup", "custom-id", ""]);
    });

    it("完成数量按恢复的唯一 ID 计数", () => {
        localStorage.setItem(storageKey, JSON.stringify({ completed: ["vue-setup", "vue-setup"] }));
        const store = useLearningStore();

        expect(store.completedCount).toBe(1);
    });

    it.each(markers)("%s 恢复后切换一次可彻底取消，再切换恢复一条", async (field, action) => {
        localStorage.setItem(storageKey, JSON.stringify({ [field]: ["vue-setup", "custom-id", "vue-setup"] }));
        const store = useLearningStore();

        store[action]("vue-setup");
        expect.soft(store[field]).toEqual(["custom-id"]);
        // 等待真实 watch 落盘，同时检查取消残留是否继续写入存储。
        await nextTick();
        expect.soft(JSON.parse(localStorage.getItem(storageKey))[field]).toEqual(["custom-id"]);

        store[action]("vue-setup");
        expect.soft(store[field]).toEqual(["custom-id", "vue-setup"]);
        await nextTick();
        expect.soft(JSON.parse(localStorage.getItem(storageKey))[field]).toEqual(["custom-id", "vue-setup"]);
    });

    it.each(markers)("对照：%s 无重复记录时恢复、取消、重新标记和持久化正常", async (field, action) => {
        localStorage.setItem(storageKey, JSON.stringify({ [field]: ["vue-setup", "custom-id"] }));
        const store = useLearningStore();
        expect(store[field]).toEqual(["vue-setup", "custom-id"]);

        store[action]("vue-setup");
        expect(store[field]).toEqual(["custom-id"]);
        await nextTick();
        expect(JSON.parse(localStorage.getItem(storageKey))[field]).toEqual(["custom-id"]);

        store[action]("vue-setup");
        expect(store[field]).toEqual(["custom-id", "vue-setup"]);
        await nextTick();
        expect(JSON.parse(localStorage.getItem(storageKey))[field]).toEqual(["custom-id", "vue-setup"]);
        expect(store.storageError).toBe("");
    });

    it("非法 JSON 使用空记录，后续操作仍可保存", async () => {
        localStorage.setItem(storageKey, "{invalid");
        const store = useLearningStore();
        for (const [field] of markers) expect(store[field]).toEqual([]);
        store.toggleCompleted("vue-setup");
        await nextTick();
        expect(store.completedCount).toBe(1);
        expect(JSON.parse(localStorage.getItem(storageKey)).completed).toEqual(["vue-setup"]);
    });

    it.each([null, {}, 42, "vue-setup"])("非数组标记 %j 恢复为空数组且可操作", async (value) => {
        localStorage.setItem(storageKey, JSON.stringify({ completed: value, favorites: value, mastered: value }));
        const store = useLearningStore();
        for (const [field, action] of markers) {
            expect(store[field]).toEqual([]);
            store[action]("custom-id");
            expect(store[field]).toEqual(["custom-id"]);
        }
        await nextTick();
        const saved = JSON.parse(localStorage.getItem(storageKey));
        for (const [field] of markers) expect(saved[field]).toEqual(["custom-id"]);
    });

    it("读取存储失败时仍可使用内存状态", () => {
        vi.spyOn(localStorage, "getItem").mockImplementation(() => {
            throw new Error("storage unavailable");
        });
        const store = useLearningStore();
        for (const [field, action] of markers) {
            expect(store[field]).toEqual([]);
            store[action]("custom-id");
            expect(store[field]).toEqual(["custom-id"]);
        }
    });

    it.each(markers)("%s 写入失败保留会话操作，存储恢复后可继续保存", async (field, action) => {
        localStorage.setItem(storageKey, JSON.stringify({ [field]: ["vue-setup", "vue-setup"] }));
        const store = useLearningStore();
        const write = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
            throw new Error("quota exceeded");
        });
        store[action]("custom-id");
        await nextTick();
        expect(store[field]).toEqual(["vue-setup", "custom-id"]);
        expect(store.storageError).toContain("无法保存");

        write.mockRestore();
        store[action]("vue-setup");
        await nextTick();
        expect(store[field]).toEqual(["custom-id"]);
        expect(JSON.parse(localStorage.getItem(storageKey))[field]).toEqual(["custom-id"]);
        expect(store.storageError).toBe("");
    });

    it("去重不改变最近访问恢复规则或持久化结构", async () => {
        const recent = Array.from({ length: 6 }, (_, index) => ({ title: `专题${index}`, path: `/topic/${index}` }));
        localStorage.setItem(
            storageKey,
            JSON.stringify({ completed: ["vue-setup", "vue-setup"], recent: [null, { path: 42 }, ...recent] })
        );
        const store = useLearningStore();
        expect(store.recent).toEqual(recent.slice(0, 5));
        store.toggleFavorite("custom-id");
        await nextTick();
        expect(JSON.parse(localStorage.getItem(storageKey))).toEqual({
            completed: ["vue-setup"],
            favorites: ["custom-id"],
            mastered: [],
            recent: recent.slice(0, 5)
        });
    });
});
