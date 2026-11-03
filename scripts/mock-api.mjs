import { createServer } from "node:http";

// 独立的 Node 模拟接口，用于真实验证开发代理；任务工作台自己的服务仍在浏览器本地。
const port = Number(process.env.LAB_API_PORT) || 3001;
const server = createServer((request, response) => {
    // request.url 通常是相对路径，用基准 URL 解析后可分别读取 pathname 和查询参数。
    // delay 限制在 0～3000ms，仅用于观察 loading/取消，不是模拟真实网络性能。
    const url = new URL(request.url, "http://127.0.0.1:" + port);
    const delay = Math.min(3000, Math.max(0, Number(url.searchParams.get("delay")) || 0));
    const timer = setTimeout(() => {
        // 明确返回 JSON 且不缓存，让前端验证代理时能区分接口响应与 SPA 的 HTML 回退。
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.setHeader("Cache-Control", "no-store");
        if (url.pathname === "/health") {
            response.end(
                JSON.stringify({
                    ok: true,
                    service: "vue-lab-mock",
                    message: "开发代理转发成功",
                    timestamp: new Date().toISOString()
                })
            );
        } else if (url.pathname === "/tasks") {
            // 固定的独立演示数据；此接口不读写任务工作台的 localStorage，也不实现 CRUD 后端。
            response.end(
                JSON.stringify({
                    items: [
                        { id: 1, title: "观察真实开发代理" },
                        { id: 2, title: "对照生产部署的请求路径" }
                    ],
                    total: 2
                })
            );
        } else {
            response.statusCode = 404;
            response.end(JSON.stringify({ message: "没有这个接口，请尝试 /health 或 /tasks。" }));
        }
    }, delay);
    // 客户端取消时清理待返回的工作，不将延迟任务留在后台。
    response.on("close", () => clearTimeout(timer));
});
// 只绑定本机回环地址；前端通过开发服务器的 /api 规则转发至这里。
server.listen(port, "127.0.0.1", () => {
    process.stdout.write(
        "模拟 API：http://127.0.0.1:" + port + "\n经 Vite 代理访问：http://localhost:5173/api/health\n"
    );
});
server.on("error", (error) => {
    console.error("模拟接口启动失败：", error.message);
    process.exitCode = 1;
});
// 终端停止/进程退出请求时关闭监听，不用强制 exit 截断已接受连接的正常结束流程。
process.on("SIGINT", () => server.close());
process.on("SIGTERM", () => server.close());
