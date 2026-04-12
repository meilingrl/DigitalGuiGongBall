import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { templates, text, type Locale } from '../data/content'

export type ThemeMode = 'light' | 'dark'

export const useAppStore = defineStore('app', () => {
  const locale = ref<Locale>('zh')
  const theme = ref<ThemeMode>('light')
  const displayName = ref('林锐')
  const selectedTemplateId = ref<string>(templates[0].id)
  const layerDepth = ref(3)
  const maxLayers = ref(templates[0].layers)
  const riskLevel = ref<'safe' | 'warning'>('safe')
  const exportState = ref<'idle' | 'pending' | 'done'>('idle')
  const healthTipVisible = ref(false)
  const collaboratorLayer = ref(2)
  const carvingTool = ref<'sculpt' | 'relief' | 'perforate' | 'polish' | 'texture'>('sculpt')
  const carvingPressure = ref(58)

  const t = computed(() => text[locale.value])

  const selectedTemplate = computed(() =>
    templates.find((item) => item.id === selectedTemplateId.value) ?? templates[0],
  )

  function toggleLocale() {
    locale.value = locale.value === 'zh' ? 'en' : 'zh'
  }

  function setLocale(next: Locale) {
    locale.value = next
  }

  function initTheme() {
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem('theme') as ThemeMode | null
    if (saved === 'light' || saved === 'dark') {
      theme.value = saved
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme.value = 'dark'
    } else {
      theme.value = 'light'
    }
  }

  function toggleTheme() {
    const next: ThemeMode = theme.value === 'light' ? 'dark' : 'light'
    theme.value = next
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('theme', next)
    }
  }

  function setTheme(mode: ThemeMode) {
    theme.value = mode
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('theme', mode)
    }
  }

  function selectTemplate(id: string) {
    selectedTemplateId.value = id
    const next = templates.find((item) => item.id === id)
    if (!next) return
    maxLayers.value = next.layers
    layerDepth.value = Math.max(1, Math.min(layerDepth.value, next.layers))
  }

  function setLayerDepth(layer: number) {
    layerDepth.value = Math.max(1, Math.min(layer, maxLayers.value))
  }

  function setRiskLevel(level: 'safe' | 'warning') {
    riskLevel.value = level
  }

  function triggerHealthTip() {
    healthTipVisible.value = true
    window.setTimeout(() => {
      healthTipVisible.value = false
    }, 4200)
  }

  function triggerExport() {
    if (exportState.value === 'pending') return
    exportState.value = 'pending'
    window.setTimeout(() => {
      exportState.value = 'done'
      window.setTimeout(() => {
        exportState.value = 'idle'
      }, 2200)
    }, 1800)
  }

  function tickCollaborator() {
    collaboratorLayer.value = collaboratorLayer.value >= maxLayers.value ? 1 : collaboratorLayer.value + 1
  }

  function setCarvingTool(tool: 'sculpt' | 'relief' | 'perforate' | 'polish' | 'texture') {
    carvingTool.value = tool
  }

  function setCarvingPressure(value: number) {
    carvingPressure.value = Math.max(0, Math.min(100, Math.round(value)))
  }

  function signOut() {
    displayName.value = '访客'
  }

  return {
    locale,
    theme,
    displayName,
    t,
    selectedTemplateId,
    selectedTemplate,
    layerDepth,
    maxLayers,
    riskLevel,
    exportState,
    healthTipVisible,
    collaboratorLayer,
    carvingTool,
    carvingPressure,
    toggleLocale,
    setLocale,
    initTheme,
    toggleTheme,
    setTheme,
    selectTemplate,
    setLayerDepth,
    setRiskLevel,
    triggerHealthTip,
    triggerExport,
    tickCollaborator,
    setCarvingTool,
    setCarvingPressure,
    signOut,
  }
})
