import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// 启动器只给这一次 Codex 进程补充项目 MCP 配置，不修改用户的全局设置或审批策略。
// 使用实际 Node 路径和绝对仓库路径，避免空格目录、子目录和不同 PATH 造成启动差异。
const root = fileURLToPath(new URL("../", import.meta.url));
const server = fileURLToPath(new URL("../tools/project-mcp/server.mjs", import.meta.url));
const mcpConfig = `mcp_servers.vue_lab_docs={command=${JSON.stringify(process.execPath)},args=[${JSON.stringify(server)}],cwd=${JSON.stringify(root)},startup_timeout_sec=15,tool_timeout_sec=20,required=true}`;
const args = process.argv.slice(2);
// 兼容 pnpm run 之后带或不带 -- 的参数写法；其余参数交由 Codex 正常解析。
if (args[0] === "--") args.shift();

const child = spawn("codex", ["--cd", root, "--config", mcpConfig, ...args], {
    cwd: root,
    stdio: "inherit",
    shell: false
});

// 终端取消时把信号传给宿主，让它关闭自己启动的 stdio 服务。
const interrupt = () => child.kill("SIGINT");
const terminate = () => child.kill("SIGTERM");
process.on("SIGINT", interrupt);
process.on("SIGTERM", terminate);
child.once("error", (error) => {
    console.error("无法启动 Codex，请确认 Codex CLI 已安装且可登录：", error.message);
    process.exitCode = 1;
});
child.once("close", (code, signal) => {
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", terminate);
    process.exitCode = code ?? (signal === "SIGINT" ? 130 : signal === "SIGTERM" ? 143 : 1);
});
