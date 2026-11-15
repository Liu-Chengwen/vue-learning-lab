# 第 04 课：WKWebView / Hybrid 联调

本课保留前一阶段的双向字符串通信，并增加第三阶段的 Promise 请求与响应，以及调用原生能力的定位与导航实验。通信入口为 `http://localhost:5173/#/hybrid`，定位入口为 `http://localhost:5173/#/hybrid/location`，导航入口为 `http://localhost:5173/#/hybrid/navigation`，也可从侧栏或全局搜索进入。HybridLab 负责 UIKit / WKWebView 容器，vue-lab 负责页面和 JavaScript 封装。

## 目录与阅读顺序

```text
src/features/hybrid/
  HybridLabView.vue       字符串实验、五个 Promise 练习、结果与通信记录
  useNativeBridge.js      页面响应式状态、练习动作、挂载和卸载清理
  LocationLabView.vue     原生定位按钮、结果、状态与学习说明
  useLocation.js          定位调用、页面状态与卸载清理
  navigation/
    NavigationLabLayout.vue   导航实验父布局、Bridge 入口与子页面切换
    NavigationLabHome.vue     实验入口、跳转模式与本页状态
    NavigationDemoPage.vue    页面 A / B 的局部状态与继续跳转
    useHybridNavigation.js   实验范围内的 Router / Native 跳转封装
src/utils/
  nativeBridge.js         请求 ID、pending 回调表、按次超时及响应匹配
src/router/index.js       通信、定位和导航实验的懒加载路由
src/data/navigation.js    搜索入口
src/App.vue               侧栏入口
docs/hybrid-integration.md
```

建议先从页面按钮找到 `useNativeBridge.js` 中对应的练习函数，再读 `nativeBridge.call()` 如何创建 Promise。最后对照 HybridLab 的 `NativeMessageHandler`、`WebViewController.handleBridgeRequest` 和 `replyToWeb` 看一条消息怎样返回。

页面输入草稿、反馈和最近 30 条记录属于本次实验，不写 Pinia 或 localStorage。新增协议单独放在工具文件中，没有引入通用 Bridge 框架。

## 前一阶段：字符串通信仍可使用

| 方向 | 入口 | 结果 |
| --- | --- | --- |
| Native → H5 | `window.receiveNativeMessage(message)` | Vue 更新收到的字符串 |
| H5 → Native | `window.webkit.messageHandlers.nativeBridge.postMessage(text)` | Swift 读取字符串并显示 UIKit 弹窗 |

这两个实验对应页面的 01、02 区域。普通浏览器可展开“在浏览器中练习接收”，仅模拟页面展示，不会调用 Swift，也不增加真实入口调用次数。

字符串发送成功只表示提交了 WebKit 通道。它没有请求 ID 或回复协议，仍需观察 iOS 弹窗确认 Native 处理。第三阶段的 Promise 结果则来自下面新增的结构化响应。

## 第三阶段：一次异步调用的协议

H5 和 Native 继续共用名为 `nativeBridge` 的处理器，只注册一次。消息处理器先检查名称、`message.frameInfo.isMainFrame` 和配置的网页来源（协议、主机、有效端口），再区分旧字符串消息与新的结构化请求。来源检查适用于所有 Bridge 消息，而非仅定位请求；路径和 hash 不属于 origin，因此同一服务下的 Hybrid 实验路由可共用同一通道。

请求对象：

```json
{
    "id": "req-101",
    "action": "greet",
    "params": { "name": "Vue Lab" }
}
```

成功响应：

```json
{
    "id": "req-101",
    "ok": true,
    "data": { "message": "你好，Vue Lab，来自 Swift" }
}
```

失败响应：

```json
{
    "id": "req-101",
    "ok": false,
    "error": "不支持的方法：unknownAction"
}
```

这里的 ID 只是示意值。实际每次调用都会生成不同的字符串 ID；Native 必须原样带回，才能找到对应的 Promise。

## 调用链与清理

1. 页面调用 `nativeBridge.call(action, params)`，得到一个 Promise。
2. 工具层为本次请求生成 ID，在 `pending` 回调表中保存 `resolve`、`reject` 和超时定时器。
3. `postMessage({ id, action, params })` 把对象提交给 Native；发送本身不会直接返回业务结果。
4. Swift 解析 `action`，执行设备信息或问候能力，通过 `JSONSerialization` 把响应字典转换成 JSON。
5. Swift 用 `evaluateJavaScript` 调用 `window.HybridBridge.receiveResponse(response)`。
6. H5 根据响应 ID 找到等待项，先清理定时器和回调记录，再根据 `ok` 调用 `resolve(data)` 或 `reject(error)`。

`await` 只是暂停当前异步函数的后续代码，不阻塞 JavaScript 主线程。`Promise.all` 可以同时等待不同请求，最终结果按传入顺序组织，即使 Native 的回复顺序不同也不会串到另一条请求。

通信、定位实验由各自页面安装 `window.HybridBridge.receiveResponse`；导航实验由父布局安装，切换其子页面时保留入口，离开整个实验时清理等待请求和全局入口。普通浏览器缺少 handler 时会得到明确失败提示；同步提交异常也会结束对应 Promise。成功、失败和超时都会从回调表中移除任务，迟到或找不到 ID 的回复不会再改变已结束的请求。默认期限仍为 5000 毫秒，定位通过可选的第三个参数单独延长等待，不改变原有练习。

离开页面后，不应继续把旧请求结果写回已卸载的组件。重新进入页面或刷新网页后会重新建立 H5 接收入口；这还不是完整的 `bridgeReady` 就绪握手。

## 五个手工练习

先启动 vue-lab，再从 HybridLab 首页进入 WKWebView 页面，等待 Hybrid 实验页面可见。第三阶段五个按钮默认不自动执行；每次练习结束后再操作下一项。

1. **正常请求**：点击“获取设备信息”。查看平台、系统名称和系统版本，数据应来自 `UIDevice.current`，页面没有硬编码示例版本。
2. **带参数请求**：修改姓名，点击“带参问候”。Swift 读取 `params.name` 并返回问候；可以使用单引号、双引号和换行，确认文本原样显示且不会变成可执行代码。
3. **错误处理**：点击“未知方法错误”。Native 返回 `ok: false`，Promise 进入 rejected，页面显示错误说明；之前的成功结果仍可作为对照。
4. **超时模拟**：在 **Debug** 版 HybridLab 点击“等待 5 秒超时”。Native 的 `debugNoReply` 分支故意不回复，约 5 秒后 H5 显示超时并清理等待项。该分支只用于学习，练习后可移除；Release 版没有这个分支，会直接返回未知方法错误。
5. **并发请求**：点击“并发请求”。页面用 `Promise.all` 同时请求设备信息和带参问候，展示组合结果；每个请求使用自己的 ID 和 Promise，不能按“先回来就给第一个请求”的方式分配结果。

页面的“等待 Native 回复”数量来自当前等待请求。五个按钮在一轮练习中暂时禁用，便于观察单轮结果；并发练习内部仍会发出两条独立请求。普通浏览器没有 Native 通道，不会伪装成功返回设备信息。

## 原生能力练习：getLocation

从 HybridLab 首页进入定位实验，或在同一容器内打开 `/#/hybrid/location`。复用的 `WebViewController` 通过传入 URL 加载页面；`HybridConfiguration.locationPageURL` 与原通信页面使用同一开发服务地址。

```js
const location = await nativeBridge.call("getLocation", {}, { timeoutMs: 60000 });
```

`timeoutMs` 是工具层选项，只决定本次 Promise 最长等待时间，不会放进发给 Swift 的 `params`。定位需要留出用户阅读授权提示的时间，所以 H5 等待 60 秒；Native 在收到请求后最多处理 45 秒，包含等待授权的时间，通常能先返回明确错误。其他调用省略此选项，仍使用 5 秒期限。

Swift 的 `LocationService` 持有 `CLLocationManager`，通过代理回调接收授权变化、定位成功和失败。只有点击 H5 按钮、收到有效请求后，才检查权限并在尚未选择时申请“使用 App 期间”权限；页面加载不会自动弹定位授权。已经授权时调用 `requestLocation()` 获取一次结果，拒绝或受限时返回错误；同一服务正在等待时拒绝重复请求。定位错误、超时和成功都沿用已有的 `id / ok / data / error` 协议，无需另建返回入口。

成功数据的字段如下：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `latitude` | number | 纬度，单位为度 |
| `longitude` | number | 经度，单位为度 |
| `horizontalAccuracy` | number | 水平精度，单位为米；数值越大，位置范围越宽 |
| `timestamp` | string | 该次位置采样的 ISO 8601 时间，可能早于页面收到响应的时间 |

用户关闭精确位置后，系统仍可能返回有效的近似位置；本实验显示其精度，不额外要求临时精确权限。页面只在内存中保留最近一次成功结果，失败时仍可作对照；不持久化、不上传坐标，也不调用浏览器定位、地图或逆地理编码。普通浏览器缺少 Native 通道时显示错误，不返回示例坐标。Native 日志仅记录请求和状态，不记录经纬度。

### 生命周期与基础手工验证

H5 切换 SPA 路由会卸载页面：`dispose()` 取消等待中的 JavaScript Promise，后续回调不再更新旧组件。它没有向 Swift 发送取消消息，Native 任务仍由自己的 45 秒期限约束。退出原生容器、整页导航或刷新会取消 Native 定位；控制器还会区分旧、新文档，避免将旧定位结果回传给新网页。系统授权提示不视为退出原生页面。

基础验证由实际运行时操作确认即可：

1. 在 HybridLab 中进入定位页，点击获取并允许使用期间定位，检查四个结果字段；再次获取应使用已有授权。
2. 拒绝授权后检查错误和重试提示。可在系统设置中调整定位权限后再试；关闭精确位置时观察 `horizontalAccuracy`。
3. 在模拟器中为设备设置一个模拟位置再获取。模拟器展示的是模拟位置；要确认本人当前所在地，请使用真机。

以上是操作步骤，不代表本次已完成权限弹窗或真机定位验收。无需为学习项目进行多设备或全量回归验证。

## 容器与路由实验：openWebView

导航实验入口为 `/#/hybrid/navigation`，也可从 HybridLab 原生首页的导航实验卡片打开。两个目标页是 `/#/hybrid/navigation/page-a` 和 `/#/hybrid/navigation/page-b`。实验中的模式只影响这三张页面，不修改侧栏、任务详情或其他业务页面的导航策略。

建议按 `NavigationLabLayout.vue` → `NavigationLabHome.vue` / `NavigationDemoPage.vue` → `useHybridNavigation.js` → Native 的 `openWebView` 处理方法阅读。页面只表达要去哪一页，小封装负责生成目标地址、选择跳转方式和处理等待状态。

| 模式 | 实际动作 | 页面与状态 |
| --- | --- | --- |
| 当前容器路由跳转 | `router.push()` | 使用当前 JS 环境，实验子页面卸载后重新进入会创建新的页面实例 |
| 新建原生容器 | Bridge 调用 `openWebView`，Swift 创建新的 `WebViewController` 并 push | 旧容器及其 Vue 页面仍保留；新容器创建自己的 JS 环境和 Vue / Pinia 实例 |

入口和目标页都可以选择模式，默认使用路由。新容器的地址通过 `navMode` 查询项携带本次实验配置，在新页面加载时初始化模式；它不写 localStorage，也不是全站开关。普通浏览器可以完成路由实验，选择新容器时会得到通道不可用提示，不会伪装成 Native 打开成功。

### 请求与成功语义

```js
await nativeBridge.call("openWebView", {
    url: targetURL,
    title: "导航页面 A"
});
```

`url` 是必需的绝对地址，由小封装通过 Vue Router 解析目标，再生成完整 URL，保留 hash 路由和查询参数；`title` 是可选的原生导航栏标题。Native 会检查参数、目标 URL 的协议 / 主机 / 有效端口及站内 hash 路由，拒绝带用户名或密码的地址，并确认请求来自当前栈顶且没有正在进行的导航转场。等待期间避免重复点击，失败时保留当前页面并展示原因。

成功仍沿用原协议，例如：

```json
{ "id": "req-demo", "ok": true, "data": { "opened": true } }
```

`opened: true` 表示新容器已经加入原生导航栈，**不表示目标网页加载完成或 Vue 已挂载**。目标网页随后加载失败时由新容器处理，不会把已经完成的 Promise 再次改为失败；本实验继续使用默认 5 秒的 Bridge 等待时间。

### 两种生命周期与返回

`NavigationLabLayout` 只在整个导航实验进入 / 离开时安装和清理 Bridge。它的子 `RouterView` 切换入口、A、B，页面草稿和点击计数留在各个子页面中，不放到父布局、Pinia 或持久化存储，因此可以真实观察子页面重建。

- 在当前容器内从入口切到 A，再用 H5 的路由返回按钮回来，入口组件会重新创建，局部草稿和计数重新初始化。
- 从入口新建原生容器打开 A，旧入口没有卸载；用原生导航栏返回关闭新容器后，旧入口的草稿和计数仍在。
- 在新容器 A 中切到路由模式，再打开 B，A 和 B 使用同一个 JS 环境。此时 H5 返回操作处理当前容器的路由历史；原生返回操作关闭当前容器，两个栈各有职责。
- 直接打开目标页、刷新后或当前容器没有可用的实验路由历史时，H5 返回会在容器内替换为实验入口。封装使用当前 JS 环境标识标记自己的历史项，只回退到本次实验可确认的历史，不依赖 `history.length` 盲目后退。

页面展示的 **JS 环境标识** 用于比较两张页面是否运行于同一次 JS 启动环境；它不是 Native 容器 ID，整页刷新也会重新生成。新 WebView 的 JS / Pinia 内存独立，同源 Cookie 和 localStorage 可使用相同的网站存储，但已加载的业务 store 不会自动跨容器同步。本实验仅观察局部页面状态，不扩展跨容器业务状态同步，也不接管全站导航。

### 最小手工练习

1. 在入口输入一段草稿、增加计数，使用路由模式打开 A，再用 H5 返回。观察入口状态重置、页面实例变化，JS 环境标识保持相同。
2. 再次填写入口状态，改用新容器模式打开 A，再点原生导航栏返回。观察入口状态保留，A 的 JS 环境标识与入口不同。
3. 新容器打开 A 后，将模式切到路由，继续打开 B，再用 H5 返回 A。观察两层导航的区别；也可以直接打开 A，体验无内部历史时回到入口的处理。

以上步骤供你运行时体验，不表示已经完成模拟器 push / pop 或视觉验收。基础验证只需相关用例与构建，不做全量回归。

## Swift 侧的对应职责

- `NativeMessageHandler`：检查名称、主框架与配置的网页来源，兼容字符串，再把对象请求交给控制器。`weak owner` 避免 handler 反过来强持有控制器。
- `handleBridgeRequest`：解析 `id`、`action` 和 `params`，分发 `getDeviceInfo`、`greet`、`getLocation`、`openWebView` 等动作，对未知方法或可回复的格式错误返回失败。
- `LocationService`：管理使用期间授权、一次定位、45 秒总期限与清理；通过完成闭包交还结果，不依赖 WebKit。
- `openWebView`：校验目标与当前导航状态，创建独立网页容器并交给现有 `UINavigationController` 管理；不等待目标 Vue 就绪。
- `replyToWeb`：统一组装成功或失败字典，序列化为 JSON 后回传；不直接把姓名等用户内容拼入 JavaScript 源码。

`evaluateJavaScript` 完成回调只说明 JavaScript 求值成功或失败。业务 Promise 是否成功，取决于响应中的 `ok` 以及 H5 是否找到对应的等待项。

本工程继续使用普通 `WKScriptMessageHandler` 和手工请求 ID，目的是学习回调表原理，没有切换到 `WKScriptMessageHandlerWithReply`。

## 模拟器与真机地址

- 同一台 Mac 上的 iOS 模拟器默认使用 `http://localhost:5173/#/hybrid`，端口以 Vite 实际输出为准。
- 真机的 `localhost` 指向手机。Mac 与手机需网络互通，vue-lab 用 `pnpm dev --host 0.0.0.0` 启动，Native 的 `HybridConfiguration` 使用 Mac 当前的局域网 IP。
- 本项目保留 HybridLab 已有的本地 HTTP 配置，不通过开放任意加载来替代地址排查。

出现 `window.receiveNativeMessage is not a function` 时，确认位于字符串实验 `/#/hybrid`；定位与导航页不提供这个旧入口。`window.HybridBridge` 尚未建立时，先确认位于通信、定位或导航实验中，并等待 Vue 组件挂载。`WKNavigationDelegate.didFinish` 不保证异步路由组件已经准备好，本阶段不在这个回调里自动发送消息。

## 实现边界

当前请求只开放教学所需的少量 action。主框架和配置来源检查限定了能够调用 Bridge 的页面；来源中的协议、主机和有效端口必须匹配，不能只看页面标题或地址字符串前缀。它仍不是完整的生产权限策略，真实项目需要按能力和参数设计更细的授权。

本阶段实现请求 ID、Promise 成功/失败、默认及按次超时、页面退出清理、并发匹配、单次原生定位和专用导航实验。没有后台或持续定位。完整就绪握手、跨页面恢复未完成请求、生产权限策略和大规模能力模块化不在本阶段范围。

## 前一阶段的 H5 验证记录（历史）

以下记录来自之前的字符串实验，不表示本次 Promise 协议已经完成 iOS 实际联调：

- 专用测试覆盖字符串收发、原文保留、HTML 文本渲染、无通道与异常反馈、模拟来源、入口恢复与卸载清理，以及真实表单与清空记录按钮。
- 普通浏览器实际操作了发送、展开模拟接收和清空记录：缺少通道时出现提示，模拟消息标明来源，清空后保留接收内容。
- 检查过宽屏双列和窄屏单列布局，页面宽度未超过视口；窄屏可继续操作表单与日志。它不能替代本次新增协议的 WKWebView 验收。

相关底层接口见 Apple 的 [evaluateJavaScript 文档](https://developer.apple.com/documentation/webkit/wkwebview/evaluatejavascript(_:completionhandler:)) 与 [WKScriptMessageHandler 文档](https://developer.apple.com/documentation/webkit/wkscriptmessagehandler)。
