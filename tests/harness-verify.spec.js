// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { runVerification } from "../scripts/harness-verify.mjs";

const directories = [];
const execFileAsync = promisify(execFile);

async function workspace() {
    // 带空格的路径验证不依赖 shell 拼接；所有 fixture 和产物都留在独立临时目录。
    const directory = await mkdtemp(join(tmpdir(), "vue lab verify "));
    directories.push(directory);
    return directory;
}
const check = (name, source, options = {}) => ({ name, command: process.execPath, args: ["-e", source], ...options });
const posixTest = process.platform === "win32" ? it.skip : it;
const pause = (milliseconds) => new Promise((yes) => setTimeout(yes, milliseconds));

async function waitUntil(predicate, timeoutMs = 2500) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await predicate()) return true;
        await pause(10);
    }
    return false;
}

function isRunning(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        if (error.code === "ESRCH") return false;
        throw error;
    }
}

afterEach(async () => {
    await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("统一校验的执行证据", () => {
    it("成功时保留每个进程的输出、真实退出码和可解析报告", async () => {
        const root = await workspace();
        const result = await runVerification({
            root,
            checks: [check("first", 'console.log("正常输出"); console.error("诊断输出")'), check("second", "")]
        });
        expect(result.exitCode).toBe(0);
        expect(result.report.status).toBe("passed");
        expect(result.report.checks.map((entry) => entry.exitCode)).toEqual([0, 0]);
        expect(result.report.git).toMatchObject({ head: null, dirty: null });
        const log = await readFile(result.report.checks[0].logPath, "utf8");
        expect(log).toContain("正常输出");
        expect(log).toContain("诊断输出");
        const persisted = JSON.parse(await readFile(result.reportPath, "utf8"));
        expect(persisted).toEqual(result.report);
        expect(Date.parse(persisted.finishedAt)).toBeGreaterThanOrEqual(Date.parse(persisted.startedAt));
    });

    it("检查失败后整体非零，保留失败输出并把后续标为跳过", async () => {
        const root = await workspace();
        const result = await runVerification({
            root,
            checks: [check("failing", 'console.error("有意失败 fixture"); process.exitCode=7'), check("later", "")]
        });
        expect(result.exitCode).toBe(1);
        expect(result.report.checks[0]).toMatchObject({ status: "failed", exitCode: 7 });
        expect(result.report.checks[1]).toMatchObject({ status: "skipped", logPath: null, exitCode: null });
        expect(await readFile(result.report.checks[0].logPath, "utf8")).toContain("有意失败 fixture");
    });

    it("命令不存在时完成失败报告，不把启动失败当作通过", async () => {
        const root = await workspace();
        const result = await runVerification({
            root,
            checks: [{ name: "missing", command: join(root, "missing"), args: [] }]
        });
        expect(result.exitCode).toBe(1);
        expect(result.report.checks[0]).toMatchObject({ status: "failed" });
        expect(result.report.checks[0].error).toContain("ENOENT");
        expect(JSON.parse(await readFile(result.reportPath, "utf8")).status).toBe("failed");
    });

    it("超时会终止检查，报告超时并跳过后续任务", async () => {
        const root = await workspace();
        const result = await runVerification({
            root,
            timeoutMs: 100,
            checks: [check("hanging", "setInterval(()=>{},1000)"), check("later", "")]
        });
        expect(result.exitCode).toBe(1);
        expect(result.report.checks[0].status).toBe("timed_out");
        expect(result.report.checks[1].status).toBe("skipped");
    });

    it("运行中取消后终止进程，并写入取消而非成功状态", async () => {
        const root = await workspace();
        const controller = new AbortController();
        const running = runVerification({
            root,
            signal: controller.signal,
            checks: [
                check("hanging", 'require("node:fs").writeFileSync("started", "ready"); setInterval(()=>{},1000)'),
                check("later", "")
            ]
        });
        try {
            // 等待 fixture 明确启动后再取消，避免慢机器上只测到“尚未运行便被跳过”。
            let started = false;
            for (let attempt = 0; attempt < 200 && !started; attempt += 1) {
                started = await access(join(root, "started")).then(
                    () => true,
                    () => false
                );
                if (!started) await new Promise((yes) => setTimeout(yes, 10));
            }
            expect(started).toBe(true);
            controller.abort();
            const result = await running;
            expect(result.exitCode).toBe(130);
            expect(result.report.status).toBe("cancelled");
            expect(result.report.checks.map((entry) => entry.status)).toEqual(["cancelled", "skipped"]);
        } finally {
            controller.abort();
            await running;
        }
    });

    posixTest.each(["cancel", "timeout"])(
        "%s 时直接子进程先退出，同组忽略 SIGTERM 的孙进程仍会被清理",
        async (mode) => {
            const root = await workspace();
            const controller = new AbortController();
            // 孙进程不继承日志管道，父进程的 close 不再等待它；持续心跳证明它曾真实运行。
            const descendant = `const fs=require("node:fs");
                process.on("SIGTERM",()=>{});
                fs.writeFileSync("descendant.pid",String(process.pid));
                let tick=0;
                setInterval(()=>fs.writeFileSync("heartbeat",String(++tick)),20);
                setTimeout(()=>process.exit(0),10000);`;
            const parent = `const fs=require("node:fs"),{spawn}=require("node:child_process");
                fs.writeFileSync("parent.pid",String(process.pid));
                const descendant=spawn(process.execPath,["-e",${JSON.stringify(descendant)}],{stdio:"ignore"});
                descendant.unref();
                process.on("SIGTERM",()=>process.exit(0));
                setInterval(()=>{},1000);
                setTimeout(()=>process.exit(0),10000);`;
            const running = runVerification({
                root,
                signal: controller.signal,
                timeoutMs: mode === "timeout" ? 1500 : 5000,
                checks: [check("process tree", parent), check("later", "")]
            });
            try {
                const ready = await waitUntil(async () => {
                    try {
                        return Number(await readFile(join(root, "heartbeat"), "utf8")) >= 2;
                    } catch {
                        return false;
                    }
                });
                expect(ready).toBe(true);
                const pid = Number(await readFile(join(root, "descendant.pid"), "utf8"));
                expect(isRunning(pid)).toBe(true);
                if (mode === "cancel") controller.abort();
                const result = await running;
                expect(result.report.checks[0].status).toBe(mode === "cancel" ? "cancelled" : "timed_out");
                expect(result.report.checks[1].status).toBe("skipped");
                const heartbeat = await readFile(join(root, "heartbeat"), "utf8");
                await pause(100);
                expect(await readFile(join(root, "heartbeat"), "utf8")).toBe(heartbeat);
                expect(await waitUntil(() => !isRunning(pid))).toBe(true);
            } finally {
                // 即使旧实现造成断言失败，也主动清掉 fixture，不把故意忽略信号的进程留给用户。
                controller.abort();
                for (const name of ["descendant.pid", "parent.pid"]) {
                    try {
                        const pid = Number(await readFile(join(root, name), "utf8"));
                        if (pid > 0) process.kill(pid, "SIGKILL");
                    } catch (error) {
                        if (!["ENOENT", "ESRCH"].includes(error.code)) throw error;
                    }
                }
                await running;
            }
        },
        10000
    );

    it("SIGTERM 取消时报告和返回码一致，未启动的检查明确跳过", async () => {
        const root = await workspace();
        const controller = new AbortController();
        controller.abort("SIGTERM");
        const result = await runVerification({
            root,
            signal: controller.signal,
            checks: [check("unused", "process.exitCode=9")]
        });
        expect(result.exitCode).toBe(143);
        expect(result.report).toMatchObject({ status: "cancelled", exitCode: 143 });
        expect(result.report.checks[0]).toMatchObject({ status: "skipped", exitCode: null, logPath: null });
        expect(JSON.parse(await readFile(result.reportPath, "utf8")).exitCode).toBe(result.exitCode);
    });

    it("步骤日志无法创建时仍保存失败报告，后续任务不会继续", async () => {
        const root = await workspace();
        // fixture 让下一步的日志路径被目录占用，真实触发 EISDIR，而非 mock 文件系统结果。
        const occupyNextLog = `const fs=require("node:fs"), p=require("node:path");
            const base=p.join(process.cwd(),".harness-artifacts/verify");
            fs.mkdirSync(p.join(base,fs.readdirSync(base)[0],"02.log"));`;
        const result = await runVerification({
            root,
            checks: [check("prepare", occupyNextLog), check("cannot-log", ""), check("later", "")]
        });
        expect(result.exitCode).toBe(1);
        expect(result.report.checks.map((entry) => entry.status)).toEqual(["passed", "failed", "skipped"]);
        expect(result.report.checks[1].error).toContain("日志写入失败");
        expect(JSON.parse(await readFile(result.reportPath, "utf8")).status).toBe("failed");
    });

    it("无法创建产物目录时拒绝执行，不返回虚假的成功报告", async () => {
        const root = await workspace();
        const reportDir = join(root, "not a directory");
        await writeFile(reportDir, "occupied");
        await expect(runVerification({ root, reportDir, checks: [check("unused", "")] })).rejects.toThrow();
    });

    it("CLI 拒绝额外参数，不允许通过命令行传入任意校验命令", async () => {
        const root = await workspace();
        const script = fileURLToPath(new URL("../scripts/harness-verify.mjs", import.meta.url));
        await expect(
            execFileAsync(process.execPath, [script, "--command", "echo injected"], { cwd: root })
        ).rejects.toMatchObject({ code: 2 });
    });
});
