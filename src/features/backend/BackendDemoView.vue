<script setup>
import { ref } from "vue";
import { ElAlert, ElButton, ElInput, ElTag } from "element-plus";
import { ArrowRight, Server } from "lucide-vue-next";
import { useRequest } from "@/composables/useRequest";
import { fetchGreeting } from "@/services/backendService";

const name = ref("Awen");
// 请求状态属于当前页面；离开路由时 useRequest 自动取消，并屏蔽晚到的结果。
const { data, loading, error, execute } = useRequest(fetchGreeting);

async function submit() {
    if (loading.value) return;
    try {
        await execute(name.value);
    } catch {
        // useRequest 已保存当前请求错误，由下方错误区域展示，允许再次提交。
    }
}
</script>

<template>
    <section class="backend-demo" aria-labelledby="backend-demo-title">
        <div class="page-heading">
            <div>
                <p class="eyebrow">FULL STACK PRACTICE</p>
                <h1 id="backend-demo-title">后端接口联调<span class="heading-dot">.</span></h1>
                <p class="page-description">输入姓名，调用 Spring Boot 接口，观察真实的 JSON 响应。</p>
            </div>
            <ElTag effect="plain"><Server :size="14" /> Spring Boot</ElTag>
        </div>

        <div class="request-flow" aria-label="请求经过 Vue 页面、Vite 开发代理和 Spring Boot">
            <span>Vue 页面</span><ArrowRight :size="16" aria-hidden="true" /> <span>Vite 开发代理</span
            ><ArrowRight :size="16" aria-hidden="true" />
            <span>Spring Boot</span>
        </div>

        <div class="demo-grid">
            <div class="panel">
                <div class="panel-header"><h2>发送问候请求</h2><ElTag type="info">GET</ElTag></div>
                <div class="panel-body">
                    <p class="endpoint"><code>/api/v1/demo/hello</code></p>
                    <form class="greeting-form" @submit.prevent="submit">
                        <label for="greeting-name">姓名</label>
                        <ElInput
                            id="greeting-name"
                            v-model="name"
                            :disabled="loading"
                            placeholder="例如 Alice"
                            aria-describedby="greeting-help"
                            clearable
                        />
                        <p id="greeting-help" class="muted">留空时，后端会使用默认姓名 Awen。</p>
                        <ElButton type="primary" native-type="submit" :loading="loading" :disabled="loading">
                            {{ loading ? "请求中…" : "发送请求" }}
                        </ElButton>
                    </form>
                </div>
            </div>

            <div class="panel" :aria-busy="loading">
                <div class="panel-header"><h2>后端响应</h2><span class="muted">真实接口返回</span></div>
                <div class="panel-body response-body" aria-live="polite">
                    <p v-if="loading" role="status" class="muted">正在等待 Spring Boot 响应…</p>
                    <ElAlert v-else-if="error" :title="error.message" type="error" :closable="false" show-icon />
                    <template v-else-if="data">
                        <p class="greeting-message" role="status">{{ data.message }}</p>
                        <pre class="response-json"><code>{{ JSON.stringify(data, null, 2) }}</code></pre>
                    </template>
                    <p v-else class="muted">发送一次请求后，这里会显示问候语和原始 JSON 数据。</p>
                </div>
            </div>
        </div>
        <p class="muted">可在浏览器 Network 面板中查看 hello 请求的查询参数、状态码和响应。</p>
    </section>
</template>

<style scoped>
.backend-demo {
    display: grid;
    gap: 24px;
}
.page-heading {
    margin-bottom: 0;
}
.request-flow {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    color: var(--text-secondary);
    font-size: 12px;
}
.request-flow span {
    padding: 7px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
}
.demo-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
}
.endpoint {
    margin: 0 0 24px;
    overflow-wrap: anywhere;
    color: var(--primary);
}
.greeting-form {
    display: grid;
    gap: 12px;
}
.greeting-form label {
    font-weight: 600;
}
.greeting-form .el-button {
    justify-self: start;
}
.greeting-form p {
    margin: 0 0 8px;
}
.response-body {
    min-height: 230px;
}
.greeting-message {
    margin: 0 0 20px;
    color: var(--primary);
    font-size: 22px;
    font-weight: 600;
    overflow-wrap: anywhere;
}
.response-json {
    margin: 0;
    padding: 16px;
    border-radius: 8px;
    background: var(--surface-soft);
    color: var(--text);
    font-family: var(--font-mono);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}
@media (max-width: 760px) {
    .demo-grid {
        grid-template-columns: minmax(0, 1fr);
    }
    .page-heading {
        align-items: flex-start;
        flex-wrap: wrap;
    }
}
</style>
