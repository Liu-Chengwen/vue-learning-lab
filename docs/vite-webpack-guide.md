# Vite / Webpack 实践指南

主项目使用 Vite 8，`examples/webpack` 是独立 Webpack 5 + Vue 3 SFC 小应用。二者共享安装依赖，有各自入口、配置、端口和产物。

## 启动与构建

```sh
# 终端一：主项目
pnpm dev
# 终端二：Webpack 对照应用，端口 5174
pnpm webpack:dev
```

修改各自模板、计数器和样式观察 HMR，点击报表按钮实际执行动态 import。

```sh
pnpm build
pnpm webpack:build
pnpm build:report
```

| 输出 | 观察内容 |
| --- | --- |
| `dist/assets` | 主应用入口、动态模块、CSS、source map、源码阅读文本 chunk |
| `dist/.vite/manifest.json` | 入口、静态与动态依赖关系 |
| `examples/webpack/dist` | runtime、main、vue-vendor、动态 report、HTML、source map |
| `build:report` 表格 | 真实 JS/CSS/HTML 的原始大小与本地 gzip 估算 |

修改懒加载模块后再构建，比较 hash 和依赖变化。源码阅读的 `?raw` 导入是文本，不代表全部在启动时执行。gzip 估算不代表服务器已经启用该压缩方式。

## 模块与 HMR

入口：`/tooling/modules`。

1. 点击加载报表模块，观察真实 import() 结果。
2. 打开 Network 再次点击，比较首次加载与模块缓存。
3. 修改 `src/features/tooling/hmrProbe.js` 字符串，观察 accept 回调和更新次数。
4. 构建后用 `pnpm preview` 打开，确认没有开发 HMR 连接。

状态保留取决于变更类型与接受边界，HMR 不保证所有场景都无需刷新。模块和组件应分别释放不再使用的副作用。

## 环境与真实代理

入口：`/tooling/config`。页面显示实际 import.meta.env 公开字段。复制 `.env.example` 为 `.env.local` 后可修改 Vite 示例标签和代理目标，修改后重启 Vite 开发服务。`API_PROXY_TARGET` 由 `vite.config.js` 显式读取；Webpack 对照示例的代理目标在 `examples/webpack/webpack.config.cjs` 中配置，不自动读取这份 `.env.local`。

```sh
# 另一个终端
pnpm mock:api
```

通过运行中的 Vite 或 Webpack 开发服务访问 `/api/health`、`/api/tasks`。代理去掉 `/api` 后转发到 `http://127.0.0.1:3001`。页面按钮实际请求 health 接口，下方路径模型只做示意。

工作台的任务服务在浏览器本地执行，不依赖该 Node 接口；额外服务用于验证真实开发代理。

DefinePlugin 显式替换示例常量，不会自动读取所有 .env。VITE_ 表示允许进入客户端，不能当成密钥保护机制。开发代理属于开发服务，生产需要自己的请求入口配置。

## 理解流程

Vite 8 采用 Rolldown 统一 bundler，结合 Oxc 工具链。先说明项目版本，再解释默认原生 ESM 开发体验、按需转换、依赖处理、缓存、HMR 与生产打包。早期 esbuild + Rollup 的说法需要标明历史版本。

Webpack 从入口建立依赖图。vue-loader 处理 SFC，css-loader 处理 CSS 依赖，style-loader 注入样式；普通 loader 转换通常从右向左。VueLoaderPlugin、HtmlWebpackPlugin、DefinePlugin 在更广的编译流程中提供能力。

性能比较固定项目、依赖、模式和缓存条件。页面流程及虚构体积模型用于理解策略，实际体积和速度以测量为准。

官方阅读：[Vite 8](https://vite.dev/blog/announcing-vite8)、[Webpack 概念](https://webpack.js.org/concepts/)、[Webpack HMR](https://webpack.js.org/concepts/hot-module-replacement/)。
