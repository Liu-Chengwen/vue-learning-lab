/**
 * API 实验目录与执行函数：页面读取元数据，按钮实际调用 run，而不是执行 code 字符串。
 * year 表示该条聚焦能力进入 ECMAScript 的年份；宿主提供的能力使用字符串 "Web API" 标记。
 * 某条函数可以组合多个能力，但不能因此把整条代码使用的全部方法都算作该年份新增。
 */
/**
 * 创建一个实验条目。id 用于选择，group/year 用于分类，code 是阅读摘录。
 * run(input, log?) 接收字符串输入与可选日志函数，可以同步返回值，也可以返回 Promise。
 * returns/mutates/note 是人工说明，不是自动反射出的类型；supported 可对部分新 API 做存在性检测。
 */
const example = (id, title, year, group, code, run, details = {}) => ({
    id,
    title,
    year,
    group,
    code,
    run,
    returns: "见实际输出",
    mutates: "不修改输入",
    note: "",
    ...details
});
// 只整理本页约定的逗号分隔文本：清理空白和空项，保留重复项，后续再由 Set 示例展示去重。
const tags = (input) =>
    input
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

export const es2015Examples = [
    // 解构是属性读取与绑定；默认值仅在 undefined 时生效，并不会顺便深拷贝嵌套对象。
    example(
        "destructure",
        "解构与默认值",
        2015,
        "语法",
        `const task = { title: input, meta: { hours: 2 } };
const { title, priority = "普通", meta: { hours } } = task;
const [first, ...rest] = ["Vue", "JS", "CSS"];
({ title, priority, hours, first, rest });`,
        (input) => {
            const task = { title: input, meta: { hours: 2 } };
            const {
                title,
                priority = "普通",
                meta: { hours }
            } = task;
            const [first, ...rest] = ["Vue", "JS", "CSS"];
            return { title, priority, hours, first, rest };
        },
        { note: "默认值只在对应值为 undefined 时使用，null 不会触发解构默认值。嵌套解构要先保证父对象存在。" }
    ),
    // undefined 触发默认参数，null 不触发；本例传 null 后的结果还包含乘法的数值转换。
    example(
        "parameters",
        "默认参数与 rest",
        2015,
        "语法",
        `function total(multiplier = 1, ...values) {
  return values.reduce((sum, n) => sum + n, 0) * multiplier;
}
total(undefined, 1, 2, 3);`,
        () => {
            function total(multiplier = 1, ...values) {
                return values.reduce((sum, n) => sum + n, 0) * multiplier;
            }
            return {
                withDefault: total(undefined, 1, 2, 3),
                doubled: total(2, 1, 2, 3),
                passedNull: total(null, 1, 2, 3)
            };
        },
        { returns: "计算后的 number", note: "rest 收集剩余参数成为数组；默认参数仅在未传或传 undefined 时生效。" }
    ),
    // 对象方法简写仍是普通方法，this 来自 task.describe() 的接收者，不是箭头函数捕获。
    example(
        "template",
        "模板字符串与增强对象字面量",
        2015,
        "语法",
        `const title = input;
const field = "priority";
const task = { title, [field]: "高", describe() { return this.title; } };
\`任务：\${task.describe()}\`;`,
        (input) => {
            const title = input;
            const field = "priority";
            const task = {
                title,
                [field]: "高",
                describe() {
                    return this.title;
                }
            };
            return { task, message: `任务：${task.describe()}` };
        },
        { note: "方法简写仍然是普通方法，其 this 取决于调用方式。" }
    ),
    // ES2015 的数组/调用展开与 ES2018 的对象展开分开标注；新数组容器不意味着深拷贝。
    example(
        "spread",
        "数组 / 调用展开",
        2015,
        "语法",
        `const source = [1, 2, 3];
const copy = [...source, 4];
Math.max(...copy);`,
        () => {
            const source = [1, 2, 3];
            const copy = [...source, 4];
            return { source, copy, maximum: Math.max(...copy), sameArray: source === copy };
        },
        { note: "数组展开是浅层操作；对象 rest/spread 属于 ES2018。" }
    ),
    // Array(3) 的 3 表示长度，Array.of(3) 的 3 是元素；空槽也不同于显式存入 undefined。
    example(
        "from",
        "Array.from / Array.of",
        2015,
        "数组",
        `Array.from(new Set(input.split(",")));
Array.from({ length: 4 }, (_, i) => i + 1);
Array.of(3); // 对比 Array(3)`,
        (input) => ({
            unique: Array.from(new Set(tags(input))),
            sequence: Array.from({ length: 4 }, (_, i) => i + 1),
            of: Array.of(3),
            arrayConstructorLength: Array(3).length,
            emptySlotExists: 0 in Array(3)
        }),
        {
            returns: "新数组",
            note: "Array.from 接受可迭代对象或类数组。Array.of(3) 包含一个元素 3，Array(3) 创建长度为 3 的稀疏数组。"
        }
    ),
    // find 返回找到的原元素，未找到为 undefined；findIndex 返回索引，未找到为 -1。
    example(
        "find",
        "find / findIndex",
        2015,
        "数组",
        `const tasks = [
  { id: 1, done: true }, { id: 2, done: false }
];
tasks.find(task => !task.done);
tasks.findIndex(task => !task.done);`,
        () => {
            const tasks = [
                { id: 1, done: true },
                { id: 2, done: false }
            ];
            return {
                found: tasks.find((task) => !task.done),
                index: tasks.findIndex((task) => !task.done),
                missingValue: String(tasks.find((task) => task.id === 9)),
                missingIndex: tasks.findIndex((task) => task.id === 9)
            };
        },
        { returns: "元素或 undefined / 索引或 -1", note: "find 返回原元素的引用；返回对象不代表复制了对象。" }
    ),
    // 这三个方法返回迭代器；这里只为可视化而展开成数组，不代表 API 本身直接返回数组。
    example(
        "arrayIterators",
        "entries / keys / values",
        2015,
        "数组",
        `const values = input.split(",");
[...values.entries()];
[...values.keys()];
[...values.values()];`,
        (input) => {
            const values = tags(input);
            return { entries: [...values.entries()], keys: [...values.keys()], values: [...values.values()] };
        },
        { returns: "迭代器（示例展开为数组）" }
    ),
    // 刻意展示修改性与引用陷阱：fill/copyWithin 原地操作，fill({}) 会重复放入同一个对象引用。
    example(
        "fillCopy",
        "fill / copyWithin",
        2015,
        "数组",
        `const filled = Array(3).fill(0);
const items = [1, 2, 3, 4];
items.copyWithin(1, 2);`,
        () => {
            const filled = Array(3).fill(0);
            const items = [1, 2, 3, 4];
            const returned = items.copyWithin(1, 2);
            const shared = Array(2).fill({ done: false });
            shared[0].done = true;
            return {
                filled,
                copyWithinResult: items,
                returnsOriginal: returned === items,
                fillObjectSharesReference: shared
            };
        },
        {
            mutates: "fill 和 copyWithin 修改被调用数组",
            note: "fill({}) 会把同一个对象引用填入多个位置，并非为每个位置创建对象。"
        }
    ),
    // 字符串不可变，这些方法读取或生成新字符串；String.includes 与 Array.includes 的标准年份不同。
    example(
        "strings",
        "字符串匹配与 repeat",
        2015,
        "字符串",
        `const value = input;
value.includes("Vue");
value.startsWith("Vue");
value.endsWith("JS");
"★".repeat(3);`,
        (input) => ({
            includes: input.includes("Vue"),
            startsWith: input.startsWith("Vue"),
            endsWith: input.endsWith("JS"),
            repeated: "★".repeat(3)
        }),
        { returns: "boolean / 新字符串", note: "此处是 String.includes（ES2015）；Array.includes 是 ES2016。" }
    ),
    // 刻意修改浅拷贝后的嵌套字段，证明 Object.assign 新建目标也不会自动隔离源对象的嵌套引用。
    example(
        "assign",
        "Object.assign 与浅拷贝",
        2015,
        "对象与数值",
        `const source = { meta: { hours: 2 } };
const target = Object.assign({ theme: "green" }, source);
target.meta.hours = 8;
source.meta.hours;`,
        () => {
            const source = { meta: { hours: 2 } };
            const target = Object.assign({ theme: "green" }, source);
            target.meta.hours = 8;
            return { source, target, sameNestedObject: source.meta === target.meta };
        },
        {
            returns: "第一个目标对象",
            mutates: "修改目标对象；嵌套引用仍可能共享",
            note: "仅复制可枚举自有属性。Object.assign 不会递归深拷贝，还会触发源的 getter 与目标的 setter。"
        }
    ),
    // Object.is 对 NaN 和正负零的规则与 === 不完全相同；Number.isFinite 不做全局 isFinite 的转换。
    example(
        "equality",
        "Object.is 与数值判断",
        2015,
        "对象与数值",
        `Object.is(NaN, NaN);
Object.is(+0, -0);
Number.isNaN("hello");
Number.isFinite("12");`,
        () => ({
            nanEqualsNaN: Object.is(NaN, NaN),
            positiveNegativeZero: Object.is(+0, -0),
            strictEqualityZero: +0 === -0,
            numberIsNaNString: Number.isNaN("hello"),
            numberIsNaNValue: Number.isNaN(NaN),
            numberIsFiniteString: Number.isFinite("12"),
            globalIsFiniteString: isFinite("12")
        }),
        { returns: "boolean", note: "Number.isNaN / isFinite 不先将输入强制转换为数字；全局同名函数的语义不同。" }
    ),
    // Map/Set 中对象按引用身份区分；两个内容相同的字面量对象仍是两个不同的键/元素。
    example(
        "mapset",
        "Map / Set：键与去重",
        2015,
        "集合",
        `const unique = new Set(input.split(","));
const owner = { id: 1 };
const map = new Map([[owner, "学习者"]]);
map.get({ id: 1 }); // ?`,
        (input) => {
            const unique = new Set(tags(input));
            const owner = { id: 1 };
            const map = new Map([[owner, "学习者"]]);
            return {
                unique: [...unique],
                sameObject: map.get(owner),
                differentObject: String(map.get({ id: 1 })),
                entries: [...map],
                twoObjectsInSet: new Set([{ id: 1 }, { id: 1 }]).size
            };
        },
        {
            returns: "集合 / 按键读取的值",
            note: "对象键按引用身份区分。不要把 new Set([{id:1}, {id:1}]) 当成按 id 去重。"
        }
    ),
    // 只验证对象键读取与不可枚举接口，不尝试控制 GC 或宣称能预测某个弱引用何时被回收。
    example(
        "weak",
        "WeakMap / WeakSet",
        2015,
        "集合",
        `const owner = {};
const metadata = new WeakMap([[owner, { visited: true }]]);
const visited = new WeakSet([owner]);
metadata.get(owner);
visited.has(owner);`,
        () => {
            const owner = {};
            const metadata = new WeakMap([[owner, { visited: true }]]);
            const visited = new WeakSet([owner]);
            return {
                metadata: metadata.get(owner),
                visited: visited.has(owner),
                hasSize: "size" in metadata,
                hasIterator: typeof metadata[Symbol.iterator]
            };
        },
        { note: "弱集合不提供 size 和枚举接口；实验不依赖不可预测的垃圾回收时机。这里使用对象键。" }
    ),
    // Symbol 键可以通过 Reflect.ownKeys 找到，因此唯一标识不等于私有访问控制。
    example(
        "symbol",
        "Symbol：唯一标识",
        2015,
        "集合",
        `const first = Symbol("task");
const second = Symbol("task");
const record = { [first]: input, title: "公开字段" };
Object.keys(record);
Reflect.ownKeys(record);`,
        (input) => {
            const first = Symbol("task");
            const second = Symbol("task");
            const record = { [first]: input, title: "公开字段" };
            return {
                sameDescriptionSameSymbol: first === second,
                keys: Object.keys(record),
                allKeys: Reflect.ownKeys(record).map(String),
                symbolValue: record[first],
                globalRegistrySame: Symbol.for("lab") === Symbol.for("lab")
            };
        },
        { note: "Symbol() 每次创建新的值；Symbol.for() 使用全局注册表。Symbol 键不等于私有字段。" }
    ),
    // 手动 next 展示 value/done；展开遵循迭代协议，不会收集 done:true 对应的 return 值。
    example(
        "iterator",
        "Iterator / Generator",
        2015,
        "迭代与元编程",
        `function* taskSteps() {
  yield "阅读";
  yield "实验";
  return "完成";
}
const iterator = taskSteps();
iterator.next(); // { value, done }`,
        () => {
            function* taskSteps() {
                yield "阅读";
                yield "实验";
                return "完成";
            }
            const iterator = taskSteps();
            return {
                first: iterator.next(),
                second: iterator.next(),
                third: iterator.next(),
                spread: [...taskSteps()]
            };
        },
        { returns: "迭代结果 { value, done }", note: "for...of 与展开消费迭代协议，不包含 done: true 的 return 值。" }
    ),
    // Reflect.get 继续传递 receiver，getter 内部的 this 仍是代理，内部 title 读取也能进入 get。
    // 这里只记录拦截过程，并未实现 Vue 的依赖收集、调度或 DOM 更新。
    example(
        "proxy",
        "Proxy / Reflect 与 receiver",
        2015,
        "迭代与元编程",
        `const target = { title: input, get label() { return this.title; } };
const proxy = new Proxy(target, {
  get(target, key, receiver) { return Reflect.get(target, key, receiver); },
  set(target, key, value, receiver) { return Reflect.set(target, key, value, receiver); }
});
proxy.label;`,
        (input, log) => {
            const target = {
                title: input,
                get label() {
                    return this.title;
                }
            };
            const proxy = new Proxy(target, {
                get(object, key, receiver) {
                    log("get 拦截", String(key));
                    return Reflect.get(object, key, receiver);
                },
                set(object, key, value, receiver) {
                    log("set 拦截", { key: String(key), value });
                    return Reflect.set(object, key, value, receiver);
                }
            });
            const before = proxy.label;
            proxy.title = "新的标题";
            return { before, after: proxy.label, rawTitle: target.title };
        },
        {
            returns: "取决于原操作",
            mutates: "此示例 set 修改原始对象",
            note: "Reflect.get 传递 receiver，使 getter 中 this 保持为代理，从而继续触发 title 的 get。这里只有拦截日志，没有实现 Vue 的依赖追踪。"
        }
    )
];

export const modernExamples = [
    // includes 使用 SameValueZero，可找到 NaN；与 indexOf 的比较规则对照，而非简单替换方法名。
    example(
        "includes",
        "数组 includes",
        2016,
        "数组",
        `[NaN, 0, "Vue"].includes(NaN);
[NaN].indexOf(NaN);`,
        () => ({ includesNaN: [NaN, 0, "Vue"].includes(NaN), indexOfNaN: [NaN].indexOf(NaN), exponentiation: 2 ** 3 }),
        { returns: "boolean", note: "includes 使用 SameValueZero 比较，能匹配 NaN；不是仅仅 indexOf 的简写。" }
    ),
    // values/entries 枚举可枚举自有字符串键；继承键与 Symbol 键不在这个返回范围中。
    example(
        "entries",
        "Object.values / entries",
        2017,
        "对象",
        `const counts = { Vue: 3, JS: 2, CSS: 1 };
Object.values(counts);
Object.entries(counts);`,
        () => {
            const counts = { Vue: 3, JS: 2, CSS: 1 };
            return {
                values: Object.values(counts),
                entries: Object.entries(counts),
                paddedId: String(7).padStart(3, "0")
            };
        },
        { returns: "新数组", note: "values/entries 关注可枚举自有字符串键；Symbol 键需单独处理。" }
    ),
    // async 调用立刻返回 Promise；await 让当前函数的后续执行延后，不阻塞后面的同步日志。
    example(
        "await",
        "async / await",
        2017,
        "异步",
        `async function load() {
  const value = await Promise.resolve(input);
  return "已加载：" + value;
}
await load();`,
        async (input, log) => {
            async function load() {
                log("await 前", "同步进入函数");
                const value = await Promise.resolve(input);
                log("await 后", "在异步恢复阶段继续");
                return `已加载：${value}`;
            }
            const promise = load();
            log("调用 async 函数返回 Promise", promise instanceof Promise);
            return await promise;
        },
        {
            returns: "async 函数返回 Promise",
            note: "await 暂停当前 async 函数的后续执行，不会阻塞整个 JavaScript 线程。"
        }
    ),
    // rest 排除已提取字段，spread 复制剩余属性；嵌套 meta 仍共享，故意修改后观察源数据。
    example(
        "objectSpread",
        "对象 rest / spread",
        2018,
        "对象",
        `const source = { title: input, meta: { hours: 2 }, id: 1 };
const { id, ...rest } = source;
const copy = { ...source, title: "草稿" };
copy.meta.hours = 8;`,
        (input) => {
            const source = { title: input, meta: { hours: 2 }, id: 1 };
            const { id, ...rest } = source;
            const copy = { ...source, title: "草稿" };
            copy.meta.hours = 8;
            return { id, rest, copy, originalHours: source.meta.hours, sameNestedObject: source.meta === copy.meta };
        },
        { returns: "新对象", note: "创建新容器不代表深拷贝；属性覆盖顺序也影响最后的结果。" }
    ),
    // finally 的正常返回值不会替换原 fulfilled 值；若抛错或返回拒绝的 Promise，后续语义会改变。
    example(
        "finally",
        "Promise.finally",
        2018,
        "异步",
        `const events = [];
const result = await Promise.resolve(input)
  .finally(() => { events.push("清理 loading"); return "另一个值"; });`,
        async (input) => {
            const events = [];
            const result = await Promise.resolve(input).finally(() => {
                events.push("清理 loading");
                return "另一个值";
            });
            return { events, result };
        },
        {
            returns: "新的 Promise，通常透传原结果",
            note: "finally 的正常返回值不会替换原 fulfilled 值；但抛错或返回 rejected Promise 会改变后续结果。"
        }
    ),
    // flat 默认一层，flatMap 也是映射后展开一层；不要据名称推断它会自动无限递归。
    example(
        "flat",
        "flat / flatMap",
        2019,
        "数组",
        `[["Vue"], ["JS", "CSS"]].flat();
["Vue JS", "CSS"].flatMap(value => value.split(" "));`,
        () => ({
            flat: [["Vue"], ["JS", "CSS"]].flat(),
            flatMap: ["Vue JS", "CSS"].flatMap((value) => value.split(" ")),
            oneLevel: [1, [2, [3]]].flat()
        }),
        { returns: "新数组", note: "flat 默认展开一层；flatMap 先映射再展开一层，不是无限展开。" }
    ),
    // 与 Object.entries 形成常用转换组合；这是建立一个新对象，而不是原地重命名原对象的键。
    example(
        "fromEntries",
        "Object.fromEntries",
        2019,
        "对象",
        `const pairs = [["title", input], ["priority", "高"]];
Object.fromEntries(pairs);`,
        (input) => ({
            object: Object.fromEntries([
                ["title", input],
                ["priority", "高"]
            ]),
            trimmedStart: "   Vue   ".trimStart(),
            trimmedEnd: "   Vue   ".trimEnd()
        }),
        { returns: "新对象", note: "重复键最终保留后出现的值。可搭配 Object.entries 进行筛选和重建。" }
    ),
    // 刻意放入 0、空字符串和 null：区分“业务上有效的 falsy 值”和“确实缺省”。
    example(
        "nullish",
        "可选链与空值合并",
        2020,
        "语法",
        `const task = { hours: 0, title: "", owner: null };
task.owner?.name;
task.hours || 25;
task.hours ?? 25;`,
        () => {
            const task = { hours: 0, title: "", owner: null };
            return {
                ownerName: String(task.owner?.name),
                withOr: task.hours || 25,
                withNullish: task.hours ?? 25,
                emptyTitleWithOr: task.title || "默认标题",
                emptyTitleWithNullish: task.title ?? "默认标题"
            };
        },
        { note: "?? 仅处理 null/undefined；?. 不会替你声明一个不存在的变量。" }
    ),
    // rejected 是输入任务的状态，不应吞成成功结果；allSettled 仍会返回包含两个状态的数组。
    example(
        "settled",
        "Promise.allSettled",
        2020,
        "异步",
        `await Promise.allSettled([
  Promise.resolve("任务列表"),
  Promise.reject(new Error("统计失败"))
]);`,
        async () => {
            const results = await Promise.allSettled([
                Promise.resolve("任务列表"),
                Promise.reject(new Error("统计失败"))
            ]);
            return results.map((result) =>
                result.status === "fulfilled" ? result : { status: result.status, reason: result.reason.message }
            );
        },
        { returns: "各输入结果的状态数组（保持输入顺序）", note: "适合允许部分失败的并行任务；不会自动取消底层工作。" }
    ),
    // 刻意混用 BigInt 与 Number 并捕获异常，展示“都表示数字”不等于可以直接混合算术。
    example(
        "bigint",
        "BigInt（拓展）",
        2020,
        "数值",
        `const value = 9007199254740993n;
value + 2n;
// value + 2 会抛 TypeError`,
        () => {
            const value = 9007199254740993n;
            let mixedError;
            try {
                value + 2;
            } catch (error) {
                mixedError = error.message;
            }
            return { value: `${value}n`, added: `${value + 2n}n`, mixedError };
        },
        { returns: "bigint", note: "BigInt 与 Number 不能直接混合算术，JSON.stringify 默认也不直接支持 BigInt。" }
    ),
    // any 忽略单个拒绝，等待首次成功；它与 race 关注首次 settled 的行为不同，也不会自动取消别的工作。
    example(
        "any",
        "Promise.any",
        2021,
        "异步",
        `await Promise.any([
  Promise.reject(new Error("服务 A 不可用")),
  Promise.resolve("服务 B 成功")
]);`,
        async () => ({
            firstSuccess: await Promise.any([
                Promise.reject(new Error("服务 A 不可用")),
                Promise.resolve("服务 B 成功")
            ])
        }),
        {
            returns: "最先 fulfilled 的值",
            note: "只有全部输入都拒绝时才以 AggregateError 拒绝；与 race 关注最先 settled 不同。"
        }
    ),
    // 逻辑赋值是短路操作，赋值条件分别是 truthy、falsy、nullish；不要用 ||= 误覆盖有效的 0。
    example(
        "logical",
        "逻辑赋值与 replaceAll",
        2021,
        "语法",
        `const config = { page: 0, size: undefined, enabled: true };
config.page ||= 1;
config.size ??= 20;
config.enabled &&= false;
"Vue/Vue".replaceAll("Vue", input);`,
        (input) => {
            const config = { page: 0, size: undefined, enabled: true };
            config.page ||= 1;
            config.size ??= 20;
            config.enabled &&= false;
            return { config, replaced: "Vue/Vue".replaceAll("Vue", input) };
        },
        {
            mutates: "逻辑赋值可能修改对应属性；replaceAll 返回新字符串",
            note: "三种赋值的短路条件不同，不能把 ||= 与 ??= 当成同一种默认值策略。"
        }
    ),
    // at 允许负索引；hasOwn 不依赖实例自己的 hasOwnProperty 方法，也不把继承属性当自有字段。
    example(
        "at",
        "Array.at / Object.hasOwn",
        2022,
        "数组",
        `const values = ["Vue", "JS", "CSS"];
values.at(-1);
const task = Object.create({ inherited: true });
task.title = input;
Object.hasOwn(task, "inherited");`,
        (input) => {
            const values = ["Vue", "JS", "CSS"];
            const task = Object.create({ inherited: true });
            task.title = input;
            return {
                last: values.at(-1),
                outOfRange: String(values.at(9)),
                ownsTitle: Object.hasOwn(task, "title"),
                ownsInherited: Object.hasOwn(task, "inherited"),
                inOperatorFindsInherited: "inherited" in task
            };
        },
        {
            returns: "元素或 undefined / boolean",
            note: "Object.hasOwn 不会因对象重写 hasOwnProperty 或原型为 null 而失效。"
        }
    ),
    // class 基础语法是 ES2015；这里聚焦 ES2022 字段和私有成员，私有字段不是普通可枚举键。
    example(
        "fields",
        "类字段与私有成员",
        2022,
        "类",
        `class Counter {
  #count = 0;
  static kind = "counter";
  next() { return ++this.#count; }
}
const counter = new Counter();
counter.next();`,
        () => {
            class Counter {
                #count = 0;
                static kind = "counter";
                next() {
                    return ++this.#count;
                }
            }
            const counter = new Counter();
            return {
                first: counter.next(),
                second: counter.next(),
                keys: Object.keys(counter),
                staticKind: Counter.kind,
                instanceKind: String(counter.kind)
            };
        },
        { note: "class 与 extends 是 ES2015；公有/私有字段等类能力在后续标准中完善。完整继承实验见“类、原型与继承”。" }
    ),
    // 与 sort/reverse 的原地行为对照。这里只复制数组层，若元素是对象，其引用仍可能共享。
    example(
        "toSorted",
        "toSorted / toReversed",
        2023,
        "数组",
        `const values = [3, 1, 2];
const sorted = values.toSorted((a, b) => a - b);
const reversed = values.toReversed();
({ values, sorted, reversed });`,
        () => {
            const values = [3, 1, 2];
            return { values, sorted: values.toSorted((a, b) => a - b), reversed: values.toReversed() };
        },
        {
            returns: "新数组（浅层）",
            supported: () => typeof Array.prototype.toSorted === "function",
            note: "对比 sort/reverse 的原地修改。数组里的对象元素仍保持引用身份。"
        }
    ),
    // 复制式 API 不改原数组，但仍有边界：with 越界会抛 RangeError，不是任意属性赋值的等价替换。
    example(
        "toSpliced",
        "toSpliced / with",
        2023,
        "数组",
        `const values = ["Vue", "JS", "CSS"];
const inserted = values.toSpliced(1, 1, "TypeScript");
const replaced = values.with(-1, "布局");`,
        () => {
            const values = ["Vue", "JS", "CSS"];
            return { values, inserted: values.toSpliced(1, 1, "TypeScript"), replaced: values.with(-1, "布局") };
        },
        {
            returns: "新数组（浅层）",
            supported: () =>
                typeof Array.prototype.toSpliced === "function" && typeof Array.prototype.with === "function",
            note: "with 的越界索引会抛 RangeError；它不是任意索引的赋值替代。"
        }
    ),
    // 从尾部搜索不意味着反转原数组；返回元素/索引的缺失语义仍分别是 undefined / -1。
    example(
        "findLast",
        "findLast / findLastIndex",
        2023,
        "数组",
        `const tasks = [{ id: 1, done: true }, { id: 2, done: true }];
tasks.findLast(task => task.done);
tasks.findLastIndex(task => task.done);`,
        () => {
            const tasks = [
                { id: 1, done: true },
                { id: 2, done: true }
            ];
            return {
                last: tasks.findLast((task) => task.done),
                index: tasks.findLastIndex((task) => task.done),
                unchanged: tasks
            };
        },
        { returns: "元素或 undefined / 索引或 -1", supported: () => typeof Array.prototype.findLast === "function" }
    ),
    // structuredClone 属于运行环境 API。日期/Set 可保留相应结构，但函数示例会刻意抛出 DataCloneError。
    example(
        "clone",
        "structuredClone：宿主 API",
        "Web API",
        "运行环境",
        `const source = { title: input, date: new Date("2026-01-01"), tags: new Set(["Vue"]) };
const copied = structuredClone(source);
copied.date instanceof Date;
copied.tags instanceof Set;`,
        (input) => {
            const source = { title: input, date: new Date("2026-01-01"), tags: new Set(["Vue"]) };
            const copied = structuredClone(source);
            let errorMessage;
            try {
                structuredClone({ callback() {} });
            } catch (error) {
                errorMessage = `${error.name}: 函数不能这样复制`;
            }
            return {
                differentObject: source !== copied,
                datePreserved: copied.date instanceof Date,
                setPreserved: copied.tags instanceof Set,
                tags: [...copied.tags],
                unsupportedFunction: errorMessage
            };
        },
        {
            returns: "结构化克隆的结果",
            supported: () => typeof structuredClone === "function",
            note: "这是运行环境 API，不是 ES2022 新增的 ECMAScript 方法。不能用于任意函数、DOM 节点或响应式 Proxy 的通用复制。"
        }
    )
];
