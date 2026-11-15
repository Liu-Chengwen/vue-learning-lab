<script setup>
import { computed } from "vue";
import { ElAlert } from "element-plus";
const props = defineProps({ error: { type: Object, default: null } });
// 保留服务器的字段名与业务错误码，Vue插值会转义内容，不拼接服务端HTML。
const fields = computed(() => Object.entries(props.error?.fieldErrors || props.error?.body?.fieldErrors || {}));
</script>
<template>
    <ElAlert
        v-if="error"
        class="backend-error"
        :title="error.message || '请求失败，请重试'"
        type="error"
        :closable="false"
        show-icon
    >
        <template #default>
            <p v-if="error.status"
                >HTTP {{ error.status }}<span v-if="error.body?.code"> · {{ error.body.code }}</span></p
            >
            <ul v-if="fields.length"
                ><li v-for="[field, message] in fields" :key="field">{{ field }}：{{ message }}</li></ul
            >
        </template>
    </ElAlert>
</template>
<style scoped>
.backend-error {
    margin: 12px 0;
}
p {
    margin: 0;
}
ul {
    margin: 4px 0 0;
    padding-left: 18px;
}
</style>
