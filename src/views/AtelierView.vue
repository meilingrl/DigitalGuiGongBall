<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AtelierScene from '../components/AtelierScene.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const router = useRouter()
const drawerOpen = ref(true)
const uiVisible = ref(true)
const autoRotate = ref(true)
let healthTimer = 0
let collabTimer = 0

const IDLE_MS = 4000
let idleTimer: ReturnType<typeof setTimeout> | null = null

type CarvingToolId = 'sculpt' | 'relief' | 'perforate' | 'polish' | 'texture'

const carvingToolIds: CarvingToolId[] = ['sculpt', 'relief', 'perforate', 'polish', 'texture']

function carvingToolLabel(id: CarvingToolId): string {
  const t = store.t
  switch (id) {
    case 'sculpt':
      return t.toolSculpt
    case 'relief':
      return t.toolRelief
    case 'perforate':
      return t.toolPerforate
    case 'polish':
      return t.toolPolish
    case 'texture':
      return t.toolTexture
  }
}

const templateName = computed(() =>
  store.locale === 'zh' ? store.selectedTemplate.nameZh : store.selectedTemplate.nameEn,
)

const riskClass = computed(() =>
  store.riskLevel === 'warning' ? 'shadow-[inset_0_0_0_4px_rgba(239,68,68,0.45)]' : '',
)

const shellClass = computed(() =>
  store.theme === 'light'
    ? 'bg-slate-100 text-slate-900'
    : 'bg-[#020817] text-white',
)

const exportText = computed(() => {
  if (store.exportState === 'pending') return store.t.exportPending
  if (store.exportState === 'done') return store.t.exportDone
  return store.t.export
})

const dockClass = computed(() =>
  store.theme === 'light'
    ? 'border border-slate-200/90 bg-white/92 text-slate-800 shadow-[0_10px_40px_rgba(15,23,42,0.08)]'
    : 'border border-white/12 bg-slate-950/88 text-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.45)]',
)

const toolBtnClass = (id: CarvingToolId) => {
  const active = store.carvingTool === id
  if (store.theme === 'light') {
    return active
      ? 'bg-teal-50 text-teal-900 ring-2 ring-teal-500/70 shadow-sm'
      : 'text-slate-600 hover:bg-slate-100/90'
  }
  return active
    ? 'bg-teal-950/80 text-teal-100 ring-2 ring-teal-400/50 shadow-sm'
    : 'text-slate-300 hover:bg-white/10'
}

function resetIdleTimer() {
  uiVisible.value = true
  if (idleTimer !== null) {
    clearTimeout(idleTimer)
    idleTimer = null
  }
  idleTimer = window.setTimeout(() => {
    uiVisible.value = false
    idleTimer = null
  }, IDLE_MS)
}

function backToHub() {
  router.push({ name: 'hub-workshop' })
}

function onIdleActivity() {
  resetIdleTimer()
}

const wheelOpts: AddEventListenerOptions = { passive: true }

onMounted(() => {
  resetIdleTimer()

  window.addEventListener('mousemove', onIdleActivity)
  window.addEventListener('mousedown', onIdleActivity)
  window.addEventListener('wheel', onIdleActivity, wheelOpts)
  window.addEventListener('touchstart', onIdleActivity, wheelOpts)

  healthTimer = window.setInterval(() => {
    store.triggerHealthTip()
  }, 90000)

  collabTimer = window.setInterval(() => {
    store.tickCollaborator()
  }, 6000)
})

onBeforeUnmount(() => {
  if (idleTimer !== null) clearTimeout(idleTimer)
  window.removeEventListener('mousemove', onIdleActivity)
  window.removeEventListener('mousedown', onIdleActivity)
  window.removeEventListener('wheel', onIdleActivity, wheelOpts)
  window.removeEventListener('touchstart', onIdleActivity, wheelOpts)
  window.clearInterval(healthTimer)
  window.clearInterval(collabTimer)
})
</script>

<template>
  <main class="relative min-h-[100dvh] overflow-hidden" :class="[shellClass, riskClass]">
    <Transition
      enter-active-class="transition-all duration-500 ease-out"
      enter-from-class="-translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-all duration-500 ease-out"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="-translate-y-full opacity-0"
    >
      <div
        v-show="uiVisible"
        class="pointer-events-auto absolute left-4 right-4 z-30 flex items-center justify-between gap-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:left-6 sm:right-6 sm:top-5"
      >
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-full border px-4 py-2 text-sm backdrop-blur-sm transition"
            :class="
              store.theme === 'light'
                ? 'border-slate-300 bg-white/80 text-slate-800 hover:bg-white'
                : 'border-white/30 bg-white/5 text-slate-100 hover:bg-white/15'
            "
            @click="backToHub"
          >
            {{ store.t.backHub }}
          </button>

          <!-- Auto-rotate toggle -->
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm backdrop-blur-sm transition"
            :class="
              autoRotate
                ? store.theme === 'light'
                  ? 'border-teal-400/70 bg-teal-50/90 text-teal-800 hover:bg-teal-100/90'
                  : 'border-teal-400/50 bg-teal-900/40 text-teal-200 hover:bg-teal-800/50'
                : store.theme === 'light'
                  ? 'border-slate-300 bg-white/80 text-slate-500 hover:bg-white'
                  : 'border-white/30 bg-white/5 text-slate-400 hover:bg-white/15'
            "
            :title="autoRotate ? '停止旋转' : '自动旋转'"
            @click="autoRotate = !autoRotate; resetIdleTimer()"
          >
            <svg
              class="h-4 w-4 transition-transform"
              :class="autoRotate ? 'animate-spin-slow' : ''"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path d="M21 12a9 9 0 1 1-9-9" stroke-linecap="round" />
              <polyline points="21 3 21 9 15 9" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="hidden sm:inline">{{ autoRotate ? '旋转中' : '已暂停' }}</span>
          </button>
        </div>
        <p
          class="hidden max-w-[45%] truncate rounded-full border px-3 py-1 text-xs sm:block"
          :class="store.theme === 'light' ? 'border-slate-200 bg-white/70 text-slate-700' : 'border-white/20 text-cyan-200'"
        >
          {{ templateName }}
        </p>
      </div>
    </Transition>

    <section class="absolute inset-0">
      <AtelierScene :layer-depth="store.layerDepth" :max-layers="store.maxLayers" :theme="store.theme" :auto-rotate="autoRotate" />
    </section>

    <section class="pointer-events-none absolute inset-0 z-20">
      <div
        v-if="store.healthTipVisible"
        class="pointer-events-auto absolute left-1/2 top-16 z-30 -translate-x-1/2 rounded-xl border border-amber-200/60 bg-amber-50/95 px-4 py-2 text-sm text-amber-900 shadow-soft"
      >
        {{ store.t.healthyReminder }}
      </div>

      <!-- Left: tablet-style vertical tool rail -->
      <Transition
        enter-active-class="transition-all duration-500 ease-out"
        enter-from-class="-translate-x-full opacity-0"
        enter-to-class="translate-x-0 opacity-100"
        leave-active-class="transition-all duration-500 ease-out"
        leave-from-class="translate-x-0 opacity-100"
        leave-to-class="-translate-x-full opacity-0"
      >
        <div
          v-show="uiVisible"
          class="pointer-events-auto absolute left-3 top-1/2 z-30 flex max-h-[min(72vh,32rem)] w-[3.25rem] -translate-y-1/2 flex-col sm:left-5 sm:w-[3.5rem]"
        >
          <div
            class="flex flex-col gap-1 rounded-2xl p-1.5 backdrop-blur-md"
            :class="dockClass"
          >
            <p
              class="mb-0.5 px-0.5 text-center text-[0.6rem] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              {{ store.t.atelierTools }}
            </p>
            <button
              v-for="id in carvingToolIds"
              :key="id"
              type="button"
              class="flex h-11 w-full flex-col items-center justify-center rounded-xl text-[0.65rem] font-medium leading-tight transition-all duration-200 sm:h-12 sm:text-[0.7rem]"
              :class="toolBtnClass(id)"
              :aria-pressed="store.carvingTool === id"
              @click="
                store.setCarvingTool(id);
                resetIdleTimer()
              "
            >
              <!-- inline icons: note-app style -->
              <span class="mb-0.5 flex h-5 w-5 items-center justify-center" aria-hidden="true">
                <svg v-if="id === 'sculpt'" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                  <circle cx="12" cy="12" r="6.5" />
                  <path d="M12 5.5v13" />
                </svg>
                <svg v-else-if="id === 'relief'" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                  <path d="M4 18h16M4 14l4-6 4 4 4-8 4 6" />
                </svg>
                <svg v-else-if="id === 'perforate'" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                  <circle cx="12" cy="12" r="8.5" />
                  <circle cx="12" cy="12" r="3.2" />
                </svg>
                <svg v-else-if="id === 'polish'" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                  <path d="M12 3l1.8 5.5h5.7l-4.6 3.4 1.8 5.5-4.7-3.4-4.7 3.4 1.8-5.5-4.6-3.4h5.7z" />
                </svg>
                <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                  <path d="M4 8h16M4 12h16M4 16h16" />
                  <path d="M8 4v16M16 4v16" opacity="0.35" />
                </svg>
              </span>
              <span class="max-w-[2.6rem] text-center leading-none">{{ carvingToolLabel(id) }}</span>
            </button>

            <div
              class="mt-1 border-t pt-2"
              :class="store.theme === 'light' ? 'border-slate-200/80' : 'border-white/10'"
            >
              <label class="mb-1 block text-center text-[0.6rem] text-slate-500 dark:text-slate-400">{{ store.t.toolPressure }}</label>
              <input
                class="h-2 w-full cursor-pointer accent-teal-600"
                type="range"
                min="0"
                max="100"
                :value="store.carvingPressure"
                @input="
                  store.setCarvingPressure(Number(($event.target as HTMLInputElement).value));
                  resetIdleTimer()
                "
              />
            </div>
          </div>
        </div>
      </Transition>

      <Transition
        enter-active-class="transition-all duration-500 ease-out"
        enter-from-class="translate-y-full opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition-all duration-500 ease-out"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-full opacity-0"
      >
        <div
          v-show="uiVisible"
          class="pointer-events-auto absolute bottom-0 left-1/2 z-30 flex w-[min(92vw,26rem)] max-w-full -translate-x-1/2 items-center gap-3 rounded-t-2xl border border-b-0 px-4 py-3 backdrop-blur-md sm:bottom-2 sm:rounded-2xl sm:border-b"
          :class="
            store.theme === 'light'
              ? 'border-slate-200/90 bg-white/90 text-slate-800 shadow-[0_-8px_32px_rgba(15,23,42,0.06)] sm:shadow-lg'
              : 'border-white/15 bg-black/45 text-slate-100 shadow-[0_-8px_32px_rgba(0,0,0,0.35)] sm:shadow-xl'
          "
          style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom))"
        >
          <label class="shrink-0 text-xs text-slate-600 dark:text-slate-200">{{ store.t.layerDepth }}</label>
          <input
            class="min-w-0 flex-1 accent-teal-600"
            type="range"
            min="1"
            :max="store.maxLayers"
            :value="store.layerDepth"
            @input="
              store.setLayerDepth(Number(($event.target as HTMLInputElement).value));
              resetIdleTimer()
            "
          />
          <span class="shrink-0 text-xs tabular-nums text-slate-600 dark:text-slate-300"
            >{{ store.layerDepth }}/{{ store.maxLayers }}</span
          >
        </div>
      </Transition>

      <!-- Right bottom: session card (clears PIP at top-right) -->
      <Transition
        enter-active-class="transition-all duration-500 ease-out"
        enter-from-class="translate-x-full opacity-0"
        enter-to-class="translate-x-0 opacity-100"
        leave-active-class="transition-all duration-500 ease-out"
        leave-from-class="translate-x-0 opacity-100"
        leave-to-class="translate-x-full opacity-0"
      >
        <aside
          v-show="uiVisible"
          class="pointer-events-auto absolute right-3 z-30 w-[min(18rem,88vw)] rounded-2xl border p-3 backdrop-blur-md sm:right-5 sm:w-72"
          style="bottom: max(5.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))"
          :class="
            store.theme === 'light'
              ? 'border-slate-200/90 bg-white/92 text-slate-900 shadow-lg'
              : 'border-white/12 bg-slate-950/85 text-white shadow-xl'
          "
        >
          <button
            class="mb-2 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-medium transition"
            :class="
              store.theme === 'light'
                ? 'border-slate-200 hover:bg-slate-50'
                : 'border-white/15 hover:bg-white/10'
            "
            type="button"
            @click="drawerOpen = !drawerOpen"
          >
            <span>{{ store.t.toolDetails }}</span>
            <span class="text-xs text-slate-400 transition-transform" :class="drawerOpen ? 'rotate-180' : ''">▾</span>
          </button>
          <Transition
            enter-active-class="transition-all duration-500 ease-out"
            enter-from-class="max-h-0 opacity-0 -translate-y-1"
            enter-to-class="max-h-[32rem] opacity-100 translate-y-0"
            leave-active-class="transition-all duration-500 ease-out"
            leave-from-class="max-h-[32rem] opacity-100 translate-y-0"
            leave-to-class="max-h-0 opacity-0 -translate-y-1"
          >
            <div v-if="drawerOpen" class="space-y-2 overflow-hidden text-sm">
              <p class="rounded-lg px-2 py-1.5 text-[0.7rem] leading-snug" :class="store.theme === 'light' ? 'bg-amber-50 text-amber-900' : 'bg-amber-950/40 text-amber-100/90'">
                {{ store.t.atelierToolHint }}
              </p>
              <button
                class="w-full rounded-xl border px-3 py-2.5 text-left font-medium transition"
                :class="
                  store.theme === 'light'
                    ? 'border-slate-200 hover:bg-slate-50'
                    : 'border-white/15 hover:bg-white/10'
                "
                type="button"
                :disabled="store.exportState === 'pending'"
                @click="store.triggerExport"
              >
                {{ exportText }}
              </button>
              <p
                class="rounded-lg px-3 py-2 text-xs"
                :class="store.theme === 'light' ? 'bg-slate-100 text-slate-700' : 'bg-white/5 text-slate-200'"
              >
                {{ store.t.collab }}: {{ store.t.collaborator }} L{{ store.collaboratorLayer }}
              </p>
              <p class="rounded-lg bg-white/5 px-3 py-2 text-xs">
                {{ store.t.risk }}:
                <span
                  :class="
                    store.riskLevel === 'warning'
                      ? store.theme === 'light'
                        ? 'text-red-600'
                        : 'text-red-300'
                      : store.theme === 'light'
                        ? 'text-emerald-700'
                        : 'text-emerald-300'
                  "
                >
                  {{ store.riskLevel === 'warning' ? store.t.warning : store.t.safe }}
                </span>
              </p>
              <p class="rounded-lg px-3 py-2 text-xs" :class="store.theme === 'light' ? 'bg-slate-100 text-teal-800' : 'text-cyan-200'">
                {{ store.t.pip }}
              </p>
            </div>
          </Transition>
        </aside>
      </Transition>
    </section>

    <ThemeToggle />
  </main>
</template>
