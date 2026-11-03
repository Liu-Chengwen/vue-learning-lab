import { catalogue } from "./catalogue";
import { uiLesson } from "./uiLesson";
import { migrationCases } from "./migrationCases";

// 复习题直接来自实验元数据，避免维护两套不一致的问答。
const categories = { vue: "Vue 3", css: "CSS", javascript: "JavaScript", tooling: "工程化", ui: "组件库" };
// flatMap 把“每专题多道题”展平成列表，并统一字符串题干与对象问答的形状。
// 生成的 lesson.id:index 会保存为收藏/自评键；调整同一章题目顺序时需考虑旧记录兼容。
const lessonQuestions = catalogue
    .filter((v) => v.interview)
    .flatMap((lesson) =>
        lesson.interview.map((question, index) => ({
            id: lesson.id + ":" + index,
            question: typeof question === "string" ? question : question.question,
            answer: typeof question === "string" ? String(lesson.explanation || "") : question.answer,
            category: categories[lesson.track] || "Vue 3",
            level: lesson.level || "基础",
            lesson: lesson.title,
            path: lesson.path
        }))
    );
// 在课程题之外拼接组件库题、迁移题和综合追问；前缀区分来源，避免不同来源 ID 冲突。
export const questions = [
    ...lessonQuestions,
    ...uiLesson.interview.map((v, i) => ({
        ...v,
        id: "ui:" + i,
        category: "组件库",
        level: "应用",
        lesson: uiLesson.title,
        path: "/ui-library"
    })),
    ...migrationCases.map((v) => ({
        id: "migration:" + v.id,
        question: v.question,
        answer: v.reason,
        category: "迁移",
        level: "理解",
        lesson: v.title,
        path: v.path
    })),
    // 综合追问把单个 API 的行为放回设计场景，补足纯演示问答的边界。
    ...[
        [
            "vue-computed",
            "Vue 3",
            "/labs/watchers",
            "computed 的 getter 里适合发请求或修改其他状态吗？",
            "不适合。computed 用于纯派生计算，副作用会让执行时机、缓存与依赖关系难以推断。请求或同步外部系统适合 watch/watchEffect，异步工作还要处理过期与清理。"
        ],
        [
            "vue-props-destructure",
            "Vue 3",
            "/labs/reactivity",
            "为什么有的 props 解构能更新，有的 reactive 解构却不能？",
            "Vue 3.5+ 的 script setup 编译器可以改写同一作用域中的 defineProps 解构访问；普通 reactive 对象的基本值解构仍然是一次读取。把值传给外部函数时还要考虑 getter/toRef，不能把编译支持泛化成所有解构都响应式。"
        ],
        [
            "vue-emits",
            "Vue 3",
            "/labs/slots",
            "声明 emits 对组件封装的作用是什么？",
            "它声明公开事件，使监听器与未声明的 attrs 透传区分开。封装底层组件时，应明确每个事件是手动发送还是透传，避免两条路径导致重复触发，也让使用者更清楚组件契约。"
        ],
        [
            "vue-cache-key",
            "Vue 3",
            "/labs/builtins",
            "KeepAlive、v-if 和 v-show 保留状态的方式相同吗？",
            "不同。v-if 的条件切换会创建和卸载；v-show 保留实例与 DOM，仅切换显示；KeepAlive 缓存动态组件实例，移出显示时触发停用而不是立即卸载。副作用是否暂停仍由业务决定。"
        ],
        [
            "vue-errors",
            "Vue 3",
            "/labs/lifecycle",
            "onErrorCaptured 能代替业务请求的 try/catch 吗？",
            "不能把所有业务失败都交给组件错误边界。onErrorCaptured 处理后代组件相关错误传播；请求代码仍应在自己负责的流程中管理可预期失败、重试与 loading，并保留用户输入。"
        ],
        [
            "vue-pinia-refs",
            "Vue 3",
            "/labs/router-state",
            "直接解构 Pinia store 的 state 与 action 有什么区别？",
            "state/getter 的普通值解构可能失去与 store 的响应式连接，适合用 storeToRefs 取得 refs。action 是可调用的 store 方法，通常可直接解构。状态归属与解构方式是两个需要分别判断的问题。"
        ],
        [
            "js-prototype-fields",
            "JavaScript",
            "/javascript/classes",
            "class 的原型方法和箭头函数字段有什么差异？",
            "原型方法通常由实例共享，调用时的 this 取决于接收者；箭头函数字段在每个实例上创建并捕获初始化时的 this。后者便于回调，但在方法共享、覆盖与继承方面并非完全等价。"
        ],
        [
            "js-private",
            "JavaScript",
            "/javascript/classes",
            "子类能通过 this 直接访问父类的 #private 字段吗？",
            "不能。私有名称的访问权限由声明它的类体决定，子类不能直接引用父类的私有名称。父类公开方法可在正确接收者上使用自己的私有字段；这与普通属性的原型查找不同。"
        ],
        [
            "js-serialization",
            "JavaScript",
            "/javascript/classes",
            "JSON 保存再读取 class 实例，是否还能直接调用原来的方法？",
            "通常不能。JSON 保留可序列化的数据，不记录实例的原型和方法。读取后一般是普通对象，需要显式重建领域实例或继续以普通数据处理。持久化策略应围绕数据结构设计。"
        ],
        [
            "js-live-binding",
            "JavaScript",
            "/javascript/modules",
            "ES module 的 live binding 与普通对象解构一样吗？",
            "不一样。命名导入访问导出绑定，导出方更新绑定后可读到新值，而导入方不能重新赋值该绑定。普通对象的基本值解构只是当时的值；对象引用和其内部可变性又是另一层问题。"
        ],
        [
            "js-copy-elements",
            "JavaScript",
            "/javascript/arrays",
            "展开数组或调用 toSorted 后，编辑其中对象为什么仍影响原数据？",
            "新建的是数组容器，元素中的对象引用仍可能共享。浅层复制不能隔离嵌套编辑，应按业务结构复制需要修改的字段。排序是否修改容器与对象是否共享引用要分别验证。"
        ],
        [
            "js-polyfill",
            "JavaScript",
            "/javascript/modern",
            "项目能构建成功，是否代表所有目标浏览器都支持新的数组 API？",
            "不代表。语法转换不等于给运行环境补充标准库实现。需要按目标环境核对支持情况，采用可用替代或合适 polyfill。动态检测只能判断是否存在，仍要理解方法语义和边界。"
        ],
        [
            "css-flex-min",
            "CSS",
            "/css/flex",
            "flex: 1 后子项为什么仍可能被长文本撑开？",
            "flex-grow 并不取消默认最小尺寸约束。flex 子项的自动最小尺寸可能受内容影响，常需要在正确的可收缩项上设置 min-width:0，并配合换行或溢出策略。还要检查父级和内部嵌套布局。"
        ],
        [
            "css-margin",
            "CSS",
            "/css/bfc",
            "垂直 margin 在什么情况下会折叠，gap 是否也会折叠？",
            "普通块级流中的部分相邻、父子和空块垂直 margin 可以折叠，具体受边框、内边距、内容和格式化上下文等条件影响。Flex/Grid 项的布局规则不同，gap 是容器定义的间距，不按块 margin 折叠处理。"
        ],
        [
            "css-zindex",
            "CSS",
            "/css/position",
            "z-index 设置得很大，弹窗为什么仍在别的元素下面？",
            "先检查它所在的层叠上下文。子元素的层级不能随意越过祖先所在上下文的整体顺序，transform、定位及其他属性都可能参与创建上下文。Teleport 能改变实际 DOM 放置位置，但仍需合理管理弹层层级和样式。"
        ]
    ].map(([id, category, path, question, answer]) => ({
        id,
        category,
        path,
        question,
        answer,
        level: "综合追问",
        lesson: "回到相关实验验证"
    }))
];
