<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { Work } from '../../../shared/design'
import { api, ApiError, errorMessage } from '../../lib/api'
import DesignPreview from '../../components/DesignPreview.vue'
const works = ref<Work[]>([])
const search = ref('')
const loading = ref(true)
const error = ref('')
const expired = ref(false)
let request = 0
async function load() {
  const current = ++request
  loading.value = true; error.value = ''; expired.value = false
  try {
    const data = await api<{ works: Work[] }>(`/api/works?search=${encodeURIComponent(search.value)}`)
    if (current === request) works.value = data.works
  } catch (cause) {
    if (current === request) { error.value = errorMessage(cause); expired.value = cause instanceof ApiError && cause.status === 401 }
  } finally { if (current === request) loading.value = false }
}
function date(value: string) { return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }
onMounted(load)
</script>

<template>
  <div class="studio-page">
    <header class="page-intro"><div><p class="eyebrow">YOUR PERSONAL COLLECTION</p><h1>我的作品<span class="title-dot">·</span></h1><p class="muted">每一重结构，都留下你的选择。</p></div><RouterLink class="primary-button" to="/hub/workshop">＋ 新建作品</RouterLink></header>
    <form class="works-search" @submit.prevent="load"><label class="sr-only" for="work-search">搜索我的作品</label><input id="work-search" v-model="search" placeholder="按作品名称或说明搜索…" maxlength="80" type="search" /><button class="secondary-button" type="submit" :disabled="loading">搜索作品</button><span class="muted">仅展示当前账号的作品</span></form>
    <div v-if="loading" class="empty-panel" role="status">正在读取你的作品…</div>
    <div v-else-if="error" class="empty-panel"><p class="notice error" role="alert">{{ error }}</p><RouterLink v-if="expired" class="primary-button" to="/login">重新登录</RouterLink><button v-else class="secondary-button" @click="load">重试加载</button></div>
    <div v-else-if="!works.length" class="empty-panel"><span class="empty-symbol">◎</span><h2>{{ search ? '没有找到匹配的作品' : '你的第一件玲珑，等你开启' }}</h2><p class="muted">{{ search ? '试试其他关键词。' : '选一个模板，在三维工坊调整结构并保存，作品就会出现在这里。' }}</p><RouterLink class="primary-button" to="/hub/workshop">浏览创作模板 →</RouterLink></div>
    <div v-else class="works-grid"><article v-for="work in works" :key="work.id" class="work-card"><RouterLink :to="`/atelier/${work.id}`" class="work-art" :aria-label="`打开 ${work.title}`"><DesignPreview :config="work.config" /><span class="work-open">继续创作 ↗</span></RouterLink><div class="work-copy"><div class="card-title"><h2><RouterLink :to="`/atelier/${work.id}`">{{ work.title }}</RouterLink></h2><span>v{{ work.version }}</span></div><p>{{ work.description || '尚未添加创作说明' }}</p><div class="work-meta"><span>{{ work.config.layers }} 层 · {{ work.config.material === 'ivory' ? '暖瓷' : work.config.material === 'jade' ? '青玉' : '古铜' }}</span><time :datetime="work.updatedAt">{{ date(work.updatedAt) }}</time></div></div></article></div>
    <p class="collection-foot">作品配置保存在后端 SQLite 数据库 · 刷新、退出登录和重启服务后仍可读取</p>
  </div>
</template>
