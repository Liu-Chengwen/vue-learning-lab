# 阶段 2～4：Skill、MCP 与统一校验

日期：2026-11-03。分支：`feat/ai-harness`。基线提交：`2ec664293cd7cf7e6ed883da72e1f401f56e3d9c`。本轮实现尚未提交，校验报告的 Git dirty 为 true。

## 本轮产物

- `.agents/skills/`：bug-investigation、code-review、feature-dev 及各自界面元数据。三个 Skill 均使用中文，保持任务范围与已有授权。
- `tools/project-mcp/`：Node.js ESM stdio 服务、文档读取逻辑、说明和可选接入模板。
- `scripts/harness-codex.mjs`：通过本次 Codex 进程参数连接项目 MCP，固定仓库和服务路径。
- `scripts/harness-verify.mjs`：固定检查顺序、超时与取消、失败跳过、日志及 JSON 报告。
- 两个新增测试文件：`tests/harness-mcp.spec.js`、`tests/harness-verify.spec.js`。
- package 命令、格式覆盖范围、Git 忽略规则、项目规则与使用指南同步。

依赖采用 MCP SDK `1.32.2` 的 v1 接口，Zod 本次解析为 `4.6.7`，精确安装结果见 pnpm-lock.yaml。仅作为开发工具依赖，浏览器应用未引用服务端代码。

## Skill 静态验证

三个目录均通过官方 skill-creator 的 `quick_validate.py`，输出 `Skill is valid!`；界面默认提示包含对应 `$skill-name`，保持默认自动触发策略，链接和 Prettier 已检查。

验证器使用 `/tmp/vue-lab-skill-validation` 中的临时 Python 环境补齐 PyYAML，未修改系统 Python 或项目依赖。本轮行为测试使用显式 Skill 调用，未单独统计隐式选择的触发率。

## 实际 Codex 宿主验证

通过项目启动器启动三个新的只读 Codex CLI 会话，均退出 0。每次任务明确只做分析、方案或审查，不修改业务，不运行测试或构建。

| Skill | 实际操作 | JSONL 中完成的项目 MCP 调用 |
| --- | --- | --- |
| bug-investigation | 读取 Skill 和实现，静态诊断学习标记异常，给出复现计划 | search_project_docs：4 次 |
| feature-dev | 读取 Skill，核对 SearchPanel，提出 disabled 兼容方案 | get_component_contract：1 次；search_project_docs：1 次 |
| code-review | 读取 Skill，审查新增工具和已通过的校验报告 | search_project_docs：2 次 |

MCP 调用的 server 均为 `vue_lab_docs`，完成事件没有工具调用错误；SearchPanel 契约返回 found:true。原始事件与最终回答位于 `.harness-artifacts/integration/` 下的 bug、feature、review 文件。

问题排查回答区分了 store 的数组计数与总览的目录匹配计数，也明确没有实际复现学习记录缺陷。需求开发回答明确 disabled 尚未实现。通过这些结果验证 Skill 的范围遵守与工具配合。

## MCP 协议与读取边界

真实 SDK 客户端测试已完成 stdio 握手、发现与调用，只发现两个只读工具。8 项 MCP 测试包括来源行号、受限摘录、空结果、未知组件、非法参数、符号链接、超限文件和文档更新后重新读取。

服务读取固定白名单，查询参数不接受路径；stdout 专用于 JSON-RPC。工具只读注解与服务端实际限制分别实现。直接客户端成功与上面的 Codex 宿主成功分别验证。

日常入口为 `pnpm harness:codex`，通过进程参数提供实际配置。可选项目配置保存在示例文件中；本轮未改用户全局 MCP、项目信任或审批设置。

## 统一校验首次结果

`pnpm harness:verify` 首次完整执行四项均通过，退出 0，测试为 10 个文件、54 项通过。

报告：`.harness-artifacts/verify/2026-11-03T10-00-08-118Z-72ae0be4/report.json`。各步骤退出码均为 0，并有独立日志。

另用隔离的 Node 命令 fixture 验证失败传播：第一个子进程退出 7，整体命令退出 1，后续步骤为 skipped，不修改应用代码。证据位于 `.harness-artifacts/failure-demo/2026-11-03T10-01-33-825Z-d6356549/report.json`。

## 实际审查反馈与基础设施修复

code-review Skill 找到一项 P2 条件风险：直接子进程结束时清除强制终止计时器，可能留下同进程组、忽略 SIGTERM 且独立重定向 stdio 的孙进程。

已新增真实 POSIX 进程回归，修复前取消和超时两例均失败，报告返回后孙进程心跳仍增长；测试 finally 主动清理 fixture。失败日志位于 `/tmp/vue-lab-harness-verify-descendants-red.log`。

修复后把进程清理作为整次检查的等待流程：正常退出可快速结束，超过宽限期后终止同组残余进程，不再由直接子进程的 close 事件提前撤销强制清理。两项新增回归与原有用例共 10 项定向测试通过，日志位于 `/tmp/vue-lab-harness-verify-descendants-green.log`。

另外将 SIGTERM 的报告和 CLI 退出码统一为同一来源，并新增取消前未启动检查的行为验证。

最终再次执行 `pnpm harness:verify`，四项全部通过，退出 0，**10 个测试文件、57 项测试通过**。

最终报告：`.harness-artifacts/verify/2026-11-03T10-13-39-457Z-455a2222/report.json`。测试、格式、Vite 与 Webpack 步骤各自退出 0。复验后仅同步文档并检查链接、空白及差异。

## 验证边界

本轮的宿主调用证据来自新启动的 Codex CLI，会话工具目录在其他客户端中的加载另按客户端验证。烟测日志包含用户原有可选 MCP 连接提示及 ephemeral 会话的嵌套代理历史加载提示；主体会话自行完成，项目 MCP 返回正常。嵌套代理不作为本轮验收能力。两项进程组回归针对 POSIX，在 Windows 跳过，未将本次结果表述为跨平台进程清理验证。

原始产物目录被 Git 忽略，临时日志可能被清理；本记录保留关键结果与位置。当前没有修改 src 或既有业务测试，阶段 5 的学习记录修复和阶段 6 的 SearchPanel 开发仍待执行。本轮不涉及页面变更，未重复做浏览器视觉验收。
