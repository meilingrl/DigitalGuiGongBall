<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { Work } from '../../../shared/design'
import { useWorkCollection } from '../../composables/useWorkCollection'
import { listDrafts, type DraftRecord } from '../../lib/drafts'
import { useAuthStore } from '../../stores/auth'
import DesignPreview from '../../components/DesignPreview.vue'
const auth = useAuthStore()
let deviceStorage: Storage | undefined
try { deviceStorage = window.localStorage } catch { /* Recovery reports unavailable storage explicitly. */ }
const {
  works, search, state, pagination, loading, error, expired, busy, pendingAction,
  actionError, recoveryNotice, notice, copiedId, load, submitSearch, setState, goTo, mutate, retryAction,
} = useWorkCollection({ userId: auth.user!.id, storage: deviceStorage })
const drafts = ref<DraftRecord[]>([])
const draftNotice = ref('')
function date(value: string | number) { return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }
function draftLink(draft: DraftRecord) { return draft.target.startsWith('new:') ? `/atelier?template=${draft.target.slice(4)}` : `/atelier/${draft.target.slice(5)}` }
function trash(work: Work) {
  if (window.confirm(`将「${work.title}」移入回收站？之后可以恢复，作品不会被永久删除。`)) void mutate(work, 'trash')
}
onMounted(() => {
  void load()
  let storage: Storage | undefined
  try { storage = window.localStorage } catch { /* listDrafts returns a visible unavailable notice. */ }
  const result = listDrafts(storage, auth.user!.id)
  drafts.value = result.drafts
  draftNotice.value = result.notice ?? ''
})
</script>

<template>
  <div class="studio-page">
    <header class="page-intro"><div><p class="eyebrow">YOUR PERSONAL COLLECTION</p><h1>我的作品<span class="title-dot">·</span></h1><p class="muted">每一重结构，都留下你的选择。</p></div><RouterLink class="primary-button" to="/hub/workshop">＋ 新建作品</RouterLink></header>
    <section v-if="drafts.length" class="draft-shelf" aria-label="此设备草稿">
      <div><h2>此设备草稿 <span>{{ drafts.length }}</span></h2><p>未保存修改或未确认请求 · 仅当前浏览器保留 7 天 · 打开后可选择恢复</p></div>
      <ul><li v-for="draft in drafts" :key="draft.target"><RouterLink :to="draftLink(draft)"><span>{{ draft.title || '未命名作品' }}</span><time :datetime="new Date(draft.updatedAt).toISOString()">{{ date(draft.updatedAt) }}</time><span>打开恢复 →</span></RouterLink></li></ul>
    </section>
    <p v-if="draftNotice" class="notice" role="status">{{ draftNotice }}</p>
    <div class="collection-tabs" aria-label="作品状态"><button :aria-pressed="state === 'active'" :class="{ selected: state === 'active' }" @click="setState('active')">我的作品</button><button :aria-pressed="state === 'trash'" :class="{ selected: state === 'trash' }" @click="setState('trash')">回收站</button><span>仅当前账号可见</span></div>
    <form class="works-search" @submit.prevent="submitSearch"><label class="sr-only" for="work-search">搜索我的作品</label><input id="work-search" v-model="search" placeholder="按作品名称或说明搜索…" maxlength="80" type="search" /><button class="secondary-button" type="submit" :disabled="loading">搜索作品</button><span class="muted">{{ state === 'trash' ? '回收站保留作品配置，可以随时恢复' : `共 ${pagination.total} 件服务端作品` }}</span></form>
    <p v-if="recoveryNotice" class="notice collection-notice" role="status">{{ recoveryNotice }}</p>
    <div v-if="actionError" class="notice error collection-notice" role="alert">{{ actionError }}<p v-if="pendingAction">结果尚未确认。重试将核实同一请求，确认后才能进行下一项操作。</p><button v-if="pendingAction" class="text-button" :disabled="busy" @click="retryAction">{{ busy ? '正在确认…' : '重试确认上次操作' }}</button><button v-else class="text-button" @click="load">刷新作品版本</button><RouterLink v-if="expired" class="text-button" to="/login">重新登录</RouterLink></div>
    <div v-if="notice" class="notice success collection-notice" role="status">{{ notice }}<RouterLink v-if="copiedId" :to="`/atelier/${copiedId}`">打开副本继续创作 →</RouterLink></div>
    <div v-if="loading" class="empty-panel" role="status">正在读取你的作品…</div>
    <div v-else-if="error" class="empty-panel"><p class="notice error" role="alert">{{ error }}</p><RouterLink v-if="expired" class="primary-button" to="/login">重新登录</RouterLink><button v-else class="secondary-button" @click="load">重试加载</button></div>
    <div v-else-if="!works.length" class="empty-panel"><span class="empty-symbol">◎</span><h2>{{ search ? '没有找到匹配的作品' : state === 'trash' ? '回收站是空的' : '你的第一件玲珑，等你开启' }}</h2><p class="muted">{{ search ? '试试其他关键词。' : state === 'trash' ? '移入回收站的作品会保留结构与材质，恢复后可继续创作。' : '选一个模板，在三维工坊调整结构并保存，作品就会出现在这里。' }}</p><RouterLink v-if="state === 'active'" class="primary-button" to="/hub/workshop">浏览创作模板 →</RouterLink><button v-else class="secondary-button" @click="setState('active')">返回我的作品</button></div>
    <div v-else class="works-grid">
      <article v-for="work in works" :key="work.id" class="work-card">
        <RouterLink v-if="state === 'active'" :to="`/atelier/${work.id}`" class="work-art" :aria-label="`打开 ${work.title}`"><DesignPreview :config="work.config" /><span class="work-open">继续创作 ↗</span></RouterLink>
        <div v-else class="work-art trash-art"><DesignPreview :config="work.config" /><span class="trash-label">回收站</span></div>
        <div class="work-copy">
          <div class="card-title"><h2><RouterLink v-if="state === 'active'" :to="`/atelier/${work.id}`">{{ work.title }}</RouterLink><span v-else>{{ work.title }}</span></h2><span>v{{ work.version }}</span></div>
          <p>{{ work.description || '尚未添加创作说明' }}</p>
          <div class="work-meta"><span>{{ work.config.layers }} 层 · {{ work.config.material === 'ivory' ? '暖瓷' : work.config.material === 'jade' ? '青玉' : '古铜' }}</span><time :datetime="work.updatedAt">{{ date(work.updatedAt) }}</time></div>
          <div class="work-actions"><template v-if="state === 'active'"><button class="text-button" :disabled="busy || !!pendingAction" :aria-label="`复制 ${work.title}`" @click="mutate(work, 'duplicate')">复制作品</button><button class="text-button muted" :disabled="busy || !!pendingAction" :aria-label="`将 ${work.title} 移入回收站`" @click="trash(work)">移入回收站</button></template><button v-else class="text-button" :disabled="busy || !!pendingAction" :aria-label="`恢复 ${work.title}`" @click="mutate(work, 'restore')">恢复作品 →</button></div>
        </div>
      </article>
    </div>
    <nav v-if="pagination.totalPages > 1 && !error" class="collection-pagination" aria-label="作品分页"><button class="secondary-button" :disabled="loading || pagination.page <= 1" @click="goTo(pagination.page - 1)">← 上一页</button><span>第 {{ pagination.page }} / {{ pagination.totalPages }} 页 · 每页 {{ pagination.pageSize }} 件</span><button class="secondary-button" :disabled="loading || pagination.page >= pagination.totalPages" @click="goTo(pagination.page + 1)">下一页 →</button></nav>
    <p class="collection-foot">服务端作品保存在 SQLite 数据库 · 回收站可恢复 · 此设备草稿会单独标明</p>
  </div>
</template>
