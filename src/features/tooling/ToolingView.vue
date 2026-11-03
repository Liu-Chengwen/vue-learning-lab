<script setup>
// 一个专题入口包含两类内容：可操作的流程/体积教学模型，以及真实 import、HMR、fetch 实验。
// 本文件不在浏览器里启动构建器；真实打包由终端命令和独立配置完成。
import { computed, onBeforeUnmount, ref } from "vue";
import { useRoute } from "vue-router";
import { ArrowDown, ArrowRight, Check, Download, FileCode2, Package, Play, RefreshCw, Zap } from "lucide-vue-next";
import LessonFrame from "@/components/learning/LessonFrame.vue";
import { toolingLessons } from "@/data/toolingLessons";
import { probeMessage, hmrUpdateCount } from "./hmrState";
import project from "../../../package.json";

const route = useRoute();
// 路由参数属于外部输入，只接受元数据里存在的 topic；省略或拼错时回到 overview。
const topic = computed(() =>
    toolingLessons.some((lesson) => lesson.topic === route.params.topic) ? route.params.topic : "overview"
);
const lesson = computed(() => toolingLessons.find((entry) => entry.topic === topic.value));
// 这些 ref 属于当前专题组件实例；HMR 文案/次数则从模块级 hmrState 导入共享。
const bundler = ref("vite");
const currentStep = ref(0);
const lazyResult = ref(null);
const lazyLoading = ref(false);
const importCount = ref(0);
const importError = ref("");
const proxyPath = ref("/api/tasks?status=doing");
const dynamicSplit = ref(true);
const shareVendor = ref(true);
const removeUnused = ref(true);
const sideEffect = ref(false);
const copied = ref("");
const selectedModule = ref("App.vue");
// import.meta 只在脚本环境读取；模板使用普通变量，便于模板编译器分析。
const hasHmr = Boolean(import.meta.hot);
const proxyLoading = ref(false);
const proxyResponse = ref(null);
const proxyError = ref("");
// AbortController 是请求控制句柄，不参与模板渲染，不需要包进 ref。
let proxyController;

// 只展示明确的公开环境字段，不枚举 Node 环境或任意本地变量。
const environment = {
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
    BASE_URL: import.meta.env.BASE_URL,
    SSR: import.meta.env.SSR,
    VITE_LAB_LABEL: import.meta.env.VITE_LAB_LABEL || "未设置（可新增后重启服务）"
};
// 流程步骤由按钮手动推进，只用于解释先后关系，不代表真实编译耗时或后台作业进度。
const pipelines = {
    vite: [
        { title: "启动开发服务", detail: "读取 vite.config.js，初始化插件与解析规则。" },
        { title: "准备依赖与模块图", detail: "使用当前版本工具链处理依赖，缓存稳定工作。" },
        { title: "按请求转换源码", detail: "默认 ESM 开发模式中，浏览器请求模块，插件处理 Vue SFC 等内容。" },
        { title: "浏览器执行与 HMR", detail: "模块更新经接受边界传播，必要时完整刷新。" }
    ],
    webpack: [
        { title: "从 entry 建立模块图", detail: "解析入口和依赖，执行配置的 loader 转换。" },
        { title: "组织 chunk 与优化", detail: "根据依赖、动态导入和 optimization 规划产物。" },
        { title: "生成并提供产物", detail: "plugin 参与编译；开发服务提供内存中的编译产物。" },
        { title: "增量编译与 HMR", detail: "变更触发相关模块重建，通过 HMR 更新运行时。" }
    ]
};
const steps = computed(() => pipelines[bundler.value]);
// 固定依赖图展示“静态边/动态边”的概念，没有扫描当前仓库或读取 Vite 内部模块图。
const graph = {
    "main.js": ["App.vue", "theme.css"],
    "App.vue": ["Counter.vue", "lazyFeature.js（动态）"],
    "Counter.vue": ["vue（外部依赖）"],
    "theme.css": [],
    "lazyFeature.js（动态）": []
};
// 这里只拼接示意 URL，不发送请求；与下面 testProxy 的真实 fetch 分开观察。
const proxyResult = computed(() =>
    proxyPath.value.startsWith("/api/") || proxyPath.value === "/api"
        ? `http://127.0.0.1:3001${proxyPath.value.replace(/^\/api/, "") || "/"}`
        : "未命中 /api 代理规则：按原路径请求开发服务"
);

// 以下大小仅为教学模型，不能作为当前项目的真实构建结果。
const chunkModel = computed(() => {
    // 用简化数字演示策略组合：有保留副作用时不能把“未使用导出”直接等同于整个模块可删除。
    const unused = removeUnused.value && !sideEffect.value ? 0 : 12;
    const main = 18 + (dynamicSplit.value ? 0 : 24) + (shareVendor.value ? 0 : 40) + unused;
    return [
        { name: "main.[hash].js", size: main, initial: true, note: "入口模块" },
        ...(shareVendor.value ? [{ name: "vendor.[hash].js", size: 40, initial: true, note: "共享依赖" }] : []),
        ...(dynamicSplit.value ? [{ name: "report.[hash].js", size: 24, initial: false, note: "访问时加载" }] : [])
    ];
});
// 求和所有 initial chunk；提取 vendor 只改变文件组织，并不会凭空减少本模型的初始总字节数。
const initialSize = computed(() =>
    chunkModel.value.filter((chunk) => chunk.initial).reduce((sum, chunk) => sum + chunk.size, 0)
);

async function loadFeature() {
    // 同一个实验同一时间只允许一次加载；后续重复调用仍执行导出函数，ES module 通常复用缓存。
    if (lazyLoading.value) return;
    lazyLoading.value = true;
    importError.value = "";
    try {
        // 动态 import 返回模块命名空间对象，随后调用具名导出；它不是直接返回报表数据。
        // import 没有 fetch 那样的 signal 参数；此处结果只更新当前组件的局部展示。
        const module = await import("./lazyFeature.js");
        lazyResult.value = module.summarizeTasks([{ status: "done" }, { status: "doing" }, { status: "todo" }]);
        importCount.value += 1;
    } catch (error) {
        importError.value = error.message;
    } finally {
        lazyLoading.value = false;
    }
}
async function copyCommand(value) {
    // 成功时保存原命令，模板通过相等判断只更新对应按钮。
    // 失败时 copied 保存错误字符串；当前模板只展示成功匹配，按钮文案仍为“复制”。
    try {
        await navigator.clipboard.writeText(value);
        copied.value = value;
    } catch {
        copied.value = "复制受限，请选中命令手动复制。";
    }
}
async function testProxy() {
    // 提交锁避免重复点击；每次重试清空旧结果/旧错误，让反馈对应本次请求。
    if (proxyLoading.value) return;
    proxyLoading.value = true;
    proxyError.value = "";
    proxyResponse.value = null;
    proxyController = new AbortController();
    try {
        // 与上方路径模型不同，这里真正请求 Vite /api，交给开发代理转发。
        const response = await fetch("/api/health?delay=350", { signal: proxyController.signal });
        // SPA 的 HTML 回退也可能返回 200，所以同时验证 Content-Type，不能只看 response.ok。
        if (!response.ok || !response.headers.get("content-type")?.includes("application/json"))
            throw new Error("开发代理未返回 JSON，请确认 pnpm mock:api 已启动，并使用 pnpm dev 打开的页面。");
        proxyResponse.value = await response.json();
    } catch (error) {
        // 离开专题主动取消属于正常清理；网络/接口错误才显示为需要重试的反馈。
        if (error.name !== "AbortError") proxyError.value = error.message || "请求失败，请启动本地演示 API 后重试。";
    } finally {
        proxyLoading.value = false;
    }
}
// fetch 是组件启动的副作用，组件离开时一并取消；生产预览没有内置开发代理，接口需另行提供。
onBeforeUnmount(() => proxyController?.abort());
</script>

<template>
    <LessonFrame :lesson="lesson">
        <template v-if="topic === 'overview'">
            <div class="tool-version"
                ><span class="version-icon"><Zap :size="23" /></span
                ><div
                    ><strong>本项目：Vite 8 + Vue 3</strong
                    ><p>Vite 声明版本 {{ project.devDependencies.vite }} · Rolldown bundler / Oxc 工具链</p></div
                ><a href="https://vite.dev/blog/announcing-vite8" target="_blank" rel="noopener noreferrer"
                    >官方版本说明 ↗</a
                ></div
            >
            <div class="panel"
                ><div class="panel-header"><h2>从入口到浏览器</h2><span class="tag">流程教学模型</span></div
                ><div class="panel-body stack"
                    ><div class="row"
                        ><button
                            class="button small"
                            :class="bundler === 'vite' ? 'primary' : 'secondary'"
                            @click="
                                bundler = 'vite';
                                currentStep = 0;
                            "
                            >Vite 默认开发模式</button
                        ><button
                            class="button small"
                            :class="bundler === 'webpack' ? 'primary' : 'secondary'"
                            @click="
                                bundler = 'webpack';
                                currentStep = 0;
                            "
                            >Webpack 开发模式</button
                        ></div
                    ><div class="pipeline"
                        ><div
                            v-for="(step, index) in steps"
                            :key="step.title"
                            class="pipeline-step"
                            :class="{ active: index === currentStep, passed: index < currentStep }"
                            ><span>{{ String(index + 1).padStart(2, "0") }}</span
                            ><h3>{{ step.title }}</h3
                            ><p>{{ step.detail }}</p></div
                        ></div
                    ><div class="row"
                        ><button class="button primary" @click="currentStep = (currentStep + 1) % steps.length"
                            ><Play :size="14" /> 观察下一步</button
                        ><span class="muted">每一步展示概念，不是浏览器内执行真实 bundler。</span></div
                    ></div
                ></div
            >
            <div class="lab-grid"
                ><div class="panel"
                    ><div class="panel-header"><h2>运行当前 Vite 应用</h2><span class="tag">主项目</span></div
                    ><div class="panel-body stack"
                        ><div
                            v-for="command in ['pnpm dev', 'pnpm build', 'pnpm preview']"
                            :key="command"
                            class="command"
                            ><code>{{ command }}</code
                            ><button @click="copyCommand(command)">{{
                                copied === command ? "已复制" : "复制"
                            }}</button></div
                        ><p class="muted">开发时观察原生 ESM 请求；构建后检查 dist/assets。</p></div
                    ></div
                ><div class="panel"
                    ><div class="panel-header"><h2>运行 Webpack 对照</h2><span class="tag">独立 Vue SFC 示例</span></div
                    ><div class="panel-body stack"
                        ><div
                            v-for="command in ['pnpm webpack:dev', 'pnpm webpack:build']"
                            :key="command"
                            class="command"
                            ><code>{{ command }}</code
                            ><button @click="copyCommand(command)">{{
                                copied === command ? "已复制" : "复制"
                            }}</button></div
                        ><p class="muted">开发地址 http://127.0.0.1:5174，产物在 examples/webpack/dist。</p></div
                    ></div
                ></div
            >
        </template>

        <template v-else-if="topic === 'modules'">
            <div class="lab-grid"
                ><div class="panel"
                    ><div class="panel-header"><h2>依赖图：静态与动态边界</h2><span class="tag">简化结构</span></div
                    ><div class="panel-body stack"
                        ><div class="module-nodes"
                            ><button
                                v-for="(dependencies, name) in graph"
                                :key="name"
                                :class="{ active: selectedModule === name }"
                                @click="selectedModule = name"
                                ><FileCode2 :size="14" />{{ name }}</button
                            ></div
                        ><div class="module-dependencies"
                            ><strong>{{ selectedModule }}</strong
                            ><ArrowDown :size="17" /><span
                                v-for="dependency in graph[selectedModule]"
                                :key="dependency"
                                >{{ dependency }}</span
                            ><span v-if="!graph[selectedModule].length" class="muted">此模型中没有后续依赖</span></div
                        ><p class="muted"
                            >图用于帮助理解依赖关系，真实项目的路由动态导入可在 src/router/index.js 阅读。</p
                        ></div
                    ></div
                ><div class="panel"
                    ><div class="panel-header"><h2>真正执行一次 import()</h2><span class="tag">真实模块加载</span></div
                    ><div class="panel-body stack"
                        ><button class="button primary" :disabled="lazyLoading" @click="loadFeature"
                            ><Download :size="15" />{{ lazyLoading ? "正在加载" : "加载报表模块" }}</button
                        ><p class="muted"
                            >成功调用 {{ importCount }} 次。打开 Network 后再点击，比较首次加载和模块缓存。</p
                        >><pre
                            v-if="lazyResult"
                            class="code-block"
                        ><code>{{ JSON.stringify(lazyResult,null,2) }}</code></pre
                        ><p v-if="importError" class="callout">{{ importError }}</p
                        ><p v-if="!lazyResult" class="empty-state">模块尚未被此实验加载。</p></div
                    ></div
                ></div
            >
            <div class="panel"
                ><div class="panel-header"
                    ><h2>真实 HMR 接受边界</h2
                    ><span class="tag">{{ hasHmr ? "开发连接可用" : "当前为生产环境，无 HMR" }}</span></div
                ><div class="panel-body"
                    ><div class="hmr-display"
                        ><Zap :size="25" /><div
                            ><strong>{{ probeMessage }}</strong
                            ><p>已接受更新 {{ hmrUpdateCount }} 次</p></div
                        ></div
                    ><p class="muted"
                        >在 IDE 修改 <code>src/features/tooling/hmrProbe.js</code> 中的字符串并保存。hmrState.js 的
                        accept 回调会更新上方内容；生产预览不会建立此连接。</p
                    >><pre class="code-block"><code>if (import.meta.hot) {
    import.meta.hot.accept("./hmrProbe.js", (module) =&gt; {
        probeMessage.value = module.probeVersion;
    });
}</code></pre>
                </div></div
            >
        </template>

        <template v-else-if="topic === 'config'">
            <div class="lab-grid"
                ><div class="panel"
                    ><div class="panel-header"><h2>当前页面的真实环境</h2><span class="tag">import.meta.env</span></div
                    ><div class="panel-body"
                        ><dl class="environment"
                            ><template v-for="(value, key) in environment" :key="key"
                                ><dt>{{ key }}</dt
                                ><dd>{{ JSON.stringify(value) }}</dd></template
                            ></dl
                        ><p class="muted"
                            >开发与生产构建预览中的值可能不同。VITE_LAB_LABEL 是公开示例配置，可在 .env
                            文件中设置并重启服务。</p
                        ></div
                    ></div
                ><div class="panel"
                    ><div class="panel-header"
                        ><h2>开发代理路径转换</h2><span class="tag">路径教学模型 · 不发网络请求</span></div
                    ><div class="panel-body stack"
                        ><label class="field"
                            >浏览器请求路径<input v-model="proxyPath" class="control" placeholder="/api/tasks" /></label
                        ><div class="proxy-target"
                            ><span>开发服务匹配 /api 后转发至</span><code>{{ proxyResult }}</code></div
                        >><pre class="code-block"><code>server: {
    proxy: {
        "/api": {
            target: "http://127.0.0.1:3001",
            changeOrigin: true,
            rewrite: (path) =&gt; path.replace(/^\/api/, "")
        }
    }
}</code></pre
                        ><p class="muted"
                            >主项目已配置这条开发代理。任务工作台仍使用本地模拟服务；下面的按钮则请求独立演示
                            API，生产代理需要另外部署。</p
                        ></div
                    ></div
                ></div
            >
            <div class="panel"
                ><div class="panel-header"
                    ><h2>真正验证一次开发代理</h2><span class="tag">真实 fetch · /api/health</span></div
                ><div class="panel-body stack"
                    ><p class="muted"
                        >先在另一个终端运行 <code>pnpm mock:api</code>，保持 Vite 开发服务运行，再点击请求。打开 Network
                        查看 /api/health，它由开发服务器转发到 3001 端口。</p
                    ><div class="row"
                        ><button class="button primary" :disabled="proxyLoading" @click="testProxy"
                            ><Play :size="14" />{{ proxyLoading ? "正在请求" : "请求本地演示 API" }}</button
                        ><button class="button secondary" @click="copyCommand('pnpm mock:api')">{{
                            copied === "pnpm mock:api" ? "命令已复制" : "复制启动命令"
                        }}</button></div
                    >><pre
                        v-if="proxyResponse"
                        class="code-block"
                    ><code>{{ JSON.stringify(proxyResponse,null,2) }}</code></pre
                    ><p v-if="proxyError" class="callout" role="alert">{{ proxyError }}</p></div
                ></div
            >
            <div class="panel"
                ><div class="panel-header"><h2>相同目标，不同配置接口</h2></div
                ><div class="panel-body"
                    ><div class="config-map"
                        ><div
                            ><strong>路径别名</strong><code>Vite: resolve.alias</code
                            ><code>Webpack: resolve.alias</code></div
                        ><div
                            ><strong>模块转换</strong><code>Vite: plugins（Vue SFC 插件）</code
                            ><code>Webpack: module.rules + loader</code></div
                        ><div
                            ><strong>公开编译常量</strong><code>Vite: import.meta.env / define</code
                            ><code>Webpack: DefinePlugin</code></div
                        ><div
                            ><strong>调试映射</strong><code>Vite: build.sourcemap</code
                            ><code>Webpack: devtool</code></div
                        ></div
                    ></div
                ></div
            >
        </template>

        <template v-else>
            <div class="callout"
                ><strong>下方大小是虚构的教学数据</strong
                ><p>模型只展示策略的影响，不代表当前应用真实包体积；实际构建结果请从终端输出与产物目录验证。</p></div
            ><div class="lab-grid"
                ><div class="panel"
                    ><div class="panel-header"><h2>调整构建策略</h2><span class="tag">策略模型</span></div
                    ><div class="panel-body stack"
                        ><label class="row"
                            ><input v-model="dynamicSplit" type="checkbox" />动态模块分包（24 KiB）</label
                        ><label class="row"><input v-model="shareVendor" type="checkbox" />提取共享依赖（40 KiB）</label
                        ><label class="row"
                            ><input v-model="removeUnused" type="checkbox" />移除无用导出（12 KiB）</label
                        ><label class="row"
                            ><input v-model="sideEffect" type="checkbox" />无用模块有必须保留的副作用</label
                        ><div class="bundle-metric"
                            ><strong>{{ initialSize }} <small>KiB</small></strong
                            ><span>模型中的初始 JS 总量</span></div
                        ><p class="muted"
                            >提取 vendor
                            不会凭空减少本例初始总量，但可能改善共享与缓存。真实项目需要分析重复模块、压缩和缓存命中。</p
                        ></div
                    ></div
                ><div class="panel"
                    ><div class="panel-header"><h2>预期产物结构</h2><span class="tag">示意</span></div
                    ><div class="panel-body stack"
                        ><div v-for="chunk in chunkModel" :key="chunk.name" class="chunk"
                            ><div class="chunk-heading"
                                ><span><Package :size="15" />{{ chunk.name }}</span
                                ><strong>{{ chunk.size }} KiB</strong></div
                            ><div class="chunk-bar"
                                ><span
                                    :style="{ width: `${(chunk.size / 94) * 100}%` }"
                                    :class="{ lazy: !chunk.initial }" /></div
                            ><p>{{ chunk.note }} · {{ chunk.initial ? "启动时需要" : "按需请求" }}</p></div
                        ></div
                    ></div
                ></div
            ><div class="panel"
                ><div class="panel-header"><h2>回到真实构建</h2><span class="tag">亲自验证</span></div
                ><div class="panel-body stack"
                    ><div class="command"
                        ><code>pnpm build</code
                        ><button @click="copyCommand('pnpm build')">{{
                            copied === "pnpm build" ? "已复制" : "复制"
                        }}</button></div
                    ><div class="command"
                        ><code>pnpm webpack:build</code
                        ><button @click="copyCommand('pnpm webpack:build')">{{
                            copied === "pnpm webpack:build" ? "已复制" : "复制"
                        }}</button></div
                    ><p class="muted"
                        >找到入口、共享依赖、lazy chunk 与 .map 文件，再修改懒加载模块重新构建。比较 hash
                        变化、入口请求数与总量，而不只看单个文件大小。</p
                    ></div
                ></div
            >
        </template>
    </LessonFrame>
</template>

<style scoped>
.tool-version {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 22px;
    border: 1px solid var(--primary-border);
    border-radius: 12px;
    background: var(--primary-soft);
}
.version-icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    background: var(--surface);
    border-radius: 10px;
    color: var(--primary);
}
.tool-version strong {
    font-size: 15px;
}
.tool-version p {
    font-size: 11px;
    margin: 7px 0 0;
    color: var(--text-secondary);
}
.tool-version a {
    font-size: 11px;
    color: var(--primary);
    margin-left: auto;
    white-space: nowrap;
}
.pipeline {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
}
.pipeline-step {
    padding: 18px 16px;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: var(--surface-soft);
    opacity: 0.7;
}
.pipeline-step.active {
    border-color: var(--primary);
    background: var(--primary-soft);
    opacity: 1;
}
.pipeline-step.passed {
    opacity: 1;
}
.pipeline-step > span {
    font: 12px var(--font-mono);
    color: var(--primary);
}
.pipeline-step h3 {
    font-size: 13px;
    margin: 14px 0 8px;
}
.pipeline-step p {
    font-size: 11px;
    line-height: 1.9;
    color: var(--text-secondary);
    margin: 0;
}
.command {
    display: flex;
    align-items: center;
    gap: 12px;
    justify-content: space-between;
    background: var(--surface-soft);
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 12px 14px;
    font-size: 12px;
}
.command button {
    border: 0;
    background: none;
    font-size: 11px;
    color: var(--primary);
    cursor: pointer;
}
.module-nodes {
    display: flex;
    gap: 7px;
    flex-wrap: wrap;
}
.module-nodes button {
    display: flex;
    gap: 5px;
    align-items: center;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text-secondary);
    padding: 8px 10px;
    font: 11px var(--font-mono);
    cursor: pointer;
}
.module-nodes button.active {
    color: var(--primary);
    border-color: var(--primary);
    background: var(--primary-soft);
}
.module-dependencies {
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    background: var(--surface-soft);
    border-radius: 8px;
    font: 11px var(--font-mono);
}
.module-dependencies > strong {
    color: var(--primary);
}
.module-dependencies > span {
    padding: 6px 10px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 5px;
}
.hmr-display {
    display: flex;
    gap: 15px;
    align-items: center;
    color: var(--primary);
    padding: 22px;
    background: var(--primary-soft);
    border-radius: 9px;
    margin-bottom: 18px;
}
.hmr-display strong {
    font-size: 17px;
}
.hmr-display p {
    font-size: 11px;
    color: var(--text-secondary);
    margin: 6px 0 0;
}
.environment {
    display: grid;
    grid-template-columns: 130px minmax(0, 1fr);
    gap: 15px;
    margin: 0 0 22px;
    font: 12px var(--font-mono);
    line-height: 1.8;
}
.environment dt {
    color: var(--primary);
}
.environment dd {
    margin: 0;
    color: var(--text-secondary);
    overflow-wrap: anywhere;
}
.proxy-target {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
    background: var(--primary-soft);
    border-radius: 8px;
}
.proxy-target span {
    font-size: 11px;
    color: var(--text-secondary);
}
.proxy-target code {
    font-size: 12px;
    color: var(--primary);
    overflow-wrap: anywhere;
}
.config-map {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
}
.config-map > div {
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--surface-soft);
    border-radius: 8px;
    padding: 18px;
}
.config-map strong {
    font-size: 12px;
}
.config-map code {
    font-size: 10px;
    color: var(--text-secondary);
}
.bundle-metric {
    padding: 20px;
    border-radius: 9px;
    background: var(--primary-soft);
    display: flex;
    flex-direction: column;
    gap: 7px;
}
.bundle-metric strong {
    font: 36px var(--font-mono);
    color: var(--primary);
}
.bundle-metric small {
    font-size: 13px;
}
.bundle-metric span {
    font-size: 11px;
    color: var(--text-secondary);
}
.chunk-heading,
.chunk-heading > span {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
}
.chunk-heading {
    justify-content: space-between;
}
.chunk-heading strong {
    font-size: 11px;
    color: var(--primary);
}
.chunk-bar {
    height: 8px;
    background: var(--surface-soft);
    border-radius: 6px;
    overflow: hidden;
    margin-top: 12px;
}
.chunk-bar > span {
    display: block;
    height: 100%;
    background: var(--primary);
    border-radius: 6px;
}
.chunk-bar > span.lazy {
    background: #d6af69;
}
.chunk p {
    font-size: 10px;
    color: var(--text-secondary);
    margin: 8px 0 0;
}
.code-block {
    font-size: 11px;
    line-height: 1.9;
}
.row {
    flex-wrap: wrap;
    font-size: 12px;
}
.row > input {
    accent-color: var(--primary);
}
.muted {
    font-size: 12px;
    line-height: 1.9;
}
.callout a {
    color: var(--primary);
}
@media (max-width: 950px) {
    .pipeline {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}
@media (max-width: 600px) {
    .pipeline,
    .config-map {
        grid-template-columns: 1fr;
    }
    .tool-version {
        align-items: flex-start;
        flex-wrap: wrap;
    }
    .tool-version a {
        margin-left: 58px;
    }
    .environment {
        grid-template-columns: 1fr;
        gap: 4px;
    }
    .environment dd {
        margin-bottom: 10px;
    }
}
</style>
