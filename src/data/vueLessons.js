// 章节元数据与实际源码入口同源；子组件也能在“阅读源码”页签直接切换查看。
// 这里只保存相对路径，真正的 SFC 导入由实验入口负责，文本读取由 SourceViewer 负责。
const relatedSources = {
    "setup": ["components/OptionsCounter.vue", "components/SetupCounter.vue"],
    "templates": ["components/DraftRow.vue", "components/MountProbe.vue"],
    "communication": ["components/CommunicationChild.vue", "components/InjectedTheme.vue"],
    "models": ["components/ModelInput.vue", "components/DualModelEditor.vue"],
    "slots": ["components/SlotCard.vue"],
    "lifecycle": ["components/LifecycleProbe.vue", "components/useScopedTicker.js", "components/ErrorProbe.vue"],
    "builtins": ["components/CachedEditor.vue", "components/AsyncReport.vue"],
    "router-state": [
        "labCounterStore.js",
        "components/StoreConsumer.vue",
        "RouterPlayground.vue",
        "RouterChildPanel.vue"
    ],
    "rendering": ["components/RenderIdentity.vue"],
    "migration": ["components/ModelInput.vue"]
};

/**
 * 将每章的简写参数规范化成 LessonFrame / catalogue / questions 共用的字段。
 * file 是实验文件名（不带扩展名），relatedSources 补齐它依赖的子组件入口。
 * vue2 是迁移说明而非执行模式开关；question/answer 会包装成当前章的一条问答。
 * 保持 topic 和生成的 id 稳定，避免导航、题库和已保存的学习记录失去对应关系。
 */
const lesson = (topic, title, subtitle, level, file, goals, explanation, question, answer, vue2, exercise) => ({
    id: `vue-${topic}`,
    topic,
    title,
    subtitle,
    category: "Vue 3",
    level,
    source: [`${file}.vue`, ...(relatedSources[topic] || [])].map((path) => `src/features/labs/${path}`),
    goals,
    explanation,
    interview: [{ question, answer }],
    vue2,
    exercise
});

// 数组顺序就是核心课程的阅读顺序；文字和示例入口分离，调整内容不会提前加载实验组件。
export const vueLessons = [
    lesson(
        "setup",
        "从 Options 到 Composition",
        "同一个计数器，三种代码组织方式。",
        "入门",
        "SetupLab",
        ["比较 Options、setup 与 script setup", "理解每个组件实例拥有独立状态", "区分运行时 API 和编译宏"],
        [
            "Options 按 data、methods、computed 等选项组织；Composition 可以按业务功能组织状态与逻辑。",
            "script setup 是编译语法糖，顶层声明可直接在模板使用；它的主体会在每次创建组件实例时执行。",
            "ref 在脚本里通过 .value 访问，在模板中的顶层绑定通常自动解包。"
        ],
        "Composition API 是否意味着 Options API 被淘汰？",
        "不是。Vue 3 继续支持 Options API；Composition API 也内置于 Vue 2.7。选择更多取决于代码组织、逻辑复用和团队约定。",
        "Vue 2 常见 Options 写法在 Vue 3 中仍然有效；Vue 3 的应用入口改用 createApp，配置隔离在应用实例上。",
        "给三个计数器都增加一个双倍数值，比较 computed 分别写在哪里。"
    ),
    lesson(
        "templates",
        "模板、条件与列表",
        "改一段文案、重排一个列表，观察声明式渲染。",
        "入门",
        "TemplatesLab",
        ["使用事件与表单修饰符", "比较 v-if 与 v-show", "解释稳定 key 与组件身份"],
        [
            "v-if 会创建和销毁分支；v-show 始终保留节点，通过 display 控制显示。",
            "key 用来识别节点或组件身份。列表可重排且子组件有自己的状态时，索引常不能代表业务身份。",
            "建议先用 computed 筛选，再 v-for 渲染；避免把 v-if 与 v-for 写在同一个元素上。"
        ],
        "为什么列表输入框在排序后可能出现状态错位？",
        "如果用索引作 key，Vue 会按位置复用组件，组件内保留的编辑状态可能与新的业务项不匹配。稳定 ID 可让状态随对应组件移动。",
        "Vue 3 中同节点 v-if 优先级高于 v-for；Vue 2 相反。template v-for 的 key 在 Vue 3 应放在 template 上。",
        "为列表增加删除与筛选，分别用索引和 ID 作 key 再观察输入状态。"
    ),
    lesson(
        "reactivity",
        "响应式不是魔法",
        "观察普通快照、响应式引用、浅层状态和集合。",
        "基础",
        "ReactivityLab",
        ["选择 ref 或 reactive", "复现普通解构丢失响应性", "验证浅层响应与 customRef"],
        [
            "ref 可包装基本值或对象；reactive 返回对象的响应式代理。对 reactive 的属性做普通解构，基本类型会成为快照。",
            "toRef/toRefs 保留与源属性的连接；readonly 是只读代理，并不等于 Object.freeze。",
            "shallowRef 只跟踪 .value 的替换，深层修改不会使依赖它的计算值失效；triggerRef 可显式触发。markRaw 用来跳过代理。"
        ],
        "把 reactive 对象重新赋值，为什么原来的引用没有跟着更新？",
        "已有消费者仍持有旧代理。可以保留代理并更新其属性，或者使用 ref 容器来表达整个对象的替换。需要根据引用归属选择。",
        "Vue 3 用 Proxy 处理响应式对象，支持侦测属性新增/删除、数组索引等；Vue 2 中部分此类变更需要 Vue.set 或数组方法。",
        "让一个 shallowRef 中的数组追加元素，分别用替换数组与 triggerRef 更新页面。"
    ),
    lesson(
        "watchers",
        "计算、侦听与更新队列",
        "让旧请求失效，再等待一次真正的 DOM 更新。",
        "进阶",
        "WatchersLab",
        ["区分派生状态与副作用", "清理失效请求", "观察批量更新、flush 与 nextTick"],
        [
            "computed 适合纯派生状态，缓存属于当前计算实例。watch 显式指定来源；watchEffect 自动收集同步执行期间读取的依赖。",
            "watch 回调可用第三个参数 onCleanup。Vue 3.5+ 还提供 onWatcherCleanup，必须在同步阶段注册，不能放在 await 之后。",
            "Vue 批量处理 DOM 更新。nextTick 等待相关 Vue DOM 刷新，并不保证浏览器已完成绘制。"
        ],
        "快速输入为什么会被旧请求结果覆盖？",
        "请求完成顺序不一定等于发起顺序。需要取消旧请求或使用请求序号丢弃过期结果，同时避免旧请求错误结束新请求的 loading。",
        "Vue 3 的 watch 可直接侦听 ref、getter、响应式对象等；侦听 reactive 对象的属性要传 getter，不能把读取到的普通值当来源。数组侦听要注意替换与深层修改的区别。",
        "改成不取消旧定时器，比较快速输入时的结果；再实现请求序号方案。"
    ),
    lesson(
        "communication",
        "让数据沿着组件树流动",
        "父子、兄弟、跨层通信与受限的实例接口。",
        "基础",
        "CommunicationLab",
        ["使用 props 与 emits", "跨层注入响应式状态", "通过 defineExpose 调用聚焦接口"],
        [
            "props 表达父组件输入，事件表达子组件提出的变更。props 是浅只读的，嵌套对象可能被改动，但这样会模糊数据流。",
            "兄弟组件可由共同父级协调；跨层上下文适合 provide/inject；跨页面业务状态可以使用 Pinia。",
            "script setup 组件默认不暴露内部绑定给父级，通过 defineExpose 提供最小的公开接口。"
        ],
        "所有通信都用全局 store 是否更简单？",
        "局部状态仍应尽量靠近使用者。父子优先 props/emits，上下文用注入，跨页面共享业务状态再考虑 store，避免扩大耦合与生命周期。",
        "Vue 3 声明 emits 能区分组件事件与透传监听器；实例 $on/$off/$once 被移除，不能直接沿用 Vue 2 的实例事件总线。",
        "把主题改为只读注入，同时提供 setTheme 方法，让孙组件通过明确接口申请修改。"
    ),
    lesson(
        "models",
        "把 v-model 拆开看",
        "原生输入、组件协议、多字段与自定义修饰符。",
        "基础",
        "ModelsLab",
        ["理解组件 model 协议", "使用 defineModel（3.4+）", "组合具名 model 与修饰符"],
        [
            "组件 v-model 默认对应 modelValue prop 与 update:modelValue 事件。defineModel 把这套协议封装为一个可写 ref。",
            "具名 v-model 可用于多个字段，如 v-model:title 与 v-model:priority。",
            "自定义组件修饰符需要组件处理；原生 .trim/.number/.lazy 的行为由 Vue 的表单绑定逻辑提供。"
        ],
        "defineModel 是否会让子组件直接修改父组件 props？",
        "它生成 modelValue 与更新事件协议；写入 model ref 会发送更新事件，父组件再更新自己的状态。它不是绕过单向数据流。",
        "Vue 2 默认使用 value/input；Vue 3 默认是 modelValue/update:modelValue，具名 model 也替代了常见的 .sync 用法。",
        "用手写 defineProps + defineEmits 实现与 defineModel 等价的输入框。"
    ),
    lesson(
        "slots",
        "为组件留出扩展点",
        "让布局组件决定结构，让使用方决定内容。",
        "进阶",
        "SlotsLab",
        ["区分插槽内容与插槽 props 的作用域", "使用具名、动态与作用域插槽", "显式管理多根节点的 attrs"],
        [
            "插槽内容在父组件作用域编译；子组件通过插槽 props 向父级提供渲染所需数据。",
            "多根组件没有唯一的隐式 attrs 接收节点，使用 inheritAttrs: false 并显式 v-bind=attrs 选择位置。",
            "attrs 包括未声明的属性与监听器。scoped CSS 通过作用域标记限制选择器，:deep 与 :slotted 表达明确扩展边界。"
        ],
        "封装组件时为什么 class 生效了，但某个点击事件却重复触发？",
        "要检查事件是否既由 emits 手动发出，又作为 attrs 监听器传给底层。声明公开事件并明确透传位置，避免两条路径同时触发。",
        "Vue 3 统一普通/作用域插槽；$listeners 合并进 $attrs，且 $attrs 包含 class/style。",
        "为卡片加一个动态插槽，让业务内容不需要修改基础组件。"
    ),
    lesson(
        "lifecycle",
        "管理生命周期与副作用",
        "反复挂载组件，确认计时器和监听器真正被清理。",
        "进阶",
        "LifecycleLab",
        ["观察挂载、更新与卸载", "在 composable 内注册清理", "体验自定义指令、错误捕获与插件注入"],
        [
            "setup 在组件初始化时执行；生命周期钩子需要在 setup 的同步阶段注册。",
            "组件创建的副作用应有对应清理。onScopeDispose 适合让 composable 跟随所属作用域释放资源。",
            "自定义指令负责可复用的 DOM 行为；插件通过 app.use 扩展应用，provide/inject 可提供服务。onErrorCaptured 可以捕获后代组件错误。"
        ],
        "页面缓存后为什么定时器还在运行？",
        "KeepAlive 停用不会卸载组件，因此 unmounted 清理不会发生。需要根据业务在 activated/deactivated 中暂停和恢复副作用。",
        "beforeDestroy/destroyed 在 Vue 3 更名为 beforeUnmount/unmounted；自定义指令钩子也向组件生命周期名称对齐。",
        "把计时器组件放入 KeepAlive，分别处理停用与最终卸载。"
    ),
    lesson(
        "builtins",
        "缓存、传送与异步边界",
        "同样是切换页面，有些状态应该保留，有些应该销毁。",
        "进阶",
        "BuiltinsLab",
        ["比较动态组件与 KeepAlive", "用 Teleport 管理弹层位置", "体验异步组件与实验性 Suspense"],
        [
            "KeepAlive 缓存组件实例，切换时触发 activated/deactivated，最终移出缓存时才卸载。",
            "Teleport 改变真实 DOM 的放置位置，不改变逻辑组件树，因此注入与事件关系仍沿组件树工作。",
            "defineAsyncComponent 延迟加载组件定义；Suspense 协调 async setup 等依赖，目前仍是实验性 API，不能等同于完整错误边界。"
        ],
        "Teleport 解决了所有弹窗样式问题吗？",
        "它能帮助摆脱某些祖先裁剪或层叠限制，但 CSS 继承、焦点、滚动锁定、z-index 与无障碍仍需具体处理。",
        "Fragment、多根组件、Teleport、Suspense 是 Vue 3 的重要能力；TransitionGroup 默认不再生成包裹节点。KeepAlive 与 Transition 在 Vue 2 中已存在。",
        "关闭缓存后比较两个编辑页的草稿，再加入 include/exclude 控制缓存对象。"
    ),
    lesson(
        "router-state",
        "路由与跨组件状态",
        "URL 保存可分享的条件，store 保存需要共享的状态。",
        "工程",
        "RouterStateLab",
        [
            "读取 params/query 与实际导航",
            "通过两个组件共享 Pinia 状态",
            "观察路由离开守卫",
            "通过嵌套 RouterView 保留父布局状态"
        ],
        [
            "Router 与 Pinia 是生态库，不是 Vue 核心 API。路由参数适合标识资源，query 适合可分享的筛选条件。",
            "Pinia setup store 通过 ref/computed/函数组织 state/getters/actions；解构响应式状态时使用 storeToRefs。",
            "store 不会自动持久化。刷新恢复需要明确的存储与恢复策略；示例实验 store 特意只展示内存状态。",
            "真正的嵌套路由需要 children 配置与父布局内的 RouterView 出口。切换子路由可保留父级局部状态；同组件是否重建取决于组件身份与 key。"
        ],
        "为什么不能直接从 store 解构 count？",
        "普通解构会读取当前基本值。storeToRefs 为响应式 state/getters 保留引用；action 可直接解构，因为它是绑定的函数。",
        "Vue 3 生态常见 Vue Router 4 与 Pinia；它们的选择不等同于所有 Vue 2 项目都只能使用 Vuex。",
        "把筛选条件写进 query，然后复制 URL 到新标签验证；为 store 增加有版本号的本地持久化。"
    ),
    lesson(
        "rendering",
        "组件身份与渲染优化",
        "观察 key、v-once、v-memo 与真实 render 函数。",
        "深入",
        "RenderingLab",
        ["用 key 控制实例身份", "观察 once/memo 的更新边界", "阅读 h/render 与编译优化说明"],
        [
            "模板会被编译为渲染函数。静态提升、patch flag 和 block 等优化帮助运行时缩小需要处理的范围。",
            "v-once 只渲染一次；v-memo 根据显式依赖决定是否复用子树。遗漏依赖会造成显示过期，优化必须以正确行为为前提。",
            "key 改变意味着组件身份改变，可用于重建表单；它不是越随机越好，随机 key 会破坏复用。"
        ],
        "Vue 3 的 diff 是否会比较整棵真实 DOM？",
        "更新首先基于虚拟节点和编译期信息，针对动态部分进行补丁处理。稳定 key 参与节点匹配，不等于免除所有比较或直接操作整棵真实 DOM。",
        "Vue 3 的编译器提供更多面向模板的优化信息；不能据此断言所有页面和所有操作都固定快某个百分比。",
        "故意从 v-memo 依赖中移除一个显示字段，再观察过期结果并修复。"
    ),
    lesson(
        "migration",
        "从版本差异到面试表达",
        "把迁移知识落到实际输入、输出与组件协议上。",
        "复盘",
        "MigrationLab",
        ["区分版本差异与 API 风格", "复习绑定与事件迁移", "用可运行例子回答面试追问"],
        [
            "先描述业务现象，再说明机制与选择，而不是只背 API 名称。",
            "迁移关注协议与行为：组件 model、事件透传、生命周期和应用配置，而不只是把 data 改写成 ref。",
            "检查小版本要求，defineModel 为 3.4+，响应式 props 解构与 useTemplateRef 为 3.5+。"
        ],
        "如果只能用一分钟介绍你为什么选择 Vue 3，你会怎么说？",
        "结合具体项目谈按业务组织与复用逻辑、响应式对象侦测范围、组件协议与工具链，再说明 Options API 仍可用及项目约束，避免泛化为某种写法必然更快。",
        "完整迁移清单在迁移专区；这里的交互演示实际使用 Vue 3，而不是同时加载两套运行时。",
        "选择一个真实组件，分别写出 Vue 2 协议、Vue 3 协议与迁移风险。"
    )
];
