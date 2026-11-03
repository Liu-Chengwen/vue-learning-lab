import { spawn, execFile } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { finished } from "node:stream/promises";

const execFileAsync = promisify(execFile);
const projectRoot = fileURLToPath(new URL("../", import.meta.url));

// CLI 仅运行这组确定的检查；命令与参数分别传递，项目路径中有空格也不依赖 shell 转义。
export const DEFAULT_CHECKS = ["format:check", "test", "build", "webpack:build"].map((name) => ({
    name,
    command: "pnpm",
    args: [name]
}));

async function readGit(root) {
    try {
        const options = { cwd: root, encoding: "utf8", timeout: 5000, maxBuffer: 1024 * 1024 };
        const [head, status] = await Promise.all([
            execFileAsync("git", ["rev-parse", "HEAD"], options),
            execFileAsync("git", ["status", "--porcelain"], options)
        ]);
        return { head: head.stdout.trim(), dirty: Boolean(status.stdout.trim()), error: null };
    } catch (error) {
        // 临时测试目录或尚未初始化的项目没有版本信息，明确记录未知，不捏造干净版本。
        return { head: null, dirty: null, error: String(error.message).slice(0, 1000) };
    }
}

function skipped(check, reason) {
    return {
        name: check.name,
        command: check.command,
        args: [...check.args],
        status: "skipped",
        startedAt: null,
        finishedAt: null,
        durationMs: 0,
        exitCode: null,
        signal: null,
        error: null,
        skipReason: reason,
        logPath: null
    };
}

async function runCheck(check, { root, logPath, signal, timeoutMs }) {
    const start = Date.now();
    const result = {
        ...skipped(check, null),
        status: "failed",
        startedAt: new Date(start).toISOString(),
        logPath
    };
    let child;
    let launchError;
    let logError;
    let stoppedFor;
    let timer;
    let childClosed = false;
    let cleanupStarted = false;
    let cleanup = Promise.resolve();
    const output = createWriteStream(logPath);

    function kill(killSignal) {
        try {
            // pnpm 会再启动测试/构建子进程；POSIX 下结束整个独立进程组，避免只停掉外壳。
            if (process.platform === "win32") child.kill(killSignal);
            else process.kill(-child.pid, killSignal);
        } catch (error) {
            if (error.code !== "ESRCH") launchError ||= error;
        }
    }

    function hasProcesses() {
        if (process.platform === "win32") return !childClosed;
        try {
            // 直接子进程 close 不代表它的同组后代已经结束，需观察原进程组是否仍存在。
            process.kill(-child.pid, 0);
            return true;
        } catch (error) {
            if (error.code !== "ESRCH") launchError ||= error;
            return false;
        }
    }

    async function finishStopping() {
        let deadline = Date.now() + 1000;
        while (hasProcesses() && Date.now() < deadline) {
            // 保持定时器引用：Promise/await 本身不保活，CLI 也必须等待必要的强制清理。
            await new Promise((yes) => setTimeout(yes, 20));
        }
        if (!hasProcesses()) return;
        kill("SIGKILL");
        deadline = Date.now() + 1000;
        while (hasProcesses() && Date.now() < deadline) await new Promise((yes) => setTimeout(yes, 20));
        if (hasProcesses()) launchError ||= new Error("强制终止后仍检测到检查进程，无法确认清理完成");
    }

    function stop(reason) {
        stoppedFor ||= reason;
        if (!child?.pid || cleanupStarted) return;
        cleanupStarted = true;
        kill("SIGTERM");
        // 清理属于整次检查，不能由直接子进程的 close 事件提前撤销；无残余则立即完成。
        cleanup = finishStopping();
    }
    const cancel = () => stop("cancelled");
    output.on("error", (error) => {
        logError = error;
        stop("log_error");
    });
    // 提前订阅完成与错误，防止创建失败或运行中磁盘错误变成未处理异常。
    const logFinished = finished(output).catch((error) => {
        logError ||= error;
    });

    try {
        await new Promise((yes, no) => {
            output.once("open", yes);
            output.once("error", no);
        });
        output.write(`[command] ${JSON.stringify([check.command, ...check.args])}\n`);
        if (signal?.aborted) {
            stoppedFor = "cancelled";
        } else {
            child = spawn(check.command, check.args, {
                cwd: root,
                shell: false,
                detached: process.platform !== "win32",
                stdio: ["ignore", "pipe", "pipe"]
            });
            child.stdout.pipe(output, { end: false });
            child.stderr.pipe(output, { end: false });
            child.once("error", (error) => {
                launchError = error;
            });
            signal?.addEventListener("abort", cancel, { once: true });
            timer = setTimeout(() => stop("timeout"), check.timeoutMs ?? timeoutMs);
            timer.unref();
            // 添加监听前后都检查，覆盖在创建子进程期间发生的取消。
            if (signal?.aborted) cancel();
            const completion = await new Promise((yes) => {
                child.once("close", (code, childSignal) => {
                    childClosed = true;
                    yes({ code, childSignal });
                });
            });
            result.exitCode = completion.code;
            result.signal = completion.childSignal;
        }
    } catch (error) {
        launchError ||= error;
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", cancel);
        output.end();
        await logFinished;
        await cleanup;
    }

    const cleanupDetail = launchError ? `；${launchError.message}` : "";
    if (stoppedFor === "cancelled") {
        result.status = "cancelled";
        result.error = "检查被取消" + cleanupDetail;
    } else if (stoppedFor === "timeout") {
        result.status = "timed_out";
        result.error = `检查超时（${check.timeoutMs ?? timeoutMs}ms）${cleanupDetail}`;
    } else if (launchError || logError) {
        result.error = `${logError ? "日志写入失败" : "命令启动/执行失败"}：${(logError || launchError).message}`;
    } else if (result.exitCode === 0) {
        result.status = "passed";
    } else {
        result.error = result.signal ? `进程被 ${result.signal} 终止` : `命令退出码 ${result.exitCode}`;
    }
    result.finishedAt = new Date().toISOString();
    result.durationMs = Date.now() - start;
    return result;
}

/**
 * 顺序执行并写入独立报告；checks/root 等参数只用于程序调用与隔离测试，不开放为 CLI 命令输入。
 * 首个失败后标记其余检查为 skipped；报告落盘失败会抛错，调用方不能宣称校验成功。
 */
export async function runVerification({
    root = projectRoot,
    reportDir = ".harness-artifacts/verify",
    checks = DEFAULT_CHECKS,
    signal,
    timeoutMs = 120000
} = {}) {
    if (
        !Array.isArray(checks) ||
        !checks.length ||
        !checks.every(
            (check) =>
                typeof check.name === "string" &&
                typeof check.command === "string" &&
                check.command.length &&
                Array.isArray(check.args) &&
                check.args.every((arg) => typeof arg === "string") &&
                (check.timeoutMs === undefined || (Number.isFinite(check.timeoutMs) && check.timeoutMs > 0))
        ) ||
        !Number.isFinite(timeoutMs) ||
        timeoutMs <= 0
    )
        throw new Error("校验配置无效");

    root = resolve(root);
    const start = Date.now();
    const runId = `${new Date(start).toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
    const directory = resolve(root, reportDir, runId);
    const git = await readGit(root);
    await mkdir(directory, { recursive: true });
    const reportPath = join(directory, "report.json");
    const report = {
        schemaVersion: 1,
        runId,
        root,
        git,
        startedAt: new Date(start).toISOString(),
        finishedAt: null,
        durationMs: 0,
        status: "passed",
        exitCode: 0,
        checks: []
    };

    for (const [index, check] of checks.entries()) {
        if (signal?.aborted || report.status !== "passed") {
            report.checks.push(skipped(check, signal?.aborted ? "执行被取消" : "前序检查未通过"));
            if (report.status === "passed") report.status = "cancelled";
            continue;
        }
        const result = await runCheck(check, {
            root,
            logPath: join(directory, `${String(index + 1).padStart(2, "0")}.log`),
            signal,
            timeoutMs
        });
        report.checks.push(result);
        if (result.status !== "passed") report.status = result.status === "cancelled" ? "cancelled" : "failed";
    }

    report.finishedAt = new Date().toISOString();
    report.durationMs = Date.now() - start;
    // 取消原因与 CLI 退出码保持同一来源，避免报告写 130 而 SIGTERM 实际退出 143。
    report.exitCode =
        report.status === "passed" ? 0 : report.status === "cancelled" ? (signal?.reason === "SIGTERM" ? 143 : 130) : 1;
    // 同目录临时文件再重命名，避免将半截 JSON 当成完整运行证据。
    await writeFile(`${reportPath}.tmp`, JSON.stringify(report, null, 2) + "\n");
    await rename(`${reportPath}.tmp`, reportPath);
    return { report, reportPath, exitCode: report.exitCode };
}

async function main(args) {
    if (args.length === 1 && args[0] === "--help") {
        console.log(
            "用法：pnpm harness:verify\n顺序执行格式、测试、Vite 与 Webpack 构建，报告写入 .harness-artifacts/verify。"
        );
        return;
    }
    if (args.length) {
        console.error("不支持的参数。使用 --help 查看用法。");
        process.exitCode = 2;
        return;
    }
    const controller = new AbortController();
    const interrupt = () => controller.abort("SIGINT");
    const terminate = () => controller.abort("SIGTERM");
    process.once("SIGINT", interrupt);
    process.once("SIGTERM", terminate);
    try {
        const result = await runVerification({ signal: controller.signal });
        for (const check of result.report.checks)
            console.log(`[${check.status}] ${check.name}${check.error ? `：${check.error}` : ""}`);
        console.log(`报告：${result.reportPath}`);
        process.exitCode = result.exitCode;
    } catch (error) {
        console.error("校验未能完成或保存报告：", error.message);
        process.exitCode = 1;
    } finally {
        process.removeListener("SIGINT", interrupt);
        process.removeListener("SIGTERM", terminate);
    }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
