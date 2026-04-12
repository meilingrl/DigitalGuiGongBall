<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  categoryLabel,
  difficultyColor,
  difficultyLabel,
  type TemplateItem,
} from '../data/content'
import { useAppStore } from '../stores/app'

const props = defineProps<{ item: TemplateItem }>()

const store = useAppStore()
const router = useRouter()

const isActive = computed(() => store.selectedTemplateId === props.item.id)
const localizedName = computed(() => (store.locale === 'zh' ? props.item.nameZh : props.item.nameEn))
const localizedDesc = computed(() => (store.locale === 'zh' ? props.item.descriptionZh : props.item.descriptionEn))
const tags = computed(() => (store.locale === 'zh' ? props.item.tagsZh : props.item.tagsEn))

const styleLabel = computed(() => {
  const map = {
    zh: { traditional: '传统', modern: '现代', mixed: '融合' },
    en: { traditional: 'Traditional', modern: 'Modern', mixed: 'Fusion' },
  }
  return map[store.locale][props.item.style]
})

const styleColor = computed(() => ({
  traditional: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40',
  modern: 'text-indigo-700 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-950/40',
  mixed: 'text-violet-700 bg-violet-50 dark:text-violet-300 dark:bg-violet-950/40',
}[props.item.style]))

function startCarving() {
  store.selectTemplate(props.item.id)
  router.push('/atelier')
}

function fmt(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n)
}
</script>

<template>
  <article
    class="group flex flex-col rounded-2xl border bg-white p-5 shadow-soft transition hover:-translate-y-0.5 dark:bg-slate-900"
    :class="
      isActive
        ? 'border-teal-600 ring-1 ring-teal-500/40 dark:border-teal-500'
        : 'border-slate-200 hover:border-teal-200 dark:border-slate-800 dark:hover:border-teal-800'
    "
  >
    <!-- Top row: name + layer count -->
    <div class="mb-3 flex items-start justify-between gap-2">
      <div class="flex-1 min-w-0">
        <div class="mb-1 flex flex-wrap items-center gap-1.5">
          <span
            v-if="item.featured"
            class="rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"
          >
            {{ store.t.workshopFeatured }}
          </span>
          <span
            v-if="item.isNew"
            class="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
          >
            {{ store.t.workshopNew }}
          </span>
        </div>
        <h3 class="text-base font-semibold leading-tight text-slate-900 dark:text-white">{{ localizedName }}</h3>
      </div>
      <span class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {{ item.layers }} {{ store.t.layers }}
      </span>
    </div>

    <!-- Description -->
    <p class="mb-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">{{ localizedDesc }}</p>

    <!-- Difficulty + Style + Category chips -->
    <div class="mb-3 flex flex-wrap gap-1.5">
      <span class="rounded-full px-2 py-0.5 text-[11px] font-medium" :class="difficultyColor(item.difficulty)">
        {{ difficultyLabel(item.difficulty, store.locale) }}
      </span>
      <span class="rounded-full px-2 py-0.5 text-[11px] font-medium" :class="styleColor">
        {{ styleLabel }}
      </span>
      <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        {{ categoryLabel(item.category, store.locale) }}
      </span>
    </div>

    <!-- Tags -->
    <div class="mb-4 flex flex-wrap gap-1">
      <span
        v-for="tag in tags"
        :key="tag"
        class="rounded px-1.5 py-0.5 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800/60 dark:text-slate-500"
      >
        # {{ tag }}
      </span>
    </div>

    <!-- Stats row -->
    <div class="mb-4 flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
      <span>
        <span class="tabular-nums font-medium text-slate-600 dark:text-slate-300">{{ fmt(item.likes) }}</span>
        {{ store.t.workshopLikes }}
      </span>
      <span>
        <span class="tabular-nums font-medium text-slate-600 dark:text-slate-300">{{ fmt(item.plays) }}</span>
        {{ store.t.workshopPlays }}
      </span>
      <span class="ml-auto">
        ~{{ item.estimatedMin }} {{ store.t.workshopMin }}
      </span>
    </div>

    <!-- CTA -->
    <button
      class="mt-auto w-full rounded-xl border px-3 py-2 text-sm font-medium transition"
      :class="
        isActive
          ? 'border-teal-600 bg-teal-700 text-white hover:bg-teal-800'
          : 'border-slate-300 text-slate-700 hover:border-teal-700 hover:text-teal-700 dark:border-slate-600 dark:text-slate-200 dark:hover:border-teal-500 dark:hover:text-teal-300'
      "
      type="button"
      @click="startCarving"
    >
      {{ store.t.start }}
    </button>
  </article>
</template>
