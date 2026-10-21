<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
  RouterLink,
  useRoute,
  useRouter
} from 'vue-router'
import AtelierScene from '../components/AtelierScene.vue'
import AtelierParameters from '../components/atelier/AtelierParameters.vue'
import { templates } from '../../shared/design'
import { useAtelierDocument } from '../composables/useAtelierDocument'
import { downloadBlob, imageDataUrlToBlob } from '../lib/download'
import { usePreferencesStore } from '../stores/preferences'
import { useAuthStore } from '../stores/auth'
import ThemeToggle from '../components/ThemeToggle.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { findInspiration } from '../../shared/inspirations'
import { useWorkPreview } from '../composables/useWorkPreview'
import { loginPath } from '../lib/journey'
import { replaceAtelierWorkId } from '../lib/atelierNavigation'

const route = useRoute()
const router = useRouter()
const app = usePreferencesStore()
const auth = useAuthStore()
const scene = ref<InstanceType<typeof AtelierScene> | null>(null)
const ready = ref(false)
const sceneError = ref('')
const controlsOpen = ref(true)
const confirmKind = ref<'leave' | 'reload' | null>(null)
let confirmResolve: ((value: boolean) => void) | undefined
function confirmDiscard(kind: 'leave' | 'reload') {
  if (confirmKind.value) return Promise.resolve(false)
  confirmKind.value = kind
  return new Promise<boolean>((resolve) => {
    confirmResolve = resolve
  })
}
function resolveConfirm(value: boolean) {
  confirmKind.value = null
  confirmResolve?.(value)
  confirmResolve = undefined
}
const previews = useWorkPreview({
  userId: auth.user!.id,
  capture: (config) => scene.value?.exportPreview(config)
})
let deviceStorage: Storage | undefined
try {
  deviceStorage = window.localStorage
} catch {
  /* The document exposes the unavailable recovery store. */
}
const {
  config,
  title,
  description,
  inspirationId,
  work,
  loading,
  loadError,
  saveError,
  navigationError,
  saveState,
  conflict,
  expired,
  redirecting,
  dirty,
  recovery,
  draftNotice,
  localDraftAt,
  pendingSave,
  load,
  save,
  retryNavigation,
  restoreDraft,
  discardDraft,
  persistDraft
} = useAtelierDocument({
  userId: auth.user!.id,
  source: () => ({
    workId: route.params.id ? String(route.params.id) : undefined,
    templateId: String(route.query.template ?? 'linglong'),
    inspirationId: String(route.query.inspiration ?? ''),
    designJson:
      typeof route.query.design === 'string' ? route.query.design : undefined
  }),
  replaceWorkId: (id) => replaceAtelierWorkId(router, id),
  storage: deviceStorage,
  onSaved: (value) => {
    void previews.store(value)
  }
})
const inspiration = computed(() => findInspiration(inspirationId.value))
watch(previews.saved, (value) => {
  if (
    value &&
    work.value?.id === value.id &&
    work.value.version === value.version
  )
    work.value = value
})
const isNew = computed(() => !work.value)
const template = computed(
  () =>
    templates.find((item) => item.id === config.value.templateId) ??
    templates[0]
)
const recoveryTime = computed(() =>
  recovery.value
    ? new Date(recovery.value.updatedAt).toLocaleString('zh-CN')
    : ''
)
async function reloadWork() {
  if (!dirty.value || (await confirmDiscard('reload'))) void load(true)
}
function onSceneReady() {
  ready.value = true
  sceneError.value = ''
}
function onSceneError(message: string) {
  ready.value = false
  sceneError.value = message
}
function retryScene() {
  ready.value = false
  sceneError.value = ''
  scene.value?.retry()
}
function downloadConfig() {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          title: title.value,
          description: description.value,
          config: config.value,
          inspirationId: inspirationId.value
        },
        null,
        2
      )
    ],
    { type: 'application/json' }
  )
  downloadBlob(blob, 'guigong-design.json')
}
function capture() {
  const data = scene.value?.exportImage()
  if (!data) {
    sceneError.value = '当前无法导出画面，请等待三维加载完成后重试'
    return
  }
  downloadBlob(imageDataUrlToBlob(data), 'guigong-preview.png')
}
function warnUnload(event: BeforeUnloadEvent) {
  if (dirty.value) {
    persistDraft()
    event.preventDefault()
    event.returnValue = ''
  }
}
function shortcut(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    void save()
  }
}
window.addEventListener('beforeunload', warnUnload)
window.addEventListener('keydown', shortcut)
onBeforeUnmount(() => {
  resolveConfirm(false)
  window.removeEventListener('beforeunload', warnUnload)
  window.removeEventListener('keydown', shortcut)
})
onBeforeRouteLeave(
  () => redirecting.value || !dirty.value || confirmDiscard('leave')
)
onBeforeRouteUpdate(
  () => redirecting.value || !dirty.value || confirmDiscard('leave')
)
watch(
  () =>
    `${route.params.id ?? ''}:${route.query.template ?? ''}:${route.query.inspiration ?? ''}:${route.query.design ?? ''}`,
  (_next, previous) => {
    if (
      previous !== undefined &&
      work.value?.id === route.params.id &&
      redirecting.value
    )
      return
    previews.reset()
    ready.value = false
    sceneError.value = ''
    void load()
  },
  { immediate: true }
)
</script>

<template>
  <main class="atelier-shell">
    <ConfirmDialog
      :open="!!confirmKind"
      :title="
        confirmKind === 'reload' ? '读取服务端最新版本？' : '离开当前创作？'
      "
      :message="
        confirmKind === 'reload'
          ? '这会舍弃此设备尚未保存的修改。可以先取消并下载配置，保留你的想法。'
          : '作品有尚未保存到服务端的修改。离开后，此设备草稿可在下次打开时恢复。'
      "
      :confirm-label="
        confirmKind === 'reload' ? '读取最新版本' : '保留草稿并离开'
      "
      @resolve="resolveConfirm"
    />
    <header class="atelier-header">
      <RouterLink class="atelier-back" to="/hub/works">
        ←
        <span>我的作品</span>
      </RouterLink>
      <div class="atelier-document">
        <span class="eyebrow">DIGITAL ATELIER</span>
        <strong>{{ title || '未命名作品' }}</strong>
      </div>
      <span class="save-indicator" aria-live="polite">
        {{
          loading
            ? '读取中'
            : saveState === 'saving'
              ? '正在保存…'
              : pendingSave
                ? '上次请求结果待确认'
                : dirty
                  ? '有未保存修改'
                  : work
                    ? `已保存 · v${work.version}`
                    : '新作品'
        }}
      </span>
      <ThemeToggle layout="inline" size="sm" />
      <button
        class="primary-button save-button"
        :disabled="
          loading ||
          !!loadError ||
          !!recovery ||
          conflict ||
          saveState === 'saving' ||
          !title.trim()
        "
        @click="save"
      >
        {{ saveState === 'saving' ? '保存中…' : '保存作品' }}
      </button>
    </header>
    <div v-if="loading" class="atelier-loading" role="status">
      正在从数据库恢复作品…
    </div>
    <div v-else-if="loadError" class="atelier-loading">
      <p class="notice error" role="alert">{{ loadError }}</p>
      <button class="secondary-button" @click="load()">重试读取</button>
      <RouterLink class="text-button" to="/hub/works">返回作品列表</RouterLink>
    </div>
    <div v-else class="atelier-body">
      <section class="atelier-stage" aria-label="三维创作视图">
        <AtelierScene
          ref="scene"
          :config="config"
          :theme="app.theme"
          @ready="onSceneReady"
          @error="onSceneError"
        />
        <div class="stage-label">
          <span class="eyebrow">{{ template.subtitle }}</span>
          <h1>{{ template.name }}</h1>
          <p>
            {{ config.layers }} 重套球 /
            {{
              config.activeLayer
                ? `聚焦第 ${config.activeLayer} 层`
                : '完整结构'
            }}
          </p>
        </div>
        <div v-if="!ready && !sceneError" class="stage-status" role="status">
          正在构建镂空结构…
        </div>
        <div v-if="sceneError" class="stage-status notice error" role="alert">
          {{ sceneError }}
          <button class="text-button" @click="retryScene">重新加载场景</button>
        </div>
        <div class="stage-toolbar">
          <button
            class="secondary-button"
            :disabled="!!recovery"
            @click="config.autoRotate = !config.autoRotate"
            :aria-pressed="config.autoRotate"
          >
            {{ config.autoRotate ? 'Ⅱ 暂停旋转' : '↻ 自动旋转' }}
          </button>
          <button class="secondary-button" @click="scene?.resetView()">
            重置视角
          </button>
          <button class="secondary-button" :disabled="!ready" @click="capture">
            导出画面
          </button>
        </div>
        <p class="stage-hint">
          拖动旋转 · 滚轮或双指缩放
          <span>原创数字镂空结构 · 非加工模型</span>
        </p>
      </section>
      <aside class="atelier-controls">
        <button
          class="controls-toggle"
          @click="controlsOpen = !controlsOpen"
          :aria-expanded="controlsOpen"
        >
          作品参数
          <span>{{ controlsOpen ? '−' : '＋' }}</span>
        </button>
        <div v-show="controlsOpen" class="controls-content">
          <div v-if="inspiration" class="atelier-inspiration">
            <p class="eyebrow">INSPIRED BY YOUR EXPLORATION</p>
            <RouterLink
              class="text-button"
              :to="`/hub/studies/${inspiration.id}`"
            >
              {{ inspiration.title }} ↗
            </RouterLink>
            <p>灵感来源会和作品一起保存。</p>
          </div>
          <div
            v-if="work && saveState === 'saved'"
            class="notice success atelier-save-result"
            role="status"
          >
            作品已保存 · v{{ work.version }}
            <RouterLink :to="`/hub/works/${work.id}`">
              查看作品与三维预览 →
            </RouterLink>
          </div>
          <div
            v-if="navigationError && work"
            class="notice error"
            role="status"
          >
            <p>{{ navigationError }}</p>
            <button
              class="text-button"
              :disabled="redirecting"
              @click="retryNavigation"
            >
              {{ redirecting ? '正在切换地址…' : '重试切换作品地址' }}
            </button>
            <RouterLink class="text-button" :to="`/hub/works/${work.id}`">
              打开已保存作品 →
            </RouterLink>
          </div>
          <p v-if="previews.busy.value" class="notice" role="status">
            作品已保存，正在生成三维预览…
          </p>
          <div
            v-else-if="previews.notice.value"
            class="notice error"
            role="status"
          >
            {{ previews.notice.value }}
            <button
              class="text-button"
              :disabled="!ready"
              @click="previews.retry"
            >
              重试生成预览
            </button>
          </div>
          <div v-if="recovery" class="notice recovery-notice" role="status">
            <strong>发现此设备的创作恢复记录</strong>
            <p>{{ recoveryTime }} · {{ recovery.title || '未命名作品' }}</p>
            <p v-if="recovery.pendingSave">
              上次请求结果尚未确认，可能已保存。恢复后重试将核实同一请求，避免重复创建或更新。
            </p>
            <p v-else>
              这是尚未保存到服务端的设备草稿。恢复后可继续修改并正式保存。
            </p>
            <div class="notice-actions">
              <button class="text-button" @click="restoreDraft">
                恢复此设备草稿
              </button>
              <button class="text-button" @click="discardDraft">
                舍弃此设备草稿
              </button>
            </div>
          </div>
          <p v-if="draftNotice" class="notice error" role="status">
            {{ draftNotice }}
          </p>
          <fieldset class="document-fields" :disabled="!!recovery">
            <AtelierParameters v-model="config" />
            <section class="control-section">
              <div class="control-heading">
                <span>04</span>
                <h2>为作品留个名字</h2>
              </div>
              <label class="control-label">
                作品名称
                <input
                  v-model="title"
                  type="text"
                  maxlength="80"
                  required
                  aria-label="作品名称"
                />
              </label>
              <label class="control-label">
                创作说明
                <textarea
                  v-model="description"
                  maxlength="1000"
                  rows="3"
                  placeholder="记录你的纹样与结构构思…"
                  aria-label="创作说明"
                />
              </label>
              <p v-if="saveError" class="notice error" role="alert">
                {{ saveError }}
                <button v-if="conflict" class="text-button" @click="reloadWork">
                  读取最新版本
                </button>
                <RouterLink
                  v-if="expired"
                  class="text-button"
                  :to="loginPath(route.fullPath)"
                >
                  重新登录并返回
                </RouterLink>
                <button v-else-if="!conflict" class="text-button" @click="save">
                  重试保存
                </button>
              </p>
              <p
                v-if="saveState === 'saved' && !dirty"
                class="notice success"
                role="status"
              >
                已写入数据库，可以从「我的作品」重新打开。
              </p>
              <button
                class="text-button config-download"
                @click="downloadConfig"
              >
                ↓ 下载当前配置 JSON
              </button>
              <p
                v-if="localDraftAt && dirty"
                class="device-draft-state"
                role="status"
              >
                {{
                  pendingSave
                    ? '此设备保留了未确认的请求与草稿。可能已保存到服务端，重试将核实原请求。'
                    : '此设备草稿，尚未保存到服务端。'
                }}保留 7 天。
              </p>
              <p class="control-foot">
                {{
                  isNew
                    ? '首次保存会创建一件独立作品。'
                    : '继续保存将更新当前作品。'
                }}视角可自由探索，结构、材质与观察参数会随作品保存。
              </p>
            </section>
          </fieldset>
        </div>
      </aside>
    </div>
  </main>
</template>
