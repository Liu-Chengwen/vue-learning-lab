# HARNESS-001：学习记录恢复去重

状态：已完成复现、最小修复、定向测试、完整校验与差异审查；未提交或推送。实际结果见 [执行记录](../runs/001-learning-record-dedup.md)。

## 目的与现象

修复前，恢复的完成专题、收藏题目、自评掌握记录中可能存在重复 ID。恢复代码只过滤非字符串，完成数量直接取数组长度，切换标记一次只删除一个匹配项。

例如完成记录为 `["vue-setup", "vue-setup"]` 时，会重复计数且取消后仍有残留。已用行为测试确认修复前失败；现恢复时去重并保留首次顺序，修复后测试通过，证据见执行记录。

## 上下文入口

- [learning.js](../../../src/stores/learning.js)：恢复、计数、切换和持久化。
- [business-state.spec.js](../../../tests/business-state.spec.js)：Pinia、存储和异步测试风格。
- [知识覆盖表](../../feature-coverage.md)：学习记录、持久化等当前范围。
- [Harness 计划](../../ai-harness-plan.md)：执行阶段与预期流程。

## 改动范围

- 调整 `src/stores/learning.js` 的 completed、favorites、mastered 恢复逻辑。
- 新增 `tests/learning-state.spec.js`，验证 store 的公开行为。
- 必要时同步相关说明与执行记录。

保留当前字符串过滤规则，对 ID 去重并保持首次出现的顺序。保留已有合法字符串 ID；最近访问记录、存储键、公开 action 和持久化结构保持当前协议。本任务不引入目录 ID 校验、跨端同步或其他数据迁移。

## 验收条件

1. 三种数组恢复后，各 ID 只保留一次。
2. completedCount 按恢复后的唯一记录计数。
3. 对已恢复的某条标记切换一次即可取消，再切换一次恢复一条。
4. 去重保持不同 ID 的首次顺序，其他合法记录不丢失。
5. 非法 JSON、非数组、混合类型输入仍可恢复为可用状态。
6. 写入存储失败时，内存操作仍有效，并提供 storageError。
7. 原有测试继续通过，不引入公开接口变化。

## 执行与验证

通过已就绪的问题排查 Skill、审查 Skill、只读 MCP 和统一校验执行：查询项目说明 → 阅读代码 → 编写复现测试 → 观察失败 → 最小修复 → 定向验证 → 完整校验 → 审查。

定向验证：`pnpm exec vitest run tests/learning-state.spec.js`。

完整检查使用 `pnpm harness:verify`，保留组成命令与结果；它包含格式、全部测试和两个构建。

运行记录应包含修复前失败、修复后通过、代码差异、Skill/MCP 实际调用与审查结论。测试使用独立 Pinia 和模拟存储环境。
