import { createApp } from "vue";
import { createPinia } from "pinia";
// 先载入组件库基础样式与暗色变量，再载入应用样式，使 main.css 的主题映射可以覆盖默认值。
import "element-plus/dist/index.css";
import "element-plus/theme-chalk/dark/css-vars.css";
import "./assets/main.css";
import App from "./App.vue";
import { router } from "./router";
import { learningPlugin } from "./plugins/learningPlugin";

// createApp 返回独立应用实例，区别于 Vue 2 常见的 new Vue 和 Vue.use 全局注册方式。
// app.use 安装插件并返回 app，因此可链式调用；挂载前先安装 Pinia、Router 和学习上下文。
// script setup 中调用 useStore/useRoute/inject 时，才能取得对应的应用级依赖。
createApp(App).use(createPinia()).use(router).use(learningPlugin).mount("#app");
