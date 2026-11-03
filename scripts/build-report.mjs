import { readdir, readFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { gzipSync } from "node:zlib";

// 读取本次真实构建的文件，不把教学页的虚构体积当成测量数据。
const root = resolve("dist");
/** 遍历当前构建目录，返回完整文件路径列表；Promise.all 并行读取互不依赖的子目录。 */
async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(
        entries.map((entry) =>
            entry.isDirectory() ? walk(resolve(directory, entry.name)) : [resolve(directory, entry.name)]
        )
    );
    // 子目录会返回数组，普通文件也包装成数组；flat 将每层结果合并后交给上层。
    return nested.flat();
}
try {
    // 只比较页面/脚本/样式，不把 .map、图片或 manifest 计进本表；这不是完整部署体积统计。
    const files = (await walk(root)).filter((path) => /\.(js|css|html)$/.test(path));
    const rows = await Promise.all(
        files.map(async (file) => {
            const contents = await readFile(file);
            return {
                file: relative(root, file),
                // 文件按字节读取；除以 1024 转 KiB，toFixed 后用一元 + 转回数字供表格展示。
                // gzip 是本地压缩估计，不包含 HTTP 头，也不说明服务器必定启用了这种编码。
                rawKiB: +(contents.byteLength / 1024).toFixed(2),
                gzipKiB: +(gzipSync(contents).byteLength / 1024).toFixed(2)
            };
        })
    );
    // 从大到小展示前二十项，完整文件数仍包含未展示的小分块；结果不是首页加载清单。
    rows.sort((a, b) => b.rawKiB - a.rawKiB);
    console.table(rows.slice(0, 20));
    console.log("JS/CSS/HTML 共 " + rows.length + " 个文件；gzip 为本地估算，实际传输取决于服务器配置。");
    console.log("入口依赖与动态分块关系：dist/.vite/manifest.json；source map 不计入上表。");
} catch (error) {
    console.error("无法读取构建产物，请先运行 pnpm build。", error.message);
    process.exitCode = 1;
}
