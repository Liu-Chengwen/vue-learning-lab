import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// 服务根目录由模块位置确定，宿主即使从子目录启动，也不会意外读取另一个工程。
export const PROJECT_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const MAX_DOCUMENT_BYTES = 128 * 1024;
const MAX_EXCERPT_CHARACTERS = 900;
const MAX_CONTRACT_CHARACTERS = 6000;

// 调用者只能查询文字与组件名，不能传入文件路径；资料来源在这里明确列举。
export const DOCUMENT_PATHS = Object.freeze([
    "README.md",
    "docs/component-contracts.md",
    "docs/feature-coverage.md",
    "docs/learning-guide.md",
    "docs/vite-webpack-guide.md",
    "docs/ai-harness-plan.md",
    "docs/harness/tasks/001-learning-record-dedup.md"
]);
export const COMPONENT_NAMES = Object.freeze(["SearchPanel", "DataTable", "TaskFormDialog", "RemoteSelect"]);

/** 将 Markdown 分段并保留原始行号；围栏代码中的 # 不视为章节。 */
function splitSections(content) {
    const lines = content.replace(/\r\n/g, "\n").split("\n");
    const sections = [];
    let start = 0;
    let title = "文档开头";
    let fence = "";
    for (let index = 0; index < lines.length; index += 1) {
        const marker = lines[index].match(/^\s*(`{3,}|~{3,})/);
        if (marker) {
            if (!fence) fence = marker[1];
            else if (fence[0] === marker[1][0] && marker[1].length >= fence.length) fence = "";
            continue;
        }
        const heading = !fence && lines[index].match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
        if (!heading) continue;
        if (index > start) sections.push({ title, start, lines: lines.slice(start, index) });
        start = index;
        title = heading[1];
    }
    if (start < lines.length) sections.push({ title, start, lines: lines.slice(start) });
    return sections;
}

/**
 * 白名单路径还要验证真实路径：允许的 README 若被换成指向 .env 的链接，也不能被读取。
 * 固定上限的文件读取防止超大资料撑满上下文；文件句柄在成功和失败路径都关闭。
 */
async function readDocument(root, documentPath) {
    const expectedPath = resolve(root, documentPath);
    if ((await realpath(expectedPath)) !== expectedPath) throw new Error("文档路径不能包含符号链接");
    const handle = await open(expectedPath, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
        const metadata = await handle.stat();
        if (!metadata.isFile() || metadata.size > MAX_DOCUMENT_BYTES) throw new Error("文档不是可读取的有限大小文件");
        const buffer = Buffer.alloc(MAX_DOCUMENT_BYTES + 1);
        let offset = 0;
        while (offset < buffer.length) {
            const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, offset);
            if (bytesRead === 0) break;
            offset += bytesRead;
        }
        if (offset > MAX_DOCUMENT_BYTES) throw new Error("文档超过读取上限");
        return buffer.toString("utf8", 0, offset);
    } finally {
        await handle.close();
    }
}

function normalize(value) {
    return value.normalize("NFKC").toLowerCase();
}

function sectionExcerpt(section, terms) {
    const hit = section.lines.findIndex((line) => terms.some((term) => normalize(line).includes(term)));
    const first = Math.max(0, hit - 2);
    const remaining = section.lines.slice(first).join("\n");
    const excerpt = remaining.slice(0, MAX_EXCERPT_CHARACTERS).trimEnd();
    return {
        startLine: section.start + first + 1,
        endLine: section.start + first + excerpt.split("\n").length,
        excerpt,
        truncated: first > 0 || remaining.length > excerpt.length
    };
}

/** root 仅为内部测试注入点，不暴露到 MCP 工具参数。每次查询读取当前文档，避免陈旧缓存。 */
export function createKnowledgeBase({ root = PROJECT_ROOT } = {}) {
    async function searchProjectDocs(query, limit = 5) {
        const terms = [...new Set(normalize(query.trim()).split(/\s+/u).filter(Boolean))];
        const canonicalRoot = await realpath(root);
        const unavailableDocuments = [];
        const matches = [];
        for (const path of DOCUMENT_PATHS) {
            let content;
            try {
                content = await readDocument(canonicalRoot, path);
            } catch {
                // 只返回白名单内的相对路径，不向客户端泄露文件系统错误和绝对路径。
                unavailableDocuments.push(path);
                continue;
            }
            for (const section of splitSections(content)) {
                const text = normalize(section.lines.join("\n"));
                if (!terms.length || !terms.every((term) => text.includes(term))) continue;
                const score = terms.reduce(
                    (total, term) =>
                        total + (normalize(section.title).includes(term) ? 100 : 0) + text.split(term).length - 1,
                    0
                );
                matches.push({ path, section: section.title, score, ...sectionExcerpt(section, terms) });
            }
        }
        matches.sort(
            (left, right) =>
                right.score - left.score || left.path.localeCompare(right.path) || left.startLine - right.startLine
        );
        return {
            query: query.trim(),
            totalMatches: matches.length,
            results: matches.slice(0, limit).map(({ score: _score, ...result }) => result),
            unavailableDocuments
        };
    }

    async function getComponentContract(name) {
        if (!COMPONENT_NAMES.includes(name)) {
            return { found: false, code: "UNKNOWN_COMPONENT", name, availableComponents: [...COMPONENT_NAMES] };
        }
        const path = "docs/component-contracts.md";
        let content;
        try {
            content = await readDocument(await realpath(root), path);
        } catch {
            return { found: false, code: "DOCUMENT_UNAVAILABLE", name, path };
        }
        const section = splitSections(content).find((entry) => entry.title === name);
        if (!section) return { found: false, code: "CONTRACT_NOT_FOUND", name, path };
        const text = section.lines.join("\n").trimEnd();
        const contract = text.slice(0, MAX_CONTRACT_CHARACTERS);
        return {
            found: true,
            name,
            path,
            section: section.title,
            startLine: section.start + 1,
            endLine: section.start + contract.split("\n").length,
            sourcePath: `src/components/business/${name}.vue`,
            contract,
            truncated: contract.length < text.length
        };
    }

    return { searchProjectDocs, getComponentContract };
}
