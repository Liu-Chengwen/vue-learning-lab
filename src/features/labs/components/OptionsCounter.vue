<script>
/**
 * Options API 计数器：按 data / computed / methods 划分状态、派生结果与操作。
 * data 使用函数使每个组件实例获得新的状态对象；需要组件 this 的选项使用普通函数。
 * 这是 Vue 3 中仍受支持的写法，用来与两个 Composition API 示例比较组织方式。
 */
export default {
    // 每个实例调用一次 data，返回新对象；不能用模块共享对象替代，否则实例间会串状态。
    data() {
        return { count: 0 };
    },
    // 计算属性基于 this.count 的响应式依赖缓存结果，getter 中不再修改 count。
    computed: {
        doubled() {
            return this.count * 2;
        }
    },
    // Vue 会为普通 methods 方法提供实例绑定；箭头函数的词法 this 不能靠这种方式改写。
    methods: {
        increment() {
            this.count++;
        }
    }
};
</script>
<template>
    <div
        ><div class="demo-value">{{ count }}</div
        ><p>双倍：{{ doubled }}</p
        ><button class="button secondary" @click="increment">+1 · this.count</button></div
    >
</template>
