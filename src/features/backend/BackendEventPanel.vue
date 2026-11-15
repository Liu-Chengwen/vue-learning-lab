<script setup>
import { ElButton, ElTag } from "element-plus";
import { useRequest } from "@/composables/useRequest";
import { backendApi } from "@/services/backendLabService";
import BackendErrorAlert from "./BackendErrorAlert.vue";
const emit = defineEmits(["response"]);
// 三个查询使用同一个取消信号；路由/身份变化销毁面板时不会渲染旧账户的观察数据。
const request = useRequest(async ({ signal }) => {
    const [outbox, notifications, audit] = await Promise.all([
        backendApi.fetchOutbox({ signal }),
        backendApi.fetchNotifications({ signal }),
        backendApi.fetchAuditLogs({ signal })
    ]);
    return { outbox, notifications, audit };
});
async function refresh() {
    if (request.loading.value) return;
    try {
        const result = await request.execute();
        if (result)
            emit("response", {
                method: "GET",
                path: "/api/v1/events/outbox + /notifications + /audit-logs",
                status: 200,
                body: result
            });
    } catch {
        /* 当前错误由useRequest拥有，显示后允许重试。 */
    }
}
function time(value) {
    const date = new Date(value);
    return value && !Number.isNaN(date.getTime()) ? date.toLocaleString("zh-CN", { hour12: false }) : "—";
}
</script>
<template>
    <section class="panel backend-events" aria-labelledby="backend-events-title">
        <div class="panel-header"
            ><h2 id="backend-events-title">事务与消息观察台</h2
            ><ElButton
                data-testid="backend-refresh-events"
                :loading="request.loading.value"
                :disabled="request.loading.value"
                @click="refresh"
                >刷新异步结果</ElButton
            ></div
        >
        <div class="panel-body">
            <p class="muted"
                >用户写入和审计、Outbox 一起提交；RabbitMQ
                接收与消费完成是两个独立时刻。消息显示最近50条，审计显示最近20条。</p
            >
            <BackendErrorAlert :error="request.error.value" />
            <div v-if="request.data.value" class="event-grid">
                <div class="event-column"
                    ><h3>Outbox · 发布状态</h3>
                    <p v-if="!request.data.value.outbox.length" class="muted">暂无发布记录。</p>
                    <article v-for="item in request.data.value.outbox" :key="item.eventId" class="event-entry">
                        <div
                            ><strong>{{ item.eventType }} · 用户 #{{ item.userId }}</strong
                            ><ElTag :type="item.status === 'SENT' ? 'success' : 'warning'" size="small">{{
                                item.status
                            }}</ElTag></div
                        >
                        <small>{{ time(item.createdAt) }} · 发布尝试 {{ item.attempts }} 次</small
                        ><code>{{ item.eventId }}</code>
                    </article>
                </div>
                <div class="event-column"
                    ><h3>通知 · 消费结果</h3>
                    <p v-if="!request.data.value.notifications.length" class="muted">暂无通知记录。</p>
                    <article v-for="item in request.data.value.notifications" :key="item.eventId" class="event-entry">
                        <div
                            ><strong>{{ item.eventType }} · 用户 #{{ item.userId }}</strong
                            ><ElTag type="success" size="small">已消费</ElTag></div
                        >
                        <small>{{ time(item.createdAt) }}</small
                        ><code>{{ item.eventId }}</code>
                    </article>
                </div>
                <div class="event-column audit-column"
                    ><h3>审计 · 事务内记录</h3>
                    <p v-if="!request.data.value.audit.length" class="muted">暂无审计记录。</p>
                    <article v-for="item in request.data.value.audit" :key="item.id" class="event-entry">
                        <div
                            ><strong>{{ item.action }} · 用户 #{{ item.userId }}</strong
                            ><ElTag size="small">审计 #{{ item.id }}</ElTag></div
                        >
                        <small>{{ time(item.createdAt) }} · 操作者 {{ item.actor }}</small>
                    </article>
                </div>
            </div>
            <p v-else-if="!request.loading.value" class="empty-hint muted"
                >完成一次资料写入后，点击刷新，观察同一次业务操作留下的记录。</p
            >
        </div>
    </section>
</template>
<style scoped>
.panel-header {
    gap: 16px;
    flex-wrap: wrap;
}
.event-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 22px;
}
.event-column {
    min-width: 0;
    max-height: 460px;
    overflow: auto;
    padding-right: 6px;
}
.audit-column {
    grid-column: 1 / -1;
}
h3 {
    margin: 0 0 12px;
    font-size: 14px;
}
.event-entry {
    padding: 12px 0;
    border-bottom: 1px solid var(--border);
    display: grid;
    gap: 6px;
}
.event-entry > div {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}
.event-entry strong {
    font-size: 12px;
    overflow-wrap: anywhere;
}
.event-entry small,
.event-entry code {
    font-size: 11px;
    color: var(--text-secondary);
    overflow-wrap: anywhere;
}
.empty-hint {
    padding: 18px 0;
}
@media (max-width: 850px) {
    .event-grid {
        grid-template-columns: 1fr;
    }
}
</style>
