<script setup>
import { ref } from "vue";
import { ElLoading, ElPagination, ElTable, ElTableColumn } from "element-plus";

/**
 * Element Plus Table 的展示层封装：接收 data/columns，页面拥有请求、筛选与分页真源。
 * page/pageSize 通过 update 事件形成具名 v-model；total 是匹配结果总数，不一定等于本页 data.length。
 * 选择事件传行数组，排序事件保留 Element 的 {prop,order}；页面决定如何转换成业务参数。
 * cell-{prop} 插槽透出 row/value/index，default 插槽允许追加原生 TableColumn。
 */
defineOptions({ inheritAttrs: false });
defineProps({
    data: { type: Array, default: () => [] },
    columns: { type: Array, default: () => [] },
    loading: Boolean,
    selectable: { type: Boolean, default: true },
    total: { type: Number, default: 0 },
    page: { type: Number, default: 1 },
    pageSize: { type: Number, default: 5 },
    rowKey: { type: String, default: "id" }
});
// 声明的事件不再自动进入 attrs，避免手动转发与自动透传重复触发。
const emit = defineEmits(["update:page", "update:pageSize", "selection-change", "sort-change"]);
const table = ref();
// 局部注册 loading 指令，展示封装使用的依赖，不要求在应用入口全量 app.use(ElementPlus)。
const vLoading = ElLoading.directive;
function setPageSize(size) {
    // 一次页大小变化对应两个明确意图：修改容量并回到第一页，避免落在不存在的页码。
    emit("update:pageSize", size);
    emit("update:page", 1);
}
// 限定公开实例能力；页面能清空选择，但不会耦合 Element Table 的全部内部方法。
defineExpose({ clearSelection: () => table.value?.clearSelection() });
</script>

<template>
    <div class="data-table" :aria-busy="loading">
        <!-- 未声明的 attrs 透传给真正的 ElTable，例如表格样式与额外交互配置。 -->
        <ElTable
            ref="table"
            v-loading="loading"
            :data="data"
            :row-key="rowKey"
            v-bind="$attrs"
            empty-text="暂无符合条件的任务，试试调整筛选条件。"
            @selection-change="emit('selection-change', $event)"
            @sort-change="emit('sort-change', $event)"
        >
            <ElTableColumn v-if="selectable" type="selection" width="42" />
            <ElTableColumn
                v-for="column in columns"
                :key="column.prop"
                :prop="column.prop"
                :label="column.label"
                :width="column.width"
                :min-width="column.minWidth || 110"
                :sortable="column.sortable || false"
                :align="column.align || 'left'"
            >
                <template #default="scope">
                    <!-- 使用方通过 cell-{prop} 接收行数据，定制展示和业务操作。 -->
                    <slot
                        :name="`cell-${column.prop}`"
                        :row="scope.row"
                        :value="scope.row[column.prop]"
                        :index="scope.$index"
                        >{{ scope.row[column.prop] ?? "—" }}</slot
                    >
                </template>
            </ElTableColumn>
            <slot />
        </ElTable>
        <!-- 分页组件只报告交互，data 的切片或服务端分页查询仍由父页面提供。 -->
        <div class="data-table__footer">
            <span class="muted">共 {{ total }} 条记录</span>
            <ElPagination
                :current-page="page"
                :page-size="pageSize"
                :page-sizes="[5, 10, 20]"
                :total="total"
                layout="sizes, prev, pager, next"
                size="small"
                @update:current-page="emit('update:page', $event)"
                @update:page-size="setPageSize"
            />
        </div>
    </div>
</template>

<style scoped>
.data-table {
    width: 100%;
    min-width: 0;
}
.data-table :deep(.el-table) {
    --el-table-header-bg-color: var(--surface-soft, #f7f9f7);
    --el-table-row-hover-bg-color: var(--surface-soft, #f7f9f7);
    --el-table-header-text-color: var(--text-secondary, #69776d);
    font-size: 13px;
}
.data-table :deep(.el-table th.el-table__cell) {
    font-size: 12px;
    font-weight: 600;
}
.data-table :deep(.el-table .el-table__cell) {
    padding: 16px 0;
}
.data-table__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 2px 0;
    gap: 12px;
    font-size: 12px;
}
@media (max-width: 650px) {
    .data-table__footer {
        align-items: flex-start;
        flex-direction: column;
    }
    .data-table__footer :deep(.el-pagination) {
        flex-wrap: wrap;
        gap: 8px;
    }
}
</style>
