import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";
import { cloneTask, initialTasks, isStoredTask, validateTask, waitForResponse } from "@/services/taskService";

const STORAGE_KEY = "vue-interview-lab:tasks:v1";

/**
 * 任务领域的唯一响应式数据源，供工作台、详情、总览和组件库复用案例共享。
 * actions 更新任务，computed 从同一数据源派生统计；筛选、分页、弹窗草稿属于各自页面/组件。
 * localStorage 只提供当前浏览器的演示持久化，失败时保持页面仍可操作。
 */
export const useTasksStore = defineStore("tasks", () => {
    // Store 持有任务真源；页面持有筛选/分页，表单组件只编辑独立草稿。
    const storageError = ref("");
    // 初始化时恢复数据；缺少记录是正常初次访问，格式错误才提示并回退到种子。
    function readTasks() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return initialTasks.map(cloneTask);
            const parsed = JSON.parse(stored);
            // 持久化数据属于外部输入，恢复前验证结构和 ID 唯一性。
            if (
                !Array.isArray(parsed) ||
                !parsed.every(isStoredTask) ||
                new Set(parsed.map((task) => task.id)).size !== parsed.length
            )
                throw new Error("存储格式无效");
            return parsed.map(cloneTask);
        } catch {
            storageError.value = "本地数据无法读取，已恢复示例数据。";
            return initialTasks.map(cloneTask);
        }
    }
    const tasks = ref(readTasks());
    // 列表读取状态与存储状态分离，避免把本地保存失败误显示成网络失败。
    const loading = ref(false);
    const loadError = ref("");
    const completedCount = computed(() => tasks.value.filter((task) => task.status === "done").length);
    const stats = computed(() => ({
        total: tasks.value.length,
        todo: tasks.value.filter((task) => task.status === "todo").length,
        doing: tasks.value.filter((task) => task.status === "doing").length,
        done: completedCount.value,
        completion: tasks.value.length ? Math.round((completedCount.value / tasks.value.length) * 100) : 0
    }));

    // deep 覆盖 status 等字段的原地变更；sync 让 action 返回时本地写入已尝试完成。
    // 这里的数据量很小。大型业务应另外评估同步序列化和频繁写入的成本。
    // 写入失败只记录 storageError，不能回滚用户在本次会话中的有效操作。
    watch(
        tasks,
        (value) => {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
                storageError.value = "";
            } catch {
                storageError.value = "本地保存失败，当前操作仍保留在本次页面会话中。";
            }
        },
        { deep: true, flush: "sync" }
    );

    // 两次加载并发时，只允许最新调用修改 loading/error。
    let loadVersion = 0;
    /** options 支持 delay/fail/signal；成功返回当前任务，错误继续交给页面决定如何提示/重试。 */
    async function loadTasks(options = {}) {
        const version = ++loadVersion;
        loading.value = true;
        loadError.value = "";
        try {
            await waitForResponse(null, options);
            // 数据来自本地 store，模拟服务只承载异步状态，不用旧快照覆盖新任务。
            return tasks.value;
        } catch (error) {
            if (version === loadVersion && error.name !== "AbortError") loadError.value = error.message;
            throw error;
        } finally {
            if (version === loadVersion) loading.value = false;
        }
    }

    /**
     * 保存已经完成交互编辑的草稿：校验 → 可取消等待 → 再校验 → 一次写入。
     * 有 id 表示更新既有任务；无 id 表示创建。返回副本，避免调用方直接修改 store 里的对象。
     */
    async function saveTask(input, options = {}) {
        // 复制调用方数据，等待成功后才写 store。取消请求不会产生半条任务。
        const draft = cloneTask(validateTask(input, tasks.value));
        await waitForResponse(null, options);
        // 等待期间其他任务也可能更新，因此提交前再验证一次唯一性。
        validateTask(draft, tasks.value);
        if (draft.id) {
            // 等待期间任务可能在别处被删除，此时拒绝更新，不能偷偷重新创建同一条记录。
            const index = tasks.value.findIndex((task) => task.id === draft.id);
            if (index < 0) throw new Error("任务已被删除，请刷新列表。");
            tasks.value[index] = draft;
        } else {
            draft.id = globalThis.crypto?.randomUUID?.() || `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
            draft.createdAt = new Date().toISOString();
            tasks.value.unshift(draft);
        }
        return cloneTask(draft);
    }

    // 这些同步 action 只更新数据；确认框、成功提示与路由跳转由页面负责。
    function deleteTask(id) {
        tasks.value = tasks.value.filter((task) => task.id !== id);
    }
    function updateStatus(id, status) {
        const task = tasks.value.find((entry) => entry.id === id);
        if (task && ["todo", "doing", "done"].includes(status)) task.status = status;
    }
    function bulkUpdate(ids, status) {
        // 复用单条更新的枚举检查；不存在的 id 不影响其他有效任务。
        ids.forEach((id) => updateStatus(id, status));
    }
    function resetTasks() {
        // 仅恢复任务，不改学习完成标记与主题偏好，它们由其他 store 管理。
        tasks.value = initialTasks.map(cloneTask);
    }

    return {
        tasks,
        stats,
        completedCount,
        loading,
        loadError,
        storageError,
        loadTasks,
        saveTask,
        deleteTask,
        updateStatus,
        bulkUpdate,
        resetTasks
    };
});
