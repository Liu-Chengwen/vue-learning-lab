// 这里的 Vue 2 片段只用于对照阅读；实际实验运行时统一使用 Vue 3。
// 每条记录按“同一需求 → before/after → 变化原因 → 面试追问 → 相关实验路径”组织。
// before/after 中的 \n 是字符串换行，由 <pre><code> 按文本展示，不是待执行的源文件。
// id 同时用于列表 key 与题库 migration:id，调整标题时应保持 id 稳定。
export const migrationCases = [
    {
        id: "app",
        title: "应用实例与全局配置",
        tag: "应用入口",
        path: "/labs/setup",
        before: "import Vue from 'vue'\nVue.prototype.$appName = '学习台'\nnew Vue({ render: h => h(App) }).$mount('#app')",
        after: "import { createApp } from 'vue'\nconst app = createApp(App)\napp.provide('appName', '学习台')\napp.mount('#app')",
        reason: "Vue 3 使用 createApp 创建独立应用上下文，插件、组件注册和依赖注入基于应用实例。provide 是显式依赖共享；globalProperties 适用于确实需要全局实例属性的兼容场景。",
        question: "createApp 相比 new Vue 的应用级配置有什么意义？"
    },
    {
        id: "reactivity",
        title: "对象与数组的变更侦测",
        tag: "响应式",
        path: "/labs/reactivity",
        before: "// Vue 2：新增属性、数组索引替换等有侦测限制\nVue.set(user, 'role', 'developer')\nitems.splice(0, 1, nextItem)",
        after: "const user = reactive({ name: 'Lin' })\nuser.role = 'developer'\nconst items = reactive(['Vue'])\nitems[0] = 'Vue 3'",
        reason: "Vue 3 的响应式对象使用 Proxy 拦截属性访问与变更，不再需要 $set/$delete。ref 对象通过 .value 暴露访问入口；普通变量赋值不会自动成为响应式。",
        question: "Vue 3 为什么不再需要 $set？这是否意味着任何变量都能响应式？"
    },
    {
        id: "model",
        title: "组件 v-model 协议与多个绑定",
        tag: "组件通信",
        path: "/labs/models",
        before: "// 默认：value prop + input 事件\nthis.$emit('input', nextValue)\n// 同步具名 prop 常使用 :title.sync",
        after: "// 显式协议\nconst props = defineProps(['modelValue'])\nconst emit = defineEmits(['update:modelValue'])\nemit('update:modelValue', nextValue)\n// Vue 3.4+ 简写：const title = defineModel('title')",
        reason: "Vue 3 默认协议变为 modelValue/update:modelValue，具名 v-model 取代 .sync，并可同时绑定多个字段。defineModel 是编译宏，需理解它生成的 prop 和事件。",
        question: "defineModel 和 modelValue/update:modelValue 是什么关系？"
    },
    {
        id: "events",
        title: "emits、.native 与属性透传",
        tag: "组件接口",
        path: "/labs/slots",
        before: "<Child @click.native='handleClick' />\n// $listeners 与 $attrs 分开\n// 使用 $on/$off 搭建实例事件总线",
        after: "const emit = defineEmits(['save'])\n// 未声明的监听器可能进入 $attrs\n// $attrs 包含 class、style 和事件监听\n// 多根组件需明确绑定到哪个节点：v-bind='$attrs'",
        reason: "Vue 3 移除了 .native 与实例 $on/$off/$once；组件事件通过 emits 声明。封装时应明确 attrs 的透传目标，避免根节点监听与组件 emit 同时导致重复触发。",
        question: "封装组件后点击事件为什么可能执行两次？"
    },
    {
        id: "lifecycle",
        title: "生命周期命名与逻辑清理",
        tag: "副作用",
        path: "/labs/lifecycle",
        before: "export default {\n  mounted() { this.timer = setInterval(this.tick, 1000) },\n  beforeDestroy() { clearInterval(this.timer) }\n}",
        after: "let timer\nonMounted(() => { timer = setInterval(tick, 1000) })\nonUnmounted(() => { clearInterval(timer) })\n// Options API: beforeDestroy → beforeUnmount\n// destroyed → unmounted",
        reason: "Composition API 将相关状态与清理逻辑集中在同一功能附近。KeepAlive 的停用不等于卸载，需要在 activated/deactivated 中管理应暂停的副作用。",
        question: "KeepAlive 缓存的组件切走后，计时器会自动停止吗？"
    },
    {
        id: "style",
        title: "Options API 与 Composition API",
        tag: "代码组织",
        path: "/labs/setup",
        before: "export default {\n  data: () => ({ count: 0 }),\n  computed: { double() { return this.count * 2 } },\n  methods: { add() { this.count++ } }\n}",
        after: "const count = ref(0)\nconst double = computed(() => count.value * 2)\nfunction add() { count.value++ }\n// 相关逻辑可提取为 useCounter()",
        reason: "Vue 3 继续支持 Options API，Vue 2.7 也内置 Composition API。它们是 API 风格，不等同于版本边界。组合式函数让逻辑来源和状态归属更明确。",
        question: "Composition API 相比 mixins 更容易维护的原因是什么？"
    },
    {
        id: "template",
        title: "列表 key、条件优先级与多根节点",
        tag: "模板",
        path: "/labs/templates",
        before: "<!-- Vue 2 同节点上 v-for 优先于 v-if -->\n<li v-for='item in items' v-if='item.visible'>...</li>\n<!-- SFC 模板通常需要单根节点 -->",
        after: "<!-- 先用 computed 过滤，再渲染 -->\n<template v-for='item in visibleItems' :key='item.id'>\n  <h3>{{ item.title }}</h3><p>{{ item.note }}</p>\n</template>\n<!-- Vue 3 同节点 v-if 优先；推荐拆开 -->",
        reason: "Vue 3 改变了 v-if/v-for 的同节点优先级，并支持 Fragment。template v-for 的 key 放在 template 上。稳定 key 表示组件身份，应避免用可变索引标识带内部状态的列表。",
        question: "为什么带输入框的可重排列表不宜使用索引作 key？"
    },
    {
        id: "filters",
        title: "过滤器与显式格式化函数",
        tag: "移除 API",
        path: "/javascript/es2015",
        before: "{{ price | currency }}\nVue.filter('currency', value => '¥' + value)",
        after: "function currency(value) {\n  return new Intl.NumberFormat('zh-CN', {\n    style: 'currency', currency: 'CNY'\n  }).format(value)\n}\n// 模板：{{ currency(price) }}",
        reason: "Vue 3 移除模板 filters，格式化使用普通函数，派生数据使用 computed。Intl 是运行环境中的国际化标准 API，可作为工具函数复用。",
        question: "过滤器移除后，格式化与派生数据分别适合放在哪里？"
    },
    {
        id: "async",
        title: "异步组件与明确的加载状态",
        tag: "异步",
        path: "/labs/builtins",
        before: "// Vue 2 异步工厂\nconst AsyncView = () => import('./Report.vue')",
        after: "const AsyncView = defineAsyncComponent({\n  loader: () => import('./Report.vue'),\n  loadingComponent: LoadingView,\n  errorComponent: ErrorView,\n  delay: 200, timeout: 5000\n})",
        reason: "Vue 3 使用 defineAsyncComponent 声明异步组件。组件模块加载与业务请求是不同的异步过程；Suspense 当前仍为实验性能力，放到独立实验中理解。",
        question: "异步组件、路由懒加载和接口请求有什么区别？"
    },
    {
        id: "watch",
        title: "数组侦听与更明确的依赖",
        tag: "侦听",
        path: "/labs/watchers",
        before: "// Vue 2 中 watch 数组常能观察到原地变更\nwatch: { items(next) { /* ... */ } }",
        after: "watch(items, handleChange, { deep: 1 }) // Vue 3.5+\n// 或观察真正关心的派生值\nwatch(() => items.value.length, handleLength)",
        reason: "watch 一个数组 ref 时默认关注引用替换。Vue 3.5+ 的 deep:1 可观察数组浅层变更，深度侦听并非越深越好，应按业务依赖选择侦听源。",
        question: "watch 数组原地变化为何可能不触发？deep:1 与 deep:true 有何取舍？"
    }
];
