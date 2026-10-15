<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { onBeforeRouteLeave, RouterLink, useRoute, useRouter } from 'vue-router'
import AtelierScene from '../components/AtelierScene.vue'
import { defaultConfigs, templates, type DesignConfig, type TemplateId, type Work } from '../../shared/design'
import { api, ApiError, errorMessage } from '../lib/api'
import { cloneDesign } from '../lib/draft'
import { useAppStore } from '../stores/app'
import ThemeToggle from '../components/ThemeToggle.vue'

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const scene = ref<InstanceType<typeof AtelierScene> | null>(null)
const config = ref<DesignConfig>(cloneDesign(defaultConfigs.linglong))
const title = ref('')
const description = ref('')
const work = ref<Work | null>(null)
const loading = ref(false)
const loadError = ref('')
const saveError = ref('')
const saveState = ref<'idle' | 'saving' | 'saved'>('idle')
const ready = ref(false)
const sceneError = ref('')
const controlsOpen = ref(true)
const baseline = ref('')
const isNew = computed(() => !work.value)
const snapshot = computed(() => JSON.stringify({ title: title.value, description: description.value, config: config.value }))
const dirty = computed(() => !loading.value && !loadError.value && snapshot.value !== baseline.value)
const template = computed(() => templates.find(item => item.id === config.value.templateId) ?? templates[0])
const conflict = ref(false)
const expired = ref(false)
let allowNavigation = false
let loadSequence = 0

async function load() {
  const sequence = ++loadSequence
  loading.value = true; loadError.value = ''; saveError.value = ''; ready.value = false; sceneError.value = ''
  saveState.value = 'idle'; conflict.value = false; expired.value = false
  try {
    if (route.params.id) {
      const result = await api<{ work: Work }>(`/api/works/${encodeURIComponent(String(route.params.id))}`)
      if (sequence !== loadSequence) return
      work.value = result.work
      title.value = result.work.title
      description.value = result.work.description
      config.value = cloneDesign(result.work.config)
    } else {
      const id = String(route.query.template ?? 'linglong') as TemplateId
      const chosen = templates.find(item => item.id === id) ?? templates[0]
      work.value = null
      title.value = `${chosen.name} · 我的创作`
      description.value = ''
      config.value = cloneDesign(chosen.config)
    }
    baseline.value = snapshot.value
  } catch (cause) {
    if (sequence === loadSequence) loadError.value = errorMessage(cause)
  } finally { if (sequence === loadSequence) loading.value = false }
}

async function save() {
  if (loading.value || saveState.value === 'saving' || !title.value.trim()) return
  const sequence = loadSequence
  const creating = work.value === null
  saveError.value = ''; conflict.value = false; expired.value = false; saveState.value = 'saving'
  const submitted = snapshot.value
  try {
    const body = { title: title.value.trim(), description: description.value.trim(), config: cloneDesign(config.value) }
    const result = await api<{ work: Work }>(work.value ? `/api/works/${work.value.id}` : '/api/works', {
      method: work.value ? 'PUT' : 'POST', body: { ...body, ...(work.value ? { version: work.value.version } : {}) },
    })
    // A response belongs to the editor that submitted it. Leaving or explicitly
    // reopening the work invalidates that editor even if the database write finishes.
    if (sequence !== loadSequence) return
    work.value = result.work
    // Inputs remain editable during a request. Only mark the submitted version clean.
    baseline.value = submitted
    if (snapshot.value === submitted) {
      title.value = result.work.title; description.value = result.work.description
      baseline.value = snapshot.value
    }
    saveState.value = 'saved'
    if (creating) {
      allowNavigation = true
      await router.replace(`/atelier/${result.work.id}`)
      allowNavigation = false
    }
  } catch (cause) {
    if (sequence !== loadSequence) return
    saveState.value = 'idle'; saveError.value = errorMessage(cause)
    conflict.value = cause instanceof ApiError && cause.status === 409
    expired.value = cause instanceof ApiError && cause.status === 401
  }
}

function reloadWork() {
  if (!dirty.value || window.confirm('重新打开会舍弃尚未保存的修改，继续吗？')) void load()
}
function downloadConfig() {
  const blob = new Blob([JSON.stringify({ title: title.value, description: description.value, config: config.value }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = 'guigong-design.json'; anchor.click(); URL.revokeObjectURL(url)
}
function capture() {
  const data = scene.value?.exportImage()
  if (!data) { sceneError.value = '当前无法导出画面，请等待三维加载完成后重试'; return }
  const anchor = document.createElement('a'); anchor.href = data; anchor.download = 'guigong-preview.png'; anchor.click()
}
function warnUnload(event: BeforeUnloadEvent) { if (dirty.value) { event.preventDefault(); event.returnValue = '' } }
function shortcut(event: KeyboardEvent) { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void save() } }
window.addEventListener('beforeunload', warnUnload)
window.addEventListener('keydown', shortcut)
onBeforeUnmount(() => { loadSequence++; window.removeEventListener('beforeunload', warnUnload); window.removeEventListener('keydown', shortcut) })
onBeforeRouteLeave(() => allowNavigation || !dirty.value || window.confirm('作品有尚未保存的修改，确定离开吗？'))
watch(() => String(route.params.id ?? '') + String(route.query.template ?? ''), (_next, previous) => {
  // After first save the address receives its persistent id; retain any edits made while saving.
  if (previous !== undefined && work.value?.id === route.params.id && allowNavigation) return
  void load()
}, { immediate: true })
watch(config, () => { if (saveState.value === 'saved') saveState.value = 'idle' }, { deep: true })
watch(() => config.value.layers, layers => { if (config.value.activeLayer > layers) config.value.activeLayer = 0 })
</script>

<template>
  <main class="atelier-shell">
    <header class="atelier-header"><RouterLink class="atelier-back" to="/hub/works">← <span>我的作品</span></RouterLink><div class="atelier-document"><span class="eyebrow">DIGITAL ATELIER</span><strong>{{ title || '未命名作品' }}</strong></div><span class="save-indicator" aria-live="polite">{{ loading ? '读取中' : saveState === 'saving' ? '正在保存…' : dirty ? '有未保存修改' : work ? `已保存 · v${work.version}` : '新作品' }}</span><ThemeToggle layout="inline" size="sm" /><button class="primary-button save-button" :disabled="loading || !!loadError || saveState === 'saving' || !title.trim()" @click="save">{{ saveState === 'saving' ? '保存中…' : '保存作品' }}</button></header>
    <div v-if="loading" class="atelier-loading" role="status">正在从数据库恢复作品…</div>
    <div v-else-if="loadError" class="atelier-loading"><p class="notice error" role="alert">{{ loadError }}</p><button class="secondary-button" @click="load">重试读取</button><RouterLink class="text-button" to="/hub/works">返回作品列表</RouterLink></div>
    <div v-else class="atelier-body">
      <section class="atelier-stage" aria-label="三维创作视图">
        <AtelierScene ref="scene" :config="config" :theme="app.theme" @ready="ready = true; sceneError = ''" @error="ready = false; sceneError = $event" />
        <div class="stage-label"><span class="eyebrow">{{ template.subtitle }}</span><h1>{{ template.name }}</h1><p>{{ config.layers }} 重套球 / {{ config.activeLayer ? `聚焦第 ${config.activeLayer} 层` : '完整结构' }}</p></div>
        <div v-if="!ready && !sceneError" class="stage-status" role="status">正在构建镂空结构…</div>
        <div v-if="sceneError" class="stage-status notice error" role="alert">{{ sceneError }}<button class="text-button" @click="reloadWork">重新加载场景</button></div>
        <div class="stage-toolbar"><button class="secondary-button" @click="config.autoRotate = !config.autoRotate" :aria-pressed="config.autoRotate">{{ config.autoRotate ? 'Ⅱ 暂停旋转' : '↻ 自动旋转' }}</button><button class="secondary-button" @click="scene?.resetView()">重置视角</button><button class="secondary-button" :disabled="!ready" @click="capture">导出画面</button></div>
        <p class="stage-hint">拖动旋转 · 滚轮或双指缩放<span>原创数字镂空结构 · 非加工模型</span></p>
      </section>
      <aside class="atelier-controls">
        <button class="controls-toggle" @click="controlsOpen = !controlsOpen" :aria-expanded="controlsOpen">作品参数 <span>{{ controlsOpen ? '−' : '＋' }}</span></button>
        <div v-show="controlsOpen" class="controls-content">
          <section class="control-section"><div class="control-heading"><span>01</span><h2>结构与纹样</h2></div><label class="control-label">嵌套层数 <output>{{ config.layers }} 层</output><input v-model.number="config.layers" aria-label="嵌套层数" type="range" min="2" max="6" step="1" /></label><label class="control-label">纹样密度 <output>{{ config.patternScale }}</output><input v-model.number="config.patternScale" aria-label="纹样密度" type="range" min="8" max="24" step="1" /></label><label class="control-label">开孔尺度 <output>{{ Math.round(config.aperture * 100) }}%</output><input v-model.number="config.aperture" aria-label="开孔尺度" type="range" min=".35" max=".8" step=".01" /></label></section>
          <section class="control-section"><div class="control-heading"><span>02</span><h2>观察内部</h2></div><label class="control-label">分层展开 <output>{{ Math.round(config.separation * 100) }}%</output><input v-model.number="config.separation" aria-label="分层展开" type="range" min="0" max="1" step=".01" /></label><label class="switch-label"><span>剖视结构<small>切去部分球壳，观察套叠关系</small></span><input v-model="config.cutaway" type="checkbox" aria-label="剖视结构" /></label><label class="control-label">聚焦图层<select v-model.number="config.activeLayer" aria-label="聚焦图层"><option :value="0">查看全部图层</option><option v-for="layer in config.layers" :key="layer" :value="layer">第 {{ layer }} 层{{ layer === 1 ? '（最外层）' : '' }}</option></select></label></section>
          <section class="control-section"><div class="control-heading"><span>03</span><h2>材质与光泽</h2></div><div class="material-options"><button v-for="material in (['ivory', 'jade', 'bronze'] as const)" :key="material" class="material-choice" :class="{ selected: config.material === material }" :aria-pressed="config.material === material" @click="config.material = material"><span :class="`material-swatch ${material}`" />{{ material === 'ivory' ? '暖瓷' : material === 'jade' ? '青玉' : '古铜' }}</button></div></section>
          <section class="control-section"><div class="control-heading"><span>04</span><h2>为作品留个名字</h2></div><label class="control-label">作品名称<input v-model="title" type="text" maxlength="80" required aria-label="作品名称" /></label><label class="control-label">创作说明<textarea v-model="description" maxlength="1000" rows="3" placeholder="记录你的纹样与结构构思…" aria-label="创作说明" /></label><p v-if="saveError" class="notice error" role="alert">{{ saveError }}<button v-if="conflict" class="text-button" @click="reloadWork">读取最新版本</button><RouterLink v-if="expired" class="text-button" to="/login">重新登录</RouterLink><button v-else-if="!conflict" class="text-button" @click="save">重试保存</button></p><p v-if="saveState === 'saved' && !dirty" class="notice success" role="status">已写入数据库，可以从「我的作品」重新打开。</p><button class="text-button config-download" @click="downloadConfig">↓ 下载当前配置 JSON</button><p class="control-foot">{{ isNew ? '首次保存会创建一件独立作品。' : '继续保存将更新当前作品。' }}视角可自由探索，结构、材质与观察参数会随作品保存。</p></section>
        </div>
      </aside>
    </div>
  </main>
</template>
