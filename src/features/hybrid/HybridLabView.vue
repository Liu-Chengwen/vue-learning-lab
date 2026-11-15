<script setup>
// script setup 中的状态和方法属于当前组件实例，不会自动变成 window 上的全局入口。
// ref 用于可变化的数据；Element Plus 负责控件；图标只辅助展示；Bridge 逻辑由下方 composable 提供。
import { ref } from "vue";
import { ElAlert, ElButton, ElInput, ElTag } from "element-plus";
import { ArrowDown, ArrowRight, Radio, Smartphone } from "lucide-vue-next";
import { useNativeBridge } from "./useNativeBridge";

/**
 * 页面持有的发送草稿，随 v-model 更新，发送后保留内容以便再次编辑。
 * JavaScript 中通过 .value 读写；模板自动解包。
 * @type {import("vue").Ref<string>}
 */
const outgoingMessage = ref("你好，我是 Vue Lab");

/**
 * Promise 问候练习的姓名草稿；保留输入原文，交给 Swift 读取 params.name 后生成问候。
 * @type {import("vue").Ref<string>}
 */
const greetingName = ref("Vue Lab");

/**
 * 当前页面实例的通信状态与操作；解构保留 ref 的响应式关联。
 * 全局入口与清理由 useNativeBridge 管理，各属性的类型和说明来自其返回接口 NativeBridgeState。
 */
const {
    /** 最新接收消息；null 表示等待，空字符串也是合法消息。 */
    nativeMessage,
    /** 当前消息的展示来源标签，不代表调用者身份已验证。 */
    receiveSource,
    /** 全局入口收到的有效字符串次数，不包含浏览器模拟。 */
    receiveCount,
    /** 最近一次检测到的通道可调用状态，不是 Native 的处理确认。 */
    bridgeAvailable,
    /** 最近一次操作的提示类型与文字，绑定至 ElAlert。 */
    feedback,
    /** 当前页面最近 30 条通信记录，最新在前。 */
    logs,
    /** 清空记录，保留最新消息和计数。 */
    clearLogs,
    /** 将输入原文提交给 WebKit，返回本地提交结果。 */
    sendMessage,
    /** 只模拟本页接收展示，不调用 Swift。 */
    simulateReceive,
    /** 重新读取通道并更新可调用状态。 */
    refreshBridge,
    /** 最近一次设备信息请求的返回值，尚未成功请求时为 null。 */
    deviceInfo,
    /** 最近一次原生问候结果，与上方的字符串接收区分开保存。 */
    greeting,
    /** Promise 被拒绝时的说明，包括 Native 错误、无通道和超时。 */
    rpcError,
    /** 当前 Promise 练习的可读状态，供辅助阅读工具播报。 */
    rpcStatus,
    /** 一次练习尚未结束时锁定其他练习按钮，避免结果在页面上相互覆盖。 */
    rpcLoading,
    /** Promise.all 的组合结果，按调用顺序保存，不按 Native 回复顺序排列。 */
    rpcResults,
    /** 当前仍等待 Native 回复的请求数量；并发练习中可以同时有两条请求。 */
    pendingCount,
    /** 发起 getDeviceInfo 请求，并将返回数据保存到 deviceInfo。 */
    requestDeviceInfo,
    /** 带上姓名参数调用 greet，成功后更新 greeting。 */
    requestGreeting,
    /** 故意请求未实现的方法，观察 Promise rejected。 */
    requestUnknownAction,
    /** 请求调试版 Native 的不回复分支，观察 5000 毫秒超时。 */
    requestTimeout,
    /** 用 Promise.all 同时获取设备信息和问候结果。 */
    requestConcurrent
} = useNativeBridge();

/**
 * Native → H5 调用示例，仅供模板按文本展示，不执行其中的 JavaScript。
 * @type {string}
 */
const receiveExample = "window.receiveNativeMessage('你好，我是 Swift')";
/**
 * H5 → Native 发送示例，仅供阅读；真实发送由 sendMessage 完成。
 * @type {string}
 */
const sendExample = "window.webkit?.messageHandlers?.nativeBridge.postMessage('你好，我是 Vue Lab')";
/**
 * Promise 调用示例，仅在教学说明中展示；真正的请求由上面解构的练习函数发起。
 * @type {string}
 */
const promiseExample = "const device = await nativeBridge.call('getDeviceInfo')";
</script>

<template>
    <!-- 根节点用 aria-labelledby 关联标题，帮助辅助阅读工具识别这个实验区域。 -->
    <section class="hybrid-lab" aria-labelledby="hybrid-title">
        <!-- 页面标题区：课程定位和说明。装饰性图标用 aria-hidden，避免重复朗读。 -->
        <div class="page-heading">
            <div>
                <p class="eyebrow">IOS × VUE · LESSON 04</p>
                <h1 id="hybrid-title">WKWebView 双向通信<span class="heading-dot">.</span></h1>
                <p class="page-description">把 Swift 与 Vue 连起来，观察一条消息如何跨过原生与网页的边界。</p>
            </div>
            <ElTag effect="plain"><Smartphone :size="14" aria-hidden="true" /> Hybrid 实验</ElTag>
        </div>

        <!-- 环境区只展示 nativeBridge.postMessage 是否可调用；它不能证明 Native 已收到消息。
             : 前缀绑定动态值，@click 绑定点击事件；手动检测按钮会重新读取当前 window 上的通道。 -->
        <div class="bridge-environment">
            <div class="environment-label">
                <Radio :size="18" aria-hidden="true" />
                <strong>{{ bridgeAvailable ? "已检测到 nativeBridge 通道" : "未检测到 Native Bridge" }}</strong>
                <ElTag :type="bridgeAvailable ? 'success' : 'info'" size="small">
                    {{ bridgeAvailable ? "可以发送" : "可练习接收" }}
                </ElTag>
            </div>
            <p>
                {{
                    bridgeAvailable
                        ? "发送后，请在 HybridLab 中观察原生弹窗，确认 Swift 是否收到消息。"
                        : "普通浏览器也能打开本页。真实发送需要在注册了 nativeBridge 的 HybridLab 中进行。"
                }}
            </p>
            <ElButton size="small" @click="refreshBridge">重新检测通道</ElButton>
        </div>

        <!-- 两个方向分别展示：接收不依赖发送表单，发送也不会自动得到 Native 的返回值。 -->
        <div class="hybrid-grid">
            <!-- Native → H5：Swift 调用全局接收入口，composable 更新 ref，Vue 再更新此处 DOM。 -->
            <section class="panel" aria-labelledby="receive-title">
                <div class="panel-header">
                    <h2 id="receive-title"><span class="step-number">01</span> Native → H5</h2>
                    <ElTag effect="plain" size="small">接收</ElTag>
                </div>
                <div class="panel-body communication-body">
                    <p class="muted">点击原生导航栏的「发送消息」，让 Swift 更新下面的 Vue 状态。</p>
                    <!-- null 表示尚未接收；空字符串是合法消息，单独显示占位说明，避免与等待状态混淆。
                         {{ }} 按文本渲染，不会执行消息中的 HTML；aria-live 让更新可被辅助工具读到。 -->
                    <div class="message-display" aria-live="polite" aria-atomic="true">
                        <span class="field-caption">最新接收消息</span>
                        <p v-if="nativeMessage === null" class="waiting-message">等待 Native 发送消息…</p>
                        <p v-else class="received-message">{{
                            nativeMessage === "" ? "（空字符串）" : nativeMessage
                        }}</p>
                        <span v-if="receiveSource" class="message-source">本次来源：{{ receiveSource }}</span>
                    </div>
                    <p class="receive-count">全局入口收到 {{ receiveCount }} 条消息 · 不含浏览器模拟</p>
                    <!-- 流程图只是调用链说明；真正的 evaluateJavaScript 由 iOS 工程执行。 -->
                    <div class="communication-flow" aria-label="Swift 执行 JavaScript，再更新 Vue 状态">
                        <code>evaluateJavaScript</code><ArrowRight :size="14" aria-hidden="true" /><code>Vue ref</code>
                    </div>
                    <!-- details/summary 是浏览器自带的折叠区域；模拟按钮只更新本页，不调用 Swift。 -->
                    <details class="browser-practice">
                        <summary>在浏览器中练习接收</summary>
                        <p>仅在当前页面模拟消息展示，不会调用 Swift，也不代表原生联调成功。</p>
                        <ElButton @click="simulateReceive">模拟接收消息</ElButton>
                    </details>
                </div>
            </section>

            <!-- H5 → Native：输入草稿经 sendMessage 提交给 WebKit，原生弹窗由 Swift 实现。 -->
            <section class="panel" aria-labelledby="send-title">
                <div class="panel-header">
                    <h2 id="send-title"><span class="step-number">02</span> H5 → Native</h2>
                    <ElTag effect="plain" size="small">发送</ElTag>
                </div>
                <div class="panel-body communication-body">
                    <p class="muted">Vue 把字符串交给 WebKit，再由 Swift 的消息处理器接收。</p>
                    <!-- .prevent 阻止表单默认刷新页面；native-type="submit" 让按钮触发表单提交。
                         v-model 双向同步输入和草稿；label 的 for 与输入 id 对应，点击标签可聚焦控件。 -->
                    <form class="bridge-form" @submit.prevent="sendMessage(outgoingMessage)">
                        <label for="hybrid-outgoing-message">发送给 Native 的消息</label>
                        <ElInput
                            id="hybrid-outgoing-message"
                            v-model="outgoingMessage"
                            type="textarea"
                            :rows="4"
                            placeholder="例如：你好，我是 Vue Lab"
                            aria-describedby="hybrid-send-help"
                        />
                        <p id="hybrid-send-help" class="muted">本课直接发送字符串；原生接收器名称为 nativeBridge。</p>
                        <ElButton type="primary" native-type="submit">发送消息给 Native</ElButton>
                    </form>
                    <div class="communication-flow" aria-label="Vue 提交消息，再由 Swift 接收">
                        <code>postMessage</code><ArrowRight :size="14" aria-hidden="true" /><code>Swift handler</code>
                    </div>
                </div>
            </section>
        </div>

        <!-- 两条通信链路共用反馈区：type 决定提示样式，message 说明最近一次操作的结果。 -->
        <div aria-live="polite" aria-atomic="true">
            <ElAlert :title="feedback.message" :type="feedback.type" :closable="false" show-icon />
        </div>

        <!-- 第三阶段把发送与返回配成一次 Promise 调用。原有字符串练习继续保留，
             新增按钮只发起对应动作；请求表、超时及异常处理都由通信逻辑负责。 -->
        <section class="panel promise-panel" aria-labelledby="promise-title" :aria-busy="rpcLoading">
            <div class="panel-header">
                <h2 id="promise-title"><span class="step-number">03</span> Promise 异步回调</h2>
                <ElTag effect="plain" size="small">请求 → 响应</ElTag>
            </div>
            <div class="panel-body promise-body">
                <p class="muted">调用 Native 方法后，等待真正的返回结果。选择下面一个练习，观察成功、失败与超时。</p>

                <!-- 姓名由页面持有，按钮把当前草稿传给 composable。输入和展示都按文本处理，
                     可以尝试引号与换行；Swift 通过 JSON 序列化回传，不将姓名直接拼入 JS 源码。 -->
                <div class="bridge-form">
                    <label for="hybrid-greeting-name">传给原生问候方法的姓名</label>
                    <ElInput
                        id="hybrid-greeting-name"
                        v-model="greetingName"
                        type="textarea"
                        :rows="2"
                        :disabled="rpcLoading"
                        placeholder="例如：Vue Lab"
                        aria-describedby="hybrid-greeting-help"
                    />
                    <p id="hybrid-greeting-help" class="muted">「带参问候」和「并发请求」都会使用这份姓名草稿。</p>
                </div>

                <!-- 同一轮练习期间禁用其他按钮。并发动作内部同时发出两条请求，
                     不需要靠连续点击制造并发，也不会在页面挂载时自动请求。 -->
                <div class="promise-actions" aria-label="第三阶段五个练习">
                    <ElButton type="primary" :disabled="rpcLoading" @click="requestDeviceInfo">
                        1. 获取设备信息
                    </ElButton>
                    <ElButton :disabled="rpcLoading" @click="requestGreeting(greetingName)">2. 带参问候</ElButton>
                    <ElButton :disabled="rpcLoading" @click="requestUnknownAction">3. 未知方法错误</ElButton>
                    <ElButton :disabled="rpcLoading" @click="requestTimeout">4. 等待 5 秒超时</ElButton>
                    <ElButton :disabled="rpcLoading" @click="requestConcurrent(greetingName)">5. 并发请求</ElButton>
                </div>
                <p class="promise-debug-note muted">
                    超时练习使用调试版 HybridLab 的 debugNoReply 分支；发布版会将它作为未知方法处理。
                </p>

                <!-- 请求数量反映回调表中的等待项；rpcStatus 是这轮练习的整体状态。
                     原生返回 ok:false、同步提交失败或 5 秒未回复时，错误显示在同一个区域。 -->
                <div class="promise-status" role="status" aria-live="polite" aria-atomic="true">
                    <strong>{{ rpcStatus }}</strong>
                    <span class="muted">等待 Native 回复：{{ pendingCount }} 条</span>
                </div>
                <ElAlert v-if="rpcError" :title="rpcError" type="error" :closable="false" show-icon />

                <!-- 各区域保留最近一次成功结果；没有成功结果时不显示，避免把示例版本号当作真实设备信息。 -->
                <div v-if="deviceInfo || greeting || rpcResults !== null" class="promise-results" aria-live="polite">
                    <div v-if="deviceInfo" class="promise-result">
                        <h3>最近收到的设备信息</h3>
                        <dl class="device-info">
                            <dt>平台</dt><dd>{{ deviceInfo.platform }}</dd> <dt>系统</dt
                            ><dd>{{ deviceInfo.systemName }}</dd> <dt>系统版本</dt
                            ><dd>{{ deviceInfo.systemVersion }}</dd>
                        </dl>
                    </div>
                    <div v-if="greeting" class="promise-result">
                        <h3>最近收到的原生问候</h3>
                        <p class="promise-greeting">{{ greeting }}</p>
                    </div>
                    <div v-if="rpcResults !== null" class="promise-result">
                        <h3>最近一次并发结果</h3>
                        <p class="muted">Promise.all 按发起顺序收集设备信息和问候，各自通过请求 ID 匹配返回值。</p>
                        <pre class="promise-json"><code>{{ JSON.stringify(rpcResults, null, 2) }}</code></pre>
                    </div>
                </div>

                <details class="browser-practice">
                    <summary>这一次 Promise 是怎样完成的？</summary>
                    <p
                        >H5 为请求生成 ID，并保存 resolve / reject；Swift 返回同一个 ID 后，H5 找到对应的等待项，完成
                        Promise 并删除记录。</p
                    >
                    <pre class="promise-json"><code>{{ promiseExample }}</code></pre>
                    <p
                        >5000 毫秒仍未回复会自动失败。离开本页时也会清理等待中的请求；普通浏览器没有 Native
                        通道，会直接显示不可用提示。</p
                    >
                </details>
            </div>
        </section>

        <!-- 日志帮助按时间观察操作；它只保留在当前页面内存中，不写入本地存储。 -->
        <section class="panel" aria-labelledby="bridge-log-title">
            <div class="panel-header">
                <h2 id="bridge-log-title">通信记录</h2>
                <ElButton size="small" :disabled="!logs.length" @click="clearLogs">清空记录</ElButton>
            </div>
            <div class="panel-body">
                <p class="log-help muted">仅保留本页最近 30 条记录，刷新或离开页面后清空。</p>
                <!-- 有记录时渲染列表，否则展示空态；递增 id 提供稳定 key，同一秒的日志也不会冲突。 -->
                <ol v-if="logs.length" class="bridge-log" aria-label="最近通信记录，最新在前">
                    <li v-for="entry in logs" :key="entry.id">
                        <time>{{ entry.time }}</time
                        ><span>{{ entry.message }}</span>
                    </li>
                </ol>
                <p v-else class="muted">还没有通信记录，先尝试接收或发送一条消息。</p>
            </div>
        </section>

        <!-- 联调说明默认收起；pre/code 保留示例代码排版，此处展示字符串，不动态执行代码。 -->
        <details class="panel integration-notes">
            <summary>连接 HybridLab 的三个步骤 <ArrowDown :size="15" aria-hidden="true" /></summary>
            <div class="panel-body">
                <ol class="integration-steps">
                    <li>在 Swift 中注册名为 <code>nativeBridge</code> 的 WKScriptMessageHandler，再加载本页。</li>
                    <li>确认本页已经显示后，点击原生导航栏按钮，通过 evaluateJavaScript 执行：</li>
                </ol>
                <pre><code>{{ receiveExample }}</code></pre>
                <p class="muted">入口在 Vue 组件挂载后注册，离开页面时清理。didFinish 不保证异步组件已挂载。</p>
                <p>3. 点击本页「发送消息给 Native」，观察 iOS 原生弹窗。页面使用的发送入口是：</p>
                <pre><code>{{ sendExample }}</code></pre>
                <p class="muted"
                    >以上是前一阶段的字符串通道。第三阶段在同一通道上增加请求 ID 与 Promise
                    响应；就绪握手和完整的来源授权仍留到后续课程。</p
                >
            </div>
        </details>
    </section>
</template>

<style scoped>
/* scoped 限制本组件样式的作用范围；颜色、字体变量继续继承应用的明暗主题。
   页面、卡片头部和面板基础外观来自全局样式，这里补充 Hybrid 实验所需的布局。 */
/* 页面纵向排列各区域；min-width: 0 允许网格内容收缩，避免长消息撑宽页面。 */
.hybrid-lab {
    display: grid;
    gap: 24px;
    min-width: 0;
}
/* 沿用全局标题样式，仅调整与本页纵向网格重复的外边距和标题内容间距。 */
.page-heading {
    margin-bottom: 0;
    gap: 16px;
}
/* 用主题浅色突出通道状态；状态文字与标签允许换行，适应窄屏。 */
.bridge-environment {
    padding: 20px 24px;
    border: 1px solid var(--primary-border);
    border-radius: 10px;
    background: var(--primary-soft);
}
.environment-label {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    color: var(--primary);
}
.bridge-environment p {
    margin: 10px 0 14px;
    color: var(--text-secondary);
    line-height: 1.7;
}
/* 宽屏将收发卡片等分为两列；minmax(0, 1fr) 允许列宽小于内容的默认最小宽度。 */
.hybrid-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: stretch;
    gap: 20px;
}
/* 面板也允许收缩；标题内部用 Flex 对齐序号和方向文字。 */
.panel {
    min-width: 0;
}
.panel-header h2 {
    display: flex;
    align-items: center;
    gap: 10px;
}
/* 序号用主题色和等宽字体，与正文、状态说明区分。 */
.step-number {
    color: var(--primary);
    font-family: var(--font-mono);
    font-size: 12px;
}
/* 通信卡片内部按内容自然排布，用 gap 统一间距，并去掉段落的默认外边距。 */
.communication-body {
    display: grid;
    gap: 18px;
}
.communication-body > p,
.bridge-form p {
    margin: 0;
    line-height: 1.7;
}
/* 接收框用浅底色集中呈现最新消息；说明文字与来源使用次要文字颜色。 */
.message-display {
    padding: 18px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface-soft);
}
.field-caption,
.message-source,
.receive-count {
    font-size: 12px;
    color: var(--text-secondary);
}
/* pre-wrap 保留消息中的换行与空格；anywhere 让连续长文本也可以折行。 */
.received-message,
.waiting-message {
    margin: 12px 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 1.7;
}
/* 已收到的消息突出显示，等待中的提示则使用较弱的颜色。 */
.received-message {
    color: var(--primary);
    font-size: 20px;
    font-weight: 600;
}
.waiting-message {
    color: var(--text-secondary);
}
/* API 调用链水平排列，空间不足时允许换行；代码名称统一使用等宽字体。 */
.communication-flow {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
    font-size: 12px;
}
.communication-flow code,
.integration-notes code {
    font-family: var(--font-mono);
    overflow-wrap: anywhere;
}
/* 表单从上到下排列标签、输入、提示和按钮；按钮保持内容宽度，不铺满整列。 */
.bridge-form {
    display: grid;
    gap: 12px;
}
.bridge-form label {
    font-weight: 600;
}
.bridge-form .el-button {
    justify-self: start;
}
/* 模拟区域与真实接收结果用分隔线区分；summary 保留原生折叠行为并提示可点击。 */
.browser-practice {
    border-top: 1px solid var(--border);
    padding-top: 16px;
}
.browser-practice summary {
    color: var(--primary);
    cursor: pointer;
}
.browser-practice p {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.7;
}
/* Promise 实验使用现有面板样式；按钮自然换行，结果逐块排列，不增加固定尺寸的复杂布局。 */
.promise-body {
    display: grid;
    gap: 18px;
}
.promise-body > p,
.promise-result p {
    margin: 0;
    line-height: 1.7;
}
.promise-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}
.promise-actions .el-button + .el-button {
    margin-left: 0;
}
.promise-debug-note {
    font-size: 12px;
}
.promise-status {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 18px;
    font-size: 13px;
}
.promise-results {
    display: grid;
    gap: 14px;
}
.promise-result {
    min-width: 0;
    padding: 18px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface-soft);
}
.promise-result h3 {
    margin: 0 0 12px;
    font-size: 14px;
}
/* 设备字段两列对齐；消息保留换行，连续长文本也可折行，避免姓名或 JSON 撑宽页面。 */
.device-info {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 8px 20px;
    margin: 0;
    font-size: 13px;
}
.device-info dt {
    color: var(--text-secondary);
}
.device-info dd {
    margin: 0;
    overflow-wrap: anywhere;
}
.promise-greeting {
    color: var(--primary);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}
.promise-json {
    margin: 12px 0 0;
    padding: 14px;
    border-radius: 6px;
    background: var(--surface);
    font-family: var(--font-mono);
    font-size: 12px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}
/* 日志说明紧贴面板顶部；列表限制高度，超过后在列表内部滚动。 */
.log-help {
    margin-top: 0;
}
.bridge-log {
    display: grid;
    gap: 0;
    max-height: 280px;
    margin: 0;
    padding: 0;
    overflow: auto;
    list-style: none;
}
/* 每条日志分成时间和消息两列；消息允许换行，时间不会被长消息挤占。 */
.bridge-log li {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 16px;
    padding: 12px 0;
    border-bottom: 1px solid var(--border);
    font-size: 12px;
    line-height: 1.7;
}
/* 时间使用次要色与等宽字体；消息保留原始换行和空格。 */
.bridge-log time {
    color: var(--text-secondary);
    font-family: var(--font-mono);
}
.bridge-log span {
    overflow-wrap: anywhere;
    white-space: pre-wrap;
}
/* 联调说明的折叠标题提供足够点击空间，箭头与文字垂直对齐。 */
.integration-notes > summary {
    padding: 20px 24px;
    cursor: pointer;
    font-weight: 600;
}
.integration-notes > summary svg {
    margin-left: 8px;
    vertical-align: middle;
}
/* 展开后用分隔线区分标题和内容，并统一步骤列表、段落的阅读行距。 */
.integration-notes .panel-body {
    border-top: 1px solid var(--border);
}
.integration-notes p,
.integration-steps {
    line-height: 1.8;
}
.integration-steps {
    margin: 0;
    padding-left: 20px;
}
/* 示例代码使用浅底背景；保留代码排版，同时允许长行换行以适应手机宽度。 */
.integration-notes pre {
    padding: 14px;
    border-radius: 6px;
    background: var(--surface-soft);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 12px;
}
/* 窄屏切换为单列卡片；标题允许换行，日志的时间与正文改成上下排列。 */
@media (max-width: 760px) {
    .hybrid-grid {
        grid-template-columns: minmax(0, 1fr);
    }
    .page-heading {
        flex-wrap: wrap;
        align-items: flex-start;
    }
    .bridge-environment {
        padding: 18px;
    }
    .bridge-log li {
        grid-template-columns: minmax(0, 1fr);
        gap: 4px;
    }
}
</style>
