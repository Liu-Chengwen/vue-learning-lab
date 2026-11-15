<script setup>
import { computed } from "vue";
import { ElAlert, ElButton, ElTag } from "element-plus";
import { ArrowRight, LocateFixed, MapPin, Smartphone } from "lucide-vue-next";
import { useLocation } from "./useLocation";

/**
 * 页面只负责展示和点击绑定；授权、定位都交给 Swift，Promise 生命周期由 composable 管理。
 * 各 ref 的类型与用途见 useLocation 返回的 LocationState，模板中会自动解包。
 */
const { location, loading, error, status, bridgeAvailable, requestLocation } = useLocation();

/**
 * 按浏览器的本地时区展示采集时间，原始 ISO 时间仍保留在 location.timestamp 中。
 * computed 在依赖变化时重新计算；尚未取得结果时不创建无效日期。
 * @type {import("vue").ComputedRef<string>}
 */
const capturedTime = computed(() => {
    if (location.value === null) {
        return "";
    }
    return new Date(location.value.timestamp).toLocaleString();
});

/** @type {string} 仅用于阅读的调用示例，实际请求在 useLocation 中执行。 */
const callExample = 'const location = await nativeBridge.call("getLocation", {}, { timeoutMs: 60000 });';
</script>

<template>
    <section class="location-lab" aria-labelledby="location-title">
        <!-- 标题和环境提示：能检测到通道，并不意味着用户已授予定位权限。 -->
        <div class="page-heading">
            <div>
                <p class="eyebrow">IOS × VUE · NATIVE CAPABILITY</p>
                <h1 id="location-title">原生定位实验<span class="heading-dot">.</span></h1>
                <p class="page-description">通过同一个 JSBridge，调用 Swift 的 Core Location，读取一次当前位置。</p>
            </div>
            <ElTag effect="plain"><MapPin :size="14" aria-hidden="true" /> getLocation</ElTag>
        </div>

        <div class="environment-note">
            <Smartphone :size="20" aria-hidden="true" />
            <div>
                <strong>{{ bridgeAvailable ? "已检测到 Native Bridge" : "请在 HybridLab 中打开本页" }}</strong>
                <p>
                    {{
                        bridgeAvailable
                            ? "首次点击时，iOS 可能会询问定位权限。允许后再等待系统返回位置。"
                            : "普通浏览器可阅读实验说明；获取位置需要 HybridLab 提供原生通道。"
                    }}
                </p>
            </div>
        </div>

        <!-- 请求区与结果区分开：失败或重试时保留最近成功结果，避免误认为它就是本次的新位置。 -->
        <section class="panel" aria-labelledby="request-location-title" :aria-busy="loading">
            <div class="panel-header">
                <h2 id="request-location-title"><LocateFixed :size="18" aria-hidden="true" /> 获取当前位置</h2>
                <ElTag size="small" effect="plain">单次定位</ElTag>
            </div>
            <div class="panel-body request-body">
                <p class="muted">只有点击按钮才会发起请求。本页不持续追踪位置，也不会自动请求授权。</p>
                <div class="request-actions">
                    <ElButton
                        class="get-location-button"
                        type="primary"
                        :loading="loading"
                        :disabled="loading"
                        @click="requestLocation"
                    >
                        {{ loading ? "正在获取…" : error ? "重试定位" : location ? "重新获取定位" : "获取当前定位" }}
                    </ElButton>
                    <span class="request-status" role="status">{{ status }}</span>
                </div>
                <ElAlert v-if="error" :title="error" type="error" :closable="false" show-icon />
                <p class="permission-help muted">若已拒绝授权，可到系统设置中允许 HybridLab 使用定位，再返回重试。</p>
            </div>
        </section>

        <section class="panel" aria-labelledby="location-result-title">
            <div class="panel-header">
                <h2 id="location-result-title">最近一次成功定位</h2>
                <ElTag v-if="location" type="success" size="small" effect="plain">Core Location 返回</ElTag>
            </div>
            <div class="panel-body" aria-live="polite">
                <template v-if="location">
                    <!-- dl/dt/dd 表达“字段名与值”；toFixed 只控制显示位数，不提高真实定位精度。 -->
                    <dl class="location-values">
                        <div>
                            <dt>纬度 · latitude</dt>
                            <dd class="coordinate" data-testid="latitude">{{ location.latitude.toFixed(6) }}°</dd>
                        </div>
                        <div>
                            <dt>经度 · longitude</dt>
                            <dd class="coordinate" data-testid="longitude">{{ location.longitude.toFixed(6) }}°</dd>
                        </div>
                        <div>
                            <dt>水平精度 · horizontalAccuracy</dt>
                            <dd data-testid="accuracy">{{ location.horizontalAccuracy.toFixed(1) }} 米</dd>
                        </div>
                        <div>
                            <dt>位置采集时间 · timestamp</dt>
                            <dd
                                ><time :datetime="location.timestamp">{{ capturedTime }}</time></dd
                            >
                        </div>
                    </dl>
                    <p class="result-help muted">精度数值表示系统估计的水平误差范围；允许大致位置时也可以得到结果。</p>
                </template>
                <p v-else class="empty-result">尚未获取位置。点击上方按钮，观察授权、等待和返回结果的过程。</p>
            </div>
        </section>

        <!-- 说明对应真实调用链；不增加浏览器定位或模拟返回，便于聚焦原生能力与 Bridge 封装。 -->
        <section class="panel" aria-labelledby="location-flow-title">
            <div class="panel-header"><h2 id="location-flow-title">读懂这次调用</h2></div>
            <div class="panel-body learning-body">
                <div class="location-flow" aria-label="Vue 请求经 Bridge 到 Swift 定位，再通过响应完成 Promise">
                    <code>Vue</code><ArrowRight :size="14" aria-hidden="true" /><code>JSBridge</code>
                    <ArrowRight :size="14" aria-hidden="true" /><code>Core Location</code>
                    <ArrowRight :size="14" aria-hidden="true" /><code>Promise</code>
                </div>
                <pre><code>{{ callExample }}</code></pre>
                <ul>
                    <li>H5 发送 getLocation 请求，Swift 检查来源、处理授权并调用系统定位能力。</li>
                    <li>Swift 带着同一个 id 回传数据或错误，Bridge 再完成对应的 Promise。</li>
                    <li>本次 H5 最多等待 60 秒；原生任务最多 45 秒，包含等待授权的时间。</li>
                </ul>
                <p class="muted"
                    >结果只保留在当前页面内存中，离开页面后清除。模拟器的位置来自模拟配置，真机位置请在手机上体验。</p
                >
            </div>
        </section>
    </section>
</template>

<style scoped>
/* 面板、标题与颜色继承项目公共样式；本页只补充定位字段及窄屏布局。 */
.location-lab {
    display: grid;
    gap: 24px;
    min-width: 0;
}
.page-heading {
    margin-bottom: 0;
    gap: 16px;
}
.panel-header h2,
.environment-note {
    display: flex;
    align-items: center;
    gap: 12px;
}
.environment-note {
    align-items: flex-start;
    padding: 20px 24px;
    border: 1px solid var(--primary-border);
    border-radius: 10px;
    background: var(--primary-soft);
}
.environment-note > svg {
    flex-shrink: 0;
    color: var(--primary);
    margin-top: 2px;
}
.environment-note p,
.request-body > p,
.learning-body p {
    margin: 0;
    line-height: 1.8;
}
.environment-note p {
    margin-top: 8px;
    color: var(--text-secondary);
}
.request-body,
.learning-body {
    display: grid;
    gap: 18px;
}
.request-actions,
.location-flow {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
}
.request-status,
.permission-help,
.result-help {
    font-size: 12px;
}
/* 每个字段作为独立块，窄屏自然变为一列；长时间文本允许换行。 */
.location-values {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px;
    margin: 0;
}
.location-values dt {
    color: var(--text-secondary);
    font-size: 12px;
}
.location-values dd {
    margin: 10px 0 0;
    overflow-wrap: anywhere;
    line-height: 1.6;
}
.coordinate {
    color: var(--primary);
    font-family: var(--font-mono);
    font-size: 24px;
}
.result-help {
    margin: 24px 0 0;
    line-height: 1.8;
}
.empty-result {
    margin: 0;
    padding: 12px 0;
    color: var(--text-secondary);
    line-height: 1.8;
}
.location-flow {
    color: var(--text-secondary);
    font-size: 12px;
}
/* 示例按文本展示，保留代码排版；长行可折行，适合 WKWebView 中阅读。 */
.learning-body pre {
    margin: 0;
    padding: 16px;
    border-radius: 8px;
    background: var(--surface-soft);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 12px;
    line-height: 1.8;
}
.learning-body code {
    font-family: var(--font-mono);
}
.learning-body ul {
    margin: 0;
    padding-left: 20px;
    line-height: 1.9;
}
@media (max-width: 760px) {
    .page-heading {
        flex-wrap: wrap;
        align-items: flex-start;
    }
    .environment-note {
        padding: 18px;
    }
    .location-values {
        grid-template-columns: minmax(0, 1fr);
    }
}
</style>
