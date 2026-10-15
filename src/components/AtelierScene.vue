<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { DesignConfig } from '../../shared/design'
import { AtelierStage } from '../three/AtelierStage'

const props = defineProps<{ config: DesignConfig; theme: 'light' | 'dark' }>()
const emit = defineEmits<{ ready: []; error: [message: string] }>()
const stageRef = ref<HTMLElement | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const message = ref('')
let stage: AtelierStage | undefined

function initialise() {
  if (!stageRef.value) return
  stage?.dispose()
  stage = undefined
  status.value = 'loading'
  message.value = ''
  try {
    stage = new AtelierStage(stageRef.value, props.config, props.theme, {
      ready: () => { status.value = 'ready'; message.value = ''; emit('ready') },
      error: (error) => { status.value = 'error'; message.value = error; emit('error', error) },
    })
  } catch {
    status.value = 'error'
    message.value = '无法启动三维预览。请检查浏览器硬件加速，或使用支持 WebGL 的浏览器。'
    emit('error', message.value)
  }
}

watch(() => props.config, (config) => stage?.setConfig(config), { deep: true })
watch(() => props.theme, (theme) => stage?.setTheme(theme))
onMounted(initialise)
onBeforeUnmount(() => { stage?.dispose(); stage = undefined })
defineExpose({ resetView: () => stage?.resetView(), exportImage: () => stage?.exportImage() })
</script>

<template>
  <div class="atelier-scene" :class="{ 'atelier-scene--dark': theme === 'dark' }" :aria-busy="status === 'loading'">
    <div ref="stageRef" class="atelier-scene__canvas" />
    <div v-if="status === 'loading'" class="atelier-scene__state" role="status">
      <span class="atelier-scene__spinner" />
      <p>正在构建镂空纹样</p>
    </div>
    <div v-else-if="status === 'error'" class="atelier-scene__state" role="alert">
      <span class="atelier-scene__error-icon" aria-hidden="true">◈</span>
      <p>{{ message }}</p>
      <button type="button" @click="initialise">重新加载三维预览</button>
    </div>
    <template v-else>
      <div class="atelier-scene__label" aria-hidden="true">
        <span class="atelier-scene__dot" />
        {{ config.activeLayer ? `第 ${config.activeLayer} 层 · 独立观察` : `${config.layers} 层 · 同心镂空结构` }}
      </div>
    </template>
  </div>
</template>

<style scoped>
.atelier-scene { position: relative; width: 100%; height: 100%; min-height: 280px; overflow: hidden; color: #655f51; background: #eeeae0; }
.atelier-scene--dark { color: #c3cabc; background: #141c1a; }
.atelier-scene__canvas { width: 100%; height: 100%; min-height: 280px; }
.atelier-scene__canvas :deep(canvas) { display: block; width: 100%; height: 100%; touch-action: none; outline: none; }
.atelier-scene__state { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 16px; padding: 40px; text-align: center; font-size: 13px; line-height: 1.8; background: inherit; }
.atelier-scene__state p { max-width: 330px; }
.atelier-scene__state button { padding: 10px 18px; border-radius: 4px; border: 1px solid currentColor; background: transparent; color: inherit; cursor: pointer; }
.atelier-scene__state button:hover { background: #89816b1a; }
.atelier-scene__spinner { width: 30px; height: 30px; border: 1px solid #9a90723a; border-top-color: #9a9072; border-radius: 50%; animation: scene-spin 1.2s linear infinite; }
.atelier-scene__error-icon { font-size: 28px; color: #a0784f; }
.atelier-scene__label { position: absolute; left: 24px; bottom: 24px; display: flex; gap: 8px; align-items: center; font-size: 10px; letter-spacing: 0.12em; pointer-events: none; }
.atelier-scene__dot { width: 5px; height: 5px; border-radius: 50%; background: #779280; }
@keyframes scene-spin { to { transform: rotate(360deg); } }
@media (max-width: 700px) { .atelier-scene__label { display: none; } }
@media (prefers-reduced-motion: reduce) { .atelier-scene__spinner { animation: none; } }
</style>
