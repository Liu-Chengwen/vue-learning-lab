// 真实动态导入的独立模块。第一次点击可在 Network 面板观察请求。
// 具名导出由 ToolingView 的 import() 完成后调用；输入为具有 status 字段的任务数组。
// 返回新统计对象，不修改传入数组；模块缓存与每次函数执行是两个不同层次。
export function summarizeTasks(tasks) {
    return {
        total: tasks.length,
        done: tasks.filter((task) => task.status === "done").length,
        generatedBy: "lazyFeature.js · import() 实际执行"
    };
}
