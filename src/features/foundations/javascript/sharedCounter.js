/**
 * 模块状态实验：这份模块在当前模块图中被解析和缓存，静态与动态导入通常复用同一实例。
 * 导出的 let 是 live binding：本模块修改后，导入方下次读取能拿到新值；导入方不能重新赋值该绑定。
 */
export let sharedCount = 0;
// action 修改模块真源，而不是让每个使用者分别复制一个数字。
export function incrementShared() {
    sharedCount++;
}
export function resetShared() {
    sharedCount = 0;
}
export function makeLocalCounter() {
    // 与模块顶层对照：每调用一次工厂就创建新的词法环境，返回的闭包各自持有自己的 count。
    let count = 0;
    return () => ++count;
}
// 记录模块首次执行的时间，用于比较重复 import 是否再次执行了这段模块初始化代码。
export const loadedAt = new Date().toISOString();
