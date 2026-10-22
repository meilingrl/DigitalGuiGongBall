<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { templates, type DesignConfig, type Work } from '../../../shared/design'
import { getLayerPattern } from '../../../shared/layerDesign'
import { findInspiration } from '../../../shared/inspirations'
import AtelierScene from '../../components/AtelierScene.vue'
import WorkThumbnail from '../../components/WorkThumbnail.vue'
import { useWorkPreview } from '../../composables/useWorkPreview'
import { api, ApiError, errorMessage } from '../../lib/api'
import { cloneDesign } from '../../lib/draft'
import { loginPath } from '../../lib/journey'
import { useAuthStore } from '../../stores/auth'
import { usePreferencesStore } from '../../stores/preferences'
const route = useRoute()
const auth = useAuthStore()
const app = usePreferencesStore()
const work = ref<Work | null>(null)
const viewConfig = ref<DesignConfig | null>(null)
const scene = ref<InstanceType<typeof AtelierScene> | null>(null)
const ready = ref(false)
const previewRevision = ref(0)
const loading = ref(true)
const error = ref('')
const expired = ref(false)
const inspiration = computed(() => findInspiration(work.value?.inspirationId))
const layerSummaries = computed(() => {
  const config = work.value?.config
  if (!config || config.schemaVersion !== 2) return []
  return [
    { name: '外层纹样', pattern: getLayerPattern(config, 0) },
    { name: '内层纹样', pattern: getLayerPattern(config, config.layers - 1) },
  ]
})
function templateName(id: DesignConfig['templateId']) {
  return templates.find(template => template.id === id)!.name
}
const previews = useWorkPreview({
  userId: auth.user!.id,
  capture: (config) => scene.value?.exportPreview(config)
})
let epoch = 0
async function load() {
  const current = ++epoch
  loading.value = true
  error.value = ''
  work.value = null
  viewConfig.value = null
  ready.value = false
  try {
    const result = await api<{ work: Work }>(
      `/api/works/${encodeURIComponent(String(route.params.id))}`,
      { expectedUserId: auth.user!.id }
    )
    if (current !== epoch) return
    work.value = result.work
    viewConfig.value = cloneDesign(result.work.config)
  } catch (cause) {
    if (current === epoch) {
      error.value = errorMessage(cause)
      expired.value = cause instanceof ApiError && cause.status === 401
    }
  } finally {
    if (current === epoch) loading.value = false
  }
}
function date(value: string) {
  return new Date(value).toLocaleString('zh-CN')
}
watch(previews.saved, (value) => {
  if (
    value &&
    work.value?.id === value.id &&
    work.value.version === value.version
  ) {
    work.value = value
    previewRevision.value++
  }
})
watch(() => route.params.id, load, { immediate: true })
onBeforeUnmount(() => {
  epoch++
})
</script>
<template>
  <div class="studio-page detail-page">
    <RouterLink class="detail-back text-button" to="/hub/works">
      ← 我的作品
    </RouterLink>
    <div v-if="loading" class="empty-panel" role="status">
      正在恢复作品的结构、材料与灵感来源…
    </div>
    <div v-else-if="error" class="empty-panel">
      <p class="notice error" role="alert">{{ error }}</p>
      <RouterLink
        v-if="expired"
        class="primary-button"
        :to="loginPath(route.fullPath)"
      >
        重新登录并返回
      </RouterLink>
      <button v-else class="secondary-button" @click="load">
        重新读取作品
      </button>
    </div>
    <template v-else-if="work && viewConfig">
      <header class="page-intro">
        <div>
          <p class="eyebrow">A WORK OF YOUR OWN / PRIVATE COLLECTION</p>
          <h1>{{ work.title }}</h1>
        </div>
        <RouterLink class="primary-button" :to="`/atelier/${work.id}`">
          继续创作 ↗
        </RouterLink>
      </header>
      <div class="detail-layout">
        <section class="detail-stage" aria-label="已保存作品的三维观察">
          <AtelierScene
            ref="scene"
            :config="viewConfig"
            :theme="app.theme"
            @ready="ready = true"
            @error="ready = false"
          />
          <div class="detail-stage-controls">
            <button
              class="secondary-button"
              @click="viewConfig.cutaway = !viewConfig.cutaway"
              :aria-pressed="viewConfig.cutaway"
            >
              {{ viewConfig.cutaway ? '查看完整球体' : '剖开看看' }}
            </button>
            <button
              class="secondary-button"
              @click="viewConfig.separation = viewConfig.separation ? 0 : 0.8"
              :aria-pressed="!!viewConfig.separation"
            >
              {{ viewConfig.separation ? '合拢结构' : '展开层次' }}
            </button>
            <button class="secondary-button" @click="scene?.resetView()">
              重置视角
            </button>
          </div>
          <p class="detail-view-note">
            自由观察 · 此处的视角变化不修改已保存作品
          </p>
        </section>
        <aside class="detail-story">
          <p class="eyebrow">THE DESIGN RECORD</p>
          <h2>这一件，属于你的选择。</h2>
          <p class="detail-description">
            {{
              work.description ||
              '还没有创作说明。进入工坊，为这件作品记录你的想法。'
            }}
          </p>
          <dl>
            <div>
              <dt>嵌套结构</dt>
              <dd>{{ work.config.layers }} 层</dd>
            </div>
            <div>
              <dt>数字材料</dt>
              <dd>
                {{
                  work.config.material === 'ivory'
                    ? '暖瓷'
                    : work.config.material === 'jade'
                      ? '青玉'
                      : '古铜'
                }}
              </dd>
            </div>
            <template v-if="work.config.schemaVersion === 2">
              <div v-for="layer in layerSummaries" :key="layer.name">
                <dt>{{ layer.name }}</dt>
                <dd>
                  {{ templateName(layer.pattern.templateId) }} · 密度
                  {{ layer.pattern.patternScale }} · 开孔
                  {{ Math.round(layer.pattern.aperture * 100) }}%
                </dd>
              </div>
              <div>
                <dt>中间层规则</dt>
                <dd>
                  沿用起始参数：{{ templateName(work.config.templateId) }} · 密度
                  {{ work.config.patternScale }} · 开孔
                  {{ Math.round(work.config.aperture * 100) }}%
                  <span v-if="work.config.layers === 2">（当前无中间层）</span>
                </dd>
              </div>
            </template>
            <div v-else>
              <dt>纹样密度 / 开孔</dt>
              <dd>
                {{ work.config.patternScale }} /
                {{ Math.round(work.config.aperture * 100) }}%
              </dd>
            </div>
            <div>
              <dt>保存版本</dt>
              <dd>v{{ work.version }} · 仅自己可见</dd>
            </div>
          </dl>
          <div v-if="inspiration" class="detail-origin">
            <span class="eyebrow">WHERE IT BEGAN</span>
            <h3>灵感起于 · {{ inspiration.title }}</h3>
            <p>{{ inspiration.summary }}</p>
            <RouterLink
              class="text-button"
              :to="`/hub/studies/${inspiration.id}`"
            >
              回看导览与结构观察 →
            </RouterLink>
          </div>
          <div v-else class="detail-origin">
            <h3>从一个纹样，自由出发。</h3>
            <p>
              这件作品由模板直接开始。也可以去文化导览，为下一次创作发现新的切入点。
            </p>
            <RouterLink class="text-button" to="/hub/museum">
              寻找下一份灵感 →
            </RouterLink>
          </div>
        </aside>
      </div>
      <section class="detail-record">
        <div>
          <p class="eyebrow">SAVED IN YOUR COLLECTION</p>
          <h2>让作品，在列表中也清晰可见。</h2>
          <p>预览由保存的三维配置生成，和作品一起存入数据库。</p>
          <p v-if="previews.notice.value" class="notice error" role="status">
            {{ previews.notice.value }}
          </p>
          <p
            v-else-if="previews.saved.value"
            class="notice success"
            role="status"
          >
            三维预览已更新，作品版本保持 v{{ work.version }}。
          </p>
          <button
            class="secondary-button"
            :disabled="!ready || previews.busy.value"
            @click="previews.store(work)"
          >
            {{
              previews.busy.value
                ? '正在生成预览…'
                : work.previewVersion === work.version
                  ? '重新生成作品预览'
                  : '生成作品预览'
            }}
          </button>
          <p class="detail-timestamps">
            创建 {{ date(work.createdAt) }}
            <br />
            最近保存
            {{ date(work.updatedAt) }}
          </p>
        </div>
        <div class="detail-preview">
          <WorkThumbnail
            :key="`${work.id}:${work.previewVersion}:${previewRevision}`"
            :work="work"
          />
        </div>
      </section>
    </template>
  </div>
</template>
<style scoped>
.detail-back {
  display: inline-block;
  margin-bottom: 28px;
}
.detail-page .page-intro h1 {
  overflow-wrap: anywhere;
  max-width: 900px;
}
.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 1fr);
  border: 1px solid var(--studio-line);
  border-radius: 7px;
  overflow: hidden;
  background: var(--studio-panel);
}
.detail-stage {
  position: relative;
  min-height: 510px;
}
.detail-stage-controls {
  position: absolute;
  left: 20px;
  right: 20px;
  bottom: 57px;
  display: flex;
  justify-content: center;
  gap: 8px;
}
.detail-stage-controls button {
  padding: 9px 12px;
  font-size: 10px;
}
.detail-stage :deep(.atelier-scene__label) {
  display: none;
}
.detail-view-note {
  position: absolute;
  bottom: 25px;
  left: 15px;
  right: 15px;
  text-align: center;
  font-size: 9px;
  letter-spacing: 1px;
  color: var(--studio-muted);
  pointer-events: none;
}
.detail-story {
  padding: 35px;
}
.detail-story h2 {
  font:
    500 25px/1.6 'Songti SC',
    Georgia,
    serif;
  margin: 18px 0;
}
.detail-description {
  font-size: 13px;
  line-height: 2;
  color: var(--studio-muted);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.detail-story dl {
  margin: 25px 0;
  font-size: 11px;
}
.detail-story dl > div {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  border-bottom: 1px solid var(--studio-line);
  padding: 13px 0;
}
.detail-story dt {
  color: var(--studio-muted);
  flex-shrink: 0;
}
.detail-story dd {
  margin: 0;
  text-align: right;
  line-height: 1.8;
}
.detail-origin {
  margin-top: 28px;
}
.detail-origin h3 {
  font:
    500 17px/1.7 'Songti SC',
    Georgia,
    serif;
  margin: 8px 0;
}
.detail-origin p {
  font-size: 11px;
  line-height: 1.9;
  color: var(--studio-muted);
  margin-bottom: 12px;
}
.detail-record {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 40px;
  margin-top: 38px;
  padding: 28px 0;
  border-top: 1px solid var(--studio-line);
  align-items: start;
}
.detail-record h2 {
  font:
    500 23px/1.6 'Songti SC',
    Georgia,
    serif;
  margin: 12px 0;
}
.detail-record p {
  font-size: 12px;
  color: var(--studio-muted);
  line-height: 1.9;
  margin: 14px 0;
}
.detail-timestamps {
  font-size: 10px !important;
}
.detail-preview {
  border: 1px solid var(--studio-line);
  border-radius: 5px;
  overflow: hidden;
}
@media (max-width: 760px) {
  .detail-back {
    margin-bottom: 20px;
  }
  .detail-layout {
    grid-template-columns: 1fr;
  }
  .detail-stage {
    min-height: 370px;
  }
  .detail-story {
    padding: 26px;
  }
  .detail-stage-controls {
    gap: 6px;
  }
  .detail-stage-controls button {
    font-size: 10px;
    padding: 10px;
  }
  .detail-record {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  .detail-preview {
    max-width: 360px;
  }
  .detail-page .page-intro {
    align-items: start;
  }
  .detail-page .page-intro h1 {
    font-size: 26px;
  }
  .detail-page .page-intro > a {
    flex-shrink: 0;
  }
}
</style>
