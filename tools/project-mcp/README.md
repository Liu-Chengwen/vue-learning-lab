# Vue Lab 只读项目知识 MCP

这是独立于浏览器应用运行的 Node.js stdio 服务，使用已锁定的 MCP SDK v1 接口。服务不需要模型 API Key，也不主动连接网络。

## 启动与接入

日常运行 `pnpm harness:codex`，由项目启动器为本次 Codex 进程注入 MCP 配置，宿主负责启动和关闭服务。该入口不修改用户全局配置，具体用法见 [Harness 指南](../../docs/harness/guide.md)。

单独调试可从项目根目录运行 `pnpm harness:mcp`。进程等待宿主的 stdin/stdout JSON-RPC 请求；没有网页或启动网址。宿主也可从任意目录用该入口的绝对路径启动，文档根目录由模块位置定位。

本项目的实际 Codex 接入配置、验证记录见 `docs/harness/runs/`。stdin/stdout 仅传协议，诊断输出写 stderr。当前聊天的工具目录是否刷新与服务端代码写好是两个独立状态。

## 两个工具

| 工具 | 参数 | 返回 |
| --- | --- | --- |
| `search_project_docs` | `query`：1～160 字符；`limit`：可选整数 1～8，默认 5 | 命中章节、相对路径、原始行号、最多 900 字符摘录、截断标记及不可用文档列表 |
| `get_component_contract` | `name`：SearchPanel、DataTable、TaskFormDialog 或 RemoteSelect | 从组件契约文档取得的真实章节、行号、固定源码路径；未知组件返回明确工具错误 |

查询中的空格分隔多个关键词时按同时匹配处理，支持中文和英文大小写归一；这是小型文档关键词检索，不是语义搜索。每次查询读取当前文件，不维护第二份组件规范或长效缓存。文档是参考数据，不能替代用户指令或实际源码。

## 读取范围与限制

白名单在 `knowledge.mjs` 中列明，只包含 README、组件契约、知识覆盖、学习指南、构建指南、Harness 计划和首个任务定义。工具参数没有任意路径、写入或 shell 执行入口。

每个文件最多读取 128 KiB；文档路径不允许符号链接跳转到白名单外文件，缺失、链接或超限的文档作为不可用来源报告。工具的 readOnly 注解用于描述能力，读取边界由实际服务端代码实现。

## 验证

运行 `pnpm exec vitest run tests/harness-mcp.spec.js`。测试通过真实 SDK stdio 客户端握手、发现并调用工具，也使用临时目录验证路径与文件大小边界。测试不联网，退出时关闭客户端子进程。宿主实际调用需要另外验证并记录。
