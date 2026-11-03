<script setup>
/**
 * 异步 setup 示例：顶层 await 由 SFC 编译器转换，外层 Suspense 等待这个依赖。
 * 报告数据是带延迟的教学数据；定义异步组件的 import 与本文件内部等待属于两个不同阶段。
 * 先同步注册作用域清理，确保等待期间离开页面时可以取消尚未执行的定时器。
 */
import { onScopeDispose } from "vue";
// 顶层 await 使当前 SFC 成为 async setup 依赖，由外层 Suspense 协调。
let timer;
// 清理先同步注册，取消的是模拟定时器，不是 Promise 原生支持了取消；真实请求需自己的取消机制。
onScopeDispose(() => clearTimeout(timer));
// SFC 顶层 await 会参与 async setup；外层需要适当的异步边界，不能把它当普通同步 setup 使用。
const report = await new Promise((resolve) => {
    timer = setTimeout(() => resolve({ chapters: 12, tip: "异步 setup 已完成，fallback 被实际内容替换。" }), 900);
});
</script>
<template>
    <div class="demo-result"
        ><b>异步报告已就绪 · {{ report.chapters }} 个 Vue 章节</b><br />{{ report.tip }}</div
    >
</template>
