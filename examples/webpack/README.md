# Webpack 5 × Vue 3 对照示例

这个目录独立构建一个小型 Vue SFC 应用，主项目继续使用 Vite。依赖与命令统一放在仓库根目录，先按根 README 安装依赖。

```sh
pnpm webpack:dev
pnpm webpack:build
```

开发地址为 `http://127.0.0.1:5174`。构建产物写入 `examples/webpack/dist`，不会覆盖 Vite 的根 `dist`。

可以依次检查：

1. `webpack.config.cjs`：entry/output、resolve alias、vue-loader、CSS loader、plugin、DefinePlugin、splitChunks、source map 和开发代理。
2. `src/App.vue`：Vue 响应式与真正的 `import()`。
3. `src/report.js`：按需加载模块；修改后比较构建文件的 hash。
4. `src/styles.css`：修改样式观察 HMR；模板/样式和脚本更新的状态保留策略可能不同。

配置故意保持可读。生产 source map 用于本地学习；实际部署需另外决定是否公开。示例使用现代浏览器能力，转译语法与补齐标准库 API 是不同工作。

`devServer.proxy` 将 `/api` 转发到本机 `3001` 并移除 `/api` 前缀。需要配合根目录 `pnpm mock:api` 启动的独立演示服务；这个代理不在生产静态文件中运行。任务工作台的数据仍由本地模拟服务和 Pinia 持有。
