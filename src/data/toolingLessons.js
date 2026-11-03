// 构建工具专题元数据与问答：页面、导航与面试复习共用。
// common 只收纳所有章节共同的展示字段；每条记录用 topic 对应 /tooling/:topic。
// source 是真实文件入口列表，正文中的流程/体积模型则不能作为实际测量数据。
const common = {
    category: "VITE / WEBPACK",
    level: "工程基础 → 原理",
    source: [
        "src/features/tooling/ToolingView.vue",
        "src/features/tooling/hmrState.js",
        "src/features/tooling/lazyFeature.js",
        "examples/webpack/webpack.config.cjs"
    ]
};

// 展开 common 只复制一层；共享 source 数组被当作只读配置使用，不在页面中 push/splice。
export const toolingLessons = [
    {
        ...common,
        id: "tooling-overview",
        topic: "overview",
        title: "Vite 与 Webpack，理解工具的职责",
        subtitle: "从入口到浏览器，分清开发服务、模块转换、打包与热更新。",
        goals: ["开发与构建流程", "Vite 8 的版本边界", "Webpack 模块图", "亲自运行对照项目"],
        explanation: [
            "本项目使用 Vite 8。它已经采用 Rolldown 作为统一 bundler，并结合 Oxc 完成相关编译工作。早期 Vite 使用 esbuild + Rollup 的历史架构需要注明版本，不能原样当作当前实现。",
            "默认开发体验以浏览器原生 ESM、按需转换和依赖预构建为基础；生产仍需要打包、分块、压缩与资源处理。不要将 Vite 简单称为生产环境不打包。",
            "Webpack 从入口建立依赖图，处理模块并生成一个或多个产物。loader 负责转换特定模块，plugin 介入编译流程；开发服务还负责提供产物与热更新连接。",
            "页面流程演示是有意简化的教学模型；真实启动与构建请运行 README 中的 Vite 和 Webpack 命令。速度受依赖、插件、缓存和项目规模等因素影响。"
        ],
        interview: [
            {
                question: "Vite 为什么通常能提供快速的开发反馈？",
                answer: "结合当前版本解释：默认开发模式利用原生 ESM 按需处理源码，依赖预构建与缓存降低重复工作，HMR 限制更新范围。Vite 8 已整合 Rolldown/Oxc 工具链。不能将所有性能归因为“不打包”，也不能把某次启动速度当成通用结论。"
            },
            {
                question: "Vite 8 还可以直接说成 esbuild + Rollup 吗？",
                answer: "那是旧版本的经典架构描述。Vite 8 官方发布说明将 Rolldown 作为统一 bundler，并与 Oxc 编译工具链整合。面试时先说项目版本，再区分早期实现、当前默认行为和仍在演进的能力。"
            },
            {
                question: "loader 和 plugin 的职责如何区分？",
                answer: "loader 将某类模块转换成构建系统能消费的内容，例如 vue-loader 处理 SFC、css-loader 处理 CSS 依赖；plugin 通过编译生命周期钩子影响更广的过程，例如 HtmlWebpackPlugin 生成 HTML 并注入产物。多个 loader 的普通转换通常从右到左执行，还存在 pitching 等更细规则。"
            }
        ],
        exercise:
            "分别运行 pnpm dev 与 pnpm webpack:dev，修改各自示例的样式和模板，记录 Network、终端输出与页面状态；不要只比较一次冷启动时间。"
    },
    {
        ...common,
        id: "tooling-modules",
        topic: "modules",
        title: "模块图、动态导入与 HMR",
        subtitle: "观察真实 import()，再通过修改一个源码文件体验热更新边界。",
        goals: ["静态与动态依赖", "ES module 缓存", "HMR 与完整刷新", "清理副作用"],
        explanation: [
            "静态导入构成启动所需依赖，动态 import() 返回 Promise，可形成延迟加载的边界。生产是否独立成块还取决于构建器和配置；重复导入通常复用模块缓存。",
            "HMR 通过构建工具与框架插件协作更新模块。是否保留状态取决于变更类型与接受边界；Vue 模板和脚本变更的处理不完全相同，不能保证所有更新都保留组件状态。",
            "本节 HMR 小模块使用真实 import.meta.hot.accept；开发环境修改 hmrProbe.js 后回调更新可见状态。生产环境没有开发 HMR 连接，按钮导入实验仍然可用。",
            "热更新和卸载都可能要求清理计时器、事件与旧副作用。业务代码优先通过组件生命周期组织清理，底层模块需要时使用 HMR dispose。"
        ],
        interview: [
            {
                question: "动态 import 与普通 import 的关键区别是什么？",
                answer: "静态 import 在模块链接阶段建立静态依赖，动态 import 在执行到表达式时返回 Promise，可以延迟加载。构建工具可据此拆分产物；变量路径受工具的静态分析能力约束。模块是否已在缓存中也影响实际网络请求。"
            },
            {
                question: "HMR 是否一定不刷新页面并保留状态？",
                answer: "不一定。构建系统沿模块依赖寻找可接受的更新边界，框架插件决定如何更新组件；找不到合适边界或出现不兼容变更时可能重新加载。状态保留取决于变更和框架处理策略。"
            },
            {
                question: "为什么热更新后可能出现重复事件监听？",
                answer: "模块重新执行但旧副作用没有释放，会累积监听和定时器。需要持有稳定引用并在组件卸载或 HMR dispose 中清理；只看到页面已更新不等于资源已释放。"
            }
        ],
        exercise:
            "点击两次动态加载并检查 Network，再修改 src/features/tooling/hmrProbe.js 的字符串，观察热更新次数；最后构建预览，比较 import.meta.hot 是否存在。"
    },
    {
        ...common,
        id: "tooling-config",
        topic: "config",
        title: "环境变量、代理与配置边界",
        subtitle: "读出当前页面的真实构建环境，理解哪些配置只影响开发服务。",
        goals: ["mode 与环境变量", "公开前端配置", "开发代理", "alias 与 DefinePlugin"],
        explanation: [
            "Vite 的 import.meta.env 提供 MODE、DEV、PROD、BASE_URL 等内置值；自定义 VITE_ 变量会进入客户端代码，通常以字符串形式暴露。mode 和 NODE_ENV 的概念相关但不等同。",
            "Webpack 的 DefinePlugin 在编译时替换代码表达式，不是运行时自动读取任意 .env 的机制。这里只显式替换示例所需常量，不向浏览器传入整个 process.env。",
            "开发代理由开发服务器转发匹配请求，它改变浏览器与开发服务之间的请求路径。生产部署需要自己的网关/服务配置，构建后静态文件不会自带开发代理。",
            "alias 帮助解析导入路径，source map 帮助调试构建后代码；二者解决不同问题。配置文件运行在 Node 侧，不能直接把所有 Node 变量当成浏览器运行时数据。"
        ],
        interview: [
            {
                question: "VITE_ 前缀能保护配置中的密钥吗？",
                answer: "不能。VITE_ 表示允许暴露给客户端，值会进入前端代码；它适合公开 API 地址和功能配置。敏感数据应留在服务器。字符串配置要显式转为所需类型。"
            },
            {
                question: "开发代理能解决生产环境的跨域吗？",
                answer: "它只配置开发服务器的转发。生产需要后端 CORS、同源网关或反向代理等实际部署方案。构建产生的静态资源不会带着 devServer/server.proxy 自动运行。"
            },
            {
                question: "DefinePlugin 与运行时环境变量有什么区别？",
                answer: "DefinePlugin 按配置在编译时替换指定表达式，字符串值通常需要 JSON.stringify；替换后的值固定在产物中。运行时配置则在页面运行时从明确来源读取，两者更新时机不同。"
            }
        ],
        exercise:
            "新增一个非敏感 VITE_LAB_LABEL 配置，重启开发服务后观察本页；运行生产构建预览，比较 MODE、DEV、PROD。再从 Webpack config 找出对应公开常量的编译替换。"
    },
    {
        ...common,
        id: "tooling-bundling",
        topic: "bundling",
        title: "构建产物、分包与 Tree Shaking",
        subtitle: "先用简化模型理解权衡，再从两个真实构建目录验证结果。",
        goals: ["chunk 与懒加载", "副作用与无用导出", "缓存与 contenthash", "source map"],
        explanation: [
            "模块、chunk 与最终文件不是同一个概念。构建器按照入口、动态依赖和分包策略组织模块，CSS 与资源还可能单独输出。分包是在首屏、请求数、重复依赖与缓存之间权衡。",
            "Tree Shaking 依赖可分析的模块关系与使用情况，并需要正确判断副作用。sideEffects 不是随意删除代码的开关，错误标注可能移除必须执行的初始化或样式。",
            "contenthash 与长期缓存有关：内容变化会影响对应产物名。提取共享依赖可降低重复，但 chunk 过碎也会增加请求与调度成本，不能只看单个文件是否变小。",
            "本页包体积模型使用虚构大小，帮助观察策略；真实结果以 pnpm build 和 pnpm webpack:build 输出为准，随后检查 dist/assets 与 examples/webpack/dist。source map 是否公开应结合部署要求。"
        ],
        interview: [
            {
                question: "Tree Shaking 是否等于压缩？",
                answer: "不等同。Tree Shaking 根据模块导入导出和使用情况标记/移除无用内容，压缩还处理语法缩短、常量折叠等。二者常协同；副作用和动态访问会影响能否安全删除。"
            },
            {
                question: "分包越多，页面一定越快吗？",
                answer: "不一定。合理延迟加载可减少初始下载和执行，但过度分包增加请求与调度成本，也可能破坏共享依赖与缓存策略。要结合真实网络、缓存、压缩与用户路径测量。"
            },
            {
                question: "contenthash 与 source map 分别解决什么问题？",
                answer: "contenthash 让产物内容变化反映到文件名，便于缓存失效与长期缓存；source map 将产物位置映射回源码，便于调试。它们不直接等价于更小体积，source map 的公开策略还需结合部署环境。"
            }
        ],
        exercise:
            "运行两个生产构建，找到动态加载模块、共享 Vue 依赖与 source map。修改一个懒加载模块再次构建，比较哪些文件的 hash 发生变化。"
    }
];
