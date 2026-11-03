<script setup>
/**
 * 六组 CSS 实验共用参数面板与测量逻辑，topic 决定实际挂载哪个实验 DOM。
 * 控件只修改真实样式，输出通过浏览器布局结果计算；不把简化公式当成真实测量值。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import StyleSample from "./StyleSample.vue";

const props = defineProps({ topic: { type: String, default: "flex" } });
// 每次返回新的参数对象。重置时恢复这些值，同时保留 state 代理本身的身份。
const defaults = () => ({
    width: 520,
    direction: "row",
    justify: "flex-start",
    align: "stretch",
    wrap: "nowrap",
    gap: 12,
    grow: 1,
    shrink: 1,
    basis: 140,
    minZero: true,
    long: false,
    sizing: "content-box",
    boxWidth: 180,
    padding: 24,
    border: 4,
    flowRoot: false,
    flexSiblings: false,
    minColumn: 140,
    gridMode: "auto-fit",
    position: "sticky",
    inset: 12,
    trapped: true,
    color: "#267857",
    deep: false,
    idRule: false,
    inlineRule: false
});
const state = reactive(defaults());
// 各实验并非同时挂载，因此测量前必须检查对应 DOM 引用是否存在。
const stage = ref(null);
const target = ref(null);
const siblingA = ref(null);
const siblingB = ref(null);
const floatParent = ref(null);
const marginParent = ref(null);
const marginChild = ref(null);
// measurements 仅保存观测结果，不反过来决定被测元素的宽高，避免形成尺寸反馈循环。
const measurements = reactive({
    width: 0,
    height: 0,
    contentWidth: "",
    items: [],
    gap: 0,
    parentHeight: 0,
    innerGap: 0,
    columns: 0,
    background: ""
});
let observer;

// computed 只派生 style 对象，不读取 DOM；样式提交后统一由 measure 观察结果。
const flexStyle = computed(() => ({
    width: `${state.width}px`,
    flexDirection: state.direction,
    justifyContent: state.justify,
    alignItems: state.align,
    flexWrap: state.wrap,
    gap: `${state.gap}px`
}));
const firstStyle = computed(() => ({
    flexGrow: state.grow,
    flexShrink: state.shrink,
    flexBasis: `${state.basis}px`,
    // 刻意切换自动最小尺寸约束，观察内容过长时 flex-shrink 为什么仍可能无法缩小。
    minWidth: state.minZero ? "0" : "auto"
}));
const boxStyle = computed(() => ({
    width: `${state.boxWidth}px`,
    padding: `${state.padding}px`,
    borderWidth: `${state.border}px`,
    boxSizing: state.sizing
}));
const gridStyle = computed(() => ({
    width: `${state.width}px`,
    // min(100%, 最小列宽) 允许窄容器进一步收缩；否则最小轨道也可能撑出容器。
    gridTemplateColumns: `repeat(${state.gridMode}, minmax(min(100%, ${state.minColumn}px), 1fr))`,
    gap: `${state.gap}px`
}));

function measure() {
    // 边框盒可能包含小数；保留一位便于观察 flex 收缩，不将小数当布局错误。
    if (target.value) {
        const rect = target.value.getBoundingClientRect();
        const style = getComputedStyle(target.value);
        measurements.width = Math.round(rect.width * 10) / 10;
        measurements.height = Math.round(rect.height * 10) / 10;
        // 这里读取计算后的 width。其含义仍受 box-sizing 影响，不一律等于内容盒宽度。
        measurements.contentWidth = style.width;
        measurements.items = [...target.value.children].map(
            (element) => Math.round(element.getBoundingClientRect().width * 10) / 10
        );
        // 本实验只有普通像素轨道，计算样式可按空格计数；这不是任意 Grid 语法的通用解析器。
        measurements.columns = props.topic === "grid" ? style.gridTemplateColumns.split(" ").length : 0;
        measurements.background = style.backgroundColor;
    }
    // 用实际边界之间的距离观察 margin 是否折叠，不用两个 CSS margin 的和伪造结果。
    if (siblingA.value && siblingB.value)
        measurements.gap = Math.round(
            siblingB.value.getBoundingClientRect().top - siblingA.value.getBoundingClientRect().bottom
        );
    if (floatParent.value) measurements.parentHeight = Math.round(floatParent.value.getBoundingClientRect().height);
    if (marginParent.value && marginChild.value)
        measurements.innerGap = Math.round(
            marginChild.value.getBoundingClientRect().top - marginParent.value.getBoundingClientRect().top
        );
}

function reset() {
    Object.assign(state, defaults());
}
watch(state, async () => {
    // 控件更新 state 后，先等待 Vue 把新 style 写入 DOM，再读取布局。
    // nextTick 等待相关 DOM 更新，不等于保证浏览器已完成绘制。
    await nextTick();
    measure();
});
onMounted(async () => {
    await nextTick();
    measure();
    // 参数没有变化但外部窗口/布局变窄时，也要重新测量；仅 watch state 无法覆盖这类变化。
    observer = new ResizeObserver(measure);
    if (stage.value) observer.observe(stage.value);
    if (target.value) observer.observe(target.value);
});
// ResizeObserver 是浏览器资源，Vue 不会替这个手动创建的观察器自动 disconnect。
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
    <section class="css-experiment stack">
        <div class="row experiment-heading"
            ><div><span class="tag">LIVE PLAYGROUND</span><h3>调整参数，观察浏览器如何布局</h3></div
            ><button class="button secondary small" @click="reset">重置实验</button></div
        >

        <template v-if="topic === 'flex'">
            <div class="controls-grid">
                <label class="field"
                    >主轴方向<select v-model="state.direction" class="control"
                        ><option>row</option
                        ><option>column</option
                        ><option>row-reverse</option></select
                    ></label
                >
                <label class="field"
                    >主轴对齐<select v-model="state.justify" class="control"
                        ><option>flex-start</option
                        ><option>center</option
                        ><option>space-between</option
                        ><option>space-around</option
                        ><option>flex-end</option></select
                    ></label
                >
                <label class="field"
                    >交叉轴对齐<select v-model="state.align" class="control"
                        ><option>stretch</option
                        ><option>center</option
                        ><option>flex-start</option
                        ><option>flex-end</option></select
                    ></label
                >
                <label class="field"
                    >换行<select v-model="state.wrap" class="control"
                        ><option>nowrap</option
                        ><option>wrap</option></select
                    ></label
                >
                <label class="field"
                    >容器宽度 {{ state.width }}px<input v-model.number="state.width" type="range" min="240" max="680"
                /></label>
                <label class="field"
                    >间距 {{ state.gap }}px<input v-model.number="state.gap" type="range" min="0" max="32"
                /></label>
                <label class="field"
                    >第一项 grow<input v-model.number="state.grow" type="number" min="0" max="5" class="control"
                /></label>
                <label class="field"
                    >第一项 shrink<input v-model.number="state.shrink" type="number" min="0" max="5" class="control"
                /></label>
                <label class="field"
                    >第一项 basis {{ state.basis }}px<input
                        v-model.number="state.basis"
                        type="range"
                        min="60"
                        max="300"
                /></label>
            </div>
            <div class="row"
                ><label class="check"><input v-model="state.minZero" type="checkbox" /> 第一项 min-width: 0</label
                ><label class="check"><input v-model="state.long" type="checkbox" /> 使用长文本</label></div
            >
            <div ref="stage" class="preview-stage"
                ><div ref="target" class="flex-demo" :style="flexStyle"
                    ><div class="flex-item first" :style="firstStyle"
                        ><strong>01</strong
                        ><span>{{
                            state.long ? "Vue3_Learning_Without_Any_Break_Point" : "第一项 · 可调整"
                        }}</span></div
                    ><div class="flex-item"><strong>02</strong><span>basis: 90px</span></div
                    ><div class="flex-item"><strong>03</strong><span>basis: 90px</span></div></div
                ></div
            >
            <div class="measure-strip"
                ><span
                    >容器实际宽度 <b>{{ measurements.width }}px</b></span
                ><span v-for="(size, index) in measurements.items" :key="index"
                    >项目 {{ index + 1 }} <b>{{ size }}px</b></span
                ></div
            >
            <pre class="code-block">
display: flex;
flex-direction: {{ state.direction }};
/* 第一项 */
flex: {{ state.grow }} {{ state.shrink }} {{ state.basis }}px;
min-width: {{ state.minZero ? "0" : "auto" }};</pre>
        </template>

        <template v-else-if="topic === 'box'">
            <div class="controls-grid"
                ><label class="field"
                    >box-sizing<select v-model="state.sizing" class="control"
                        ><option>content-box</option
                        ><option>border-box</option></select
                    ></label
                ><label class="field"
                    >指定 width {{ state.boxWidth }}px<input
                        v-model.number="state.boxWidth"
                        type="range"
                        min="120"
                        max="280" /></label
                ><label class="field"
                    >padding {{ state.padding }}px<input
                        v-model.number="state.padding"
                        type="range"
                        min="0"
                        max="48" /></label
                ><label class="field"
                    >border {{ state.border }}px<input
                        v-model.number="state.border"
                        type="range"
                        min="0"
                        max="16" /></label
            ></div>
            <div ref="stage" class="preview-stage box-stage"
                ><div ref="target" class="box-demo" :style="boxStyle"
                    ><div class="box-content">content<br />{{ state.boxWidth }}px 指定宽度</div></div
                ><div class="box-legend"
                    ><span><i class="content-dot"></i> 内容</span><span><i class="padding-dot"></i> 内边距</span
                    ><span><i class="border-dot"></i> 边框</span></div
                ></div
            >
            <div class="measure-strip"
                ><span
                    >边框盒实测 <b>{{ measurements.width }}px</b></span
                ><span
                    >计算样式 width <b>{{ measurements.contentWidth }}</b></span
                ><span
                    >模式 <b>{{ state.sizing }}</b></span
                ></div
            >
            <p class="callout">{{
                state.sizing === "content-box"
                    ? `当前边框盒 = ${state.boxWidth} + 2 × ${state.padding} + 2 × ${state.border} = ${state.boxWidth + 2 * state.padding + 2 * state.border}px。`
                    : "当前 width 包含内容、padding 与 border；内边距增加时，内容区域会缩小。"
            }}</p>
        </template>

        <template v-else-if="topic === 'bfc'">
            <div class="row"
                ><label class="check"><input v-model="state.flowRoot" type="checkbox" /> 开启 display: flow-root</label
                ><label class="check"
                    ><input v-model="state.flexSiblings" type="checkbox" /> 相邻块改用 Flex 列布局</label
                ></div
            >
            <div ref="stage" class="bfc-grid">
                <article class="small-experiment"
                    ><h4>01 · 容器包含浮动</h4
                    ><div class="float-stage"
                        ><div
                            ref="floatParent"
                            class="float-parent"
                            :style="{ display: state.flowRoot ? 'flow-root' : 'block' }"
                            ><div class="float-child">float: left<br />height: 70px</div></div
                        ><p class="after-float">后面的普通流内容</p></div
                    ><p class="muted"
                        >父容器实测高度：<b>{{ measurements.parentHeight }}px</b>（含边框）</p
                    ></article
                >
                <article class="small-experiment"
                    ><h4>02 · 父子 margin</h4
                    ><div class="margin-stage"
                        ><div
                            ref="marginParent"
                            class="margin-parent"
                            :style="{ display: state.flowRoot ? 'flow-root' : 'block' }"
                            ><div ref="marginChild" class="margin-child">margin-top: 30px</div></div
                        ></div
                    ><p class="muted"
                        >子项到父容器顶部：<b>{{ measurements.innerGap }}px</b></p
                    ></article
                >
                <article class="small-experiment"
                    ><h4>03 · 相邻块 margin</h4
                    ><div class="siblings" :style="{ display: state.flexSiblings ? 'flex' : 'block' }"
                        ><div ref="siblingA" class="sibling sibling-a">margin-bottom: 24px</div
                        ><div ref="siblingB" class="sibling sibling-b">margin-top: 32px</div></div
                    ><p class="muted"
                        >相邻块实测间距：<b>{{ measurements.gap }}px</b></p
                    ></article
                >
            </div>
            <p class="callout"
                >flow-root 包含内部浮动并阻止父子外边距折叠；相邻兄弟的折叠需要单独观察。Flex
                项之间的外边距不会发生这种折叠。</p
            >
        </template>

        <template v-else-if="topic === 'grid'">
            <div class="controls-grid"
                ><label class="field"
                    >容器宽度 {{ state.width }}px<input
                        v-model.number="state.width"
                        type="range"
                        min="240"
                        max="680" /></label
                ><label class="field"
                    >最小列宽 {{ state.minColumn }}px<input
                        v-model.number="state.minColumn"
                        type="range"
                        min="80"
                        max="240" /></label
                ><label class="field"
                    >gap {{ state.gap }}px<input v-model.number="state.gap" type="range" min="0" max="32" /></label
                ><label class="field"
                    >重复策略<select v-model="state.gridMode" class="control"
                        ><option>auto-fit</option
                        ><option>auto-fill</option></select
                    ></label
                ></div
            >
            <div ref="stage" class="preview-stage"
                ><div ref="target" class="grid-demo" :style="gridStyle"
                    ><div v-for="index in 5" :key="index" class="grid-item"
                        ><span>0{{ index }}</span
                        ><strong>学习卡片</strong><small>自动适应可用空间</small></div
                    ></div
                ></div
            >
            <div class="measure-strip"
                ><span
                    >实际列数 <b>{{ measurements.columns }}</b></span
                ><span
                    >实际宽度 <b>{{ measurements.width }}px</b></span
                ></div
            >
            <pre class="code-block">
display: grid;
grid-template-columns: repeat({{ state.gridMode }}, minmax(min(100%, {{ state.minColumn }}px), 1fr));
gap: {{ state.gap }}px;</pre>
        </template>

        <template v-else-if="topic === 'position'">
            <div class="controls-grid"
                ><label class="field"
                    >定位方式<select v-model="state.position" class="control"
                        ><option>sticky</option
                        ><option>absolute</option
                        ><option>relative</option></select
                    ></label
                ><label class="field"
                    >top {{ state.inset }}px<input v-model.number="state.inset" type="range" min="0" max="64" /></label
            ></div>
            <div ref="stage" class="position-grid"
                ><article
                    ><h4>在容器内滚动 ↓</h4
                    ><div class="scroll-demo"
                        ><div class="scroll-content"
                            ><p>容器顶部 · position: relative</p
                            ><div class="positioned-box" :style="{ position: state.position, top: `${state.inset}px` }"
                                >position: {{ state.position }}</div
                            ><p v-for="i in 7" :key="i" class="scroll-line"
                                >{{ i.toString().padStart(2, "0") }} · 滚动内容与正常流占位</p
                            ></div
                        ></div
                    ></article
                ><article
                    ><h4>层叠上下文</h4
                    ><label class="check"
                        ><input v-model="state.trapped" type="checkbox" /> A 的祖先创建 transform 上下文</label
                    ><div class="stacking-stage"
                        ><div class="stacking-parent" :style="{ transform: state.trapped ? 'translateZ(0)' : 'none' }"
                            ><small>祖先 A</small><div class="stacking-child">子项 A · z-index: 999</div></div
                        ><div class="stacking-sibling">兄弟 B<br />z-index: 2</div></div
                    ><p class="muted">{{
                        state.trapped
                            ? "A 的子项被限制在祖先上下文内，999 不能跨上下文比较。"
                            : "移除祖先的上下文后，A 的子项参与外层层叠，可以覆盖 B。"
                    }}</p></article
                ></div
            >
        </template>

        <template v-else>
            <div class="controls-grid"
                ><label class="field"
                    >主题变量<select v-model="state.color" class="control"
                        ><option value="#267857">森林绿</option
                        ><option value="#6066b1">鸢尾紫</option
                        ><option value="#b26d32">琥珀棕</option></select
                    ></label
                ><label class="check"
                    ><input v-model="state.deep" type="checkbox" /> 用 :deep() 覆盖内部按钮圆角</label
                ></div
            >
            <div ref="stage" class="preview-stage" :style="{ '--sample-color': state.color }"
                ><div :class="{ 'deep-enabled': state.deep }"
                    ><StyleSample><span class="slot-label">插槽内容由 :slotted() 定义样式</span></StyleSample></div
                ></div
            >
            <h4>优先级实验</h4
            ><div class="row"
                ><label class="check"><input v-model="state.idRule" type="checkbox" /> 添加 ID 选择器</label
                ><label class="check"><input v-model="state.inlineRule" type="checkbox" /> 添加内联背景</label></div
            >
            <div
                ref="target"
                :id="state.idRule ? 'specificity-box' : undefined"
                class="priority-box"
                :style="state.inlineRule ? { backgroundColor: '#b26d32' } : {}"
                >.class → #id → inline style</div
            >
            <div class="measure-strip"
                ><span
                    >实际背景 <b>{{ measurements.background }}</b></span
                ></div
            >
            <pre class="code-block">
/* 父级 CSS 变量可被子组件继承 */
--sample-color: {{ state.color }};

/* 只在开启开关的实验容器中生效 */
.deep-enabled :deep(.sample-button) { border-radius: 0; }</pre>
        </template>
    </section>
</template>

<style scoped>
/* 面板可以换行；实验容器内部保留真实溢出，使用滚动观察而非裁掉问题。 */
.css-experiment {
    gap: 24px;
}
.experiment-heading {
    justify-content: space-between;
    align-items: center;
}
.experiment-heading h3 {
    margin: 10px 0 0;
    font-size: 17px;
}
.controls-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(155px, 1fr));
    gap: 18px;
}
.field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 12px;
    font-weight: 600;
}
input[type="range"] {
    width: 100%;
    accent-color: var(--accent, #267857);
}
.check {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    cursor: pointer;
}
.check input {
    accent-color: #267857;
}
.preview-stage {
    overflow: auto;
    padding: 28px;
    border: 1px solid var(--border, #e4e9e2);
    border-radius: 12px;
    background-color: var(--surface-soft, #f7f9f6);
    background-image: radial-gradient(#cfd8cf 0.7px, transparent 0.7px);
    background-size: 14px 14px;
}
/* 三个项目只开放第一项参数，其他项保持基准，便于判断究竟是哪一个约束发生变化。 */
.flex-demo {
    display: flex;
    min-height: 170px;
    padding: 12px;
    background: #e8eee7;
    outline: 1px dashed #99b8a3;
}
.flex-item {
    flex: 0 1 90px;
    min-height: 70px;
    min-width: 0;
    padding: 14px;
    background: #d5e5d8;
    color: #28543a;
    border: 1px solid #9fbda7;
    border-radius: 7px;
    display: flex;
    flex-direction: column;
    gap: 9px;
}
.flex-item.first {
    background: #267857;
    color: white;
    border-color: #267857;
}
.flex-item span {
    /* 省略号只处理文本展示；外层 flex 项能否收缩仍由它自己的 min-width 等约束决定。 */
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.measure-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 14px 24px;
    font-size: 12px;
    color: var(--muted, #6b766e);
}
.measure-strip b {
    color: var(--text, #22382a);
    margin-left: 7px;
    font-variant-numeric: tabular-nums;
}
/* 三种底色分别表示 border、padding 与内容，尺寸模式由脚本绑定的 boxSizing 决定。 */
.box-demo {
    background: #eadcbd;
    border: solid #bd9360;
}
.box-content {
    background: #b5d7c0;
    min-height: 70px;
    padding: 12px 4px;
    text-align: center;
    font-size: 12px;
    color: #284f37;
}
.box-legend {
    display: flex;
    gap: 20px;
    margin-top: 24px;
    font-size: 12px;
}
.box-legend span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
}
.box-legend i {
    width: 10px;
    height: 10px;
    border-radius: 2px;
}
.content-dot {
    background: #b5d7c0;
}
.padding-dot {
    background: #eadcbd;
}
.border-dot {
    background: #bd9360;
}
.bfc-grid {
    display: grid;
    gap: 18px;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
}
.small-experiment {
    padding: 18px;
    border: 1px solid var(--border, #e4e9e2);
    border-radius: 12px;
    min-width: 0;
}
.small-experiment h4 {
    margin: 0 0 22px;
    font-size: 12px;
}
.small-experiment .muted {
    font-size: 11px;
    margin: 22px 0 0;
}
/* 外层实验舞台始终包含整个演示；开关改变的是里面被测 float-parent，而不是舞台。 */
.float-stage {
    display: flow-root;
    min-height: 130px;
}
.float-parent {
    border: 2px solid #af805c;
    background: #f4eada;
}
.float-child {
    float: left;
    height: 70px;
    width: 105px;
    background: #d7e6d9;
    padding: 12px;
    box-sizing: border-box;
    font-size: 11px;
}
.after-float {
    margin: 8px 0;
    font-size: 11px;
}
/* 1px 内边距防止演示的 margin 继续折叠到实验舞台外部，隔离待观察的父子关系。 */
.margin-stage {
    padding: 1px;
    min-height: 130px;
}
.margin-parent {
    /* 用 outline 标边界而不用 border：border 会阻止这里刻意保留的父子 margin 折叠。 */
    outline: 2px dashed #af805c;
    background: #f4eada;
}
.margin-child {
    margin-top: 30px;
    height: 58px;
    background: #d7e6d9;
    padding: 12px;
    box-sizing: border-box;
    font-size: 11px;
}
/* 普通块流会比较相邻 margin；切换 Flex 列布局后，两项目 margin 不再这样折叠。 */
.siblings {
    flex-direction: column;
    min-height: 130px;
}
.sibling {
    font-size: 10px;
    padding: 10px;
    background: #d7e6d9;
}
.sibling-a {
    margin-bottom: 24px;
}
.sibling-b {
    margin-top: 32px;
    background: #e6dbc5;
}
/* 与 Flex 单轴对照：列数由 Grid 轨道算法决定，脚本只提供容器、最小列宽和 gap。 */
.grid-demo {
    display: grid;
}
.grid-item {
    min-width: 0;
    background: var(--surface, #fff);
    border: 1px solid #cddfcf;
    border-radius: 9px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.grid-item span {
    color: #267857;
    font-size: 22px;
}
.grid-item strong {
    font-size: 12px;
}
.grid-item small {
    font-size: 10px;
    color: var(--muted, #7a857d);
}
.position-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 26px;
}
.position-grid h4 {
    margin: 0 0 14px;
    font-size: 13px;
}
/* 局部滚动容器让 sticky 的参照和约束都留在实验内，不影响整个应用页面。 */
.scroll-demo {
    height: 240px;
    overflow: auto;
    border: 1px solid #d5dfd5;
    border-radius: 10px;
    background: var(--surface-soft, #f7f9f6);
}
.scroll-content {
    position: relative;
    min-height: 600px;
    padding: 16px;
}
.scroll-content > p:first-child {
    font-size: 11px;
    color: #7b827b;
}
.positioned-box {
    padding: 12px;
    left: 12px;
    background: #267857;
    color: #fff;
    font-size: 12px;
    z-index: 1;
    border-radius: 5px;
}
.scroll-line {
    padding: 18px 0;
    font-size: 11px;
    border-bottom: 1px solid #dfe6dd;
}
/* isolate 将层叠演示限制在舞台内；切换祖先 transform 观察其子项能否越过兄弟 B。 */
.stacking-stage {
    height: 160px;
    position: relative;
    margin: 18px 0;
    isolation: isolate;
}
.stacking-parent {
    position: relative;
    width: 65%;
    height: 125px;
    border: 1px dashed #b8a98a;
    background: #f3ebd9;
    padding: 9px;
    color: #80653d;
}
.stacking-parent small {
    font-size: 10px;
}
.stacking-child {
    position: absolute;
    left: 20px;
    top: 48px;
    width: 100%;
    padding: 15px 8px;
    z-index: 999;
    background: #b5d9be;
    color: #28543a;
    font-size: 11px;
}
.stacking-sibling {
    position: absolute;
    right: 0;
    top: 72px;
    width: 47%;
    padding: 16px;
    z-index: 2;
    background: #b2bbdf;
    color: #303b68;
    font-size: 11px;
    border-radius: 5px;
}
.position-grid .muted {
    font-size: 12px;
    line-height: 1.8;
}
/* 深度选择器限定在开启开关的容器下，避免把覆盖规则扩散到其他组件。 */
.deep-enabled :deep(.sample-button) {
    border-radius: 0;
}
/* 这里比较同一来源下的普通 class、ID 与内联声明，不涵盖 !important 等全部层叠规则。 */
.priority-box {
    background: #267857;
    padding: 24px;
    color: white;
    border-radius: 9px;
    font-family: monospace;
    font-size: 12px;
}
#specificity-box {
    background: #6066b1;
}
@media (max-width: 650px) {
    .position-grid {
        grid-template-columns: 1fr;
    }
    .preview-stage {
        padding: 18px;
    }
    .experiment-heading {
        align-items: flex-start;
        gap: 12px;
    }
}
</style>
