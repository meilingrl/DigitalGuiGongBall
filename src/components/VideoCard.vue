<script setup lang="ts">
import { ref, nextTick, onUnmounted } from 'vue'

// ─── Props ────────────────────────────────────────────────────────────────────
const props = withDefaults(
  defineProps<{
    /** 视频标题（已由父级完成国际化） */
    title: string
    /** 时长文本，如 "05:12" */
    duration: string
    /** 描述文本（已由父级完成国际化） */
    desc: string
    /** 封面图路径（相对 /public），缺省时显示渐变占位 */
    poster?: string
    /** 微缩预览视频路径（相对 /public），缺省时禁用悬停预览逻辑 */
    preview?: string
    /** 观看按钮文案，由父级注入 i18n 值 */
    watchLabel?: string
  }>(),
  { watchLabel: 'Watch' },
)

// ─── 悬停状态机 ───────────────────────────────────────────────────────────────
//
//  idle  →(mouseenter + 300ms 防误触)→  active  →(mouseleave)→  fading  →(150ms)→  idle
//          clearTimeout 可在任意阶段将流程回退
//
const videoRef = ref<HTMLVideoElement | null>(null)

/** 防误触计时器句柄 */
const hoverTimer = ref<ReturnType<typeof setTimeout> | null>(null)
/** 淡出结束后卸载 video DOM 的计时器句柄 */
const fadeOutTimer = ref<ReturnType<typeof setTimeout> | null>(null)

/** true = <video> DOM 已挂载（v-if 门控） */
const isHoverConfirmed = ref(false)
/** true = 视频层不透明，封面层透明（CSS opacity 过渡驱动） */
const isVideoVisible = ref(false)

/** 确认悬停后激活视频播放，处理浏览器 autoplay 策略异常 */
async function activateVideo() {
  isHoverConfirmed.value = true
  await nextTick() // 等待 <video> DOM 挂载完成
  isVideoVisible.value = true
  try {
    await videoRef.value?.play()
  } catch {
    // muted 视频的 autoplay 通常被允许，此处静默捕获极端情况
  }
}

function onMouseEnter() {
  if (!props.preview) return

  // 若正处于淡出阶段（用户快速移回），撤销淡出并直接恢复
  if (fadeOutTimer.value !== null) {
    clearTimeout(fadeOutTimer.value)
    fadeOutTimer.value = null
    isVideoVisible.value = true
    videoRef.value?.play().catch(() => {})
    return
  }

  // 已处于活跃态（hover 确认后又快速移出再移入）
  if (isHoverConfirmed.value) {
    isVideoVisible.value = true
    videoRef.value?.play().catch(() => {})
    return
  }

  // 启动 300ms 防误触延迟，避免快速划过触发不必要的资源请求
  hoverTimer.value = setTimeout(() => {
    hoverTimer.value = null
    activateVideo()
  }, 300)
}

function onMouseLeave() {
  // 若计时器尚未触发，直接取消，不挂载 video
  if (hoverTimer.value !== null) {
    clearTimeout(hoverTimer.value)
    hoverTimer.value = null
    return
  }

  if (!isHoverConfirmed.value) return

  // 触发透明度淡出过渡（CSS duration-150）
  isVideoVisible.value = false

  // 等待过渡完成后重置首帧并卸载 video DOM
  fadeOutTimer.value = setTimeout(() => {
    if (videoRef.value) {
      videoRef.value.pause()
      videoRef.value.currentTime = 0
    }
    isHoverConfirmed.value = false
    fadeOutTimer.value = null
  }, 150)
}

// 组件销毁时清理所有挂起的计时器，防止内存泄漏
onUnmounted(() => {
  if (hoverTimer.value !== null) clearTimeout(hoverTimer.value)
  if (fadeOutTimer.value !== null) clearTimeout(fadeOutTimer.value)
})
</script>

<template>
  <!--
    容器：开启 inline-size 容器查询上下文（container-grid），
    使卡片内部元素可响应自身宽度而非视口宽度。
    鼠标事件仅在有 preview 路径时才真正触发逻辑。
  -->
  <article
    class="container-grid group overflow-hidden rounded-2xl border border-slate-200 bg-white
           shadow-soft transition-[border-color,box-shadow] duration-200
           hover:border-teal-200/70 hover:shadow-md
           dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-900/60"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >

    <!-- ── 媒体容器 ──────────────────────────────────────────────────────────
         aspect-video = aspect-ratio: 16/9，确保任意宽度下比例不失真。
         overflow-hidden 防止绝对定位子元素溢出圆角。
         bg-slate-900 作为兜底背景，消除封面→视频过渡间隙的白色闪烁。
    ─────────────────────────────────────────────────────────────────────── -->
    <div class="relative aspect-video overflow-hidden bg-slate-900">

      <!-- 层 1：封面图（始终存在，poster 缺省时隐藏此层，渐变占位层接管） -->
      <img
        v-if="poster"
        :src="poster"
        :alt="title"
        loading="lazy"
        draggable="false"
        class="absolute inset-0 h-full w-full object-cover transition-opacity duration-200"
        :class="isVideoVisible ? 'opacity-0' : 'opacity-100'"
      />

      <!-- 封面缺省时的渐变占位（向后兼容现有样式，保持与展览卡片一致） -->
      <div
        v-else
        class="absolute inset-0 bg-gradient-to-t from-black/60 via-slate-800/40 to-slate-700/20"
      />

      <!-- 层 2：预览视频
           v-if 双重门控：isHoverConfirmed（hover 确认）AND preview（路径存在）。
           preload="none" 禁止浏览器在赋值 src 前预取资源。
           muted + loop + playsinline 满足主流浏览器 autoplay 策略要求。
      -->
      <video
        v-if="isHoverConfirmed && preview"
        ref="videoRef"
        :src="preview"
        preload="none"
        muted
        loop
        playsinline
        aria-hidden="true"
        class="absolute inset-0 h-full w-full object-cover transition-opacity duration-150"
        :class="isVideoVisible ? 'opacity-100' : 'opacity-0'"
      />

      <!-- 层 3：UI 覆盖物（播放图标）
           视频播放时淡出（opacity-0 + pointer-events-none 防止误触）。
           group-hover:scale-105 提供轻微缩放反馈，增强操作感知。
      -->
      <div
        class="absolute inset-0 flex items-center justify-center
               transition-opacity duration-200"
        :class="isVideoVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'"
      >
        <button
          type="button"
          class="flex h-14 w-14 items-center justify-center rounded-full
                 bg-white/95 text-teal-800 shadow-lg
                 transition-transform duration-200 group-hover:scale-105
                 dark:bg-slate-100 dark:text-teal-900"
          :aria-label="watchLabel"
        >
          <svg class="ml-0.5 h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>

      <!-- 时长角标（始终显示在右下角，不参与过渡） -->
      <span
        class="absolute bottom-2 right-2 rounded bg-black/60
               px-2 py-0.5 text-[11px] font-medium text-white"
      >
        {{ duration }}
      </span>
    </div>

    <!-- ── 文字信息区 ─────────────────────────────────────────────────────── -->
    <div class="p-4">
      <h4 class="font-display text-base font-semibold leading-snug text-slate-900 dark:text-white">
        {{ title }}
      </h4>
      <p class="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        {{ desc }}
      </p>
      <button
        type="button"
        class="mt-3 text-sm font-medium text-teal-700 transition-colors
               hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-200"
      >
        {{ watchLabel }}
      </button>
    </div>
  </article>
</template>
