<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { products, type Product, type ProductCategory } from '../../data/mall'
import { useAppStore } from '../../stores/app'
import { usePointsStore } from '../../stores/points'
import { resolvePublicUrl } from '../../utils/publicUrl'

const store = useAppStore()
const pointsStore = usePointsStore()
const t = computed(() => store.t)

// ─── First-visit task ────────────────────────────────────────────────────────
onMounted(() => pointsStore.onMallVisit())

// ─── Points task drawer ──────────────────────────────────────────────────────
const drawerOpen = ref(false)
const claimAnim = ref(false)
const claimedPoints = ref(0)

function openDrawer() { drawerOpen.value = true }
function closeDrawer() { drawerOpen.value = false }

function claimAll() {
  const gained = pointsStore.claimAll()
  claimedPoints.value = gained
  claimAnim.value = true
  setTimeout(() => { claimAnim.value = false }, 1800)
}

function taskStatusClass(completed: boolean, claimed: boolean) {
  if (claimed) return 'text-slate-400 dark:text-slate-600'
  if (completed) return 'text-teal-700 dark:text-teal-400'
  return 'text-slate-400 dark:text-slate-500'
}

function taskLabel(completed: boolean, claimed: boolean) {
  if (claimed) return t.value.mallTaskClaimed
  if (completed) return t.value.mallTaskCompleted
  return t.value.mallTaskPending
}

// Tasks sorted: completed-unclaimed first → pending → claimed (muted, bottom)
const sortedTasks = computed(() =>
  [...pointsStore.tasks].sort((a, b) => {
    const rank = (task: typeof a) => {
      if (task.completed && !task.claimed) return 0
      if (!task.completed) return 1
      return 2
    }
    return rank(a) - rank(b)
  }),
)

// ─── Category filter ─────────────────────────────────────────────────────────
const categories: ProductCategory[] = ['all', 'stationery', 'decor', 'apparel', 'limited']
const activeCat = ref<ProductCategory>('all')

function catLabel(cat: ProductCategory) {
  const map: Record<ProductCategory, string> = {
    all: t.value.mallCategoryAll,
    stationery: t.value.mallCategoryStationery,
    decor: t.value.mallCategoryDecor,
    apparel: t.value.mallCategoryApparel,
    limited: t.value.mallCategoryLimited,
  }
  return map[cat]
}

const filtered = computed(() =>
  activeCat.value === 'all' ? products : products.filter((p) => p.category === activeCat.value),
)

// ─── Product detail ──────────────────────────────────────────────────────────
const selectedProduct = ref<Product | null>(null)
function openProduct(p: Product) { selectedProduct.value = p }
function backToList() {
  selectedProduct.value = null
  redeemState.value = 'idle'
}

// ─── Redeem flow ─────────────────────────────────────────────────────────────
type RedeemState = 'idle' | 'confirm' | 'success'
const redeemState = ref<RedeemState>('idle')

function canRedeem(p: Product) {
  return p.stock > 0 && pointsStore.balance >= p.points
}

function openConfirm() { redeemState.value = 'confirm' }
function cancelConfirm() { redeemState.value = 'idle' }
function confirmRedeem() {
  if (!selectedProduct.value) return
  const ok = pointsStore.spend(selectedProduct.value.points)
  if (ok) redeemState.value = 'success'
}

function productName(p: Product) { return store.locale === 'zh' ? p.nameZh : p.nameEn }
function productDesc(p: Product) { return store.locale === 'zh' ? p.descZh : p.descEn }

function fillRedeemMsg(p: Product) {
  return t.value.mallRedeemConfirmMsg
    .replace('{points}', String(p.points))
    .replace('{name}', productName(p))
}

function productImage(p: Product) {
  return resolvePublicUrl(p.image)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header + Points card row -->
    <div class="flex flex-wrap items-start justify-between gap-4">
      <header>
        <p class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ t.mall }}</p>
        <h2 class="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{{ t.mallIntro }}</h2>
        <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{{ t.mallBody }}</p>
      </header>

      <!-- Points card -->
      <div
        class="flex shrink-0 items-center gap-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 px-4 py-3 shadow-soft dark:border-amber-800/40 dark:from-amber-950/30 dark:to-orange-950/20"
      >
        <svg class="h-8 w-8 text-amber-500 dark:text-amber-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.93V18a1 1 0 0 1-2 0v-1.07A6 6 0 0 1 6 11a1 1 0 0 1 2 0 4 4 0 0 0 8 0 1 1 0 0 1 2 0 6 6 0 0 1-5 5.93zM12 8a2 2 0 1 1 2-2 2 2 0 0 1-2 2z"/>
        </svg>
        <div>
          <p class="text-xs text-amber-700 dark:text-amber-400">{{ t.mallMyPoints }}</p>
          <p class="text-2xl font-bold text-amber-900 dark:text-amber-300 leading-none">{{ pointsStore.balance }}</p>
        </div>
        <button
          type="button"
          class="relative ml-2 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 transition hover:bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/60"
          @click="openDrawer"
        >
          {{ t.mallTasksBtn }}
          <!-- Unclaimed badge -->
          <span
            v-if="pointsStore.hasUnclaimed"
            class="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white"
          >!</span>
        </button>
      </div>
    </div>

    <!-- ── Product detail page ────────────────────────────────────────────── -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
      mode="out-in"
    >
      <!-- Detail view -->
      <div v-if="selectedProduct" :key="selectedProduct.id" class="space-y-4">
        <button
          type="button"
          class="flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-200"
          @click="backToList"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {{ store.locale === 'zh' ? '返回商品列表' : 'Back to products' }}
        </button>

        <!-- Success state -->
        <div
          v-if="redeemState === 'success'"
          class="flex flex-col items-center gap-4 rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 to-green-50 py-14 text-center dark:border-teal-800 dark:from-teal-950/40 dark:to-green-950/20"
        >
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-4xl dark:bg-teal-950/60">✓</div>
          <h3 class="font-display text-xl font-semibold text-teal-900 dark:text-teal-200">{{ t.mallRedeemSuccessTitle }}</h3>
          <p class="max-w-xs text-sm text-slate-600 dark:text-slate-400">{{ t.mallRedeemSuccessMsg }}</p>
          <div class="mt-2 flex gap-3">
            <button
              type="button"
              class="rounded-xl bg-teal-800 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-900 dark:bg-teal-600"
              @click="backToList"
            >{{ t.mallContinue }}</button>
          </div>
        </div>

        <!-- Confirm modal (inline) -->
        <div
          v-else-if="redeemState === 'confirm'"
          class="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-700 dark:bg-slate-900"
        >
          <h3 class="font-display text-lg font-semibold text-slate-900 dark:text-white">{{ t.mallRedeemConfirmTitle }}</h3>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">{{ fillRedeemMsg(selectedProduct) }}</p>
          <div class="mt-3 flex items-center gap-2 text-sm">
            <span class="text-slate-500 dark:text-slate-400">{{ t.mallRedeemAfter }}:</span>
            <span class="font-semibold text-amber-700 dark:text-amber-400">
              {{ pointsStore.balance - selectedProduct.points }}
            </span>
          </div>
          <div class="mt-5 flex gap-3">
            <button
              type="button"
              class="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300"
              @click="cancelConfirm"
            >{{ t.mallCancel }}</button>
            <button
              type="button"
              class="flex-1 rounded-xl bg-teal-800 py-2.5 text-sm font-medium text-white transition hover:bg-teal-900 dark:bg-teal-600"
              @click="confirmRedeem"
            >{{ t.mallConfirm }}</button>
          </div>
        </div>

        <!-- Product detail card -->
        <div v-else class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <!-- Product cover -->
          <div
            class="flex aspect-[3/1] items-center justify-center bg-gradient-to-br"
            :class="selectedProduct.accentColor"
          >
            <img
              :src="productImage(selectedProduct)"
              :alt="productName(selectedProduct)"
              class="h-full w-full object-cover"
              loading="lazy"
              draggable="false"
            />
          </div>
          <div class="p-6 space-y-4">
            <div>
              <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {{ catLabel(selectedProduct.category) }}
              </span>
              <h3 class="font-display mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                {{ productName(selectedProduct) }}
              </h3>
            </div>
            <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{{ productDesc(selectedProduct) }}</p>
            <div class="flex items-center gap-6 text-sm">
              <div>
                <p class="text-xs text-slate-400 dark:text-slate-500">{{ t.mallPointsPrice }}</p>
                <p class="text-xl font-bold text-amber-700 dark:text-amber-400">{{ selectedProduct.points }} <span class="text-xs font-normal">pts</span></p>
              </div>
              <div>
                <p class="text-xs text-slate-400 dark:text-slate-500">{{ t.mallStock }}</p>
                <p class="font-medium text-slate-800 dark:text-slate-200">{{ selectedProduct.stock }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-400 dark:text-slate-500">{{ t.mallMyPoints }}</p>
                <p class="font-medium" :class="pointsStore.balance >= selectedProduct.points ? 'text-teal-700 dark:text-teal-400' : 'text-rose-500'">
                  {{ pointsStore.balance }}
                </p>
              </div>
            </div>

            <button
              type="button"
              class="w-full rounded-xl py-2.5 text-sm font-medium transition"
              :class="canRedeem(selectedProduct)
                ? 'bg-teal-800 text-white hover:bg-teal-900 dark:bg-teal-600 dark:hover:bg-teal-500'
                : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'"
              :disabled="!canRedeem(selectedProduct)"
              @click="canRedeem(selectedProduct) && openConfirm()"
            >
              {{ selectedProduct.stock === 0 ? t.mallOutOfStock : !canRedeem(selectedProduct) ? t.mallRedeemDisabled : t.mallRedeemBtn }}
            </button>
          </div>
        </div>
      </div>

      <!-- Product list -->
      <div v-else key="list" class="space-y-5">
        <!-- Category tabs -->
        <div class="flex flex-wrap gap-2">
          <button
            v-for="cat in categories"
            :key="cat"
            type="button"
            class="rounded-full px-3.5 py-1 text-xs font-medium transition"
            :class="activeCat === cat
              ? 'bg-teal-700 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'"
            @click="activeCat = cat"
          >
            {{ catLabel(cat) }}
          </button>
        </div>

        <!-- Products grid -->
        <div class="container-grid content-grid">
          <article
            v-for="p in filtered"
            :key="p.id"
            class="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft transition hover:border-teal-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-teal-800"
            @click="openProduct(p)"
          >
            <!-- Accent cover -->
            <div
              class="flex aspect-[2/1] items-center justify-center bg-gradient-to-br"
              :class="p.accentColor"
            >
              <img
                :src="productImage(p)"
                :alt="productName(p)"
                class="h-full w-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
                draggable="false"
              />
            </div>
            <div class="p-4">
              <div class="mb-1 flex items-center justify-between">
                <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {{ catLabel(p.category) }}
                </span>
                <span v-if="p.stock <= 10 && p.stock > 0" class="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                  {{ store.locale === 'zh' ? `仅剩 ${p.stock}` : `${p.stock} left` }}
                </span>
                <span v-else-if="p.stock === 0" class="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                  {{ t.mallOutOfStock }}
                </span>
              </div>
              <h4 class="font-display mt-1 text-sm font-semibold text-slate-900 group-hover:text-teal-800 dark:text-white dark:group-hover:text-teal-300">
                {{ productName(p) }}
              </h4>
              <p class="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{{ productDesc(p) }}</p>
              <div class="mt-3 flex items-center justify-between">
                <span class="text-base font-bold text-amber-700 dark:text-amber-400">
                  {{ p.points }} <span class="text-xs font-normal text-amber-600/70 dark:text-amber-500/70">pts</span>
                </span>
                <span
                  class="rounded-lg px-2.5 py-1 text-xs font-medium transition"
                  :class="p.stock === 0
                    ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                    : pointsStore.balance >= p.points
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'"
                >
                  {{ p.stock === 0 ? t.mallOutOfStock : pointsStore.balance >= p.points ? t.mallRedeemBtn : t.mallRedeemDisabled }}
                </span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </Transition>

    <!-- ── Points Task Drawer ─────────────────────────────────────────────── -->
    <Teleport to="body">
      <!-- Backdrop -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="drawerOpen"
          class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          @click="closeDrawer"
        />
      </Transition>

      <!-- Drawer panel -->
      <Transition
        enter-active-class="transition duration-250 ease-out"
        enter-from-class="translate-x-full opacity-0"
        enter-to-class="translate-x-0 opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="translate-x-0 opacity-100"
        leave-to-class="translate-x-full opacity-0"
      >
        <div
          v-if="drawerOpen"
          class="fixed right-0 top-0 z-50 flex h-full w-full max-w-xs flex-col bg-white shadow-2xl dark:bg-slate-900"
        >
          <!-- Drawer header -->
          <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h3 class="font-display text-base font-semibold text-slate-900 dark:text-white">{{ t.mallTasksTitle }}</h3>
            <button
              type="button"
              class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              @click="closeDrawer"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Task list -->
          <div class="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <div
              v-for="task in sortedTasks"
              :key="task.id"
              class="flex items-center gap-3 rounded-xl border p-3.5 transition-opacity"
              :class="task.claimed
                ? 'border-slate-100 bg-slate-50/40 opacity-50 dark:border-slate-800/60 dark:bg-slate-800/20'
                : task.completed
                  ? 'border-teal-200 bg-teal-50/80 dark:border-teal-800/60 dark:bg-teal-950/30'
                  : 'border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900'"
            >
              <!-- Status icon -->
              <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                :class="task.claimed
                  ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                  : task.completed
                    ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'"
              >
                <svg v-if="task.claimed" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <svg v-else-if="task.completed" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </div>

              <!-- Task info -->
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium" :class="taskStatusClass(task.completed, task.claimed)">
                  {{ store.locale === 'zh' ? task.labelZh : task.labelEn }}
                </p>
                <p class="mt-0.5 text-[11px]" :class="task.claimed ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500'">
                  {{ task.claimed ? taskLabel(task.completed, task.claimed) : (store.locale === 'zh' ? task.hintZh : task.hintEn) }}
                </p>
              </div>

              <!-- Points badge -->
              <span
                class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
                :class="task.claimed
                  ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                  : task.completed
                    ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'"
              >
                +{{ task.points }}
              </span>
            </div>
          </div>

          <!-- Footer -->
          <div class="border-t border-slate-100 p-5 dark:border-slate-800 space-y-3">
            <!-- Pending total -->
            <div class="flex items-center justify-between text-sm">
              <span class="text-slate-500 dark:text-slate-400">{{ t.mallPendingPoints }}</span>
              <span class="font-bold text-teal-700 dark:text-teal-400">+{{ pointsStore.pendingPoints }} pts</span>
            </div>

            <!-- Claim button with animation -->
            <button
              type="button"
              class="relative w-full overflow-hidden rounded-xl py-2.5 text-sm font-medium transition"
              :class="pointsStore.pendingPoints > 0
                ? 'bg-teal-700 text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500'
                : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'"
              :disabled="pointsStore.pendingPoints === 0"
              @click="pointsStore.pendingPoints > 0 && claimAll()"
            >
              <!-- Claim animation overlay -->
              <Transition
                enter-active-class="transition duration-300 ease-out"
                enter-from-class="opacity-0 scale-90"
                enter-to-class="opacity-100 scale-100"
                leave-active-class="transition duration-500 ease-in"
                leave-from-class="opacity-100 scale-100"
                leave-to-class="opacity-0 scale-90"
              >
                <span
                  v-if="claimAnim"
                  class="absolute inset-0 flex items-center justify-center bg-teal-600 text-white font-semibold"
                >
                  +{{ claimedPoints }} pts ✓
                </span>
              </Transition>
              <span :class="claimAnim ? 'invisible' : ''">{{ t.mallClaimAll }}</span>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
