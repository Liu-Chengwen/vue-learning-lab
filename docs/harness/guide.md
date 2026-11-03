# AI Harness 使用与阅读指南

当前入口覆盖 Skill、只读项目知识 MCP 和统一校验。业务修复与 SearchPanel 新需求留到计划的后续阶段。

## 1. 从项目专用 Codex 启动

先安装项目依赖并确认本机 `codex` 已登录，再在项目终端执行：

```sh
pnpm harness:codex
```

该命令通过 `scripts/harness-codex.mjs` 启动 Codex，固定项目目录，并以本次进程的配置参数接入 `vue_lab_docs` MCP。Node 和服务文件使用绝对路径，支持含空格的目录；用户原有的全局配置、信任和审批策略保持原状。

启动器将 MCP 设为本次会话的必需服务，连接失败会反馈启动问题。其他 Codex 参数原样传递，例如只读方案演示：

```sh
pnpm harness:codex exec --sandbox read-only '使用 $feature-dev，只规划 SearchPanel 的字段级 disabled，先调用项目 MCP 查询契约，不修改文件。'
```

本轮接入验证是在新的 Codex CLI 会话中完成的，原始事件记录包含 Skill 文件读取和 MCP 工具调用。日常开发建议从这个入口启动，便于复现相同的项目连接。

`tools/project-mcp/codex.config.example.toml` 是可选项目配置示例。项目级配置的自动加载取决于宿主和项目可信状态，见 [OpenAI 配置说明](https://learn.chatgpt.com/docs/config-file/config-advanced)。启动器直接为本次调用提供配置，使用它无需编辑用户全局文件。

## 2. 使用三个 Skill

在新启动的 Codex 提示框中输入以下内容。这里的 `$` 是 Skill 调用标记。

| Skill | 适用任务 | 主要交付 |
| --- | --- | --- |
| `$bug-investigation` | 功能异常、报错、失败测试 | 复现证据、根因、最小修复、回归结果 |
| `$code-review` | 对变更或指定实现做只读审查 | 按风险排序、可定位的问题和验证边界 |
| `$feature-dev` | 明确的页面或组件小需求 | 验收条件、契约与复用、实现、必要测试及文档 |

例如，后续正式执行修复阶段时可以提出：

```text
使用 $bug-investigation，按照 docs/harness/tasks/001-learning-record-dedup.md
完成任务。先通过项目 MCP 查询依据，建立真实失败测试，修复后执行统一校验，
再进行代码审查并记录结果。
```

当前阶段仅做过只读诊断、方案和审查验证，上述业务任务尚未实施。用户只要求分析或规划时，Skill 保持相应范围。

Skill 定义执行方法，Codex 根据任务调用工具。SKILL.md 的 YAML frontmatter 提供 name/description 用于发现，正文提供流程；agents/openai.yaml 提供界面元数据，详见 [OpenAI Skills 说明](https://learn.chatgpt.com/docs/build-skills)。

## 3. MCP 能查询什么

- `search_project_docs({ query, limit })`：关键词检索项目文档，返回来源路径、章节、原始行号和有限摘录。
- `get_component_contract({ name })`：获取 SearchPanel、DataTable、TaskFormDialog、RemoteSelect 的现有契约与源码路径。

工具按白名单读取现有文档，参数不接受任意文件路径。文档内容仍须结合代码核对。完整参数与边界见 [MCP 服务说明](../../tools/project-mcp/README.md)。

`pnpm harness:mcp` 只启动 stdio 服务，进程会等待客户端的 JSON-RPC 请求，终端静默是正常的等待状态。日常使用启动器，由 Codex 管理服务进程即可。协议方式见 [MCP SDK stdio 文档](https://ts.sdk.modelcontextprotocol.io/server#stdio)。

## 4. 执行统一校验

```sh
pnpm harness:verify
```

固定顺序为：`format:check` → `test` → `build` → `webpack:build`。每个命令使用独立参数启动；前一步失败后，后续明确标为 skipped，总命令非零退出。

产物位于 `.harness-artifacts/verify/<runId>/`：

- `report.json`：Git 版本与 dirty 状态、整体状态、命令、退出码、起止时间、耗时、错误和跳过原因。
- `01.log`～`04.log`：各个实际执行步骤的 stdout/stderr，跳过的步骤不生成日志。

该目录已由 Git 忽略。阶段总结保存在 `docs/harness/runs/`，将必要结论和证据位置纳入版本管理。临时原始产物应按需要另行保存。

查看报告时，先看整体 status，再定位失败步骤的 logPath。`passed`、`failed`、`timed_out`、`cancelled`、`skipped` 有各自语义；Prettier 通过仍只是格式通过。

## 5. 建议阅读顺序

1. 根目录 [AGENTS.md](../../AGENTS.md)：项目长期约定。
2. [.agents/skills/bug-investigation/SKILL.md](../../.agents/skills/bug-investigation/SKILL.md)：一次问题排查的方法。
3. [MCP server.mjs](../../tools/project-mcp/server.mjs) 与 [knowledge.mjs](../../tools/project-mcp/knowledge.mjs)：协议工具与实际读取边界。
4. [harness-verify.mjs](../../scripts/harness-verify.mjs)：确定性校验与机器报告。
5. [执行记录](runs/2026-11-03-skills-mcp-verify.md)：本次做过的验证及限制。

后续真实任务中，把失败信息交给 AI 分析并修复，再用同一脚本复验。这一步才会形成业务开发的完整反馈闭环。
