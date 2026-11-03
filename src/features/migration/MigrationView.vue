<script setup>
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import { ArrowRight, ArrowUpRight, ArrowLeftRight, ChevronLeft, ChevronRight } from "lucide-vue-next";
import { migrationCases } from "@/data/migrationCases";
// 迁移数据中的 before/after 是展示用字符串，不通过 eval 或模板编译执行。
// 所有片段明确标出运行版本，实际 Vue 3 示例可通过右侧入口验证。
const selected = ref(0);
// 只保存下标，当前案例随选择计算；标题、示例、原因、入口始终来自同一条记录。
// 模板对上一项/下一项做边界禁用，侧栏按钮则直接提供有效下标。
const current = computed(() => migrationCases[selected.value]);
</script>
<template>
    <section
        ><div class="page-heading"
            ><div
                ><div class="eyebrow">MIGRATION NOTES</div><h1>同一个需求，两种写法</h1
                ><p class="page-description">对照版本行为与代码组织，理解变化的原因，而不只记住语法替换。</p></div
            ><span class="tag green"><ArrowLeftRight :size="13" />Vue 2 → Vue 3</span></div
        >
        <div class="migration-layout"
            ><nav class="panel migration-nav" aria-label="迁移主题"
                ><button
                    v-for="(item, index) in migrationCases"
                    :key="item.id"
                    :class="{ active: index === selected }"
                    @click="selected = index"
                    ><span>{{ String(index + 1).padStart(2, "0") }}</span
                    ><div
                        >{{ item.title }}<small>{{ item.tag }}</small></div
                    ><ChevronRight :size="13" /></button
            ></nav>
            <div class="stack"
                ><div class="panel"
                    ><div class="panel-header"
                        ><h2>{{ current.title }}</h2
                        ><span class="muted">{{ selected + 1 }} / {{ migrationCases.length }}</span></div
                    ><div class="migration-code"
                        ><div
                            ><div class="code-label"
                                ><span class="tag">VUE 2 · 参考片段</span><span class="muted">阅读对照</span></div
                            >><pre class="code-block"><code>{{ current.before }}</code></pre></div
                        ><div
                            ><div class="code-label"
                                ><span class="tag green">VUE 3 · 对应写法</span
                                ><RouterLink :to="current.path"
                                    >运行相关实验<ArrowUpRight :size="12" /></RouterLink></div
                            >><pre class="code-block"><code>{{ current.after }}</code></pre>
                        </div></div
                    ><div class="panel-body"
                        ><div class="callout"
                            ><strong>为什么这样变化？</strong><p>{{ current.reason }}</p></div
                        ><p class="interview-prompt"><strong>面试追问</strong>{{ current.question }}</p
                        ><div class="row"
                            ><button class="button small secondary" :disabled="selected === 0" @click="selected--"
                                ><ChevronLeft :size="14" />上一项</button
                            ><button
                                class="button small primary"
                                :disabled="selected === migrationCases.length - 1"
                                @click="selected++"
                                >下一项<ChevronRight :size="14" /></button
                            ><RouterLink :to="current.path" class="button small link"
                                >去实验里验证<ArrowRight :size="13" /></RouterLink></div></div></div
                ><p class="callout"
                    >Options API 与 Composition API 是代码组织方式。Vue 3 保留 Options API；Vue 2.7 也支持 Composition
                    API。具体破坏性变化与 API 风格分开学习。</p
                ></div
            ></div
        >
    </section>
</template>
<style scoped>
.migration-layout {
    display: grid;
    grid-template-columns: 230px minmax(0, 1fr);
    gap: 22px;
    align-items: start;
}
.migration-nav {
    padding: 8px;
}
.migration-nav button {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    border: 0;
    background: transparent;
    text-align: left;
    padding: 13px 10px;
    border-radius: 6px;
    font-size: 11px;
    color: var(--text-secondary);
}
.migration-nav button > span {
    font: 10px var(--font-mono);
    opacity: 0.6;
}
.migration-nav button > div {
    flex: 1;
}
.migration-nav small {
    display: block;
    font-size: 9px;
    color: var(--muted);
    margin-top: 4px;
}
.migration-nav button.active {
    background: var(--primary-soft);
    color: var(--primary);
}
.migration-code {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    background: var(--border);
}
.migration-code > div {
    min-width: 0;
    background: var(--surface);
    padding: 16px;
}
.code-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    font-size: 10px;
}
.code-label a {
    color: var(--primary);
    display: flex;
    align-items: center;
    gap: 4px;
}
.migration-code pre {
    margin: 0;
    min-height: 220px;
    font-size: 10px;
    padding: 15px;
}
.interview-prompt {
    font-size: 12px;
    line-height: 1.9;
    margin: 20px 0;
    color: var(--text-secondary);
}
.interview-prompt strong {
    display: block;
    font-size: 11px;
    color: var(--text);
    margin-bottom: 5px;
}
@media (max-width: 1200px) {
    .migration-layout {
        grid-template-columns: 190px minmax(0, 1fr);
    }
    .migration-code {
        grid-template-columns: 1fr;
    }
    .migration-code pre {
        min-height: auto;
    }
}
@media (max-width: 650px) {
    .migration-layout {
        grid-template-columns: 1fr;
    }
    .migration-nav {
        display: flex;
        overflow: auto;
    }
    .migration-nav button {
        min-width: 180px;
    }
    .migration-nav small {
        display: none;
    }
}
</style>
