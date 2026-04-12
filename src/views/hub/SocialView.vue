<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAppStore } from '../../stores/app'
import { friends, rooms, type FriendStatus } from '../../data/social'
import { difficultyColor, difficultyLabel } from '../../data/content'

const store = useAppStore()
const t = computed(() => store.t)

const activeTab = ref<'friends' | 'rooms'>('friends')

const onlineFriends = computed(() => friends.filter((f) => f.status !== 'offline'))
const offlineFriends = computed(() => friends.filter((f) => f.status === 'offline'))

const statusMeta: Record<FriendStatus, { labelKey: 'socialOnline' | 'socialOffline' | 'socialCarving' | 'socialMuseum' | 'socialIdle'; color: string }> = {
  carving: { labelKey: 'socialCarving', color: 'bg-teal-500' },
  museum: { labelKey: 'socialMuseum', color: 'bg-sky-500' },
  idle: { labelKey: 'socialIdle', color: 'bg-amber-400' },
  offline: { labelKey: 'socialOffline', color: 'bg-slate-300 dark:bg-slate-600' },
}

const roomStatusMeta = {
  active: { labelKey: 'socialActive' as const, color: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/50' },
  waiting: { labelKey: 'socialWaiting' as const, color: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/50' },
  full: { labelKey: 'socialFull' as const, color: 'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800' },
}

function levelColor(level: number) {
  if (level >= 60) return 'text-rose-600 dark:text-rose-400'
  if (level >= 40) return 'text-amber-600 dark:text-amber-400'
  if (level >= 25) return 'text-sky-600 dark:text-sky-400'
  return 'text-slate-500 dark:text-slate-400'
}
</script>

<template>
  <div>
    <header class="mb-6">
      <p class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ t.social }}</p>
      <h2 class="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{{ t.socialIntro }}</h2>
      <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{{ t.socialBody }}</p>
    </header>

    <!-- Tabs -->
    <div class="mb-6 flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit dark:border-slate-800 dark:bg-slate-900">
      <button
        v-for="tab in (['friends', 'rooms'] as const)"
        :key="tab"
        type="button"
        class="rounded-lg px-4 py-1.5 text-sm font-medium transition"
        :class="
          activeTab === tab
            ? 'bg-white text-slate-900 shadow-soft dark:bg-slate-800 dark:text-white'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
        "
        @click="activeTab = tab"
      >
        {{ tab === 'friends' ? t.socialFriendsTab : t.socialRoomsTab }}
        <span class="ml-1.5 tabular-nums text-xs opacity-60">
          {{ tab === 'friends' ? friends.length : rooms.length }}
        </span>
      </button>
    </div>

    <!-- Friends tab -->
    <div v-if="activeTab === 'friends'" class="space-y-6">

      <!-- Online section -->
      <div>
        <p class="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <span class="h-1.5 w-1.5 rounded-full bg-teal-500 inline-block" />
          {{ t.socialOnline }} · {{ onlineFriends.length }}
        </p>
        <div class="space-y-2">
          <article
            v-for="f in onlineFriends"
            :key="f.id"
            class="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900"
          >
            <!-- Avatar -->
            <div class="relative shrink-0">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                :style="{ backgroundColor: f.avatarColor }"
              >
                {{ f.initials }}
              </div>
              <span
                class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900"
                :class="statusMeta[f.status].color"
              />
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-baseline gap-2">
                <p class="font-medium text-slate-900 dark:text-white truncate">
                  {{ store.locale === 'zh' ? f.nameZh : f.nameEn }}
                </p>
                <span class="text-xs font-semibold shrink-0" :class="levelColor(f.level)">Lv.{{ f.level }}</span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 truncate">
                {{ store.locale === 'zh' ? f.specialtyZh : f.specialtyEn }}
              </p>
              <p v-if="f.currentTemplateZh" class="mt-0.5 text-xs text-teal-600 dark:text-teal-400 truncate">
                ✦ {{ store.locale === 'zh' ? f.currentTemplateZh : f.currentTemplateEn }}
              </p>
            </div>

            <!-- Status badge + action -->
            <div class="flex flex-col items-end gap-2 shrink-0">
              <span class="rounded-full px-2 py-0.5 text-[11px] font-medium"
                :class="f.status === 'carving'
                  ? 'text-teal-700 bg-teal-50 dark:text-teal-300 dark:bg-teal-950/50'
                  : f.status === 'museum'
                  ? 'text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-950/50'
                  : 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/50'"
              >
                {{ t[statusMeta[f.status].labelKey] }}
              </span>
              <button
                type="button"
                class="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-teal-600 hover:text-teal-700 transition dark:border-slate-700 dark:text-slate-300"
              >
                {{ t.socialInvite }}
              </button>
            </div>
          </article>
        </div>
      </div>

      <!-- Offline section -->
      <div>
        <p class="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-600">
          <span class="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600 inline-block" />
          {{ t.socialOffline }} · {{ offlineFriends.length }}
        </p>
        <div class="space-y-2">
          <article
            v-for="f in offlineFriends"
            :key="f.id"
            class="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white/70 p-4 dark:border-slate-800/60 dark:bg-slate-900/60 opacity-70"
          >
            <div class="relative shrink-0">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white opacity-60"
                :style="{ backgroundColor: f.avatarColor }"
              >
                {{ f.initials }}
              </div>
              <span class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-slate-300 dark:border-slate-900 dark:bg-slate-600" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-baseline gap-2">
                <p class="font-medium text-slate-500 dark:text-slate-400 truncate">
                  {{ store.locale === 'zh' ? f.nameZh : f.nameEn }}
                </p>
                <span class="text-xs shrink-0 text-slate-400 dark:text-slate-600">Lv.{{ f.level }}</span>
              </div>
              <p class="text-xs text-slate-400 dark:text-slate-600 truncate">
                {{ store.locale === 'zh' ? f.specialtyZh : f.specialtyEn }}
              </p>
            </div>
            <span class="shrink-0 text-xs text-slate-400 dark:text-slate-600">{{ t.socialOffline }}</span>
          </article>
        </div>
      </div>
    </div>

    <!-- Rooms tab -->
    <div v-else class="space-y-4">
      <div class="flex justify-end">
        <button
          type="button"
          class="rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 transition"
        >
          + {{ t.socialCreateRoom }}
        </button>
      </div>

      <article
        v-for="room in rooms"
        :key="room.id"
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"
        :class="room.status === 'full' ? 'opacity-60' : ''"
      >
        <div class="mb-3 flex items-start justify-between gap-3">
          <div>
            <h4 class="font-semibold text-slate-900 dark:text-white">
              {{ store.locale === 'zh' ? room.nameZh : room.nameEn }}
            </h4>
            <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {{ store.locale === 'zh' ? '主持：' + room.hostNameZh : 'Host: ' + room.hostNameEn }}
            </p>
          </div>
          <span class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium" :class="roomStatusMeta[room.status].color">
            {{ t[roomStatusMeta[room.status].labelKey] }}
          </span>
        </div>

        <div class="mb-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>
            {{ store.locale === 'zh' ? '模板：' : 'Template: ' }}
            <span class="font-medium text-slate-700 dark:text-slate-200">
              {{ store.locale === 'zh' ? room.templateZh : room.templateEn }}
            </span>
          </span>
          <span>
            {{ t.socialLayers }}: <span class="font-medium text-slate-700 dark:text-slate-200">{{ room.layerRange }}</span>
          </span>
          <span>
            {{ t.socialMembers }}:
            <span class="tabular-nums font-medium text-slate-700 dark:text-slate-200">{{ room.members }}/{{ room.maxMembers }}</span>
          </span>
          <span v-if="room.startedAgo">
            {{ room.startedAgo }} {{ store.locale === 'zh' ? '分钟前开始' : 'min ago' }}
          </span>
        </div>

        <!-- Difficulty + tags -->
        <div class="mb-4 flex flex-wrap gap-1.5">
          <span class="rounded-full px-2 py-0.5 text-[11px] font-medium" :class="difficultyColor(room.difficulty)">
            {{ difficultyLabel(room.difficulty, store.locale) }}
          </span>
          <span
            v-for="tag in (store.locale === 'zh' ? room.tagsZh : room.tagsEn)"
            :key="tag"
            class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          >
            {{ tag }}
          </span>
        </div>

        <!-- Member pips -->
        <div class="mb-4 flex gap-1">
          <div
            v-for="i in room.maxMembers"
            :key="i"
            class="h-2 flex-1 rounded-full transition"
            :class="i <= room.members ? 'bg-teal-500' : 'bg-slate-100 dark:bg-slate-800'"
          />
        </div>

        <button
          type="button"
          class="w-full rounded-xl border px-4 py-2 text-sm font-medium transition"
          :class="
            room.status === 'full'
              ? 'cursor-not-allowed border-slate-200 text-slate-400 dark:border-slate-700'
              : 'border-teal-600 text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950/30'
          "
          :disabled="room.status === 'full'"
        >
          {{ room.status === 'full' ? (store.locale === 'zh' ? '已满员' : 'Room full') : t.socialJoin }}
        </button>
      </article>
    </div>
  </div>
</template>
