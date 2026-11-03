// 通过动态 import 进入独立 chunk。修改文案后重新构建，比较 report 文件的 hash。
// count 是调用时的数值快照；返回普通对象，无 Vue 依赖，也不会修改调用方的计数状态。
export function createReport(count) {
    return {
        module: "report.js · 真实动态模块",
        count,
        message: count > 0 ? `你已完成 ${count} 次点击实验。` : "先试着点击计数器，再重新生成报表。"
    };
}
