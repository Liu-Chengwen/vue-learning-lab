<script setup>
import { ref, watch } from "vue";
import { Copy, Check, FileCode2 } from "lucide-vue-next";

// 接受相对项目根目录的一条路径或路径数组；路径来自专题元数据，不接收任意文件系统请求。
const props = defineProps({ source: { type: [String, Array], default: "" } });
// import.meta.glob 是 Vite 的构建转换能力：生成“路径 → 加载函数”的静态映射。
// ?raw 把文件作为文本导入，import:default 直接取文本默认导出；未设置 eager，对应文件被选中后才异步加载。
// 所以展示与运行引用同一份源文件，但“阅读源码”不会执行被展示的脚本文本。
const modules = {
    ...import.meta.glob("/src/**/*.{vue,js,css}", { query: "?raw", import: "default" }),
    // 只读示例源码与配置，避免把 webpack:build 生成的 dist 再收集进主应用。
    ...import.meta.glob(["/examples/webpack/src/**/*.{vue,js,css}", "/examples/webpack/webpack.config.cjs"], {
        query: "?raw",
        import: "default"
    }),
    ...import.meta.glob("/vite.config.js", { query: "?raw", import: "default" })
};
// 组件本地 UI 状态：父级只提供可选文件，当前选择、加载结果和复制反馈由面板管理。
const content = ref("");
const selected = ref("");
const paths = ref([]);
const copied = ref(false);
const error = ref("");
// 异步加载完成顺序不一定等于点击顺序；序号标记当前加载结果的所有权。
let requestId = 0;

// 侦听 prop 的 getter，而非把 props.source 的一次读取直接传入 watch。
// 元数据换成另一个专题时，先重建文件列表，再选择它的第一个入口。
watch(
    () => props.source,
    (value) => {
        paths.value = (Array.isArray(value) ? value : [value]).filter(Boolean);
        selected.value = paths.value[0] || "";
    },
    { immediate: true }
);

// selected 是 ref，可直接作为侦听源；immediate 让默认文件也执行同一加载流程。
watch(
    selected,
    async (value) => {
        const id = ++requestId;
        content.value = "";
        error.value = "";
        // 将元数据里有/无开头斜线的路径统一为 glob 映射的绝对项目路径格式。
        const path = "/" + value.replace(/^\//, "");
        if (!modules[path]) {
            error.value = "此专题的源码入口：" + value;
            return;
        }
        try {
            const code = await modules[path]();
            // import 本身没有 AbortController 接口；只接受最新一次结果，防旧文件覆盖新选择。
            if (id === requestId) content.value = code;
        } catch {
            if (id === requestId) error.value = "源码读取失败，请重新切换文件。";
        }
    },
    { immediate: true }
);

async function copy() {
    // Clipboard API 返回 Promise，并可能因权限/上下文失败；保留手动选中复制的退路。
    try {
        await navigator.clipboard.writeText(content.value);
        copied.value = true;
    } catch {
        error.value = "浏览器未允许复制，可以直接选中代码复制。";
    }
}
</script>

<template>
    <div class="source-viewer">
        <div class="source-toolbar">
            <span class="row"
                ><FileCode2 :size="16" /><span>{{ selected || "源码" }}</span></span
            >
            <button class="button small secondary" :disabled="!content" @click="copy">
                <Check v-if="copied" :size="14" /><Copy v-else :size="14" />{{ copied ? "已复制" : "复制" }}
            </button>
        </div>
        <div v-if="paths.length > 1" class="source-files">
            <button
                v-for="path in paths"
                :key="path"
                class="button small"
                :class="{ secondary: selected !== path, primary: selected === path }"
                @click="
                    selected = path;
                    copied = false;
                "
                >{{ path.split("/").at(-1) }}</button
            >
        </div>
        <p v-if="error" class="callout">{{ error }}</p>
        <pre v-if="content" class="code-block source-code"><code>{{ content }}</code></pre>
        <p v-else-if="!error" class="muted">正在读取源文件…</p>
    </div>
</template>

<style scoped>
.source-toolbar {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    padding: 14px 18px;
    background: var(--surface-soft);
    border-bottom: 1px solid var(--border);
    font: 12px var(--font-mono);
    overflow-wrap: anywhere;
}
.source-files {
    display: flex;
    gap: 8px;
    padding: 12px;
    flex-wrap: wrap;
}
.source-code {
    max-height: 650px;
    margin: 0;
    border-radius: 0 0 12px 12px;
    font-size: 12px;
    line-height: 1.85;
}
</style>
