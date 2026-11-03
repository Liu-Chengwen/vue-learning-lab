<script setup>
// 总览只派生统计，不复制业务状态；不同页面通过 Pinia 读取同一个数据源。
import { computed, ref, version } from "vue";
import { RouterLink } from "vue-router";
import {
    ArrowRight,
    ArrowUpRight,
    Code2,
    Blocks,
    Paintbrush,
    Braces,
    FlaskConical,
    CheckCircle2,
    Bookmark,
    ChevronRight,
    RotateCcw,
    Wrench,
    Play,
    Sparkles
} from "lucide-vue-next";
import { useLearningStore } from "@/stores/learning";
import { useTasksStore } from "@/stores/tasks";
import { catalogue } from "@/data/catalogue";
import { questions } from "@/data/questions";

const learning = useLearningStore();
const tasks = useTasksStore();
// 只控制二次确认区域的显示；真正清空哪些记录由 learning store 的 action 决定。
const showReset = ref(false);
// 与当前目录取交集，统计仍存在的专题；不把已从目录移除的历史 ID 当作当前完成项。
const completed = computed(() => catalogue.filter((v) => learning.completed.includes(v.id)).length);
const progress = computed(() => Math.round((completed.value / catalogue.length) * 100));
// 最近访问保存的是可导航的标题/路径；没有历史记录时提供固定起点。
const continueTo = computed(() => learning.recent[0] || { title: "起步与 API 风格", path: "/labs/setup" });
// 静态卡片只保存展示配置和入口，统计数量从 catalogue 派生，不在这里再维护一套课程列表。
const tracks = [
    {
        id: "vue",
        title: "Vue 3 核心",
        icon: Code2,
        description: "从响应式到组件设计，理解每一次更新。",
        path: "/labs/setup",
        color: "green",
        label: "COMPOSITION API"
    },
    {
        id: "ui",
        title: "组件库与定制",
        icon: Blocks,
        description: "用 Element Plus 完成业务，设计可复用接口。",
        path: "/ui-library",
        color: "blue",
        label: "BUILD FOR BUSINESS"
    },
    {
        id: "css",
        title: "CSS 布局实验",
        icon: Paintbrush,
        description: "调参数、看尺寸，让布局变化变得直观。",
        path: "/css/flex",
        color: "amber",
        label: "MAKE IT VISUAL"
    },
    {
        id: "javascript",
        title: "JavaScript 基础",
        icon: Braces,
        description: "闭包、继承与异步，先预测，再动手验证。",
        path: "/javascript/this",
        color: "violet",
        label: "KNOW THE LANGUAGE"
    }
];
const roadmap = [
    { title: "建立基础", description: "CSS 布局 / this / 闭包", path: "/javascript/scope" },
    { title: "理解 Vue", description: "响应式 / 通信 / 生命周期", path: "/labs/reactivity" },
    { title: "完成业务", description: "Element Plus / 封装 / 状态", path: "/tasks" },
    { title: "表达原理", description: "构建工具 / 迁移 / 面试", path: "/interview" }
];
function trackProgress(id) {
    // id 与 catalogue.track 对应；返回普通统计对象，由调用它的模板渲染过程追踪 store 依赖。
    const lessons = catalogue.filter((v) => v.track === id);
    return { total: lessons.length, done: lessons.filter((v) => learning.completed.includes(v.id)).length };
}
function reset() {
    // 清除完成/收藏/自评/最近访问，不删除任务工作台的任务，也不重置外观偏好。
    learning.resetProgress();
    showReset.value = false;
}
</script>

<template>
    <section>
        <div class="page-heading dashboard-heading"
            ><div
                ><div class="eyebrow">YOUR LEARNING SPACE</div
                ><h1>学习，从动手开始<span class="heading-dot">。</span></h1
                ><p class="page-description">把零散的知识连成体系，把“我知道”变成“我能解释，也能实现”。</p></div
            ><span class="version-pill"
                ><span class="status-dot"></span>Vue {{ version }}<span class="pill-divider">/</span>本地学习空间</span
            ></div
        >
        <div class="welcome-card">
            <div class="welcome-copy"
                ><span class="welcome-label"><Sparkles :size="13" />LEARN. EXPERIMENT. UNDERSTAND.</span
                ><h2>代码跑起来，<br />原理才会清晰起来。</h2
                ><p
                    >一个工作台，连接 Vue 3、组件定制与前端基础。<br
                        class="desktop-break"
                    />从一个小实验出发，找到面试答案背后的理由。</p
                ><div class="row"
                    ><RouterLink :to="continueTo.path" class="button hero-button"
                        ><Play :size="14" />{{ learning.recent.length ? "继续学习" : "开始第一个实验"
                        }}<ArrowRight :size="14" /></RouterLink
                    ><RouterLink to="/tasks" class="hero-text-link"
                        >进入业务实践<ArrowUpRight :size="14" /></RouterLink></div
            ></div>
            <div class="welcome-illustration" aria-hidden="true"
                ><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div
                ><div class="code-tile tile-top"
                    ><span class="code-keyword">const</span> understanding =<br /><span class="code-method">ref</span
                    >(<span class="code-value">'从实践开始'</span>)</div
                ><div class="main-symbol">&lt;V<span>/</span>&gt;</div
                ><div class="code-tile tile-bottom"><span class="green-dot"></span>每一次改变，都有迹可循</div
                ><span class="orbit-dot dot-one"></span><span class="orbit-dot dot-two"></span
            ></div>
        </div>
        <div class="overview-metrics">
            <div class="overview-metric"
                ><span class="metric-icon green"><FlaskConical :size="19" /></span
                ><div
                    ><span class="metric-label">可探索专题</span
                    ><div class="metric">{{ catalogue.length }}<small>个</small></div></div
                ><span class="metric-caption">从基础到工程</span></div
            >
            <div class="overview-metric"
                ><span class="metric-icon blue"><CheckCircle2 :size="19" /></span
                ><div
                    ><span class="metric-label">已完成学习</span
                    ><div class="metric"
                        >{{ completed }}<small>/ {{ catalogue.length }}</small></div
                    ></div
                ><div class="mini-progress"
                    ><span>{{ progress }}%</span><div><i :style="{ width: progress + '%' }"></i></div></div
            ></div>
            <div class="overview-metric"
                ><span class="metric-icon amber"><Bookmark :size="19" /></span
                ><div
                    ><span class="metric-label">重点面试题</span
                    ><div class="metric">{{ questions.length }}<small>道</small></div></div
                ><RouterLink to="/interview" class="metric-link" aria-label="前往面试复习"
                    ><ArrowUpRight :size="19" /></RouterLink
            ></div>
        </div>
        <div class="section-heading"
            ><h2>选择一条学习线<span class="section-caption">知识相连，按需探索</span></h2
            ><RouterLink to="/tooling/overview">也来了解构建工具<Wrench :size="13" /></RouterLink
        ></div>
        <div class="track-grid"
            ><RouterLink v-for="track in tracks" :key="track.id" :to="track.path" class="track-card"
                ><div class="track-top"
                    ><span class="track-icon" :class="track.color"><component :is="track.icon" :size="21" /></span
                    ><ArrowUpRight class="track-arrow" :size="18" /></div
                ><h3>{{ track.title }}</h3
                ><p>{{ track.description }}</p
                ><div class="track-bottom"
                    ><span>{{ track.label }}</span
                    ><small>{{ trackProgress(track.id).done }} / {{ trackProgress(track.id).total }} 完成</small></div
                ><div class="track-progress"
                    ><i
                        :style="{ width: (trackProgress(track.id).done / trackProgress(track.id).total) * 100 + '%' }"
                    ></i></div></RouterLink
        ></div>
        <div class="dashboard-bottom">
            <div class="panel"
                ><div class="panel-header"><h2>让学习有迹可循</h2><span class="tag">推荐路线</span></div
                ><div class="roadmap"
                    ><RouterLink v-for="(step, index) in roadmap" :key="step.title" :to="step.path" class="roadmap-step"
                        ><span class="step-number">{{ String(index + 1).padStart(2, "0") }}</span
                        ><div
                            ><h3>{{ step.title }}</h3
                            ><p>{{ step.description }}</p></div
                        ><ChevronRight :size="15" /></RouterLink></div
            ></div>
            <div class="panel"
                ><div class="panel-header"
                    ><h2>{{ learning.recent.length ? "最近探索" : "今天，从这里开始" }}</h2
                    ><span class="tag">{{ learning.recent.length ? "继续上次" : "值得一试" }}</span></div
                ><div class="recent-list"
                    ><template v-if="learning.recent.length"
                        ><RouterLink v-for="item in learning.recent.slice(0, 3)" :key="item.path" :to="item.path"
                            ><span class="recent-icon"><Code2 :size="16" /></span
                            ><div
                                ><strong>{{ item.title }}</strong
                                ><small>打开实验，继续建立理解</small></div
                            ><ArrowUpRight :size="16" /></RouterLink></template
                    ><template v-else
                        ><RouterLink to="/labs/reactivity"
                            ><span class="recent-icon"><Code2 :size="16" /></span
                            ><div><strong>为什么解构会丢失响应性？</strong><small>Vue 3 · 响应式实验</small></div
                            ><ArrowUpRight :size="16" /></RouterLink
                        ><RouterLink to="/css/flex"
                            ><span class="recent-icon amber"><Paintbrush :size="16" /></span
                            ><div><strong>长文本为什么撑开 Flex 布局？</strong><small>CSS · 尺寸与溢出</small></div
                            ><ArrowUpRight :size="16" /></RouterLink
                        ><RouterLink to="/javascript/classes"
                            ><span class="recent-icon violet"><Braces :size="16" /></span
                            ><div><strong>class 背后的原型关系是什么？</strong><small>JavaScript · 类与继承</small></div
                            ><ArrowUpRight :size="16" /></RouterLink></template></div
                ><RouterLink to="/tasks" class="task-summary"
                    ><CheckCircle2 :size="15" /><span>学习任务</span
                    ><strong>{{ tasks.completedCount }} / {{ tasks.tasks.length }} 已完成</strong
                    ><ArrowRight :size="14" /></RouterLink
            ></div>
        </div>
        <div class="learning-tip"
            ><span>小建议：先预测结果，再运行代码，最后试着用自己的话解释。</span
            ><button class="button link" @click="showReset = !showReset"
                ><RotateCcw :size="12" />重置学习记录</button
            ></div
        >
        <div v-if="showReset" class="callout row"
            ><span>将清空完成标记、收藏、自评与访问记录，任务数据由工作台单独管理。</span
            ><button class="button small danger" @click="reset">确认重置</button
            ><button class="button small" @click="showReset = false">取消</button></div
        >
        <p v-if="learning.storageError" class="callout">{{ learning.storageError }}</p>
    </section>
</template>

<style scoped>
.dashboard-heading {
    margin-bottom: 25px;
}
.heading-dot {
    color: var(--primary);
}
.version-pill {
    display: flex;
    gap: 7px;
    align-items: center;
    font-size: 10px;
    border: 1px solid var(--border);
    padding: 7px 11px;
    border-radius: 20px;
    background: var(--surface);
    color: var(--text-secondary);
    white-space: nowrap;
}
.pill-divider {
    padding: 0 2px;
    color: var(--border);
}
.welcome-card {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    background: #eaf3ec;
    border: 1px solid #dfece2;
    border-radius: 14px;
    padding: 31px 34px;
    overflow: hidden;
    position: relative;
    min-height: 277px;
}
.welcome-label {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #648a70;
    font-size: 9px;
    letter-spacing: 1.6px;
    font-weight: 600;
}
.welcome-copy h2 {
    font-size: 30px;
    letter-spacing: 1px;
    line-height: 1.5;
    margin: 15px 0 12px;
    color: #244b36;
    font-weight: 650;
}
.welcome-copy p {
    font-size: 11px;
    line-height: 1.9;
    color: #6b8473;
    margin-bottom: 22px;
}
.hero-button {
    background: #287b56;
    border-color: #287b56;
    color: #fff;
    font-size: 11px;
    padding: 9px 14px;
}
.hero-button:hover {
    background: #1e6545;
    color: #fff;
}
.hero-text-link {
    font-size: 11px;
    display: flex;
    align-items: center;
    gap: 5px;
    margin-left: 8px;
    color: #4c765d;
}
.welcome-illustration {
    position: relative;
    min-height: 220px;
}
.orbit {
    position: absolute;
    width: 248px;
    height: 248px;
    border: 1px solid #c9dccd;
    border-radius: 50%;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
}
.orbit-two {
    width: 185px;
    height: 185px;
    border-style: dashed;
    opacity: 0.7;
}
.main-symbol {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-8deg);
    font: 600 67px var(--font-mono);
    color: #3a8860;
    letter-spacing: -8px;
    text-shadow: 4px 5px 0 #d2e5d8;
}
.main-symbol span {
    color: #99bda6;
}
.code-tile {
    position: absolute;
    border: 1px solid #d8e5db;
    background: #ffffffda;
    border-radius: 9px;
    box-shadow: 0 8px 25px #315c3e08;
    font: 10px/1.9 var(--font-mono);
    color: #78877c;
}
.tile-top {
    padding: 12px 18px;
    left: 5%;
    top: 7%;
    transform: rotate(-5deg);
}
.code-keyword {
    color: #9a7caa;
}
.code-method {
    color: #508c6b;
}
.code-value {
    color: #8b9b65;
}
.tile-bottom {
    padding: 8px 14px;
    right: 0;
    bottom: 8%;
    font-size: 9px;
    transform: rotate(4deg);
    display: flex;
    align-items: center;
    gap: 8px;
}
.green-dot {
    width: 5px;
    height: 5px;
    background: #6aa681;
    border-radius: 50%;
}
.orbit-dot {
    width: 8px;
    height: 8px;
    background: #94bc9e;
    border: 3px solid #eaf3ec;
    border-radius: 50%;
    box-sizing: content-box;
    position: absolute;
}
.dot-one {
    right: 15%;
    top: 9%;
}
.dot-two {
    left: 19%;
    bottom: 8%;
    background: #d5b979;
}
.overview-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    margin-top: 20px;
}
.overview-metric {
    display: flex;
    align-items: center;
    gap: 14px;
    border: 1px solid var(--border);
    background: var(--surface);
    border-radius: 11px;
    padding: 19px 20px;
    min-width: 0;
}
.metric-icon,
.track-icon {
    display: grid;
    place-items: center;
    border-radius: 10px;
    flex-shrink: 0;
}
.metric-icon {
    width: 42px;
    height: 44px;
}
.green {
    background: var(--primary-soft);
    color: var(--primary);
}
.blue {
    background: #eff4fc;
    color: #6890c5;
}
.amber {
    background: #faf5e9;
    color: #b99553;
}
.violet {
    background: #f3effa;
    color: #a187c2;
}
.metric-label {
    display: block;
    font-size: 10px;
    color: var(--text-secondary);
    margin-bottom: 5px;
}
.overview-metric .metric {
    font-size: 27px;
}
.metric small {
    font: 10px sans-serif;
    letter-spacing: 0;
    color: var(--muted);
    margin-left: 6px;
}
.metric-caption {
    font-size: 9px;
    align-self: flex-end;
    margin-left: auto;
    color: var(--muted);
    padding-bottom: 2px;
    white-space: nowrap;
}
.mini-progress {
    margin-left: auto;
    width: 58px;
    font: 10px var(--font-mono);
    color: var(--primary);
    text-align: right;
}
.mini-progress > div {
    height: 4px;
    background: var(--surface-soft);
    border-radius: 4px;
    margin-top: 8px;
    overflow: hidden;
}
.mini-progress i {
    height: 100%;
    display: block;
    background: var(--primary);
    border-radius: 4px;
}
.metric-link {
    margin-left: auto;
    color: var(--muted);
}
.section-caption {
    font-size: 10px;
    color: var(--muted);
    font-weight: 400;
    margin-left: 8px;
}
.track-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
}
.track-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 11px;
    padding: 20px 18px 15px;
    transition:
        transform 0.18s,
        border-color 0.18s;
}
.track-card:hover {
    transform: translateY(-3px);
    border-color: var(--primary-border);
}
.track-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.track-icon {
    width: 40px;
    height: 42px;
}
.track-arrow {
    color: var(--muted);
    opacity: 0.65;
}
.track-card h3 {
    font-size: 14px;
    margin: 17px 0 8px;
    font-weight: 650;
}
.track-card p {
    font-size: 10px;
    color: var(--text-secondary);
    line-height: 1.9;
    min-height: 39px;
}
.track-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 6px;
    margin-top: 20px;
}
.track-bottom > span {
    font-size: 7px;
    letter-spacing: 0.6px;
    color: var(--muted);
}
.track-bottom small {
    font-size: 8px;
    color: var(--muted);
    white-space: nowrap;
}
.track-progress {
    height: 3px;
    background: var(--surface-soft);
    margin-top: 10px;
    border-radius: 5px;
    overflow: hidden;
}
.track-progress i {
    display: block;
    height: 100%;
    background: var(--primary);
}
.dashboard-bottom {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-top: 24px;
}
.roadmap {
    padding: 5px 22px;
}
.roadmap-step {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 13px 0;
    border-bottom: 1px solid var(--border);
}
.roadmap-step:last-child {
    border-bottom: 0;
}
.step-number {
    font: 11px var(--font-mono);
    background: var(--surface-soft);
    color: var(--primary);
    border: 1px solid var(--border);
    border-radius: 50%;
    width: 29px;
    height: 29px;
    display: grid;
    place-items: center;
}
.roadmap-step > div {
    flex: 1;
}
.roadmap-step h3 {
    font-size: 11px;
    margin: 0 0 2px;
    font-weight: 600;
}
.roadmap-step p {
    font-size: 10px;
    color: var(--muted);
    margin: 0;
}
.roadmap-step > svg {
    color: var(--muted);
}
.recent-list {
    padding: 6px 22px;
}
.recent-list > a {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 0;
    border-bottom: 1px solid var(--border);
}
.recent-list > a:last-child {
    border-bottom: 0;
}
.recent-icon {
    width: 32px;
    height: 34px;
    border-radius: 7px;
    background: var(--primary-soft);
    color: var(--primary);
    display: grid;
    place-items: center;
}
.recent-list > a > div {
    flex: 1;
    min-width: 0;
}
.recent-list strong {
    display: block;
    font-size: 11px;
    font-weight: 500;
}
.recent-list small {
    display: block;
    font-size: 9px;
    color: var(--muted);
    margin-top: 3px;
}
.recent-list > a > svg {
    color: var(--muted);
}
.task-summary {
    margin: 0 22px 16px;
    border: 1px solid var(--border);
    background: var(--surface-soft);
    padding: 10px 12px;
    display: flex;
    gap: 8px;
    align-items: center;
    border-radius: 6px;
    font-size: 10px;
    color: var(--text-secondary);
}
.task-summary strong {
    font-weight: 500;
    margin-left: auto;
}
.learning-tip {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10px;
    color: var(--muted);
    gap: 14px;
    margin-top: 20px;
}
.learning-tip .button {
    font-size: 10px;
}
:global(html.dark) .welcome-card {
    background: #243b2c;
    border-color: #354c3d;
}
:global(html.dark) .welcome-copy h2 {
    color: #c5e5cf;
}
:global(html.dark) .welcome-copy p,
:global(html.dark) .welcome-label,
:global(html.dark) .hero-text-link {
    color: #9bbba4;
}
:global(html.dark) .code-tile {
    background: #22352b;
    border-color: #415b49;
}
:global(html.dark) .orbit {
    border-color: #415b49;
}
:global(html.dark) .main-symbol {
    text-shadow: none;
}
@media (max-width: 1200px) {
    .track-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .metric-caption {
        display: none;
    }
    .overview-metric {
        padding: 17px 15px;
        gap: 10px;
    }
    .metric-icon {
        width: 36px;
        height: 38px;
    }
    .welcome-card {
        padding: 28px;
    }
    .track-card p {
        min-height: 0;
    }
    .welcome-copy h2 {
        font-size: 27px;
    }
    .section-caption {
        display: none;
    }
}
@media (max-width: 650px) {
    .welcome-card {
        grid-template-columns: 1fr;
        padding: 25px;
    }
    .welcome-illustration {
        display: none;
    }
    .welcome-copy h2 {
        font-size: 28px;
    }
    .overview-metrics {
        gap: 9px;
    }
    .overview-metric {
        flex-direction: column;
        align-items: flex-start;
        gap: 9px;
        padding: 14px 12px;
    }
    .overview-metric .metric {
        font-size: 24px;
    }
    .metric-icon {
        width: 29px;
        height: 31px;
    }
    .metric-label {
        font-size: 9px;
    }
    .mini-progress,
    .metric-link {
        display: none;
    }
    .dashboard-bottom {
        grid-template-columns: 1fr;
    }
    .version-pill {
        display: none;
    }
    .track-card {
        padding: 17px 15px;
    }
    .track-bottom {
        margin-top: 14px;
        flex-wrap: wrap;
    }
    .section-heading > a {
        font-size: 9px;
    }
    .section-heading h2 {
        font-size: 13px;
    }
    .learning-tip {
        align-items: flex-start;
        flex-wrap: wrap;
    }
    .welcome-label {
        font-size: 8px;
    }
    .desktop-break {
        display: none;
    }
}
</style>
