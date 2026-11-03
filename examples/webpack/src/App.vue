<script setup>
// 与主项目相同的 Composition API；单独运行是为了把“Vue 的响应式行为”和“构建器差异”分开观察。
import { computed, ref } from "vue";

// 以下两个公开值由 DefinePlugin 在编译时替换，并非浏览器读取 Node 环境。
const projectName = __LAB_NAME__;
const mode = process.env.LAB_MODE;
const count = ref(0);
// computed 根据 count 依赖失效后重算；不手动同步 doubled，避免出现两份可变事实。
const doubled = computed(() => count.value * 2);
const loading = ref(false);
const report = ref(null);
const error = ref("");

async function loadReport() {
    // 防重复加载，且每次尝试清空旧错误；finally 同时覆盖成功与异常，保证按钮恢复可点击。
    if (loading.value) return;
    loading.value = true;
    error.value = "";
    try {
        // Webpack 根据 import() 生成按需 chunk，魔法注释指定可读名称。
        const { createReport } = await import(/* webpackChunkName: "report" */ "./report.js");
        // 加载完成后取当前 count 生成普通对象：后续计数变化不会自动重算这份报表。
        // 再次点击会重新调用函数，但模块本身通常复用缓存，而非每次重新执行顶层代码。
        report.value = createReport(count.value);
    } catch (reason) {
        error.value = reason.message || "动态模块加载失败，请检查开发服务与网络。";
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <main class="webpack-demo">
        <div class="brand"
            ><span>W</span
            ><div><strong>构建工具对照实验</strong><small>WEBPACK / VUE SINGLE FILE COMPONENT</small></div></div
        >
        <p class="eyebrow">真实启动 · 独立配置 · 可观察产物</p>
        <h1>同样的 Vue，<br />另一条构建路径。</h1>
        <p class="lead"
            >这里由 Webpack 处理 Vue 单文件组件、CSS 和动态导入。你可以修改源码、观察 HMR，再和 Vite 主项目比较。</p
        >
        <div class="badges"
            ><span>{{ projectName }}</span
            ><span>mode: {{ mode }}</span
            ><span>vue-loader + CSS loaders</span></div
        >

        <section class="panel">
            <div class="panel-heading"><h2>响应式计数器</h2><code>src/App.vue</code></div>
            <div class="counter"
                ><strong>{{ count }}</strong
                ><span>computed × 2 = {{ doubled }}</span></div
            >
            <div class="actions"
                ><button @click="count++">计数 +1</button><button class="secondary" @click="count = 0">重置</button
                ><button class="secondary" :disabled="loading" @click="loadReport">{{
                    loading ? "加载中…" : "动态加载报表"
                }}</button></div
            >
            <pre v-if="report"><code>{{ JSON.stringify(report, null, 2) }}</code></pre>
            <p v-if="error" class="error" role="alert">{{ error }}</p>
        </section>

        <section class="panel reading"
            ><h2>接下来观察什么？</h2
            ><ol
                ><li>打开 Network，点击动态加载，找到 report 对应的模块请求。</li
                ><li>修改 App.vue 的模板或样式并保存，观察热更新；脚本改变可能重新创建组件状态。</li
                ><li
                    >运行 pnpm webpack:build，查看 examples/webpack/dist 中的 runtime、Vue 共享 chunk、report 与 source
                    map。</li
                ><li
                    >修改 report.js 后再次构建，比较 contenthash。回到主项目 /tooling 记录 Vite 与 Webpack 的差异。</li
                ></ol
            ></section
        >
        <footer>源码：examples/webpack · 配置：webpack.config.cjs · 开发端口：5174</footer>
    </main>
</template>

<style scoped>
/* VueLoaderPlugin 将 SFC 的 style 块交给同一组 CSS loader，并处理 scoped 标记。 */
.counter strong {
    font-variant-numeric: tabular-nums;
}
</style>
