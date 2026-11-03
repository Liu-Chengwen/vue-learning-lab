/**
 * CSS / JavaScript 学习元数据：导航、总览、完成记录和面试题都从同一组描述派生。
 * 本文件不导入实验组件，避免为了生成目录而提前执行全部实验；实际组件由各入口选择。
 * 解释与代码分工不同：这里给学习目标，真实行为要回到 source 指向的实现验证。
 */
// 把实验入口与真正实现机制的子文件一起提供给源码阅读器；路径相对于项目根目录。
const relatedSources = {
    "css-styles": ["src/features/foundations/css/StyleSample.vue"],
    "js-classes": ["src/features/foundations/javascript/classModels.js"],
    "js-es2015": ["src/features/foundations/javascript/apiExamples.js"],
    "js-modern": ["src/features/foundations/javascript/apiExamples.js"],
    "js-modules": ["src/features/foundations/javascript/sharedCounter.js"],
    "js-functions": ["src/features/foundations/javascript/useExperimentLog.js"],
    "js-async": ["src/features/foundations/javascript/useExperimentLog.js"]
};
const lesson = (category, topic, title, subtitle, source, options = {}) => {
    // 当前目录仅有 CSS 与 JS 两类；稳定 id 用于存储进度，topic 用于路由，标题修改不会破坏已存标记。
    const id = `${category === "CSS" ? "css" : "js"}-${topic}`;
    return {
        id,
        topic,
        category,
        title,
        subtitle,
        level: "基础 → 应用",
        // 原始入口和子文件都交给 SourceViewer 读取实际内容，避免另维护一份脱离实现的“完整源码”。
        source: [source, ...(relatedSources[id] || [])],
        goals: [],
        explanation: "",
        interview: [],
        exercise: "修改一个参数，先预测结果，再运行并说明变化的原因。",
        // 专题可覆盖目标、解释、问答或练习；这些是展示元数据，不会改变实验组件自己的运行逻辑。
        ...options
    };
};

const cssSource = "src/features/foundations/css/CssExperiments.vue";
// 六个 CSS 专题共享一个实现文件，但页面按 topic 只挂载对应分支，测量以当前真实 DOM 为准。
export const cssLessons = [
    lesson("CSS", "flex", "Flex，不止是居中", "用真实尺寸理解空间分配、收缩和长文本溢出。", cssSource, {
        goals: ["区分主轴与交叉轴", "理解 grow / shrink / basis", "修复默认最小尺寸引起的溢出"],
        explanation:
            "flex-direction 决定主轴，justify-content 沿主轴分配剩余空间，align-items 沿交叉轴对齐。flex-grow 分配正剩余空间；flex-shrink 的收缩与项目的基准尺寸有关。默认 min-width: auto 常使行方向的项目无法缩到内容最小尺寸以下，因此需要根据场景使用 min-width: 0。下面的尺寸由浏览器实际测量。",
        interview: [
            {
                question: "为什么设置了 flex: 1，长文本还是会撑开布局？",
                answer: "flex 的增长与收缩仍受最小尺寸约束。行方向子项默认 min-width: auto 可能保留内容的最小宽度。可按需求设置 min-width: 0，再结合 overflow、text-overflow 和 white-space 处理文本。"
            },
            {
                question: "flex: 1 与 flex: auto 有什么区别？",
                answer: "浏览器通常将 flex: 1 展开为 1 1 0%，flex: auto 为 1 1 auto。两者的 flex-basis 不同，因此内容基准和最终空间分配可能不同；百分比基准还取决于容器尺寸是否确定。"
            }
        ],
        exercise:
            "先关闭 min-width: 0，输入长文本并缩小容器；再打开它。解释溢出原因，然后让第二项固定为 100px，其他项平分剩余空间。"
    }),
    lesson("CSS", "box", "盒模型与实际尺寸", "CSS 写下的 width，什么时候不等于屏幕上的宽度？", cssSource, {
        goals: ["比较 content-box 与 border-box", "区分 content / padding / border", "读取实际渲染尺寸"],
        explanation:
            "content-box 的 width 只规定内容宽度，padding 和 border 额外增加边框盒尺寸。border-box 将它们纳入指定宽度。getBoundingClientRect 返回边框盒的实际尺寸，且可能包含小数与 transform 的影响。margin 位于边框外，不属于这个测量宽度。",
        interview: [
            {
                question: "一个 width: 200px、padding: 20px、border: 2px 的盒子实际多宽？",
                answer: "没有变换且没有其他尺寸约束时，content-box 的边框盒宽度为 244px；border-box 的边框盒宽度为 200px。"
            }
        ]
    }),
    lesson("CSS", "bfc", "BFC、浮动与外边距", "把原来的 CSS 练习变成可复现、可测量的实验。", cssSource, {
        goals: ["用 flow-root 包含内部浮动", "区分父子和相邻 margin 折叠", "理解格式化上下文的边界"],
        explanation:
            "display: flow-root 创建新的块级格式化上下文，能包含内部浮动并阻止内部子元素与容器的 margin 折叠。它不阻止同一个普通块流中兄弟元素之间的 margin 折叠。Flex/Grid 中的项目外边距不发生这种折叠。BFC 是布局机制，仍然有实际用途。",
        interview: [
            {
                question: "BFC 能消除所有 margin 折叠吗？",
                answer: "不能。独立 BFC 可以阻止其内部子元素与容器的外边距折叠，但内部相邻普通块仍可能折叠。要根据父子或兄弟关系选择边框、padding、flow-root、Flex 等方案。"
            }
        ],
        exercise:
            "比较 flow-root 对内部浮动、父子 margin 的影响，再切换相邻块为 Flex，解释为什么两个实验的处理方式不同。"
    }),
    lesson("CSS", "grid", "Grid 与响应式", "用 auto-fit 和 minmax 组织二维布局。", cssSource, {
        goals: ["观察容器变化时的列数", "理解 minmax 的最小约束", "选择 Flex 或 Grid"],
        explanation:
            "Grid 同时控制行与列，适合卡片网格；Flex 重点处理单一方向的项目分配。repeat(auto-fit, minmax(..., 1fr)) 会根据容器可用宽度计算列数。最小列宽也受容器尺寸影响，实际工程可用 min(100%, 最小宽度) 避免窄屏溢出。",
        interview: [
            {
                question: "auto-fit 和 auto-fill 的区别是什么？",
                answer: "两者都按容器尺寸创建尽可能多的轨道；auto-fit 会折叠空轨道，使有内容的轨道能扩展，auto-fill 保留空轨道。内容足够多时两者看起来可能相同。"
            }
        ]
    }),
    lesson("CSS", "position", "定位、滚动与层叠", "为什么 z-index: 999 也可能在另一个元素下面？", cssSource, {
        goals: ["比较 relative / absolute / sticky", "观察 sticky 的滚动参照", "理解层叠上下文限制"],
        explanation:
            "relative 保留正常流占位，absolute 脱离正常流并参考其包含块定位。sticky 在滚动约束范围内表现为相对定位与粘附。z-index 不是跨页面的全局名次：子元素受祖先层叠上下文约束，transform 等属性也可能创建新的层叠上下文。",
        interview: [
            {
                question: "为什么弹窗 z-index 很大，仍被其他面板挡住？",
                answer: "应检查祖先是否建立了层叠上下文、是否受到 overflow 裁剪，以及实际挂载位置。必要时用 Teleport 将弹层移到合适容器，并统一管理层级。"
            }
        ]
    }),
    lesson("CSS", "styles", "组件样式与主题变量", "把层叠、继承和作用域应用到组件库定制。", cssSource, {
        goals: ["观察 CSS 自定义属性继承", "区分 scoped 与深度选择器", "理解局部覆盖优先级"],
        explanation:
            "CSS 自定义属性通过层叠与继承传递，适合统一主题。Vue 的 scoped CSS 通过编译后的属性选择器限制作用域，并不是 Shadow DOM。:deep() 用于访问子组件内部结构，:slotted() 影响传入插槽的内容；定制组件库时优先使用公开变量、props 与插槽。",
        interview: [
            {
                question: "scoped 能阻止所有父组件样式影响子组件吗？",
                answer: "不能。继承属性和 CSS 变量仍可传递，子组件根节点也可能同时带父子作用域属性。内部节点的样式覆盖可使用公开主题能力或有边界的 :deep()。"
            }
        ]
    })
];

const basics = "src/features/foundations/javascript/JavaScriptBasics.vue";
// JS 目录按机制组织：基础共享组件，类、异步、API 分开；专题问答会合并进全局复习题库。
export const jsLessons = [
    lesson("JavaScript", "scope", "作用域与变量", "从循环回调到暂时性死区，运行后再解释。", basics, {
        goals: ["区分 var 与块级绑定", "理解 TDZ", "区分 const 绑定与对象内容"],
        explanation:
            "词法作用域由代码定义位置决定。var 没有块级作用域；let/const 为每轮循环创建独立绑定。const 限制绑定重新赋值，并不自动冻结对象。let/const 在初始化前不能访问。",
        interview: [
            {
                question: "var 和 let 的循环回调结果为什么不同？",
                answer: "var 回调共享同一个函数作用域绑定，执行时读取循环结束后的值；let 的 for 循环为每次迭代创建新的绑定。"
            }
        ]
    }),
    lesson("JavaScript", "this", "this 由谁决定？", "对象方法、独立调用、箭头函数和显式绑定逐一对照。", basics, {
        goals: ["根据调用方式判断普通函数 this", "理解箭头函数的词法 this", "连接 Options API 与 setup"],
        explanation:
            "普通函数 this 主要由调用方式决定；箭头函数继承外部词法 this，不会被 call/apply/bind 改写。当前实验处于 ES module 的严格模式。Vue Options 中需要组件 this 的 methods 使用普通函数；setup 不提供组件 this，script setup 直接使用词法变量。",
        interview: [
            {
                question: "把 obj.method 赋给另一个变量再执行，this 还指向 obj 吗？",
                answer: "不会因定义在对象上而自动绑定。独立调用在严格模式下 this 为 undefined。可以使用 bind，或者在回调中写 obj.method() 保留调用接收者。"
            }
        ]
    }),
    lesson("JavaScript", "closures", "闭包与状态隔离", "让两个计数器独立运行，再观察快照与实时值。", basics, {
        goals: ["理解函数持有词法环境", "比较独立调用与共享状态", "区分快照和实时读取"],
        explanation:
            "闭包是函数与其词法环境的组合，不要求函数必须被返回。工厂函数每次调用创建的环境可以彼此独立；模块级状态通常在同一模块实例内共享。闭包不等于内存泄漏，应关注被持续持有的引用及相关资源是否仍需要。",
        interview: [
            {
                question: "composable 中的 ref 应放在函数内还是模块顶层？",
                answer: "取决于状态归属。函数内通常为每次调用创建独立状态；模块顶层在同一模块实例内共享。SSR 还要避免跨请求意外共享用户状态。"
            }
        ]
    }),
    lesson(
        "JavaScript",
        "classes",
        "类、原型与继承",
        "从真实原型关系到 super、静态成员和组合设计。",
        "src/features/foundations/javascript/ClassLab.vue",
        {
            goals: ["区分实例、自有字段和原型方法", "理解 extends 的两条继承关系", "比较继承与组合"],
            explanation:
                "class 基于原型机制，但还有严格模式、必须用 new 调用、暂时性死区等语义。原型方法由实例共享，箭头函数字段在每个实例上创建。extends 同时连接子类构造函数与父类、子类 prototype 与父类 prototype。私有字段属于 ES2022 类能力，不是普通可枚举属性。",
            interview: [
                {
                    question: "extends 建立了哪些原型关系？",
                    answer: "Object.getPrototypeOf(Child.prototype) === Parent.prototype 连接实例继承；Object.getPrototypeOf(Child) === Parent 连接静态继承。实例自身仍存放构造期间创建的字段。"
                },
                {
                    question: "什么情况下优先使用组合？",
                    answer: "当行为可以独立变化、并不存在稳定的 is-a 关系时，使用参数化函数、策略对象或 composable 组合，能避免为了组合行为而不断增加继承层级。"
                }
            ],
            exercise:
                "给 TimedTask 重写 describe，调用 super.describe()；然后通过注入格式化函数实现同样的展示，比较两种扩展方式。"
        }
    ),
    lesson("JavaScript", "arrays", "引用、拷贝与数据处理", "编辑草稿为什么会悄悄修改原始数据？", basics, {
        goals: ["观察浅拷贝的嵌套引用", "区分原地排序与复制排序", "选择数组方法与集合"],
        explanation:
            "对象展开和 Object.assign 是浅拷贝，嵌套对象仍可能共享引用。sort 会修改原数组；复制后排序或 toSorted 返回新数组，但元素中的对象依然是原来的引用。Map/Set 中的对象键/元素按引用身份区分。structuredClone 是运行环境 API，不是通用的任意对象复制方案。",
        interview: [
            {
                question: "toSorted 返回新数组，是否意味着完成了深拷贝？",
                answer: "不是。数组容器是新的，但其中的对象元素仍是同一引用。编辑嵌套对象仍需按业务数据结构复制。"
            }
        ]
    }),
    lesson(
        "JavaScript",
        "async",
        "异步与事件循环",
        "观察执行顺序，再选择正确的 Promise 聚合策略。",
        "src/features/foundations/javascript/AsyncLab.vue",
        {
            goals: ["观察同步、微任务和计时器", "对比四种 Promise 聚合策略", "处理旧请求晚返回"],
            explanation:
                "当前实验运行在浏览器中：同步代码先执行，Promise reaction 在微任务检查点执行，计时器回调属于后续任务。Promise.all 遇到输入拒绝会拒绝；allSettled 等全部结果；race 采用最先 settled 的结果；any 采用最先 fulfilled 的结果。它们都不会自动取消其他任务。",
            interview: [
                {
                    question: "Promise.all 失败后，其他请求会停止吗？",
                    answer: "不会。聚合 promise 的状态变化不等于底层任务被取消。需要显式 AbortController 或应用层过期结果判断，并保持 loading/error 与最新请求一致。"
                }
            ]
        }
    ),
    lesson("JavaScript", "functions", "防抖、节流与清理", "每一次输入都发生了，为什么请求次数不同？", basics, {
        goals: ["用闭包保存计时器与时间戳", "区分 debounce 与 throttle", "取消等待中的工作"],
        explanation:
            "防抖在连续触发停止一段时间后执行，适合搜索。节流在给定时间窗口内限制执行频率，适合连续滚动。实现需要说明首次/末次策略，并在组件卸载或需求失效时清理尾调用。下面的防抖是 trailing，节流是 leading。",
        interview: [
            {
                question: "防抖函数为什么需要 cancel？",
                answer: "组件卸载、用户清空条件或切换数据源时，之前排队的回调可能已经失效。取消计时器能避免无意义请求或更新过期页面。"
            }
        ]
    }),
    lesson("JavaScript", "events", "DOM 事件与委托", "点一次按钮，观察捕获、目标和冒泡。", basics, {
        goals: ["区分 target 与 currentTarget", "观察捕获与冒泡", "移除同一个监听引用"],
        explanation:
            "事件沿祖先路径传播，捕获阶段向目标靠近，随后在支持冒泡的事件中向上冒泡。target 是原始目标，currentTarget 是当前监听的节点。stopPropagation 阻止传播，不等于 preventDefault。removeEventListener 需要匹配事件类型、函数引用和 capture。",
        interview: [
            {
                question: "事件委托为什么能处理后来加入的子元素？",
                answer: "监听绑定在稳定祖先上，子元素事件冒泡到该祖先，再通过 target/closest 定位对应元素。需要校验匹配元素确实位于委托容器内。"
            }
        ]
    }),
    lesson(
        "JavaScript",
        "es2015",
        "ES2015：常用语法与 API",
        "从解构与集合到迭代协议，用输入输出理解用途。",
        "src/features/foundations/javascript/ApiLab.vue",
        {
            goals: ["分清语法与标准库方法", "掌握集合与迭代基本协议", "观察 Proxy 与 Reflect"],
            explanation:
                "ES6 指 ES2015。解构、模板字符串、箭头函数、rest、数组/调用展开是语法；Array.from、Object.assign、Map、Set、Promise 等是标准库能力。对象 rest/spread 属于 ES2018，数组 includes 属于 ES2016，不能都归为 ES6 新增。",
            interview: [
                {
                    question: "for...of 与 for...in 遍历的是什么？",
                    answer: "for...of 使用对象的迭代协议读取值；for...in 枚举可枚举字符串属性键，还可能包含继承属性。数组的元素遍历通常优先使用 for...of 或数组方法。"
                }
            ]
        }
    ),
    lesson(
        "JavaScript",
        "modern",
        "现代 JavaScript 工具箱",
        "按年份识别能力，按语义选择 API。",
        "src/features/foundations/javascript/ApiLab.vue",
        {
            goals: ["区分各版本新增能力", "比较返回值与数据修改性", "识别运行环境 API"],
            explanation:
                "新语法与 API 按实际标准版本标注。构建器能转换某些语法，但不代表旧浏览器自动拥有新的标准库方法。可选链、空值合并、数组复制方法、对象转换各有用途；structuredClone、fetch 和 AbortController 属于运行环境 API。",
            interview: [
                {
                    question: "?? 与 || 设置默认值有什么区别？",
                    answer: "?? 只在左侧为 null 或 undefined 时使用右值，保留 0、false 和空字符串；|| 在左侧为任意 falsy 值时使用右值。应根据业务语义选择。"
                }
            ]
        }
    ),
    lesson(
        "JavaScript",
        "modules",
        "模块作用域与共享状态",
        "静态导入、动态导入与每次调用创建的状态有什么不同？",
        basics,
        {
            goals: ["理解模块实例和 live binding", "观察共享与独立状态", "实际执行动态 import"],
            explanation:
                "命名导入是对导出绑定的只读访问；导出方修改绑定后，导入方能读到新值。同一个解析后的模块通常在当前模块图中只执行一次，动态 import 也复用模块实例。函数内创建的局部变量则可在每次调用中保持独立。",
            interview: [
                {
                    question: "每调用一次 useCounter 就共享计数吗？",
                    answer: "取决于计数变量声明位置。函数内部创建的状态通常彼此独立；模块顶层变量在模块实例内共享。函数名称是否以 use 开头不会改变 JavaScript 的作用域规则。"
                }
            ]
        }
    )
];
