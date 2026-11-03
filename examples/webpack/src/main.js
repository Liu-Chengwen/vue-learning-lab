import { createApp } from "vue";
import App from "./App.vue";
import "./styles.css";

// 与 Vite 主项目保持相同的 Vue 挂载方式；差异在于构建工具如何处理这些导入。
// App.vue 由 vue-loader 转成模块，styles.css 经 css-loader/style-loader 在页面注入样式。
// HTML 模板只提供 #app，最终的脚本地址由 HtmlWebpackPlugin 按生成产物注入。
createApp(App).mount("#app");
