# Vue Lab · AI Harness 实践计划

规划日期：2026-11-03。实施进度：阶段 0～6 已完成。项目规则、三个 Skill、两项 MCP 工具及统一校验已有实际执行证据；学习记录去重修复与 SearchPanel 字段禁用需求均已实现。最新完整校验通过 83 项测试及格式、双构建，字段禁用示例通过 Chrome 桌面及 375 × 667 窄屏验收。证据见[基线记录](harness/runs/2026-11-03-baseline.md)、[阶段 2～4 记录](harness/runs/2026-11-03-skills-mcp-verify.md)、[阶段 5 记录](harness/runs/001-learning-record-dedup.md)、[阶段 6 开发记录](harness/runs/002-search-panel-disabled.md)与[浏览器验收](harness/runs/002-search-panel-disabled-browser.md)，运行方法见[使用指南](harness/guide.md)。

## 1. 目标与实施方式

在现有 Vue 学习实验室中，建立一套可运行、可复用、可展示的 AI 辅助研发工作流：

**需求 / 问题 → 读取项目规则 → 按 Skill 执行 → 通过 MCP 获取项目知识 → 修改代码 → 自动检查 → 根据反馈修复 → 审查与人工验收。**

Codex 提供模型执行、文件操作、工具调用和任务循环等基础能力；本项目负责补充项目规则、专用 Skill、只读知识工具和确定性校验。本案例定位为基于现有执行环境建设项目 Harness 工作流。

第一版使用当前 Codex 环境和项目原有 JavaScript 技术栈。每个阶段解释目的、展示产物并验证效果。当前已具备项目启动器、Skill、只读 MCP 和统一校验，并通过两个真实业务案例验证了需求、修改、检查、反馈修复及审查验收的流程。

## 2. 项目现状

以下是规划时的初始核查快照，当前进度见文件开头及阶段记录：

| 项目项 | 当前状态 | 对本次实践的意义 |
| --- | --- | --- |
| 业务基础 | Vue 3、Element Plus、Pinia、Router，已有任务与学习模块 | 可以直接选择真实的小改动 |
| 项目知识 | README、组件接口、知识覆盖表、学习指南等 | 可作为 MCP 的实际知识来源 |
| 测试 | 8 个 Vitest 测试文件，使用 Vue Test Utils 与 happy-dom | 可以增加行为测试，观察修复反馈 |
| 已有命令 | `test`、`format:check`、`build`、`webpack:build`、`check` | 复用现有工具链 |
| 综合检查 | `check` 包含测试与两个构建，未包含格式检查 | 统一校验需要补齐这部分 |
| AI 项目入口 | 未发现 AGENTS.md、项目 Skill、MCP 或 CI 配置 | 需要分层补齐 |
| Git | `git status --short --branch` 返回当前目录不是 Git 仓库 | 实施时先建立版本基线，再使用实验分支 |

规划时未重新运行测试与构建。[既有验收记录](verification.md)中的结果是历史记录；实施阶段已经建立 Git 基线，并重新通过格式检查、38 项测试及两个构建，详见阶段记录。

## 3. 各部分的职责

| 部分 | 负责的事情 | 本项目的落点 |
| --- | --- | --- |
| AGENTS.md | 持久的项目约定、目录入口、命令与边界 | 复用组件、保留必要中文注释、明确状态归属、按变更选择检查 |
| Skill | 说明某类任务的执行方法和成功标准 | 问题定位、需求开发、代码审查 |
| MCP Server | 通过标准协议提供受控的项目知识查询 | 检索文档、查询组件契约 |
| 校验脚本 | 确定性运行检查，输出退出码和结果 | 格式、测试、主应用与对照示例构建 |
| Codex | 理解任务、选择工具、修改和验证、处理反馈 | 执行工作流，记录实际执行证据 |
| 开发者 | 确定需求、理解方案、审查和验收 | 能解释流程及代码变更理由 |

Skill 定义可复用流程，MCP 提供数据或受控动作，职责见 [OpenAI 官方说明](https://developers.openai.com/plugins/concepts/skills)。AGENTS.md 的加载范围按[官方项目指令说明](https://learn.chatgpt.com/docs/agent-configuration/agents-md)确认。

## 4. 阶段安排

| 阶段 | 实际工作 | 主要产物 | 验收标准 |
| --- | --- | --- | --- |
| 0：建立基线 | 核对文件，建立本地 Git 初始版本与实验分支，执行现有检查 | 基线记录、版本与分支信息 | 区分原有失败与新增失败，具备审查和回退基础 |
| 1：项目上下文 | 编写精简 AGENTS.md，关联已有文档，明确首个任务和改动范围 | 项目规则、任务说明 | 新的实际执行会话确认规则被加载；任务有明确验收项 |
| 2：Skill | 实现 bug-investigation、code-review、feature-dev | SKILL.md 与必要参考 | 在宿主中能发现、触发并实际执行；输出有依据的结果 |
| 3：只读 MCP | 使用 Node.js ESM 与 MCP SDK 建立本地 stdio 服务，接入宿主 | 服务、协议测试、接入说明 | 客户端能发现并调用工具，AI 会话得到真实查询结果 |
| 4：统一校验 | 增加 `pnpm harness:verify`，汇总已有检查并记录结果 | 校验脚本、结果报告 | 必需检查失败则整体非零退出；跳过和通过分别记录 |
| 5：真实修复闭环 | 通过 Skill 和 MCP 定位学习记录问题，先复现再修复与审查 | 回归测试、最小修复、运行记录 | 能展示修复前失败、修复后通过及完整校验结果 |
| 6：需求开发与复盘 | 增加 SearchPanel 字段级禁用能力，验证 feature-dev 的真实开发流程，整理演示 | 第二个案例、演示步骤、复盘 | 真实需求按同一流程完成，说明已验证能力和改进方向 |

按阶段推进。检查发现问题时先处理或记录阻塞，不把尚未执行的步骤标为完成。发布、远程操作和全局配置变更根据实际任务授权单独处理。

## 5. 第一轮：修复学习记录恢复时的重复 ID

[learning.js](../src/stores/learning.js) 在规划基线中恢复 completed、favorites、mastered 时只过滤非字符串，没有去重；completedCount 使用数组长度，toggle 每次只删除一个匹配项。该问题现已修复，以下保留任务定义。

例如恢复 `completed: ["vue-setup", "vue-setup"]` 时，存在重复计数和取消后残留的风险。正式实施已先复现再修复，失败与通过输出见[阶段 5 记录](harness/runs/001-learning-record-dedup.md)。

### 任务范围与验收

- 恢复这三个数组时保留字符串检查，对 ID 去重并保持首次出现的顺序。
- 保留已有合法字符串 ID、最近访问记录和存储异常兜底，不在本任务中引入专题目录校验或其他数据迁移。
- 新增 `tests/learning-state.spec.js`，验证恢复后唯一、完成数正确、一次切换能取消、顺序保留。
- 验证非法 JSON、非数组、混合类型输入和写入失败的兜底行为。

预期主要改动为该 store 与新增测试，必要的文档同步列入变更说明。

### 执行链路

任务输入 → 调用问题排查 Skill → MCP 检索学习记录与状态说明 → 阅读实际 store → 新增行为测试 → 观察失败 → 最小修复 → 定向测试 → 完整校验 → 审查 Skill → 输出差异和证据。

保留 MCP 调用结果、失败测试输出、修复差异、通过结果与审查结论。测试使用独立存储环境。

## 6. 第二轮：SearchPanel 字段级禁用

增加一个明确的小需求：字段配置支持 `disabled`，让对应的 Input、Select、DatePicker 禁用；未配置时保持现有交互。自定义字段插槽提供相同状态供使用方处理。

使用 feature-dev Skill，经 MCP 查询 SearchPanel 契约，再完成组件、使用示例、行为测试和契约文档更新。主要验证禁用状态、默认兼容、插槽状态及查询/重置协议；控件外观和实际交互在浏览器中做代表性检查。

这两轮分别展示问题修复和需求开发，围绕现有代码展开。

## 7. Skill 与 MCP 的最小设计

### Skill

| Skill | 输入 | 执行重点 | 输出 |
| --- | --- | --- | --- |
| bug-investigation | 问题、范围、已有证据 | 复现、区分假设与证据、定位、修复、回归 | 根因、变更、验证与剩余问题 |
| code-review | 变更、需求、检查结果 | 检查行为、边界、兼容性和测试，给出定位 | 分级问题与依据，或未发现问题及验证边界 |
| feature-dev | 需求、验收条件 | 查询契约、复用实现、补充必要测试、校验 | 可审查变更与验收对照 |

Skill 按任务引用相关文档。对已经授权的实施步骤持续执行；用户只要求规划时，只生成规划产物。

项目级目录优先采用 `.agents/skills/<name>/SKILL.md`。是否发现和生效，以实际宿主的列表、触发与执行为准，见 [OpenAI Skills 文档](https://learn.chatgpt.com/docs/build-skills)。

### MCP

第一版提供两个工具：

- `search_project_docs(query, limit)`：检索指定文档，返回来源路径、章节及有限长度的摘录。
- `get_component_contract(name)`：查询已知组件的 props、models、events、slots 和公开方法，返回文档依据与源码路径。

读取已有 docs 文档，避免再维护一份相同的组件规范。服务端限制可读范围、参数与结果长度，不提供任意文件读取、写文件或 shell 工具。stdio 协议输出与诊断日志分流。

验证包含正常查询、无结果、未知组件和越界输入；再由 SDK 客户端验证握手、发现和调用，最后在实际 Codex 会话中调用。客户端测试通过与宿主接入通过分别记录。

采用本地 stdio，按实际客户端确认配置方式，参考 [OpenAI MCP 文档](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)。仓库保留接入示例，全局配置不直接覆盖；需要重启或新会话时在阶段记录中说明。

## 8. 校验与证据

计划中的 `pnpm harness:verify` 组合以下检查，MCP 测试纳入现有测试入口：

1. `pnpm format:check`：保留现有约定，扩展必要的新代码目录。
2. `pnpm test`：原有测试及新增行为、MCP 测试。
3. `pnpm build`：主应用构建。
4. `pnpm webpack:build`：已有对照示例构建。

第一版沿用 JavaScript 与 Prettier。ESLint 和 TypeScript 类型检查作为后续扩展，不将格式检查表述为完整 lint / 类型检查。

报告包含任务与运行 ID、Git 版本及未提交状态、命令、起止时间、退出码、结果摘要、失败和跳过项；保留必要日志及原始输出位置。浏览器检查另记页面、操作和观察，happy-dom 不证明布局效果。

修复循环根据失败原因选择相关检查，修复后再做完整校验。相同原因持续失败或遇到环境、权限阻塞时报告原因，不盲目重试。脚本结果与 AI 分析说明分开呈现。

## 9. 预计目录

以下为计划结构，实施时按阶段创建：

```text
AGENTS.md
.agents/skills/
  bug-investigation/SKILL.md
  code-review/SKILL.md
  feature-dev/SKILL.md
tools/project-mcp/
  server.mjs
  README.md
scripts/harness-verify.mjs
tests/
  learning-state.spec.js
  harness-mcp.spec.js
docs/
  ai-harness-plan.md
  harness/tasks/
  harness/runs/
```

源码、任务定义与审查结论纳入版本管理，临时日志和生成产物按目录规则管理。接入 SDK 等依赖在实施时选定并锁定兼容版本，主应用不加载 MCP 服务端代码。

## 10. 展示与学习目标

演示从具体任务开始，展示规则入口、Skill 触发、MCP 结果、代码改动、检查反馈和审查报告。通过真实执行记录说明流程。

完成后应能结合代码回答：各层职责如何划分；为什么规则不能代替权限和自动检查；MCP 统一了什么接口；如何证明 Skill 和 MCP 已经生效；失败后如何定位和验证；如何记录耗时、人工介入与审查问题。

Vue 项目跑通后，再迁移到 uni-app 验证复用范围与平台差异。现阶段不预先声称跨项目验证成功，也不给出提效百分比。
