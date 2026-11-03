<script setup>
/**
 * 类与继承实验控制器：每次运行创建新的普通实例，再把观测结果转成文本或原型图。
 * 只有“私有字段”分支刻意创建 Vue Proxy，用捕获到的异常说明接收者边界。
 */
import { computed, markRaw, reactive, ref } from "vue";
import { Task, TimedTask, LegacyTask, ValidationError, formatTask } from "./classModels";
import { useExperimentLog } from "./useExperimentLog";
import ConsoleOutput from "./ConsoleOutput.vue";

const { logs, log, clear } = useExperimentLog();
// mode 选择待观察的语言机制；输入保留在界面中，重新运行不会复用上一轮模型的私有状态。
const mode = ref("prototype");
const title = ref("理解 Vue 组件通信");
const minutes = ref(25);
const chain = ref([]);
const staticChain = ref([]);
// 这些字符串只作为阅读摘录显示，真实执行在 run 中；不使用 eval 执行用户输入或展示字符串。
const examples = {
    prototype: `class Task {
  constructor(title) { this.title = title; }
  describe() { return this.title; } // 原型方法
  describeBound = () => this.describe(); // 实例字段（ES2022）
}
const a = new Task("Vue");
const b = new Task("CSS");
a.describe === b.describe; // ?
a.describeBound === b.describeBound; // ?`,
    inheritance: `class TimedTask extends Task {
  constructor(title, minutes) {
    super(title);
    this.minutes = minutes;
  }
  describe() {
    return super.describe() + "，计划 " + this.minutes + " 分钟";
  }
}
Object.getPrototypeOf(TimedTask.prototype) === Task.prototype;
Object.getPrototypeOf(TimedTask) === Task;`,
    callback: `const task = new TimedTask("学习继承", 25);
const callback = task.describe;
callback(); // 原型方法没有自动绑定 this
callback.bind(task)();
(() => task.describe())();
task.describeBound();`,
    private: `class Task {
  #status = "待学习"; // 私有字段，ES2022
  complete() { this.#status = "已完成"; }
}
const task = new Task();
Object.keys(task); // 私有字段不会出现在这里
reactive(task).complete(); // Proxy 不是持有 #status 的原始实例`,
    composition: `const formatTask = (task, formatter) => formatter(task);
formatTask(task, task => "📋 " + task.title);
formatTask(task, task => task.title.toUpperCase());

class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}`,
    serialization: `const original = new TimedTask("学习继承", 25);
const restored = JSON.parse(JSON.stringify(original));
restored instanceof TimedTask; // ?
typeof restored.describe; // ?
// 持久化保存数据；恢复时按需要重新创建模型。`
};
const code = computed(() => examples[mode.value]);

function inspectChain(instance) {
    // 原型连接来自 Object.getPrototypeOf 的实际返回值；constructor 仅用于图上的可读标签。
    // 上限用于约束教学展示长度，不把这段绘图逻辑当通用对象类型检测器。
    const nodes = [];
    let current = instance;
    let index = 0;
    while (current !== null && index < 8) {
        const name =
            index === 0 ? `实例 ${instance.constructor.name}` : `${current.constructor?.name || "无构造器"}.prototype`;
        nodes.push({
            name,
            keys:
                Object.getOwnPropertyNames(current)
                    .filter((key) => key !== "constructor")
                    .slice(0, 8)
                    .join(", ") || "（无自有公开成员）"
        });
        current = Object.getPrototypeOf(current);
        index++;
    }
    nodes.push({ name: "null", keys: "原型链终点" });
    chain.value = nodes;
    // extends 连接两条链：实例沿 prototype 查找方法，构造器之间则继承 static 成员。
    staticChain.value = [
        { name: "TimedTask", parent: Object.getPrototypeOf(TimedTask).name },
        { name: "Task", parent: Object.getPrototypeOf(Task) === Function.prototype ? "Function.prototype" : "其他" }
    ];
}
function run() {
    clear();
    // 两个实例用来区分“共享方法”和“独立字段/私有状态”，避免把状态变化误认为影响了整个类。
    const first = new TimedTask(title.value || "学习继承", minutes.value);
    const second = new TimedTask("另一个任务", 40);
    inspectChain(first);
    if (mode.value === "prototype") {
        log("实例自有属性", Object.keys(first));
        log("Task.prototype 的成员", Object.getOwnPropertyNames(Task.prototype));
        log("两个实例的 describe 是否同一方法", first.describe === second.describe, "success");
        log("两个实例的箭头函数字段是否同一函数", first.describeBound === second.describeBound);
        const legacy = new LegacyTask("构造函数写法");
        log("传统构造函数的原型", Object.getPrototypeOf(legacy) === LegacyTask.prototype);
        log("传统写法的方法查找", legacy.describe());
        // 刻意使用构造函数显式返回对象，展示 new 会采用该对象作为结果的规则。
        function ReturnsObject() {
            this.original = true;
            return { replaced: true };
        }
        log("new 的构造函数显式返回对象", new ReturnsObject());
        log("原型方法的 enumerable", Object.getOwnPropertyDescriptor(Task.prototype, "describe").enumerable);
    } else if (mode.value === "inheritance") {
        log("重写方法并调用 super", first.describe(), "success");
        log("实例原型关系", Object.getPrototypeOf(TimedTask.prototype) === Task.prototype);
        log("静态继承关系", Object.getPrototypeOf(TimedTask) === Task);
        log("instanceof", { timed: first instanceof TimedTask, task: first instanceof Task });
        log("继承静态成员", TimedTask.category);
        log("实例上的静态成员", first.category);
        log("继承的静态工厂使用 new this", TimedTask.create("工厂创建").constructor.name);
        // 修改一个实例后检查另一个实例，验证继承关系不意味着所有实例共用同一份状态。
        first.complete();
        log("实例 A 完成 / 实例 B 未改变", { a: first.status, b: second.status });
        first.label = "  setter 修改标题  ";
        log("getter / setter", first.label);
    } else if (mode.value === "callback") {
        // 这是刻意展示的错误调用：普通原型方法被提取后不会自动绑定原实例。
        const callback = first.describe;
        try {
            log("直接执行提取方法", callback());
        } catch (error) {
            log("this 丢失：捕获实际异常", error, "error");
        }
        log("bind 绑定实例", callback.bind(first)(), "success");
        log("包装函数保留方法调用", (() => first.describe())());
        const boundField = first.describeBound;
        log("实例箭头函数字段", boundField());
    } else if (mode.value === "private") {
        log("公开可枚举字段", Object.keys(first));
        log("通过公开方法修改私有状态", first.complete(), "success");
        log("通过 getter 读取私有状态", first.status);
        // 这是刻意触发并捕获的边界：Proxy 不因代理原对象就自动持有它的 #private 成员。
        try {
            reactive(first).complete();
        } catch (error) {
            log("Proxy 与私有字段接收者", error, "error");
        }
        // markRaw 保持实例身份，但跳过代理也意味着不能据此期待私有字段自动驱动模板更新。
        const raw = markRaw(new Task("需要保持原始实例的模型"));
        log("markRaw 保持实例身份", reactive(raw) === raw);
        log("原始实例方法正常执行", raw.complete());
        log(
            "边界",
            "markRaw 会跳过代理转换，不代表私有字段变成可追踪的响应式状态。UI 状态通常用普通数据与 ref/reactive 管理。"
        );
    } else if (mode.value === "composition") {
        // 同一对象注入不同格式化策略，说明行为变化不一定需要继续增加继承层级。
        log("继承：TimedTask.describe()", first.describe());
        log(
            "组合：清单格式策略",
            formatTask(first, (task) => `📋 ${task.title}`)
        );
        log(
            "组合：时长格式策略",
            formatTask(first, (task) => `${task.minutes} min · ${task.title}`),
            "success"
        );
        const error = new ValidationError("任务标题不能为空", "title");
        log("自定义错误", { name: error.name, message: error.message, field: error.field });
        log("错误继承关系", { validation: error instanceof ValidationError, error: error instanceof Error });
    } else {
        // JSON 保存公开的可序列化数据，不保存方法、原型和 #status；这里刻意先改变私有状态再序列化。
        first.complete();
        const serialized = JSON.stringify(first);
        const restored = JSON.parse(serialized);
        log("JSON 保存了什么", serialized);
        log("恢复后的原型", Object.getPrototypeOf(restored) === Object.prototype);
        log("恢复后的 instanceof TimedTask", restored instanceof TimedTask);
        log("恢复后的 describe", typeof restored.describe);
        log("私有状态没有作为普通属性保存", Object.hasOwn(restored, "#status"));
        // 显式重建只恢复传入构造器的数据；没有记录的私有状态仍采用新实例的初始值。
        const rebuilt = new TimedTask(restored.title, restored.minutes);
        log("按数据显式重建模型", rebuilt.describe(), "success");
    }
}
function reset() {
    // 重置输出与原型图，不清空用户填写的标题/时长，方便在同一输入下对照多个分支。
    clear();
    chain.value = [];
    staticChain.value = [];
}
</script>

<template>
    <section class="stack class-lab">
        <div class="row lab-toolbar"
            ><span class="tag">CLASS · PROTOTYPE · COMPOSITION</span
            ><button class="button secondary small" @click="reset">重置实验</button></div
        >
        <div class="controls-grid"
            ><label class="field"
                >选择实验<select v-model="mode" class="control" @change="reset"
                    ><option value="prototype">实例字段 vs 原型方法</option
                    ><option value="inheritance">extends / super / static</option
                    ><option value="callback">方法回调与 this 丢失</option
                    ><option value="private">私有字段与 Vue Proxy</option
                    ><option value="composition">继承 vs 组合</option
                    ><option value="serialization">序列化之后发生了什么</option></select
                ></label
            ><label class="field">任务标题<input v-model="title" class="control" maxlength="40" /></label
            ><label class="field"
                >计划时长 {{ minutes }}min<input
                    v-model.number="minutes"
                    type="range"
                    min="5"
                    max="60"
                    step="5" /></label
        ></div>
        <pre class="code-block">{{ code }}</pre
        ><div class="row"
            ><button class="button primary" @click="run">运行并检查真实对象</button
            ><span class="muted small-note">class 语法 ES2015 · 字段与私有成员 ES2022</span></div
        >
        <div v-if="chain.length" class="prototype-panel"
            ><div
                ><h4>实例原型链</h4
                ><div class="prototype-chain"
                    ><template v-for="(node, index) in chain" :key="node.name"
                        ><span v-if="index" class="chain-arrow">↓ Object.getPrototypeOf</span
                        ><article
                            ><strong>{{ node.name }}</strong
                            ><small>{{ node.keys }}</small></article
                        ></template
                    ></div
                ></div
            ><div
                ><h4>构造器之间的继承</h4
                ><div v-for="item in staticChain" :key="item.name" class="static-relation"
                    ><code>{{ item.name }}</code
                    ><span>→</span><code>{{ item.parent }}</code></div
                ><p class="muted small-note"
                    >两条关系均由实际 Object.getPrototypeOf
                    读取。原型链中的方法是查找得到的，并非复制到了每个实例上。</p
                ></div
            ></div
        >
        <ConsoleOutput :logs="logs" />
    </section>
</template>

<style scoped>
.class-lab {
    gap: 22px;
}
.lab-toolbar {
    justify-content: space-between;
}
.controls-grid {
    display: grid;
    grid-template-columns: 1.3fr 1fr 0.8fr;
    gap: 16px;
}
.field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 12px;
    font-weight: 600;
}
input[type="range"] {
    accent-color: #267857;
}
.small-note {
    font-size: 11px;
    line-height: 1.8;
}
.prototype-panel {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
    padding: 24px;
    background: var(--surface-soft, #f6f8f4);
    border: 1px solid var(--border, #e2e7df);
    border-radius: 12px;
}
.prototype-panel h4 {
    font-size: 12px;
    margin: 0 0 18px;
}
.prototype-chain {
    display: flex;
    flex-direction: column;
    align-items: stretch;
}
.prototype-chain article {
    padding: 12px 15px;
    background: var(--surface, #fff);
    border: 1px solid #d5e4d6;
    border-radius: 7px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.prototype-chain strong {
    font: 12px monospace;
    color: var(--accent, #267857);
}
.prototype-chain small {
    font: 10px/1.6 monospace;
    color: var(--muted, #788278);
    word-break: break-word;
}
.chain-arrow {
    font: 9px monospace;
    color: #829a87;
    padding: 7px 14px;
}
.static-relation {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 15px;
    font-size: 11px;
}
.static-relation code {
    border: 1px solid var(--border, #dfe5dc);
    border-radius: 5px;
    padding: 7px 9px;
    background: var(--surface, #fff);
}
@media (max-width: 700px) {
    .controls-grid,
    .prototype-panel {
        grid-template-columns: 1fr;
    }
    .prototype-panel {
        padding: 18px;
    }
}
</style>
