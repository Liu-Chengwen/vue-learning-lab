<script setup>
// 应用壳只管理导航、搜索与外观偏好；实验和业务逻辑留在各自功能目录。
import { computed, ref, watch, onMounted, onUnmounted } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { ElConfigProvider } from "element-plus";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import {
    LayoutDashboard,
    CheckSquare2,
    Blocks,
    Code2,
    Braces,
    Paintbrush,
    Wrench,
    ArrowLeftRight,
    GraduationCap,
    Search,
    Sun,
    Moon,
    ChevronDown,
    ChevronRight,
    ArrowUpRight,
    Menu,
    X,
    PanelLeftClose,
    BookOpen
} from "lucide-vue-next";
import { usePreferencesStore } from "@/stores/preferences";
import { navGroups, searchEntries } from "@/data/navigation";

const preferences = usePreferencesStore();
const route = useRoute();
const router = useRouter();
// 导航展开、搜索输入和移动抽屉只属于应用壳，离开/刷新应用无需持久化。
// 跨页面需要共享并恢复的外观偏好则放在上面的 Pinia store。
const search = ref("");
const searchOpen = ref(false);
const mobileOpen = ref(false);
const expanded = ref([]);
// 模板 ref 在挂载前为 null，用于快捷键聚焦真实 input；不是用来替代 v-model 保存输入值。
const searchInput = ref(null);
const icons = { vue: Code2, css: Paintbrush, js: Braces, tool: Wrench };
// 搜索仅查本地专题元数据；不发送用户输入到外部服务。
const results = computed(() => {
    const query = search.value.trim().toLowerCase();
    return query
        ? searchEntries.filter((v) => (v.title + v.category + v.path).toLowerCase().includes(query)).slice(0, 8)
        : [];
});
// 先精确匹配专题文案；任务详情等动态路径没有静态条目时再使用路由元信息。
const currentTitle = computed(
    () => searchEntries.find((item) => item.path === route.path)?.title || route.meta.title || "学习总览"
);
// 只关心 path：切换页面时收起浮层、清空搜索并展开对应组。
// immediate 确保直接打开深层 hash 地址时，初次渲染也能看到当前组。
watch(
    () => route.path,
    () => {
        mobileOpen.value = false;
        searchOpen.value = false;
        search.value = "";
        const group = navGroups.find((g) => route.path.startsWith(g.base));
        if (group && !expanded.value.includes(group.id)) expanded.value.push(group.id);
    },
    { immediate: true }
);
function toggleGroup(id) {
    // 替换数组表达展开集合的变更；组 id 同时供模板判断和 aria-expanded 使用。
    expanded.value = expanded.value.includes(id) ? expanded.value.filter((v) => v !== id) : [...expanded.value, id];
}
function go(path) {
    // 所有导航仍走 Router，而非手动改 window.location，避免丢失 SPA 内存状态。
    router.push(path);
    searchOpen.value = false;
    search.value = "";
}
function keydown(event) {
    // macOS 用 Meta、Windows/Linux 用 Ctrl；阻止浏览器原快捷键后聚焦搜索框。
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.value?.focus();
    }
    if (event.key === "Escape") {
        searchOpen.value = false;
        mobileOpen.value = false;
        searchInput.value?.blur();
    }
}
// 全局快捷键也属于副作用：应用卸载时移除同一个监听函数。
onMounted(() => window.addEventListener("keydown", keydown));
onUnmounted(() => window.removeEventListener("keydown", keydown));
</script>

<template>
    <!-- ConfigProvider 通过组件上下文提供语言/尺寸；store 切换 html 的 class/data 属性，由 main.css 应用颜色变量。 -->
    <ElConfigProvider :locale="zhCn" :size="preferences.density">
        <div class="app-shell">
            <button v-if="mobileOpen" class="sidebar-scrim" aria-label="关闭导航" @click="mobileOpen = false"></button>
            <aside class="app-sidebar" :class="{ 'is-open': mobileOpen }" aria-label="主导航">
                <div class="brand">
                    <RouterLink to="/" class="brand-link"
                        ><span class="brand-mark"
                            ><svg viewBox="0 0 32 32" aria-hidden="true">
                                <path d="M4 7h6l6 10L22 7h6L16 27Z" fill="currentColor" />
                                <path d="m10 7 6 10 6-10h-5l-1 2-1-2Z" fill="#fff" opacity=".7" /></svg></span
                        ><span
                            ><strong>Vue Lab<span class="brand-dot">.</span></strong
                            ><small>前端面试实验室</small></span
                        ></RouterLink
                    >
                    <button class="mobile-close icon-button" aria-label="关闭导航" @click="mobileOpen = false"
                        ><X :size="18"
                    /></button>
                </div>
                <div class="sidebar-scroll">
                    <div class="nav-section-label">WORKSPACE<span>工作台</span></div>
                    <RouterLink to="/" class="nav-item" :class="{ active: route.path === '/' }"
                        ><LayoutDashboard :size="17" /><span>学习总览</span
                        ><span v-if="route.path === '/'" class="nav-active-dot"></span
                    ></RouterLink>
                    <RouterLink to="/tasks" class="nav-item" :class="{ active: route.path.startsWith('/tasks') }"
                        ><CheckSquare2 :size="17" /><span>任务工作台</span></RouterLink
                    >
                    <div class="nav-section-label">LEARN BY DOING<span>动手学习</span></div>
                    <template v-for="group in navGroups" :key="group.id">
                        <button
                            class="nav-item nav-group"
                            :class="{ 'group-active': route.path.startsWith(group.base) }"
                            :aria-expanded="expanded.includes(group.id)"
                            @click="toggleGroup(group.id)"
                            ><component :is="icons[group.icon]" :size="17" /><span>{{ group.label }}</span
                            ><ChevronDown v-if="expanded.includes(group.id)" :size="14" /><ChevronRight
                                v-else
                                :size="14"
                        /></button>
                        <div v-if="expanded.includes(group.id)" class="nav-subitems"
                            ><RouterLink
                                v-for="([topic, title], index) in group.items"
                                :key="topic"
                                :to="group.base + '/' + topic"
                                :class="{ active: route.path === group.base + '/' + topic }"
                                ><span class="nav-index">{{ String(index + 1).padStart(2, "0") }}</span
                                >{{ title }}</RouterLink
                            ></div
                        >
                        <RouterLink
                            v-if="group.id === 'vue'"
                            to="/ui-library"
                            class="nav-item"
                            :class="{ active: route.path === '/ui-library' }"
                            ><Blocks :size="17" /><span>组件库应用与定制</span
                            ><span class="nav-badge">EP</span></RouterLink
                        >
                    </template>
                    <div class="nav-section-label">MAKE IT STICK<span>巩固复习</span></div>
                    <RouterLink to="/migration" class="nav-item" :class="{ active: route.path === '/migration' }"
                        ><ArrowLeftRight :size="17" /><span>Vue 2 → 3 对照</span></RouterLink
                    >
                    <RouterLink to="/interview" class="nav-item" :class="{ active: route.path === '/interview' }"
                        ><GraduationCap :size="17" /><span>面试复习</span></RouterLink
                    >
                    <div class="sidebar-note"
                        ><BookOpen :size="17" /><p>每一次动手，<br />都是理解的进一步。</p
                        ><RouterLink to="/labs/setup" aria-label="开始学习"><ArrowUpRight :size="17" /></RouterLink
                    ></div>
                </div>
                <div class="sidebar-footer"
                    ><span class="status-dot"></span><span>Vue 3.5 · Composition API</span
                    ><span class="version-tag">v1.0</span></div
                >
            </aside>
            <div class="app-workspace">
                <header class="app-topbar">
                    <div class="breadcrumb"
                        ><button
                            class="icon-button mobile-menu"
                            aria-label="打开导航"
                            :aria-expanded="mobileOpen"
                            @click="mobileOpen = true"
                            ><Menu :size="20" /></button
                        ><PanelLeftClose class="desktop-panel-icon" :size="17" /><span class="breadcrumb-root"
                            >学习空间</span
                        ><ChevronRight :size="13" /><strong>{{ currentTitle }}</strong></div
                    >
                    <div class="topbar-actions">
                        <div
                            class="global-search"
                            @focusout="
                                (event) => {
                                    if (!event.currentTarget.contains(event.relatedTarget)) searchOpen = false;
                                }
                            "
                            ><Search :size="15" /><input
                                ref="searchInput"
                                v-model="search"
                                aria-label="搜索知识点"
                                placeholder="搜索知识点…"
                                @focus="searchOpen = true"
                                @keydown.enter="results[0] && go(results[0].path)"
                            /><kbd>⌘ K</kbd
                            ><div v-if="searchOpen && search.trim()" class="search-results"
                                ><button v-for="item in results" :key="item.path" @click="go(item.path)"
                                    ><span>{{ item.title }}</span
                                    ><small>{{ item.category }}</small
                                    ><ArrowUpRight :size="14" /></button
                                ><p v-if="!results.length" class="muted">没有找到相关知识点</p></div
                            ></div
                        >
                        <span class="topbar-divider"></span
                        ><button
                            class="icon-button theme-button"
                            :aria-label="preferences.theme === 'dark' ? '切换浅色主题' : '切换深色主题'"
                            @click="preferences.setTheme(preferences.theme === 'dark' ? 'light' : 'dark')"
                            ><Sun v-if="preferences.theme === 'dark'" :size="18" /><Moon v-else :size="18" /></button
                        ><span class="profile-avatar" title="本地学习空间">学</span>
                    </div>
                </header>
                <!--
                    RouterView 的作用域插槽给出当前组件与路由记录，再由动态 component 渲染。
                    key 以第一层匹配记录 + topic 决定身份：专题切换重建实验并清理旧副作用；
                    嵌套子路径变化保留父布局。其他 params（如任务 id）变化时，详情页自行侦听更新。
                    不直接使用 fullPath 作 key，否则仅改变 query 也会不必要地重建整个页面。
                -->
                <main id="main-content" class="app-main"
                    ><RouterView v-slot="{ Component, route: currentRoute }"
                        ><component
                            :is="Component"
                            :key="
                                (currentRoute.matched[0]?.path || currentRoute.path) + (currentRoute.params.topic || '')
                            " /></RouterView
                    ><p v-if="preferences.storageError" class="callout">{{ preferences.storageError }}</p
                    ><footer class="app-footer"
                        ><span>动手实践 · 观察现象 · 理解原理</span><span>Built with Vue 3 & Element Plus</span></footer
                    ></main
                >
            </div>
        </div>
    </ElConfigProvider>
</template>
