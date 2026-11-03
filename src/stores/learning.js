import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";

function restoreIds(value) {
    // Set 按插入顺序去重；保留所有字符串 ID，不依赖当前目录是否仍收录它们。
    return Array.isArray(value) ? [...new Set(value.filter((id) => typeof id === "string"))] : [];
}

/**
 * 应用级学习记录：完成专题、收藏题目、自评掌握和最近访问都按稳定 ID/路径保存。
 * 页面通过 action 修改，computed 负责派生展示；它们与任务工作台的数据相互独立。
 */
export const useLearningStore = defineStore("learning", () => {
    // localStorage 属于外部输入，读取失败或格式不符合时使用安全初始值。
    let saved = {};
    try {
        saved = JSON.parse(localStorage.getItem("vue-lab:learning:v1") || "{}") || {};
    } catch {
        /* 使用初始状态 */
    }
    // 恢复时先检查容器和成员类型；不从 localStorage 恢复组件实例或可执行函数。
    // ID 比显示标题稳定：调整文案不需要连带修改收藏和完成记录。
    const completed = ref(restoreIds(saved.completed));
    const favorites = ref(restoreIds(saved.favorites));
    const mastered = ref(restoreIds(saved.mastered));
    const recent = ref(
        Array.isArray(saved.recent)
            ? saved.recent.filter((v) => v && typeof v.path === "string" && typeof v.title === "string").slice(0, 5)
            : []
    );
    const storageError = ref("");
    // 数量由数组派生，不额外维护可变计数，避免“数组已更新而计数忘了更新”。
    const completedCount = computed(() => completed.value.length);

    // list 接收 ref 而非解包后的数组，让三个 action 复用同一套“存在则删除，否则添加”规则。
    // splice/push 都是原地修改，因此下面持久化侦听器要能观察数组内部变化。
    function toggleIn(list, id) {
        const index = list.value.indexOf(id);
        if (index >= 0) list.value.splice(index, 1);
        else list.value.push(id);
    }
    const toggleCompleted = (id) => toggleIn(completed, id);
    const toggleFavorite = (id) => toggleIn(favorites, id);
    const toggleMastered = (id) => toggleIn(mastered, id);
    // 相同路径只保留一条，并把最近访问移到头部；列表最多五项，避免存储无限增长。
    function visit(title, path) {
        recent.value = [{ title, path }, ...recent.value.filter((v) => v.path !== path)].slice(0, 5);
    }
    // 完成记录与自评是用户标记，并不是自动判断已经掌握知识。
    // 重置内存状态即可，后面的 watch 会把新状态持久化；不在每个 action 内重复存储逻辑。
    function resetProgress() {
        completed.value = [];
        favorites.value = [];
        mastered.value = [];
        recent.value = [];
    }
    // localStorage 不具备 Vue 响应性：由 watch 将响应式状态同步到浏览器存储。
    // 这是单向保存，不监听其他标签页的 storage 事件，也不是自动多端同步。
    watch(
        [completed, favorites, mastered, recent],
        () => {
            try {
                localStorage.setItem(
                    "vue-lab:learning:v1",
                    JSON.stringify({
                        completed: completed.value,
                        favorites: favorites.value,
                        mastered: mastered.value,
                        recent: recent.value
                    })
                );
                storageError.value = "";
            } catch {
                storageError.value = "学习记录暂时无法保存，请检查浏览器存储空间。";
            }
        },
        // ref 的值是数组；deep 同时覆盖原地增删与整体替换，不能只依赖引用是否变化。
        { deep: true }
    );
    return {
        completed,
        completedCount,
        favorites,
        mastered,
        recent,
        storageError,
        toggleCompleted,
        toggleFavorite,
        toggleMastered,
        visit,
        resetProgress
    };
});
