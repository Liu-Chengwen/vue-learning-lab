/**
 * 独立的 Webpack 5 + Vue 3 SFC 教学配置。
 * 主项目仍由 Vite 启动；本配置仅处理 examples/webpack/src，产物写入自己的 dist。
 * 项目 package.json 使用 type:module；.cjs 扩展名让本文件显式保持 CommonJS 的 require/module.exports。
 */
const path = require("node:path");
const webpack = require("webpack");
const { VueLoaderPlugin } = require("vue-loader");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = (_environment, argv = {}) => {
    // CLI 的 --mode 决定这里的分支；它与浏览器访问时的运行状态不是同一个概念。
    const production = argv.mode === "production";
    return {
        // 相对 entry/template 从本配置目录解析，避免在仓库根目录启动命令时读错源码。
        context: __dirname,
        mode: production ? "production" : "development",
        entry: "./src/main.js",
        output: {
            path: path.resolve(__dirname, "dist"),
            // name 表示 chunk 名；内容变化会影响 contenthash，便于观察资源缓存失效范围。
            filename: "[name].[contenthash:8].js",
            chunkFilename: "[name].[contenthash:8].js",
            // 运行时推断资源基础路径；clean 只清理上面的示例产物目录，不清理主项目 dist。
            publicPath: "auto",
            clean: true
        },
        resolve: {
            extensions: [".js", ".vue"],
            alias: {
                "@": path.resolve(__dirname, "src"),
                // SFC 在构建时编译，浏览器只需要 Vue runtime。
                "vue$": "vue/dist/vue.runtime.esm-bundler.js"
            }
        },
        module: {
            rules: [
                { test: /\.vue$/, loader: "vue-loader" },
                // 普通 loader 转换从右向左：css-loader 处理依赖，style-loader 注入样式。
                { test: /\.css$/, use: ["style-loader", "css-loader"] },
                { test: /\.(png|jpe?g|gif|svg)$/i, type: "asset/resource" }
            ]
        },
        plugins: [
            // VueLoaderPlugin 将其他 rule 应用到 SFC 的对应语言块。
            new VueLoaderPlugin(),
            new HtmlWebpackPlugin({ template: "./public/index.html", title: "Webpack × Vue 3 对照实验" }),
            // DefinePlugin 是编译期替换，显式暴露公开常量，不把整个 process.env 注入浏览器。
            new webpack.DefinePlugin({
                "__VUE_OPTIONS_API__": JSON.stringify(true),
                "__VUE_PROD_DEVTOOLS__": JSON.stringify(false),
                "__VUE_PROD_HYDRATION_MISMATCH_DETAILS__": JSON.stringify(false),
                "__LAB_NAME__": JSON.stringify("Webpack 5 × Vue 3"),
                "process.env.LAB_MODE": JSON.stringify(production ? "production" : "development")
            })
        ],
        optimization: {
            // runtime 与共享 Vue 依赖单独输出，观察 contenthash 与模块缓存。
            runtimeChunk: "single",
            // 标记哪些导出被使用；最终能否删除代码仍与副作用信息、优化模式和压缩阶段有关。
            usedExports: true,
            splitChunks: {
                chunks: "all",
                cacheGroups: {
                    vue: {
                        // 同时匹配普通 node_modules 与 pnpm 嵌套结构里的 vue/@vue 包。
                        test: /[\\/]node_modules[\\/](?:\.pnpm[\\/][^\\/]+[\\/]node_modules[\\/])?(?:@vue|vue)[\\/]/,
                        name: "vue-vendor",
                        chunks: "all",
                        enforce: true
                    }
                }
            }
        },
        // 这里有意输出 source map 供学习；真实部署应单独决定映射文件的公开策略。
        devtool: production ? "source-map" : "eval-source-map",
        devServer: {
            host: "127.0.0.1",
            port: 5174,
            // HMR 由开发服务、Webpack runtime 与 vue-loader 协作；不同变更不保证保留全部组件状态。
            hot: true,
            open: false,
            historyApiFallback: true,
            static: { directory: path.resolve(__dirname, "dist") },
            // 仅开发服务器执行代理；生产静态产物不携带这个服务端转发行为。
            proxy: [
                { context: ["/api"], target: "http://127.0.0.1:3001", changeOrigin: true, pathRewrite: { "^/api": "" } }
            ]
        },
        performance: { hints: false }
    };
};
