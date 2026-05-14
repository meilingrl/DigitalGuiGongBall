<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { products, type Product, type ProductCategory } from '../../data/mall'
import { useAppStore } from '../../stores/app'
import { usePointsStore } from '../../stores/points'
import { resolvePublicUrl } from '../../utils/publicUrl'

interface ShippingAddress {
  recipient: string
  phone: string
  region: string
  detail: string
  note: string
}

interface MallOrder {
  id: string
  productId: string
  productNameZh: string
  productNameEn: string
  points: number
  status: 'pending'
  createdAt: string
  address: ShippingAddress
}

type RedeemState = 'detail' | 'address' | 'confirm' | 'success'

const store = useAppStore()
const pointsStore = usePointsStore()
const t = computed(() => store.t)

onMounted(() => pointsStore.onMallVisit())

const drawerOpen = ref(false)
const claimAnim = ref(false)
const claimedPoints = ref(0)
const activeCat = ref<ProductCategory>('all')
const selectedProduct = ref<Product | null>(null)
const redeemState = ref<RedeemState>('detail')
const orders = ref<MallOrder[]>([])
const inventory = reactive(
  Object.fromEntries(products.map((product) => [product.id, product.stock])) as Record<string, number>,
)
const addressForm = reactive<ShippingAddress>({
  recipient: '',
  phone: '',
  region: '',
  detail: '',
  note: '',
})
const addressErrors = reactive<Record<keyof ShippingAddress, string>>({
  recipient: '',
  phone: '',
  region: '',
  detail: '',
  note: '',
})
const latestOrder = ref<MallOrder | null>(null)

const categories: ProductCategory[] = ['all', 'stationery', 'decor', 'apparel', 'limited']
const stepLabels = computed(() => [
  t.value.mallStep1,
  t.value.mallStep2,
  t.value.mallStep3,
  t.value.mallStep4,
])

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

const orderList = computed(() => [...orders.value].reverse())

function productStock(product: Product) {
  return inventory[product.id] ?? product.stock
}

function canRedeem(product: Product) {
  return productStock(product) > 0 && pointsStore.balance >= product.points
}

function productName(product: Product) {
  return store.locale === 'zh' ? product.nameZh : product.nameEn
}

function productDesc(product: Product) {
  return store.locale === 'zh' ? product.descZh : product.descEn
}

function productImage(product: Product) {
  return resolvePublicUrl(product.image)
}

function openProduct(product: Product) {
  selectedProduct.value = product
  redeemState.value = 'detail'
  latestOrder.value = null
  resetAddressErrors()
}

function backToList() {
  selectedProduct.value = null
  redeemState.value = 'detail'
  latestOrder.value = null
  resetAddressForm()
  resetAddressErrors()
}

function resetAddressForm() {
  addressForm.recipient = ''
  addressForm.phone = ''
  addressForm.region = ''
  addressForm.detail = ''
  addressForm.note = ''
}

function resetAddressErrors() {
  addressErrors.recipient = ''
  addressErrors.phone = ''
  addressErrors.region = ''
  addressErrors.detail = ''
  addressErrors.note = ''
}

function validateAddress() {
  resetAddressErrors()

  const recipient = addressForm.recipient.trim()
  const phone = addressForm.phone.trim()
  const region = addressForm.region.trim()
  const detail = addressForm.detail.trim()
  const phoneOk = /^1\d{10}$/.test(phone)

  if (!recipient) addressErrors.recipient = t.value.mallAddressErrorRequired
  if (!phone) {
    addressErrors.phone = t.value.mallAddressErrorRequired
  } else if (!phoneOk) {
    addressErrors.phone = t.value.mallAddressErrorPhone
  }
  if (!region) addressErrors.region = t.value.mallAddressErrorRequired
  if (!detail) {
    addressErrors.detail = t.value.mallAddressErrorRequired
  } else if (detail.length < 5) {
    addressErrors.detail = t.value.mallAddressErrorDetail
  }

  return !addressErrors.recipient && !addressErrors.phone && !addressErrors.region && !addressErrors.detail
}

function continueToAddress() {
  if (!selectedProduct.value || !canRedeem(selectedProduct.value)) return
  redeemState.value = 'address'
}

function continueToConfirm() {
  if (!selectedProduct.value) return
  if (validateAddress()) redeemState.value = 'confirm'
}

function returnToDetail() {
  redeemState.value = 'detail'
}

function returnToAddress() {
  redeemState.value = 'address'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(store.locale === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function orderName(order: MallOrder) {
  return store.locale === 'zh' ? order.productNameZh : order.productNameEn
}

function orderStatusLabel(order: MallOrder) {
  return order.status === 'pending' ? t.value.mallOrderStatusPending : t.value.mallOrderStatusPending
}

function addressSummary(address: ShippingAddress) {
  return `${address.region} ${address.detail}`.trim()
}

function fillRedeemMsg(product: Product) {
  return t.value.mallRedeemConfirmMsg
    .replace('{points}', String(product.points))
    .replace('{name}', productName(product))
}

function placeOrder() {
  const product = selectedProduct.value
  if (!product) return
  if (!validateAddress()) {
    redeemState.value = 'address'
    return
  }
  if (!canRedeem(product)) return

  const ok = pointsStore.spend(product.points)
  if (!ok) return

  inventory[product.id] = Math.max(0, productStock(product) - 1)
  const createdAt = new Date().toISOString()
  const order: MallOrder = {
    id: `MG-${Date.now().toString().slice(-6)}`,
    productId: product.id,
    productNameZh: product.nameZh,
    productNameEn: product.nameEn,
    points: product.points,
    status: 'pending',
    createdAt,
    address: {
      recipient: addressForm.recipient.trim(),
      phone: addressForm.phone.trim(),
      region: addressForm.region.trim(),
      detail: addressForm.detail.trim(),
      note: addressForm.note.trim(),
    },
  }

  orders.value.push(order)
  latestOrder.value = order
  redeemState.value = 'success'
}

const currentStep = computed(() => {
  if (redeemState.value === 'address') return 2
  if (redeemState.value === 'confirm') return 3
  if (redeemState.value === 'success') return 4
  return 1
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <header>
        <p class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ t.mall }}</p>
        <h2 class="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{{ t.mallIntro }}</h2>
        <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{{ t.mallBody }}</p>
      </header>

      <div
        class="flex shrink-0 items-center gap-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 px-4 py-3 shadow-soft dark:border-amber-800/40 dark:from-amber-950/30 dark:to-orange-950/20"
      >
        <svg class="h-8 w-8 text-amber-500 dark:text-amber-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.93V18a1 1 0 0 1-2 0v-1.07A6 6 0 0 1 6 11a1 1 0 0 1 2 0 4 4 0 0 0 8 0 1 1 0 0 1 2 0 6 6 0 0 1-5 5.93zM12 8a2 2 0 1 1 2-2 2 2 0 0 1-2 2z"/>
        </svg>
        <div>
          <p class="text-xs text-amber-700 dark:text-amber-400">{{ t.mallMyPoints }}</p>
          <p class="text-2xl font-bold leading-none text-amber-900 dark:text-amber-300">{{ pointsStore.balance }}</p>
        </div>
        <button
          type="button"
          class="relative ml-2 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 transition hover:bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/60"
          @click="openDrawer"
        >
          {{ t.mallTasksBtn }}
          <span
            v-if="pointsStore.hasUnclaimed"
            class="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white"
          >!</span>
        </button>
      </div>
    </div>

    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-display text-lg font-semibold text-slate-900 dark:text-white">{{ t.mallOrdersTitle }}</h3>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t.mallOrdersSubtitle }}</p>
        </div>
        <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {{ orderList.length }} {{ store.locale === 'zh' ? '单' : 'orders' }}
        </span>
      </div>

      <div v-if="orderList.length === 0" class="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        {{ t.mallOrdersEmpty }}
      </div>

      <div v-else class="mt-4 grid gap-3">
        <article
          v-for="order in orderList"
          :key="order.id"
          class="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ orderName(order) }}</p>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ t.mallOrderId }}: {{ order.id }}</p>
            </div>
            <span class="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              {{ orderStatusLabel(order) }}
            </span>
          </div>
          <div class="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300 md:grid-cols-2">
            <p>{{ t.mallPointsPrice }}: <span class="font-semibold text-amber-700 dark:text-amber-400">{{ order.points }} pts</span></p>
            <p>{{ t.mallOrderTime }}: <span class="font-medium">{{ formatDate(order.createdAt) }}</span></p>
            <p>{{ t.mallAddressRecipient }}: <span class="font-medium">{{ order.address.recipient }}</span></p>
            <p>{{ t.mallAddressSummary }}: <span class="font-medium">{{ addressSummary(order.address) }}</span></p>
          </div>
        </article>
      </div>
    </section>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
      mode="out-in"
    >
      <div v-if="selectedProduct" :key="selectedProduct.id" class="space-y-4">
        <button
          type="button"
          class="flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-200"
          @click="backToList"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {{ t.mallBackToProducts }}
        </button>

        <div class="flex flex-wrap gap-2">
          <div
            v-for="(label, index) in stepLabels"
            :key="label"
            class="flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
            :class="currentStep >= index + 1 ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'"
          >
            <span>{{ index + 1 }}</span>
            <span>{{ label }}</span>
          </div>
        </div>

        <div
          v-if="redeemState === 'success' && latestOrder"
          class="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 to-green-50 p-6 text-center dark:border-teal-800 dark:from-teal-950/40 dark:to-green-950/20"
        >
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-4xl dark:bg-teal-950/60">✓</div>
          <h3 class="mt-4 font-display text-xl font-semibold text-teal-900 dark:text-teal-200">{{ t.mallRedeemSuccessTitle }}</h3>
          <p class="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">{{ t.mallRedeemSuccessMsg }}</p>
          <div class="mx-auto mt-6 grid max-w-2xl gap-3 rounded-2xl bg-white/80 p-4 text-left text-sm shadow-soft dark:bg-slate-900/70 md:grid-cols-2">
            <p>{{ t.mallOrderProduct }}: <span class="font-semibold">{{ orderName(latestOrder) }}</span></p>
            <p>{{ t.mallOrderId }}: <span class="font-semibold">{{ latestOrder.id }}</span></p>
            <p>{{ t.mallAddressRecipient }}: <span class="font-semibold">{{ latestOrder.address.recipient }}</span></p>
            <p>{{ t.mallRedeemAfter }}: <span class="font-semibold text-amber-700 dark:text-amber-400">{{ pointsStore.balance }} pts</span></p>
            <p class="md:col-span-2">{{ t.mallAddressSummary }}: <span class="font-semibold">{{ addressSummary(latestOrder.address) }}</span></p>
            <p class="md:col-span-2">{{ t.mallOrderStatus }}: <span class="font-semibold text-teal-700 dark:text-teal-400">{{ orderStatusLabel(latestOrder) }}</span></p>
          </div>
          <div class="mt-6 flex justify-center gap-3">
            <button
              type="button"
              class="rounded-xl border border-teal-200 px-5 py-2.5 text-sm font-medium text-teal-700 transition hover:bg-teal-50 dark:border-teal-800 dark:text-teal-300 dark:hover:bg-teal-950/40"
              @click="backToList"
            >{{ t.mallContinue }}</button>
          </div>
        </div>

        <div
          v-else
          class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-700 dark:bg-slate-900"
        >
          <div class="flex aspect-[3/1] items-center justify-center bg-gradient-to-br" :class="selectedProduct.accentColor">
            <img
              :src="productImage(selectedProduct)"
              :alt="productName(selectedProduct)"
              class="h-full w-full object-cover"
              loading="lazy"
              draggable="false"
            />
          </div>

          <div class="space-y-6 p-6">
            <div class="space-y-4">
              <div>
                <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {{ catLabel(selectedProduct.category) }}
                </span>
                <h3 class="mt-2 font-display text-xl font-semibold text-slate-900 dark:text-white">
                  {{ productName(selectedProduct) }}
                </h3>
              </div>

              <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{{ productDesc(selectedProduct) }}</p>

              <div class="grid gap-3 text-sm md:grid-cols-4">
                <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                  <p class="text-xs text-slate-400 dark:text-slate-500">{{ t.mallPointsPrice }}</p>
                  <p class="mt-1 text-xl font-bold text-amber-700 dark:text-amber-400">{{ selectedProduct.points }} pts</p>
                </div>
                <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                  <p class="text-xs text-slate-400 dark:text-slate-500">{{ t.mallStock }}</p>
                  <p class="mt-1 font-semibold text-slate-900 dark:text-slate-100">{{ productStock(selectedProduct) }}</p>
                </div>
                <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                  <p class="text-xs text-slate-400 dark:text-slate-500">{{ t.mallMyPoints }}</p>
                  <p class="mt-1 font-semibold" :class="pointsStore.balance >= selectedProduct.points ? 'text-teal-700 dark:text-teal-400' : 'text-rose-500'">
                    {{ pointsStore.balance }} pts
                  </p>
                </div>
                <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                  <p class="text-xs text-slate-400 dark:text-slate-500">{{ t.mallPointsGap }}</p>
                  <p class="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                    {{ Math.max(0, selectedProduct.points - pointsStore.balance) }} pts
                  </p>
                </div>
              </div>

              <div
                v-if="productStock(selectedProduct) === 0"
                class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
              >
                {{ t.mallOutOfStockHint }}
              </div>
              <div
                v-else-if="pointsStore.balance < selectedProduct.points"
                class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
              >
                {{ t.mallRedeemNeedMore
                  .replace('{need}', String(selectedProduct.points - pointsStore.balance))
                  .replace('{current}', String(pointsStore.balance)) }}
              </div>
            </div>

            <div v-if="redeemState === 'detail'" class="flex gap-3">
              <button
                type="button"
                class="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300"
                @click="backToList"
              >{{ t.mallCancel }}</button>
              <button
                type="button"
                class="flex-1 rounded-xl py-2.5 text-sm font-medium transition"
                :class="canRedeem(selectedProduct)
                  ? 'bg-teal-800 text-white hover:bg-teal-900 dark:bg-teal-600 dark:hover:bg-teal-500'
                  : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'"
                :disabled="!canRedeem(selectedProduct)"
                @click="continueToAddress"
              >
                {{ productStock(selectedProduct) === 0 ? t.mallOutOfStock : !canRedeem(selectedProduct) ? t.mallRedeemDisabled : t.mallRedeemBtn }}
              </button>
            </div>

            <div v-else-if="redeemState === 'address'" class="space-y-4">
              <div>
                <h4 class="font-display text-lg font-semibold text-slate-900 dark:text-white">{{ t.mallAddressTitle }}</h4>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t.mallAddressSubtitle }}</p>
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <label class="space-y-1.5 text-sm">
                  <span class="text-slate-600 dark:text-slate-300">{{ t.mallAddressRecipient }}</span>
                  <input
                    v-model="addressForm.recipient"
                    type="text"
                    class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    :placeholder="t.mallAddressRecipientPlaceholder"
                  />
                  <p v-if="addressErrors.recipient" class="text-xs text-rose-500">{{ addressErrors.recipient }}</p>
                </label>
                <label class="space-y-1.5 text-sm">
                  <span class="text-slate-600 dark:text-slate-300">{{ t.mallAddressPhone }}</span>
                  <input
                    v-model="addressForm.phone"
                    type="tel"
                    class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    :placeholder="t.mallAddressPhonePlaceholder"
                  />
                  <p v-if="addressErrors.phone" class="text-xs text-rose-500">{{ addressErrors.phone }}</p>
                </label>
                <label class="space-y-1.5 text-sm md:col-span-2">
                  <span class="text-slate-600 dark:text-slate-300">{{ t.mallAddressRegion }}</span>
                  <input
                    v-model="addressForm.region"
                    type="text"
                    class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    :placeholder="t.mallAddressRegionPlaceholder"
                  />
                  <p v-if="addressErrors.region" class="text-xs text-rose-500">{{ addressErrors.region }}</p>
                </label>
                <label class="space-y-1.5 text-sm md:col-span-2">
                  <span class="text-slate-600 dark:text-slate-300">{{ t.mallAddressDetail }}</span>
                  <textarea
                    v-model="addressForm.detail"
                    rows="3"
                    class="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    :placeholder="t.mallAddressDetailPlaceholder"
                  />
                  <p v-if="addressErrors.detail" class="text-xs text-rose-500">{{ addressErrors.detail }}</p>
                </label>
                <label class="space-y-1.5 text-sm md:col-span-2">
                  <span class="text-slate-600 dark:text-slate-300">{{ t.mallAddressNote }}</span>
                  <input
                    v-model="addressForm.note"
                    type="text"
                    class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    :placeholder="t.mallAddressNotePlaceholder"
                  />
                </label>
              </div>

              <div class="flex gap-3">
                <button
                  type="button"
                  class="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300"
                  @click="returnToDetail"
                >{{ t.mallBack }}</button>
                <button
                  type="button"
                  class="flex-1 rounded-xl bg-teal-800 py-2.5 text-sm font-medium text-white transition hover:bg-teal-900 dark:bg-teal-600"
                  @click="continueToConfirm"
                >{{ t.mallAddressConfirm }}</button>
              </div>
            </div>

            <div v-else-if="redeemState === 'confirm'" class="space-y-4">
              <div>
                <h4 class="font-display text-lg font-semibold text-slate-900 dark:text-white">{{ t.mallRedeemConfirmTitle }}</h4>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ fillRedeemMsg(selectedProduct) }}</p>
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                  <p class="text-xs text-slate-400 dark:text-slate-500">{{ t.mallOrderProduct }}</p>
                  <p class="mt-1 font-semibold text-slate-900 dark:text-white">{{ productName(selectedProduct) }}</p>
                </div>
                <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                  <p class="text-xs text-slate-400 dark:text-slate-500">{{ t.mallRedeemAfter }}</p>
                  <p class="mt-1 font-semibold text-amber-700 dark:text-amber-400">{{ pointsStore.balance - selectedProduct.points }} pts</p>
                </div>
                <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                  <p class="text-xs text-slate-400 dark:text-slate-500">{{ t.mallAddressRecipient }}</p>
                  <p class="mt-1 font-semibold text-slate-900 dark:text-white">{{ addressForm.recipient }}</p>
                </div>
                <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                  <p class="text-xs text-slate-400 dark:text-slate-500">{{ t.mallAddressPhone }}</p>
                  <p class="mt-1 font-semibold text-slate-900 dark:text-white">{{ addressForm.phone }}</p>
                </div>
                <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60 md:col-span-2">
                  <p class="text-xs text-slate-400 dark:text-slate-500">{{ t.mallAddressSummary }}</p>
                  <p class="mt-1 font-semibold text-slate-900 dark:text-white">{{ addressSummary(addressForm) }}</p>
                </div>
              </div>

              <div class="flex gap-3">
                <button
                  type="button"
                  class="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300"
                  @click="returnToAddress"
                >{{ t.mallBack }}</button>
                <button
                  type="button"
                  class="flex-1 rounded-xl bg-teal-800 py-2.5 text-sm font-medium text-white transition hover:bg-teal-900 dark:bg-teal-600"
                  @click="placeOrder"
                >{{ t.mallPlaceOrder }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else key="list" class="space-y-5">
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

        <div class="container-grid content-grid">
          <article
            v-for="product in filtered"
            :key="product.id"
            class="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft transition hover:border-teal-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-teal-800"
            @click="openProduct(product)"
          >
            <div class="flex aspect-[2/1] items-center justify-center bg-gradient-to-br" :class="product.accentColor">
              <img
                :src="productImage(product)"
                :alt="productName(product)"
                class="h-full w-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
                draggable="false"
              />
            </div>
            <div class="p-4">
              <div class="mb-1 flex items-center justify-between">
                <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {{ catLabel(product.category) }}
                </span>
                <span v-if="productStock(product) <= 10 && productStock(product) > 0" class="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                  {{ store.locale === 'zh' ? `仅剩 ${productStock(product)}` : `${productStock(product)} left` }}
                </span>
                <span v-else-if="productStock(product) === 0" class="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                  {{ t.mallOutOfStock }}
                </span>
              </div>
              <h4 class="mt-1 font-display text-sm font-semibold text-slate-900 group-hover:text-teal-800 dark:text-white dark:group-hover:text-teal-300">
                {{ productName(product) }}
              </h4>
              <p class="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{{ productDesc(product) }}</p>
              <div class="mt-3 flex items-center justify-between">
                <span class="text-base font-bold text-amber-700 dark:text-amber-400">
                  {{ product.points }} <span class="text-xs font-normal text-amber-600/70 dark:text-amber-500/70">pts</span>
                </span>
                <span
                  class="rounded-lg px-2.5 py-1 text-xs font-medium transition"
                  :class="productStock(product) === 0
                    ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                    : pointsStore.balance >= product.points
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'"
                >
                  {{ productStock(product) === 0 ? t.mallOutOfStock : pointsStore.balance >= product.points ? t.mallRedeemBtn : t.mallRedeemDisabled }}
                </span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </Transition>

    <Teleport to="body">
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

          <div class="flex-1 space-y-3 overflow-y-auto px-5 py-4">
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

              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium" :class="taskStatusClass(task.completed, task.claimed)">
                  {{ store.locale === 'zh' ? task.labelZh : task.labelEn }}
                </p>
                <p class="mt-0.5 text-[11px]" :class="task.claimed ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500'">
                  {{ task.claimed ? taskLabel(task.completed, task.claimed) : (store.locale === 'zh' ? task.hintZh : task.hintEn) }}
                </p>
              </div>

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

          <div class="space-y-3 border-t border-slate-100 p-5 dark:border-slate-800">
            <div class="flex items-center justify-between text-sm">
              <span class="text-slate-500 dark:text-slate-400">{{ t.mallPendingPoints }}</span>
              <span class="font-bold text-teal-700 dark:text-teal-400">+{{ pointsStore.pendingPoints }} pts</span>
            </div>

            <button
              type="button"
              class="relative w-full overflow-hidden rounded-xl py-2.5 text-sm font-medium transition"
              :class="pointsStore.pendingPoints > 0
                ? 'bg-teal-700 text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500'
                : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'"
              :disabled="pointsStore.pendingPoints === 0"
              @click="pointsStore.pendingPoints > 0 && claimAll()"
            >
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
                  class="absolute inset-0 flex items-center justify-center bg-teal-600 font-semibold text-white"
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
