import { vueLessons } from "./vueLessons";
import { cssLessons, jsLessons } from "./foundationLessons";
import { toolingLessons } from "./toolingLessons";

// 元数据统一提供给总览和复习区。实验组件仍按路由懒加载，不在这里导入。
// 展开运算符只创建元数据的浅层副本，再补 path/track；原始数组不会被这里改写。
// path 用于 RouterLink，track 用于分类统计，id 用于持久化完成状态，各自承担不同职责。
export const catalogue = [
    ...vueLessons.map((v) => ({ ...v, path: "/labs/" + (v.topic || v.id.replace(/^vue-/, "")), track: "vue" })),
    ...cssLessons.map((v) => ({ ...v, path: "/css/" + v.topic, track: "css" })),
    ...jsLessons.map((v) => ({ ...v, path: "/javascript/" + v.topic, track: "javascript" })),
    ...toolingLessons.map((v) => ({ ...v, path: "/tooling/" + v.topic, track: "tooling" })),
    // 组件库在总览只需摘要；完整说明/源码/问答放在 uiLesson，由专题页和题库单独引用。
    { id: "ui-library", title: "Element Plus 应用与定制", path: "/ui-library", track: "ui" }
];
