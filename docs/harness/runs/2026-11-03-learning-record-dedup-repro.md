# HARNESS-001：仅建立重复 ID 复现

- 日期：2026-11-03（Asia/Shanghai），定向测试开始于 20:19:06。
- 分支：`feat/ai-harness`；基线：`5cc23e53cf4686357424b27434fc305e62084846`；开始时工作区干净。
- 环境：Node v24.18.0、pnpm 11.13.1、Vitest 5.0.5；沿用项目 happy-dom 配置。
- 授权范围：使用 bug-investigation，只执行任务 001 的复现阶段，不修改 `src/stores/learning.js`，不提交或推送。

## Skill 与 MCP 实际执行

已读取 `.agents/skills/bug-investigation/SKILL.md`，实际调用宿主提供的 `vue_lab_docs.search_project_docs({ query: "学习记录", limit: 5 })`，成功后才核对 store 源码。查询返回 7 个匹配中的 5 个章节，无 unavailableDocuments：

- `docs/learning-guide.md:176–184`：学习记录存储、重置与验证。
- `docs/ai-harness-plan.md:58–62`：恢复仅过滤字符串、计数和取消残留风险。
- `docs/harness/tasks/001-learning-record-dedup.md:1–3`：任务状态。
- `docs/ai-harness-plan.md:51–56`：分阶段执行与实际验证要求。
- `docs/ai-harness-plan.md:73–77`：先查询、再读源码、建立真实失败的执行链路。

保存证据时再次实际调用相同查询，完整返回见 [mcp-search.json](2026-11-03-learning-record-dedup-repro/mcp-search.json)。本轮不涉及业务组件，未调用组件契约工具。

## 测试与真实结果

新增 `tests/learning-state.spec.js`，直接使用真实 store 的公开状态和 action；每例创建独立 Pinia 与 Map 模拟存储，结束时销毁 Pinia、恢复全局。异步持久化使用 `nextTick` 等待真实 watch，不 mock store、不修改实现。

执行 `pnpm exec vitest run tests/learning-state.spec.js`，退出码 **1**，共 **10 例，7 失败、3 通过**。完整 stdout/stderr 见 [vitest-output.txt](2026-11-03-learning-record-dedup-repro/vitest-output.txt)（原始输出改用 txt 后缀，避免被仓库的日志忽略规则排除）。

| 行为 | 实际结果 |
| --- | --- |
| completed、favorites、mastered 恢复去重及首次顺序（3 例） | 失败；非字符串被过滤，但重复字符串仍保留 |
| completedCount 唯一计数（1 例） | 失败；两个相同 ID 得到 2，预期 1 |
| 三类标记取消后重新标记、内存与持久化（3 例） | 失败；取消后仍保留一个 ID 并落盘，再切换反而删除剩余 ID |
| 三类无重复记录的恢复、取消、重新标记与持久化对照（3 例） | 全部通过，storageError 为空 |

所有失败为 AssertionError，发生在重复数组、重复计数或取消残留的行为断言上；测试文件成功加载、存储读取和 watch 写入可运行，无模块加载、Pinia 激活或测试环境错误。取消用例使用软断言，日志中的多条断言失败属于同一用例的内存及持久化检查，不代表额外测试用例。

另执行 `pnpm exec prettier --check tests/learning-state.spec.js`，退出码 0，通过。

## 源码定位与边界

- `src/stores/learning.js:18–20`：恢复数组只过滤类型，没有去重。
- `src/stores/learning.js:28`：completedCount 直接使用数组长度。
- `src/stores/learning.js:32–35`：indexOf 配合 splice 每次只删除一个匹配项。

本轮仅新增测试与本运行记录、MCP 返回和失败日志。store 保持原样，问题未修复，新增复现测试按预期保持失败。未执行修复、修复后复验、全量测试、构建、统一校验、浏览器检查或审查阶段；未提交、未推送。非法 JSON、非数组、写入失败等完整验收项留待后续授权阶段。
