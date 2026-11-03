// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createKnowledgeBase } from "../tools/project-mcp/knowledge.mjs";

const serverPath = fileURLToPath(new URL("../tools/project-mcp/server.mjs", import.meta.url));

describe("真实 stdio MCP 协议", () => {
    let client;
    let transport;
    beforeAll(async () => {
        client = new Client({ name: "vue-lab-mcp-test", version: "1.0.0" });
        // 刻意从临时目录启动，确认服务未依赖宿主的当前工作目录。
        transport = new StdioClientTransport({
            command: process.execPath,
            args: [serverPath],
            cwd: tmpdir(),
            stderr: "pipe"
        });
        transport.stderr?.on("data", () => {});
        await client.connect(transport);
    });
    afterAll(async () => {
        await client?.close();
        await transport?.close();
    });

    it("完成握手并只发现两个只读查询工具", async () => {
        const { tools } = await client.listTools();
        expect(tools.map((tool) => tool.name).sort()).toEqual(["get_component_contract", "search_project_docs"]);
        expect(tools.every((tool) => tool.annotations?.readOnlyHint && tool.annotations?.openWorldHint === false)).toBe(
            true
        );
    });

    it("检索当前文档，并返回可核对的来源与受限摘录", async () => {
        const response = await client.callTool({
            name: "search_project_docs",
            arguments: { query: "SearchPanel", limit: 2 }
        });
        expect(response.isError).not.toBe(true);
        const payload = response.structuredContent;
        expect(payload.totalMatches).toBeGreaterThan(0);
        expect(payload.results).toHaveLength(2);
        for (const entry of payload.results) {
            const original = await readFile(fileURLToPath(new URL(`../${entry.path}`, import.meta.url)), "utf8");
            const fromLine = original
                .replace(/\r\n/g, "\n")
                .split("\n")
                .slice(entry.startLine - 1)
                .join("\n");
            expect(fromLine.startsWith(entry.excerpt)).toBe(true);
            expect(entry.endLine).toBeGreaterThanOrEqual(entry.startLine);
            expect(entry.excerpt.length).toBeLessThanOrEqual(900);
        }
        expect(JSON.parse(response.content[0].text)).toEqual(payload);
    });

    it("不存在的关键词有明确空结果，不把它当成工具异常", async () => {
        const response = await client.callTool({
            name: "search_project_docs",
            arguments: { query: "__missing_harness_topic_93d7__" }
        });
        expect(response.isError).not.toBe(true);
        expect(response.structuredContent.results).toEqual([]);
        expect(response.structuredContent.totalMatches).toBe(0);
    });

    it("组件契约来自原始文档，未知组件不能被用作文件路径", async () => {
        const known = await client.callTool({ name: "get_component_contract", arguments: { name: "SearchPanel" } });
        expect(known.structuredContent).toMatchObject({
            found: true,
            path: "docs/component-contracts.md",
            sourcePath: "src/components/business/SearchPanel.vue"
        });
        expect(known.structuredContent.contract).toContain("update:modelValue");
        const unknown = await client.callTool({ name: "get_component_contract", arguments: { name: "../../.env" } });
        expect(unknown.isError).toBe(true);
        expect(unknown.structuredContent).toMatchObject({ found: false, code: "UNKNOWN_COMPONENT" });
    });

    it("拒绝空查询、超大 limit 和额外路径参数，随后仍可正常查询", async () => {
        for (const args of [{ query: " " }, { query: "Vue", limit: 9 }, { query: "Vue", path: "../../.env" }]) {
            const response = await client.callTool({ name: "search_project_docs", arguments: args });
            expect(response.isError).toBe(true);
        }
        const response = await client.callTool({ name: "get_component_contract", arguments: { name: "DataTable" } });
        expect(response.structuredContent.found).toBe(true);
    });
});

describe("项目知识读取边界", () => {
    let root;
    beforeAll(async () => {
        root = await mkdtemp(join(tmpdir(), "vue-lab-mcp-"));
        await mkdir(join(root, "docs"));
    });
    afterAll(async () => {
        await rm(root, { recursive: true, force: true });
    });

    it("白名单文件被替换为指向其他文件的链接时不泄露内容", async () => {
        const secret = join(root, "private.txt");
        const readme = join(root, "README.md");
        await writeFile(secret, "sensitive-fixture-marker");
        await symlink(secret, readme);
        const payload = await createKnowledgeBase({ root }).searchProjectDocs("sensitive-fixture-marker");
        expect(payload.results).toEqual([]);
        expect(payload.unavailableDocuments).toContain("README.md");
        await rm(readme);
    });

    it("超限文档被排除，其他正常文档仍可提供有限摘录", async () => {
        await writeFile(join(root, "README.md"), "oversized-marker".repeat(20000));
        await writeFile(
            join(root, "docs/component-contracts.md"),
            `# 接口\n\n## SearchPanel\n\nsearch-marker\n${"x".repeat(1500)}`
        );
        const payload = await createKnowledgeBase({ root }).searchProjectDocs("search-marker");
        expect(payload.unavailableDocuments).toContain("README.md");
        expect(payload.results).toHaveLength(1);
        expect(payload.results[0].excerpt.length).toBeLessThanOrEqual(900);
        expect(payload.results[0].truncated).toBe(true);
    });

    it("同一知识服务的后续查询读取更新后的契约，不依赖复制的规范或陈旧缓存", async () => {
        const document = join(root, "docs/component-contracts.md");
        const knowledge = createKnowledgeBase({ root });
        await writeFile(document, "# 组件\n\n## SearchPanel\n\n旧的契约内容\n");
        const before = await knowledge.getComponentContract("SearchPanel");
        expect(before.contract).toContain("旧的契约内容");
        await writeFile(document, "# 组件\n\n## SearchPanel\n\n更新后的契约内容\n");
        const after = await knowledge.getComponentContract("SearchPanel");
        expect(after.contract).toContain("更新后的契约内容");
        expect(after.contract).not.toContain("旧的契约内容");
    });
});
