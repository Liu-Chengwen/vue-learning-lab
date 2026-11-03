// Symbol 避免与其他插件的字符串 key 意外重名；提供者和注入者需导入同一个 Symbol 实例。
export const learningContextKey = Symbol("learning-context");

// 一个最小插件：应用级依赖注入。组件中可以 inject(learningContextKey)。
export const learningPlugin = {
    install(app, options = {}) {
        // install 接收 createApp 创建的应用实例；后展开的 options 可覆盖默认配置。
        // freeze 只做浅层冻结，此对象也没有被包成 reactive，组件不应把它当可变业务状态。
        const context = Object.freeze({
            name: "Vue 3 前端面试实验室",
            apiStyle: "Composition API",
            version: "1.0",
            ...options
        });
        app.provide(learningContextKey, context);
        // 字符串 key 供入门示例直观看见；正式抽取插件时通常优先导出 Symbol key。
        app.provide("learning-app", context);
    }
};
