import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

// 测试复用 Vue SFC 转换与路径别名；happy-dom 提供组件、DOM 事件所需的浏览器环境。
export default defineConfig({
    plugins: [vue()],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    test: {
        // happy-dom 模拟常用浏览器 API，但不提供完整布局引擎；CSS 实测仍需真实浏览器。
        environment: "happy-dom",
        include: ["tests/**/*.spec.js"],
        // 每条用例运行前恢复 spy 实现并清空 mock 调用记录，降低用例间共享模拟状态的影响。
        // localStorage、挂载组件和自建计时器仍由对应测试自行清理。
        restoreMocks: true,
        clearMocks: true
    }
});
