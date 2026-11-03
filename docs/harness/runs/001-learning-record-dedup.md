# HARNESS-001：学习记录恢复去重

## 范围与版本

2026-11-03，分支 `feat/ai-harness`，基线 `5cc23e53cf4686357424b27434fc305e62084846`。继续上一轮复现阶段；开始时已有未跟踪的复现测试与证据文件，本轮保留这些文件并扩展测试。环境沿用 Node v24.18.0、pnpm 11.13.1、Vitest 5.0.5。

用户授权最小修复、定向测试和完整校验；不开始 SearchPanel，不提交或推送。

## Skill 与实际 MCP 调用

使用 `.agents/skills/bug-investigation/SKILL.md`；按任务要求使用 `.agents/skills/code-review/SKILL.md` 审查最终差异（同一代理只读自查，未启动子代理）。

复现阶段与本轮均实际调用项目 MCP `vue_lab_docs.search_project_docs({ query: "学习记录", limit: 5 })`，成功返回 7 个匹配中的 5 个章节，`unavailableDocuments` 为空。本轮原始返回保存在 [mcp-search.json](001-learning-record-dedup/mcp-search.json)。主要依据：

- `docs/ai-harness-plan.md:58–62`：重复 ID、按数组长度计数及一次取消残留的风险。
- `docs/ai-harness-plan.md:73–77`：查询、源码核对、失败复现、修复与验证链路。
- `docs/learning-guide.md:176–184`：浏览器 localStorage 学习记录与验证边界。
- 另返回任务状态和阶段安排；查询时的“尚未执行”是历史文档状态，本轮以实际代码、输出为准。任务状态已在本轮同步。

未涉及业务组件契约，未调用 `get_component_contract`。MCP 返回是说明依据，根因以实际源码与测试交叉核实。

## 根因与最小修复

修复前 `src/stores/learning.js:18–20` 只过滤非字符串，重复 ID 仍进入内存；`:28` 按数组长度计数；`:32–35` 每次仅删除一个匹配项，因此重复计数且取消后有残留。

本轮仅为三个标记的恢复引入内部 `restoreIds`：先沿用字符串过滤，再通过 Set 去重并按插入顺序生成数组。保留自定义 ID 和空字符串，不引入目录校验。计数、toggle、recent、存储键和持久化结构沿用既有实现；恢复后唯一数组让现有计数与切换得到正确结果。去重发生在内存恢复，仍在后续状态变化时由原有 watch 持久化，不新增启动写盘行为。

测试直接使用真实 store，独立 Pinia 与 Map 模拟存储，等待 `nextTick` 检查真实 watch 落盘，结束时销毁作用域并恢复全局。保留原有 10 例复现与对照，新增 10 例兼容验证：非法 JSON、四类非数组标记、读取异常、三类标记写入失败及恢复保存、recent 与持久化结构。

## 真实检查结果

| 阶段 / 命令 | 实际结果 | 证据 |
| --- | --- | --- |
| 修复前 `pnpm exec vitest run tests/learning-state.spec.js`（上一轮实际执行） | 退出 1；7 失败、3 通过。重复计数得到 2 而非 1，三类取消均残留并落盘；对照全通过，均为行为断言失败 | [原始失败输出](2026-11-03-learning-record-dedup-repro/vitest-output.txt)、[复现记录](2026-11-03-learning-record-dedup-repro.md) |
| 修复后首先运行 `pnpm exec vitest run tests/learning-state.spec.js` | 退出 0；20/20 通过，20:21:23 开始 | [原始通过输出](001-learning-record-dedup/vitest-after.txt) |
| 随后运行 `pnpm harness:verify` | 退出 0；整体 passed，四步全部实际执行通过，无 skipped | [报告副本](001-learning-record-dedup/verify-report.json) |
| 最终 `git diff --check` | 退出 0 | 工作区检查 |

完整校验原始报告路径：`.harness-artifacts/verify/2026-11-03T12-21-26-260Z-afc195c0/report.json`，起止时间为 `2026-11-03T12:21:26.260Z` 至 `2026-11-03T12:21:36.764Z`，基线 HEAD 如上，dirty 为 true。该目录被 Git 忽略，因此另保留报告副本；原始日志仍在同目录。

| 组成命令 | 状态 / 退出码 | 原始日志（相对报告目录） |
| --- | --- | --- |
| `pnpm format:check` | passed / 0 | `01.log` |
| `pnpm test` | passed / 0；11 文件、77 测试全通过 | `02.log` |
| `pnpm build` | passed / 0；Vite 生产构建成功 | `03.log` |
| `pnpm webpack:build` | passed / 0；独立示例生产构建成功 | `04.log` |

本轮定向测试与统一校验均首次通过，未发生需要修复后重跑的检查失败。随后仅同步任务状态与本记录，没有再修改实现或测试。格式检查只是 Prettier，不代表类型检查。

## 差异审查与剩余边界

按 code-review 技能核对任务验收、实际 store 差异、完整测试文件和以上验证结果：未发现需要修复的问题。恢复过滤与顺序、完成数量、三类一次取消和重新标记、已有合法数据、读写异常后的会话有效操作、recent 和存储协议均有行为证据；没有改动公开接口或异步清理逻辑。该结论是本代理自查，并非独立审查。

本轮无 UI 改动，未运行浏览器布局检查；happy-dom 与模拟存储不证明真实浏览器配额或跨标签页行为。后者未纳入本任务，保持现有边界。

交付包含 store 最小修复、测试、任务状态和执行证据；上一轮失败原始文件保持原样。HARNESS-001 已完成，未开始 SearchPanel，未提交、未推送。
