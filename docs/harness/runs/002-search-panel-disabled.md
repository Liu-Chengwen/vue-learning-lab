# HARNESS-002：SearchPanel 字段级 disabled

## 范围与状态

日期：2026-11-03（Asia/Shanghai）。分支 `feat/ai-harness`，基线 `5cc23e53cf4686357424b27434fc305e62084846`；工作区已有学习记录修复、测试和运行证据，本轮保留，不回退或覆盖。环境沿用 Node v24.18.0、pnpm 11.13.1、Vitest 5.0.5。

使用 `.agents/skills/feature-dev/SKILL.md`，已完成实现、契约、行为测试和自动校验。**浏览器验收待用户操作，未执行、未标记通过。** 未提交或推送。

## 实际 MCP 调用与源码核对

在读取 SearchPanel 实现前实际调用项目 MCP：

1. `vue_lab_docs.get_component_contract({ name: "SearchPanel" })` 成功，`found: true`，返回 `docs/component-contracts.md:16–26`，源码路径 `src/components/business/SearchPanel.vue`。原始返回见 [mcp-contract.json](002-search-panel-disabled/mcp-contract.json)。
2. `vue_lab_docs.search_project_docs({ query: "SearchPanel", limit: 5 })` 成功，返回 7 个匹配中的 5 个章节，无不可用文档。原始返回见 [mcp-search.json](002-search-panel-disabled/mcp-search.json)。主要依据为 `docs/ai-harness-plan.md:79–85` 的字段禁用范围及现有组件契约。

随后核对真实组件、现有受控重置测试、组件库使用方和契约文档。现有协议为父级持有 model、更新发新对象，submit/reset 发条件快照；字段插槽原先提供 value/update。本轮增加可选配置和插槽参数，沿用这些行为。

## 实现与验收对应

| 验收要求 | 实现与自动证据 |
| --- | --- |
| Input、Select、DatePicker 支持 `fields[].disabled` | SearchPanel 为三种真实 Element Plus 控件绑定布尔 disabled；三组参数化测试检查组件 prop 及原生 input.disabled |
| 缺省兼容、禁用保留值 | 缺省 false；切换不修改 model 或发出 model 更新；验证非目标字段保持可用、重新启用后可以更新 |
| 字段插槽提供 disabled，演示正确使用 | 插槽扩展为 `{ value, update, disabled }`，使用方负责绑定；插槽行为测试覆盖缺省、禁用、保值与恢复编辑，页面真实 ElSelect 绑定 disabled |
| 查询、重置、v-model 兼容 | 保留原有更新、submit/reset、expose；验证查询包含禁用字段、显式重置仍恢复默认快照、字段更新创建新对象且不修改父级旧对象；原有三个父受控重置测试保持通过 |
| 组件库可切换示例 | `/ui-library` → “业务组件封装”增加“禁用搜索字段”开关，控制内置标题输入框及自定义优先级选择器；页面测试通过真实点击开关验证往返保值及查询重置 |
| 测试与契约 | 扩展 `tests/search-panel.spec.js`，新增 `tests/ui-library-search.spec.js`，更新 `docs/component-contracts.md` 与页面公开接口说明 |

禁用开关是页面局部 ref，字段配置由 computed 派生；不进入 Pinia，不改变筛选或分页状态归属。组件不引入 model 清理、查询过滤或更新拦截；disabled 控制控件交互，自定义插槽消费方负责使用它。显式重置依然可改变禁用字段的值。

## 执行、失败定位与复验

先执行定向命令：

```sh
pnpm exec vitest run tests/search-panel.spec.js tests/ui-library-search.spec.js
```

首次退出 1：8 通过、1 失败。页面测试用 `attributes("aria-label")` 在 ElSwitch 根节点查找开关，得到 undefined；本地 Element Plus 源码表明该属性为 `ariaLabel` prop。修正为按 prop 定位，组件实现未因该失败改变。原始输出见 [targeted-initial-failed.txt](002-search-panel-disabled/targeted-initial-failed.txt)。修正后 9/9 通过，再将开关操作改为真实 click 并复验通过。

随后运行 `pnpm harness:verify`，首次退出 1，只有格式步骤执行：`tests/ui-library-search.spec.js` 的链式调用不符合 Prettier 格式。其余三个步骤均 **skipped**，不记为通过。失败原始报告为 `.harness-artifacts/verify/2026-11-03T12-26-02-032Z-00085d91/report.json`；保留 [报告副本](002-search-panel-disabled/verify-initial-failed.json) 与 [格式失败输出](002-search-panel-disabled/format-initial-failed.txt)。

执行 `pnpm exec prettier --write tests/ui-library-search.spec.js` 后，先重跑定向测试：退出 0，2 个文件、**9/9 通过**，20:26:14 开始。最终输出见 [targeted.txt](002-search-panel-disabled/targeted.txt)。

再运行 `pnpm harness:verify`：退出 0，整体 **passed**。最新原始报告路径：

```text
.harness-artifacts/verify/2026-11-03T12-26-22-544Z-0ed0d6e8/report.json
```

起止时间为 `2026-11-03T12:26:22.544Z` 至 `2026-11-03T12:26:32.687Z`，HEAD 如上、dirty 为 true。因原始目录被 Git 忽略，另保留 [完整报告副本](002-search-panel-disabled/verify-report.json)。各步骤日志位于原始报告同目录：

| 命令 | 实际状态 / 退出码 | 日志 |
| --- | --- | --- |
| `pnpm format:check` | passed / 0 | `01.log` |
| `pnpm test` | passed / 0，12 文件、83/83 测试通过 | `02.log` |
| `pnpm build` | passed / 0，Vite 生产构建成功 | `03.log` |
| `pnpm webpack:build` | passed / 0，独立 Webpack 示例构建成功 | `04.log` |

最终核对代码和测试 diff、运行 `git diff --check`，退出 0；未发现本轮范围内需要继续修复的问题。自动检查后仅新增本记录，未再修改实现和测试。

## 浏览器验收待办与验证边界

本轮遵照用户要求不操作浏览器，不将 happy-dom 的测试结果记为浏览器验收通过。页面测试保留真实 SearchPanel、Input、Select、Switch，替换无关的 LessonFrame、RouterLink、DataTable、TaskFormDialog、RemoteSelect；Select 的选值以组件更新事件驱动，日期控件的禁用由 DOM 和 prop 断言验证。自动检查不证明实际弹层、鼠标键盘交互与 CSS 布局。

供用户操作的代表性步骤（均待验收）：

1. 打开 `/ui-library` 的“业务组件封装”，输入标题、选择优先级，再开启“禁用搜索字段”。
2. 检查输入框和插槽选择器不能编辑且原值保留，查询仍应用当前条件。
3. 关闭开关，检查原值与编辑能力恢复；再次禁用后点击重置，检查恢复默认值并更新查询结果。
4. 观察桌面与窄屏的开关、字段和按钮布局，以及禁用状态下的焦点和清除交互。

示例展示内置 Input 和插槽 Select；三类内置控件（包括 DatePicker）已由定向测试验证。浏览器验收仍为待办，功能未发布，未提交、未推送。
