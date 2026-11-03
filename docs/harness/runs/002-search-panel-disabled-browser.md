# HARNESS-002：测试与浏览器验收补充

## 范围与结论

日期：2026-11-03（Asia/Shanghai）。按用户“第六步禁用字段已完成开发，由你完成测试”的要求，检查既有实现、自动测试及真实浏览器交互。起始分支为 `feat/ai-harness`，HEAD 为 `e26e7319aafaac8d06151c48608a4cd19b514b9e`，工作区干净。

**字段禁用需求验收通过。** 测试发现组件库示例中自定义优先级选择器与 label 未关联，已完成最小修复和回归；修复后 12 个测试文件、83 项测试，以及格式检查、Vite 和 Webpack 构建全部通过。Chrome 桌面和 375 × 667 窄屏代表性交互通过。本轮没有提交、推送或发布。

开发阶段的契约查询、实现和首次自动检查见[原始记录](002-search-panel-disabled.md)。本记录补齐该记录当时尚未进行的浏览器验收。

## 检查方式

- 使用项目 `code-review` Skill 审查实现与测试；独立代理只读复核，无字段禁用行为问题。浏览器发现标签问题后，按 `bug-investigation` Skill 建立失败测试、修复并复验，独立代理复核最终差异未发现新增问题。
- 当前会话未直接暴露项目 MCP 工具；通过项目已安装的 MCP SDK Client 与 stdio 服务真实调用 `get_component_contract({ name: "SearchPanel" })`，返回 `found: true`，来源为 `docs/component-contracts.md`，再核对组件和使用方。SDK 调用与宿主原生工具接入分别记录，不把文件读取记作 MCP 调用。
- 自动检查使用真实 SearchPanel 与 Element Plus 控件；页面测试替换无关展示组件，选值部分通过更新事件驱动。真实鼠标、键盘、弹层和布局另由 Chrome 验证。

## 发现的问题与回归

在 `/ui-library` → “业务组件封装”中，面板已有 `<label for="search-priority">`，但插槽内 ElSelect 未指定对应 id。Chrome Issues 报告 `Incorrect use of <label for=FORM_ELEMENT>`，优先级选择器缺少该标签提供的可访问名称。

先在页面集成测试中断言 `#search-priority` 是原生 INPUT，且其 `labels` 包含优先级 label。修复前实际失败：找不到该输入节点。随后仅给示例 ElSelect 增加 `id="search-priority"`，并在组件契约中说明自定义字段的标签关联责任；字段禁用、model、事件和重置逻辑不变。

| 命令 / 操作 | 实际结果 | 证据 |
| --- | --- | --- |
| 修复前 `pnpm exec vitest run tests/ui-library-search.spec.js` | 退出 1，1 项失败，缺少 `#search-priority` | [失败输出](002-search-panel-disabled/browser-label-red.txt) |
| 修复后 `pnpm exec vitest run tests/search-panel.spec.js tests/ui-library-search.spec.js` | 退出 0，2 文件、9 项通过 | [通过输出](002-search-panel-disabled/browser-label-green.txt) |
| 修复后新建 Chrome 测试标签页 | 选择器可访问名称为“优先级”；点击 label 可聚焦并打开选项 | 实际浏览器观察 |

## 完整自动校验

开始测试时先运行一次 `pnpm harness:verify`，四步全部通过，报告为 `.harness-artifacts/verify/2026-11-03T12-34-50-917Z-dc2bbf20/report.json`。这仅是修复前基线，不能代替修复后的检查。

修复后再次运行 `pnpm harness:verify`，退出 0。原始报告为：

```text
.harness-artifacts/verify/2026-11-03T12-49-39-949Z-7cbc1251/report.json
```

起止时间为 `2026-11-03T12:49:39.949Z` 至 `2026-11-03T12:49:51.413Z`，Git HEAD 如上，dirty 为 true。由于该目录被 Git 忽略，保留[报告副本](002-search-panel-disabled/browser-verify-report.json)及[测试输出](002-search-panel-disabled/browser-verify-test.txt)。

| 检查 | 状态 / 退出码 |
| --- | --- |
| `pnpm format:check` | passed / 0 |
| `pnpm test` | passed / 0，12 文件、83/83 通过 |
| `pnpm build` | passed / 0，Vite 主应用构建成功 |
| `pnpm webpack:build` | passed / 0，独立示例构建成功 |

该次完整校验之后只补充文档和证据文件，未再修改实现或测试。

## 真实 Chrome 操作与观察

访问既有本地服务 `http://localhost:5173/`，使用独立测试标签页。以下为真实浏览器操作，未以 happy-dom 结果代替。窄屏使用 Chrome 设备工具栏的 iPhone SE 视口 **375 × 667**，不是实体手机测试。

| 场景 | 操作与实际观察 |
| --- | --- |
| 默认可编辑 | 输入标题 `ref`，通过键盘选中高优先级，字段显示正常 |
| 开启禁用且保值 | 开启“禁用搜索字段”，输入框与插槽选择器禁用，`ref` / `high` 保留；尝试点击并输入不能修改值 |
| 禁用后的查询 | 查询仍提交 `{"query":"ref","priority":"high"}`，8 条初始任务筛至 1 条 |
| 禁用后的焦点 | 从查询按钮 Shift+Tab，跳过两个禁用字段，焦点回到开关 |
| 禁用后的显式重置 | 重置清空两项条件，禁用状态保留，查询结果恢复 8 条，提交默认条件快照 |
| 恢复编辑 | 关闭禁用后原值保留；可改标题为 `Flex`，优先级为 `medium`，查询得到“用 Flex 修复长文本溢出”1 条结果 |
| 弹层与禁用切换 | 打开优先级下拉后开启禁用，弹层关闭，原值保留 |
| 窄屏布局和操作 | 字段、开关、查询与重置按钮正常换行，没有新增搜索面板溢出；表格使用自身滚动区；禁用、恢复与重置可操作 |
| 原有任务页兼容 | `/tasks` 默认搜索字段可用；输入 `QA20261103` 查询得到空结果，重置恢复 8 条，输入值清空；未新增、修改或删除任务 |
| 修复后的浏览器诊断 | 新测试标签页 Console 为 0 条消息；Issues 无 page error，原 label 关联错误消失；仍有 1 条通用表单 id/name 改进提示，未记为零 Issues |

检查结束已关闭本轮测试标签页，保留原有页面及开发服务。未修改持久化任务、主题或密度设置。

## 验证边界

- 真实浏览器禁用示例覆盖内置 Input 和插槽 Select。内置 Select、DatePicker 的 disabled 由自动测试验证组件 prop 和原生 input.disabled；本次未额外制作日期禁用页面或宣称完成其真实浏览器验收。
- 未执行跨浏览器、实体手机、自动无障碍全量扫描或发布环境检查。Chrome Issues 中剩余的通用改进提示不属于本次标签关联修复的验收结果。
- 禁用字段仍参与查询，显式重置仍可改变禁用字段值；这是既定组件契约，不视作错误。
