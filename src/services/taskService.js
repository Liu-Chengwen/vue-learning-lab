/**
 * 本地业务边界：提供任务枚举、示例数据、校验与可取消的异步服务。
 * 这里的 Promise/计时器/AbortSignal 都真实执行，但没有向后端发送任务数据。
 * Pinia store 决定何时提交数据；本文件不保存响应式状态，也不操作页面或 localStorage。
 */

/** 业务校验错误保留字段名，便于将来把服务错误映射到指定 FormItem。 */
export class ValidationError extends Error {
    constructor(message, field = "title") {
        super(message);
        this.name = "ValidationError";
        this.field = field;
    }
}

// value 是持久化与组件通信的稳定值；label/color 只负责界面表达。
export const taskStatuses = [
    { value: "todo", label: "待学习", color: "info" },
    { value: "doing", label: "进行中", color: "warning" },
    { value: "done", label: "已完成", color: "success" }
];
export const taskPriorities = [
    { value: "high", label: "高优先级", color: "danger" },
    { value: "medium", label: "中优先级", color: "warning" },
    { value: "low", label: "低优先级", color: "info" }
];

// 这些是可重置的演示种子。每次恢复都应 cloneTask，避免用户操作反向修改种子数组。
export const initialTasks = [
    {
        id: "task-101",
        title: "弄懂 ref 与 reactive 的使用边界",
        description: "尝试对象替换、解构和模板自动解包，再用自己的话解释为什么。",
        status: "doing",
        priority: "high",
        tags: ["Vue 3", "响应式"],
        dueDate: "2026-10-26",
        createdAt: "2026-10-20T08:00:00.000Z"
    },
    {
        id: "task-102",
        title: "封装一个支持双向绑定的输入组件",
        description: "分别使用 modelValue/update:modelValue 与 defineModel 实现，对照两种写法。",
        status: "todo",
        priority: "high",
        tags: ["Vue 3", "组件通信"],
        dueDate: "2026-10-27",
        createdAt: "2026-10-20T09:00:00.000Z"
    },
    {
        id: "task-103",
        title: "用 Flex 修复长文本溢出",
        description: "解释 flex-basis、收缩与 min-width: 0 的关系。",
        status: "done",
        priority: "medium",
        tags: ["CSS", "Flex"],
        dueDate: "2026-10-24",
        createdAt: "2026-10-21T08:00:00.000Z"
    },
    {
        id: "task-104",
        title: "手写可取消的防抖函数",
        description: "保留 this 与参数，提供 cancel，并在组件卸载时取消尾调用。",
        status: "doing",
        priority: "high",
        tags: ["JavaScript", "闭包"],
        dueDate: "2026-10-28",
        createdAt: "2026-10-21T09:00:00.000Z"
    },
    {
        id: "task-105",
        title: "为 Element Plus 配置主题",
        description: "切换主题色和明暗模式，同时观察 Dialog 与 Select 的弹出层。",
        status: "todo",
        priority: "medium",
        tags: ["Element Plus", "CSS"],
        dueDate: "2026-10-29",
        createdAt: "2026-10-22T08:00:00.000Z"
    },
    {
        id: "task-106",
        title: "比较 Promise 的四种聚合策略",
        description: "用一成功一失败两个请求对照 all、allSettled、race 与 any。",
        status: "todo",
        priority: "medium",
        tags: ["JavaScript", "异步"],
        dueDate: "2026-10-30",
        createdAt: "2026-10-22T09:00:00.000Z"
    },
    {
        id: "task-107",
        title: "理解组件挂载与副作用清理",
        description: "反复挂载计时器组件，检查卸载后是否还有多余监听和定时器。",
        status: "done",
        priority: "low",
        tags: ["Vue 3", "生命周期"],
        dueDate: "2026-10-23",
        createdAt: "2026-10-23T08:00:00.000Z"
    },
    {
        id: "task-108",
        title: "梳理 class 与原型继承",
        description: "画出实例和构造函数的两条原型链，并验证静态成员的归属。",
        status: "todo",
        priority: "medium",
        tags: ["JavaScript", "类与继承"],
        dueDate: "2026-10-31",
        createdAt: "2026-10-23T09:00:00.000Z"
    }
];

// 当前任务只含一层 tags 数组，因此按数据结构显式复制；这不是通用深拷贝。
export const cloneTask = (task) => ({ ...task, tags: [...(task.tags || [])] });

/**
 * 模拟一次服务等待，成功值可以是普通值，也可以是等待结束后才执行的函数。
 * fail 产生普通服务错误；signal 取消产生 AbortError。成功、失败与取消都释放自己的监听/计时器。
 * 此函数只调度一次工作，不重试、不缓存，也不会替调用方管理 loading。
 */
export function waitForResponse(value, { delay = 550, fail = false, signal } = {}) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException("请求已取消", "AbortError"));
            return;
        }
        const abort = () => {
            // 取消是停止底层工作，而不只是忽略结果；useRequest 另外提供过期结果保护。
            clearTimeout(timer);
            signal?.removeEventListener("abort", abort);
            reject(new DOMException("请求已取消", "AbortError"));
        };
        const timer = setTimeout(() => {
            signal?.removeEventListener("abort", abort);
            if (fail) reject(new Error("模拟服务暂时不可用，请重试。"));
            else {
                try {
                    // 延迟函数自身抛错时也要拒绝 Promise，避免变成无法捕获的定时器异常。
                    resolve(typeof value === "function" ? value() : value);
                } catch (error) {
                    reject(error);
                }
            }
        }, delay);
        signal?.addEventListener("abort", abort, { once: true });
    });
}

const tags = [
    "Vue 3",
    "响应式",
    "组件通信",
    "生命周期",
    "Element Plus",
    "CSS",
    "Flex",
    "JavaScript",
    "闭包",
    "异步",
    "类与继承",
    "Vite",
    "Webpack",
    "面试"
];
/** 把关键词映射成 Select 约定的 {label,value} 选项；空关键词返回全部标签。 */
export async function searchTags(query = "", options = {}) {
    const value = String(query).trim().toLowerCase();
    return waitForResponse(
        tags.filter((tag) => tag.toLowerCase().includes(value)).map((tag) => ({ label: tag, value: tag })),
        options
    );
}

/**
 * 校验并返回一个规范化后的任务对象，不直接修改传入草稿。
 * existing 用于检查同名冲突；编辑时通过 id 排除自身，创建时则与所有任务比较。
 * 表单校验负责即时反馈，这个服务入口仍需独立校验，不能信任调用方一定走过表单。
 */
export function validateTask(task, existing = []) {
    const title = String(task.title || "").trim();
    if (title.length < 3 || title.length > 80) throw new ValidationError("标题需要 3～80 个字符。");
    if (existing.some((item) => item.id !== task.id && item.title.trim() === title))
        throw new ValidationError("已有同名任务，请换一个标题。");
    if (!taskStatuses.some((status) => status.value === task.status))
        throw new ValidationError("请选择有效状态。", "status");
    if (!taskPriorities.some((priority) => priority.value === task.priority))
        throw new ValidationError("请选择有效优先级。", "priority");
    // 日期组件清空时可能发出 null；存储层统一为字符串，刷新时不会误判数据损坏。
    return {
        ...task,
        title,
        description: String(task.description ?? ""),
        tags: Array.isArray(task.tags) ? task.tags.filter((tag) => typeof tag === "string") : [],
        dueDate: typeof task.dueDate === "string" ? task.dueDate : ""
    };
}

/**
 * 读取持久化数据时的结构守卫：确认后续列表渲染所需字段存在且枚举合法。
 * 它不是完整的业务校验或日期验证；任务 ID 的集合唯一性由 store 在数组层另外检查。
 */
export function isStoredTask(task) {
    return (
        task &&
        typeof task.id === "string" &&
        typeof task.title === "string" &&
        typeof task.description === "string" &&
        typeof task.dueDate === "string" &&
        typeof task.createdAt === "string" &&
        Array.isArray(task.tags) &&
        task.tags.every((tag) => typeof tag === "string") &&
        taskStatuses.some((entry) => entry.value === task.status) &&
        taskPriorities.some((entry) => entry.value === task.priority)
    );
}
