import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";

// 配置文件在 Node 侧执行，与浏览器中的 src/main.js 处于不同运行环境。
// 导出函数能接收本次 mode；loadEnv 的第三参数为空表示读取全部前缀，但这里只选用代理目标，
// 不代表把这些变量都传给浏览器。VITE_ 变量另由 Vite 按公开约定注入客户端。
export default defineConfig(({ mode }) => {
    const environment = loadEnv(mode, process.cwd(), "");
    return {
        plugins: [vue(), vueDevTools()],
        // import.meta.url 定位当前 ESM 配置文件，fileURLToPath 转成跨平台文件路径。
        // @ 是构建器解析别名，浏览器本身并不认识这种导入路径。
        resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
        server: {
            proxy: {
                "/api": {
                    target: environment.API_PROXY_TARGET || "http://127.0.0.1:3001",
                    // 转发时调整 Host；rewrite 去掉约定的 /api 前缀，后端实际收到 /health 等路径。
                    // 这段代码在开发服务器中执行，构建出来的静态页面不会自带代理服务。
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api/, "")
                }
            }
        },
        // manifest 记录源入口和生成文件/动态依赖的映射；source map 辅助还原编译前位置。
        // 二者便于教学，不能只凭单个 chunk 大小判断首屏性能；部署时另行决定映射文件公开策略。
        build: { manifest: true, sourcemap: true }
    };
});
