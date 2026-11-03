import { ref } from "vue";
import { probeVersion } from "./hmrProbe.js";

// 这是一个真实的开发 HMR 接受边界，放在模块层避免每次组件挂载重复注册。
// import.meta.hot 在普通生产构建中不存在；可选链让这里同时兼容开发与生产环境。
// hot.data 是模块替换之间的临时交接区，不是 localStorage，整页刷新后不会保留。
const previous = import.meta.hot?.data.probeState;
export const probeMessage = ref(previous?.message || probeVersion);
export const hmrUpdateCount = ref(previous?.count || 0);

if (import.meta.hot) {
    // 显式接受依赖模块的更新：probe 文件变化时更新共享 ref，而非依赖整页刷新。
    import.meta.hot.accept("./hmrProbe.js", (module) => {
        if (!module) return;
        probeMessage.value = module.probeVersion;
        hmrUpdateCount.value += 1;
    });
    // 本模块自身被替换时，保存值而非旧 ref 实例，让新模块创建自己的响应式容器。
    // dispose 是开发热替换清理点，不等同于组件卸载钩子；真实副作用也应在这里清理。
    import.meta.hot.dispose((data) => {
        data.probeState = { message: probeMessage.value, count: hmrUpdateCount.value };
    });
}
