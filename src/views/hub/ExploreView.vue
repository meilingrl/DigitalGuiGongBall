<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { AMapAdapter } from '../../map/AMapAdapter'
import { createMarkerElement, ensureMarkerAnimations } from '../../map/markerFactory'
import { useMapStore } from '../../stores/map'
import { useAppStore } from '../../stores/app'
import { usePointsStore, TASK_IDS } from '../../stores/points'
import { useExploreProfileStore, type TransportMode } from '../../stores/exploreProfile'
import { activities, venues, type Activity, type Venue } from '../../data/explore'
import { resolvePublicUrl } from '../../utils/publicUrl'

const store = useAppStore()
const mapStore = useMapStore()
const pointsStore = usePointsStore()
const exploreProfileStore = useExploreProfileStore()
exploreProfileStore.hydrateFromStorage()
const t = computed(() => store.t)

// ─── CSS filter for theme-adaptive map ───────────────────────────────────────
const mapFilter = computed(() => {
  if (store.theme === 'dark') {
    return 'invert(0.88) hue-rotate(180deg) saturate(0.6) brightness(0.85)'
  }
  return 'saturate(0.55) brightness(1.02) contrast(0.95)'
})

// ─── Map container ref (floating card anchoring) ─────────────────────────────
const mapContainerRef = ref<HTMLElement | null>(null)

const cardPos = ref({ x: 0, y: 0 })
const cardVisible = ref(false)

function updateCardPos(): void {
  const venue = mapStore.pinnedVenue
  if (!venue || !adapter || !mapContainerRef.value) {
    cardVisible.value = false
    return
  }
  const pixel = adapter.lngLatToPixel({ lng: venue.lng, lat: venue.lat })
  if (!pixel) { cardVisible.value = false; return }
  const rect = mapContainerRef.value.getBoundingClientRect()
  cardPos.value = {
    x: rect.left + pixel.x + 18,
    y: rect.top + pixel.y - 80,
  }
  cardVisible.value = true
}

function onMapMove(): void { updateCardPos() }

let adapter: AMapAdapter | null = null

async function initMap() {
  if (mapStore.mapReady || mapStore.mapError) return
  ensureMarkerAnimations()

  try {
    adapter = new AMapAdapter()
    await adapter.init('amap-container', {
      zoom: 5,
      center: { lng: 108.0, lat: 35.5 },
      style: store.theme,
    })
    mapStore.setAdapter(adapter)
    renderVenueMarkers()
    renderActivityMarkers()
    updateCluster()
    adapter.enable3DBuildings(true)
    adapter.on('moveend', onMapMove)
    adapter.on('zoomend', onMapMove)
    adapter.on('zoomend', updateCluster)
  } catch {
    mapStore.setError()
  }
}

/** Venue pin shows activity dot if any matching activity passes current calendar filter */
function venueHasVisibleActivity(venueId: string): boolean {
  const acts = activities.filter((a) => a.venueId === venueId)
  if (acts.length === 0) return false
  if (mapStore.activityFilterDates.length === 0) return true
  const set = new Set(mapStore.activityFilterDates)
  return acts.some((a) => set.has(a.date))
}

function renderVenueMarkers() {
  if (!adapter) return
  adapter.clearMarkers()
  venues.forEach((v) => {
    const isActive = mapStore.activeVenueId === v.id
    const el = createMarkerElement({
      category: v.ichCategory,
      label: store.locale === 'zh' ? v.nameZh : v.nameEn,
      active: isActive,
      hasActivity: venueHasVisibleActivity(v.id),
      onClick: () => {
        mapStore.setActiveVenue(v.id)
        mapStore.pinVenue(v.id)
      },
    })
    adapter!.addMarker(v.id, { lng: v.lng, lat: v.lat }, el)
  })
}

watch(
  () => [mapStore.activeVenueId, store.locale, mapStore.mapReady, mapStore.activityFilterDates],
  () => {
    if (mapStore.mapReady) renderVenueMarkers()
  },
  { deep: true },
)

const ACT_MARKER_PREFIX = 'act_'

function renderActivityMarkers(): void {
  if (!adapter) return
  activities.forEach((a) => adapter!.removeMarker(ACT_MARKER_PREFIX + a.id))

  mapStore.visibleActivities.forEach((a) => {
    const venue = venues.find((v) => v.id === a.venueId)
    if (!venue) return
    const offsetLng = venue.lng + 0.008
    const offsetLat = venue.lat + 0.006

    const dot = document.createElement('div')
    dot.style.cssText = `
      width: 12px; height: 12px; border-radius: 50%;
      background: #f59e0b; border: 2px solid #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      cursor: pointer;
      animation: marker-pulse 2s ease-in-out infinite;
      position: relative;
    `
    const tip = document.createElement('div')
    tip.textContent = store.locale === 'zh' ? a.titleZh : a.titleEn
    tip.style.cssText = `
      position: absolute; bottom: 16px; left: 50%;
      transform: translateX(-50%);
      background: #92400e; color: #fff;
      padding: 2px 7px; border-radius: 5px;
      font-size: 10px; white-space: nowrap;
      pointer-events: none; opacity: 0;
      transition: opacity 0.15s; box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    `
    dot.appendChild(tip)
    dot.addEventListener('mouseenter', () => { tip.style.opacity = '1' })
    dot.addEventListener('mouseleave', () => { tip.style.opacity = '0' })
    dot.addEventListener('click', () => { openActivity(a) })

    adapter!.addMarker(ACT_MARKER_PREFIX + a.id, { lng: offsetLng, lat: offsetLat }, dot)
  })
}

watch(
  () => mapStore.visibleActivities,
  () => {
    if (mapStore.mapReady) {
      renderActivityMarkers()
      updateCluster()
    }
  },
  { deep: false },
)

function updateCluster(): void {
  if (!adapter) return
  const zoom = adapter.getZoom()
  if (zoom <= 9) {
    const points = mapStore.visibleActivities.map((a) => {
      const v = venues.find((vv) => vv.id === a.venueId)
      return v
        ? { lng: v.lng + 0.008, lat: v.lat + 0.006, data: a }
        : null
    }).filter((p): p is NonNullable<typeof p> => p !== null)
    adapter.setActivityCluster(points)
    activities.forEach((a) => adapter!.removeMarker(ACT_MARKER_PREFIX + a.id))
  } else {
    adapter.clearActivityCluster()
    renderActivityMarkers()
  }
}

watch(
  () => store.theme,
  (theme) => {
    adapter?.setStyle(theme)
  },
)


watch(
  () => mapStore.pinnedVenueId,
  () => {
    if (mapStore.pinnedVenueId) {
      setTimeout(updateCardPos, 350)
    } else {
      cardVisible.value = false
    }
  },
)

// ─── Merged calendar (iOS-style range + toggle + undo/clear) ────────────────
const today = new Date()
const calYear = ref(today.getFullYear())
const calMonth = ref(today.getMonth())

const monthNames = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月']
const monthNamesEn = ['January','February','March','April','May','June','July','August','September','October','November','December']

const calDays = computed(() => {
  const first = new Date(calYear.value, calMonth.value, 1)
  const last = new Date(calYear.value, calMonth.value + 1, 0)
  const startDow = first.getDay()
  const days: { date: number; hasActivity: boolean; dateStr: string }[] = []
  for (let i = 0; i < startDow; i++) days.push({ date: 0, hasActivity: false, dateStr: '' })
  for (let d = 1; d <= last.getDate(); d++) {
    const dateStr = `${calYear.value}-${String(calMonth.value + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({ date: d, hasActivity: activities.some((a) => a.date === dateStr), dateStr })
  }
  return days
})

/** First tap anchor for iOS-style range; second tap closes range and merges into selection */
const rangeAnchor = ref<string | null>(null)

function enumerateInclusiveRange(aIso: string, bIso: string): string[] {
  const d1 = new Date(`${aIso}T12:00:00`)
  const d2 = new Date(`${bIso}T12:00:00`)
  const start = d1 <= d2 ? d1 : d2
  const end = d1 <= d2 ? d2 : d1
  const out: string[] = []
  const cur = new Date(start)
  while (cur <= end) {
    out.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`,
    )
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

function isDateFiltered(dateStr: string): boolean {
  return mapStore.activityFilterDates.includes(dateStr)
}

function onCalendarDayClick(dateStr: string, isEmptyCell: boolean): void {
  if (isEmptyCell || !dateStr) return

  if (rangeAnchor.value === null) {
    if (isDateFiltered(dateStr)) {
      mapStore.commitActivityFilter(
        mapStore.activityFilterDates.filter((d) => d !== dateStr),
        true,
      )
    } else {
      rangeAnchor.value = dateStr
    }
    return
  }

  if (dateStr === rangeAnchor.value) {
    rangeAnchor.value = null
    return
  }

  const rangeDays = enumerateInclusiveRange(rangeAnchor.value, dateStr)
  const merged = new Set([...mapStore.activityFilterDates, ...rangeDays])
  mapStore.commitActivityFilter([...merged], true)
  rangeAnchor.value = null
}

function prevMonth(): void {
  if (calMonth.value === 0) { calYear.value--; calMonth.value = 11 }
  else calMonth.value--
  rangeAnchor.value = null
}

function nextMonth(): void {
  if (calMonth.value === 11) { calYear.value++; calMonth.value = 0 }
  else calMonth.value++
  rangeAnchor.value = null
}

function clearCalendarFilterAndAnchor(): void {
  mapStore.clearActivityFilter()
  rangeAnchor.value = null
}

function undoCalendarFilter(): void {
  mapStore.undoActivityFilter()
  rangeAnchor.value = null
}

const isToday = (dateStr: string) => {
  const t2 = new Date()
  return dateStr === `${t2.getFullYear()}-${String(t2.getMonth() + 1).padStart(2, '0')}-${String(t2.getDate()).padStart(2, '0')}`
}

const filteredEventCount = computed(() => mapStore.visibleActivities.length)

// ─── Activity detail (opened from map / venue / card only, not from calendar as controller) ─
const selectedActivity = ref<Activity | null>(null)
const showBookModal = ref(false)
type BookingVoucher = { code: string; status: 'pending' | 'confirmed'; createdAt: string }
type BookingRecord = {
  activityId: string
  name: string
  phone: string
  email: string
  emergencyContact: string
  adults: number
  children: number
  transportMode: TransportMode
  notes: string
  voucher: BookingVoucher
}
const BOOKING_STORAGE_KEY = 'explore_bookings_v1'
const bookName = ref(exploreProfileStore.preset.contactName)
const bookPhone = ref(exploreProfileStore.preset.phone)
const bookEmail = ref(exploreProfileStore.preset.email)
const bookEmergencyContact = ref(exploreProfileStore.preset.emergencyContact)
const bookAdults = ref(exploreProfileStore.preset.adults)
const bookChildren = ref(exploreProfileStore.preset.children)
const bookTransportMode = ref<TransportMode>(exploreProfileStore.preset.transportMode)
const bookNotes = ref('')
const bookHealthConfirmed = ref(false)
const bookLiabilityConfirmed = ref(false)
const bookDone = ref(false)
const bookMode = ref<'created' | 'view'>('created')
const bookError = ref('')
const bookVoucher = ref<BookingVoucher | null>(null)
const bookedRecords = ref<Record<string, BookingRecord>>({})
const checkedIn = ref<Set<string>>(new Set())
const checkinDone = ref<string | null>(null)
const lastCheckinDistanceM = ref<number | null>(null)
const checkinError = ref<string | null>(null)
const checkinActivityId = ref<string | null>(null)
const phoneRegex = /^1\d{10}$/
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const selectFieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'

const bookingTotalCount = computed(() => bookAdults.value + bookChildren.value)
const currentBookingRecord = computed<BookingRecord | null>(() => {
  const id = selectedActivity.value?.id
  if (!id) return null
  return bookedRecords.value[id] ?? null
})
const qrSize = 29
const fakeQrMatrix = computed<number[][]>(() => {
  const seed = (bookVoucher.value?.code ?? 'EXP-DEMO').split('')
  const nums = seed.map((ch) => ch.charCodeAt(0))
  const size = qrSize
  const quietZone = 2
  const matrix: number[][] = []
  const inFinder = (x: number, y: number, ox: number, oy: number) =>
    x >= ox && x < ox + 7 && y >= oy && y < oy + 7
  const finderFill = (x: number, y: number, ox: number, oy: number): number => {
    const dx = x - ox
    const dy = y - oy
    const outer = dx === 0 || dx === 6 || dy === 0 || dy === 6
    const inner = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4
    return outer || inner ? 1 : 0
  }
  for (let y = 0; y < size; y++) {
    const row: number[] = []
    for (let x = 0; x < size; x++) {
      if (
        x < quietZone ||
        y < quietZone ||
        x >= size - quietZone ||
        y >= size - quietZone
      ) {
        row.push(0)
        continue
      }
      if (inFinder(x, y, quietZone, quietZone)) {
        row.push(finderFill(x, y, quietZone, quietZone))
        continue
      }
      if (inFinder(x, y, size - quietZone - 7, quietZone)) {
        row.push(finderFill(x, y, size - quietZone - 7, quietZone))
        continue
      }
      if (inFinder(x, y, quietZone, size - quietZone - 7)) {
        row.push(finderFill(x, y, quietZone, size - quietZone - 7))
        continue
      }
      const v = nums[(x * 3 + y * 5) % nums.length] + x * 11 + y * 7
      row.push(v % 2 === 0 ? 1 : 0)
    }
    matrix.push(row)
  }
  return matrix
})
const flatQrCells = computed(() => fakeQrMatrix.value.flat())
const qrGridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${qrSize}, minmax(0, 1fr))`,
}))

function hydrateBookedRecords() {
  if (typeof window === 'undefined') return
  const raw = window.localStorage.getItem(BOOKING_STORAGE_KEY)
  if (!raw) return
  try {
    const parsed = JSON.parse(raw) as Record<string, BookingRecord>
    bookedRecords.value = parsed
  } catch {
    bookedRecords.value = {}
  }
}

function persistBookedRecords() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(bookedRecords.value))
}

hydrateBookedRecords()

function openActivity(a: Activity) { selectedActivity.value = a }
function closeActivityDetail() { selectedActivity.value = null }

function applyPresetToBooking() {
  bookName.value = exploreProfileStore.preset.contactName
  bookPhone.value = exploreProfileStore.preset.phone
  bookEmail.value = exploreProfileStore.preset.email
  bookEmergencyContact.value = exploreProfileStore.preset.emergencyContact
  bookTransportMode.value = exploreProfileStore.preset.transportMode
  bookAdults.value = exploreProfileStore.preset.adults
  bookChildren.value = exploreProfileStore.preset.children
}

function openBook() {
  applyPresetToBooking()
  bookNotes.value = ''
  bookHealthConfirmed.value = false
  bookLiabilityConfirmed.value = false
  bookError.value = ''
  bookVoucher.value = null
  bookDone.value = false
  bookMode.value = 'created'
  showBookModal.value = true
}

function openBookedInfo() {
  const activity = selectedActivity.value
  if (!activity) return
  const record = bookedRecords.value[activity.id]
  if (!record) return
  bookName.value = record.name
  bookPhone.value = record.phone
  bookEmail.value = record.email
  bookEmergencyContact.value = record.emergencyContact
  bookAdults.value = record.adults
  bookChildren.value = record.children
  bookTransportMode.value = record.transportMode
  bookNotes.value = record.notes
  bookHealthConfirmed.value = true
  bookLiabilityConfirmed.value = true
  bookVoucher.value = record.voucher
  bookError.value = ''
  bookDone.value = true
  bookMode.value = 'view'
  showBookModal.value = true
}

function closeBook() { showBookModal.value = false }
function submitBook() {
  if (!selectedActivity.value) return
  const name = bookName.value.trim()
  const phone = bookPhone.value.trim()
  const email = bookEmail.value.trim()
  const emergency = bookEmergencyContact.value.trim()
  if (!name) {
    bookError.value = t.value.exploreBookErrorName
    return
  }
  if (!phoneRegex.test(phone)) {
    bookError.value = t.value.exploreBookErrorPhone
    return
  }
  if (email && !emailRegex.test(email)) {
    bookError.value = t.value.exploreBookErrorEmail
    return
  }
  if (bookingTotalCount.value <= 0) {
    bookError.value = t.value.exploreBookErrorCount
    return
  }
  if (!bookHealthConfirmed.value || !bookLiabilityConfirmed.value) {
    bookError.value = t.value.exploreBookErrorConfirm
    return
  }
  if (
    selectedActivity.value.remaining !== null &&
    bookingTotalCount.value > selectedActivity.value.remaining
  ) {
    bookError.value = t.value.exploreBookErrorCapacity
    return
  }
  bookError.value = ''
  exploreProfileStore.savePreset({
    contactName: name,
    phone,
    email,
    emergencyContact: emergency,
    transportMode: bookTransportMode.value,
    adults: bookAdults.value,
    children: bookChildren.value,
  })
  const codeSeed = Math.random().toString(36).slice(2, 8).toUpperCase()
  bookVoucher.value = {
    code: `EXP-${selectedActivity.value.id.toUpperCase()}-${codeSeed}`,
    status: selectedActivity.value.remaining !== null && selectedActivity.value.remaining <= 8 ? 'pending' : 'confirmed',
    createdAt: new Date().toLocaleString(),
  }
  bookedRecords.value[selectedActivity.value.id] = {
    activityId: selectedActivity.value.id,
    name,
    phone,
    email,
    emergencyContact: emergency,
    adults: bookAdults.value,
    children: bookChildren.value,
    transportMode: bookTransportMode.value,
    notes: bookNotes.value.trim(),
    voucher: bookVoucher.value,
  }
  persistBookedRecords()
  bookDone.value = true
  bookMode.value = 'created'
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('geolocation not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 60000,
    })
  })
}

async function doCheckin(activity: Activity) {
  if (checkedIn.value.has(activity.id)) return
  const venue = venues.find((v) => v.id === activity.venueId)
  if (!venue) return
  let distance = Number.POSITIVE_INFINITY
  try {
    const pos = await getCurrentPosition()
    distance = haversineMetres(pos.coords.latitude, pos.coords.longitude, venue.lat, venue.lng)
  } catch {
    checkinActivityId.value = activity.id
    checkinError.value = store.locale === 'zh' ? '定位失败，请检查定位权限后重试' : 'Location failed. Please enable permissions and try again.'
    checkinDone.value = null
    return
  }
  lastCheckinDistanceM.value = Math.round(distance)
  checkinActivityId.value = activity.id
  if (distance > GEOFENCE_RADIUS) {
    checkinError.value = t.value.exploreCheckinOutOfRange
      .replace('{distance}', String(Math.round(distance)))
      .replace('{radius}', String(GEOFENCE_RADIUS))
    checkinDone.value = null
    return
  }
  checkinError.value = null
  checkedIn.value.add(activity.id)
  checkinDone.value = activity.id
  pointsStore.completeTask(TASK_IDS.EVENT_CHECKIN)
  setTimeout(() => { if (checkinDone.value === activity.id) checkinDone.value = null }, 3000)
}

function closeVenuePanel() {
  mapStore.setActiveVenue(null)
  mapStore.pinVenue(null)
}

function venueName(v: Venue) { return store.locale === 'zh' ? v.nameZh : v.nameEn }
function venueAddress(v: Venue) { return store.locale === 'zh' ? v.addressZh : v.addressEn }
function venueType(v: Venue) { return store.locale === 'zh' ? v.typeZh : v.typeEn }
function venueHours(v: Venue) { return store.locale === 'zh' ? v.openHoursZh : v.openHoursEn }
function venueDesc(v: Venue) { return store.locale === 'zh' ? v.descZh : v.descEn }
function venueTags(v: Venue) { return store.locale === 'zh' ? v.tagsZh : v.tagsEn }
function actTitle(a: Activity) { return store.locale === 'zh' ? a.titleZh : a.titleEn }
function actTime(a: Activity) { return store.locale === 'zh' ? a.timeZh : a.timeEn }
function actDesc(a: Activity) { return store.locale === 'zh' ? a.descZh : a.descEn }
function actTags(a: Activity) { return store.locale === 'zh' ? a.tagsZh : a.tagsEn }
function venueImage(v: Venue) { return resolvePublicUrl(v.image) }
function activityImage(a: Activity) { return resolvePublicUrl(a.image) }

const parkingCapacityBase: Record<string, { total: number; baseBusy: number }> = {
  v001: { total: 120, baseBusy: 0.72 },
  v002: { total: 80, baseBusy: 0.68 },
  v003: { total: 90, baseBusy: 0.74 },
  v004: { total: 110, baseBusy: 0.78 },
}

const carParkingAdvice = computed(() => {
  if (bookTransportMode.value !== 'car' || !selectedActivity.value) return null
  const venue = venues.find((v) => v.id === selectedActivity.value!.venueId)
  if (!venue) return null
  const base = parkingCapacityBase[venue.id] ?? { total: 90, baseBusy: 0.72 }
  const load =
    selectedActivity.value.quota && selectedActivity.value.remaining !== null
      ? (selectedActivity.value.quota - selectedActivity.value.remaining) / selectedActivity.value.quota
      : 0.6
  const busyRatio = Math.min(0.97, base.baseBusy + load * 0.28)
  const available = Math.max(0, Math.round(base.total * (1 - busyRatio)))
  const highPressure = busyRatio >= 0.85 || available <= 12
  return {
    available,
    highPressure,
    message: store.locale === 'zh'
      ? highPressure
        ? `馆内停车位预计仅剩 ${available} 个，周边停车压力较高，建议优先选择公共交通。`
        : `馆内停车位预计剩余 ${available} 个，当前停车压力可控。`
      : highPressure
        ? `Only about ${available} on-site parking spots left; nearby parking pressure is high. Public transit is recommended.`
        : `About ${available} on-site parking spots are available; current parking pressure is manageable.`,
  }
})

// ─── Route planning & geofence ───────────────────────────────────────────────
type RouteState = 'idle' | 'locating' | 'drawing' | 'done' | 'error' | 'geofence_ok'
const routeState = ref<RouteState>('idle')
const routeMsg = ref('')
const routeVenueId = ref<string | null>(null)

function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const GEOFENCE_RADIUS = 300

function navigateTo(venue: Venue): void {
  routeState.value = 'locating'
  routeMsg.value = store.locale === 'zh' ? '正在获取位置…' : 'Getting your location…'
  routeVenueId.value = venue.id

  if (!navigator.geolocation) {
    routeState.value = 'error'
    routeMsg.value = store.locale === 'zh' ? '浏览器不支持定位' : 'Geolocation not supported'
    return
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const userLat = pos.coords.latitude
      const userLng = pos.coords.longitude
      const dist = haversineMetres(userLat, userLng, venue.lat, venue.lng)

      if (dist <= GEOFENCE_RADIUS) {
        routeState.value = 'geofence_ok'
        routeMsg.value = store.locale === 'zh'
          ? `已到达！距场馆 ${Math.round(dist)} 米，自动签到成功 ✓`
          : `Arrived! ${Math.round(dist)} m away — checked in ✓`
        const vActs = mapStore.visibleActivities.filter((a) => a.venueId === venue.id)
        if (vActs.length > 0 && !checkedIn.value.has(vActs[0].id)) {
          doCheckin(vActs[0])
        }
        return
      }

      routeState.value = 'drawing'
      routeMsg.value = store.locale === 'zh' ? '正在规划路线…' : 'Planning route…'
      try {
        await adapter?.drawWalkingRoute(
          { lng: userLng, lat: userLat },
          { lng: venue.lng, lat: venue.lat },
        )
        routeState.value = 'done'
        routeMsg.value = store.locale === 'zh'
          ? `步行路线已显示（距场馆约 ${Math.round(dist)} 米）`
          : `Walking route shown (${Math.round(dist)} m away)`
        renderVenueMarkers()
        renderActivityMarkers()
      } catch {
        routeState.value = 'done'
        routeMsg.value = store.locale === 'zh'
          ? `距场馆约 ${(dist / 1000).toFixed(1)} 公里，请使用地图应用导航`
          : `~${(dist / 1000).toFixed(1)} km away — use your maps app to navigate`
      }
    },
    (err) => {
      routeState.value = 'done'
      routeMsg.value = store.locale === 'zh'
        ? `定位失败 (${err.code})，请检查定位权限后重试`
        : `Location denied (${err.code}). Please enable permissions and retry.`
    },
    { timeout: 8000, maximumAge: 60000 },
  )
}

const categoryColour: Record<string, string> = {
  museum: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300',
  craft: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  performing: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
  festival: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
  culinary: 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300',
}
function categoryBadge(v: Venue) { return categoryColour[v.ichCategory] ?? categoryColour.museum }

onMounted(() => { initMap() })
onBeforeUnmount(() => {
  mapStore.reset()
  adapter = null
})
</script>

<template>
  <div class="space-y-6">
    <header>
      <p class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ t.explore }}</p>
      <h2 class="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{{ t.exploreIntro }}</h2>
      <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{{ t.exploreBody }}</p>
    </header>

    <!-- Activity detail (independent of calendar; opened from map / list / card) -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
      mode="out-in"
    >
      <div v-if="selectedActivity" :key="selectedActivity.id" class="space-y-4">
        <button
          type="button"
          class="flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-200"
          @click="closeActivityDetail"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {{ t.exploreBack }}
        </button>

        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <div class="relative flex aspect-[3/1] items-center justify-center overflow-hidden bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950/50 dark:to-teal-900/30">
            <img
              v-if="activityImage(selectedActivity)"
              :src="activityImage(selectedActivity)"
              :alt="actTitle(selectedActivity)"
              class="h-full w-full object-cover"
              loading="lazy"
              draggable="false"
            />
            <svg
              v-else
              class="h-14 w-14 text-teal-300 dark:text-teal-800"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>

          <div class="p-6 space-y-4">
            <div class="flex flex-wrap gap-2">
              <span
                v-for="tag in actTags(selectedActivity)"
                :key="tag"
                class="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-950/50 dark:text-teal-300"
              >{{ tag }}</span>
            </div>
            <h3 class="font-display text-xl font-semibold text-slate-900 dark:text-white">{{ actTitle(selectedActivity) }}</h3>

            <dl class="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt class="text-xs text-slate-400 dark:text-slate-500">{{ store.locale === 'zh' ? '日期' : 'Date' }}</dt>
                <dd class="mt-0.5 font-medium text-slate-800 dark:text-slate-200">{{ selectedActivity.date }}</dd>
              </div>
              <div>
                <dt class="text-xs text-slate-400 dark:text-slate-500">{{ store.locale === 'zh' ? '时间' : 'Time' }}</dt>
                <dd class="mt-0.5 font-medium text-slate-800 dark:text-slate-200">{{ actTime(selectedActivity) }}</dd>
              </div>
              <div v-if="selectedActivity.quota !== null">
                <dt class="text-xs text-slate-400 dark:text-slate-500">{{ t.exploreQuota }}</dt>
                <dd class="mt-0.5 font-medium text-slate-800 dark:text-slate-200">{{ selectedActivity.quota }}{{ store.locale === 'zh' ? '人' : ' people' }}</dd>
              </div>
              <div v-if="selectedActivity.remaining !== null">
                <dt class="text-xs text-slate-400 dark:text-slate-500">{{ t.exploreRemaining }}</dt>
                <dd
                  class="mt-0.5 font-medium"
                  :class="(selectedActivity.remaining ?? 0) <= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'"
                >{{ selectedActivity.remaining }}</dd>
              </div>
              <div>
                <dt class="text-xs text-slate-400 dark:text-slate-500">{{ t.explorePointsReward }}</dt>
                <dd class="mt-0.5 font-medium text-teal-700 dark:text-teal-400">+{{ selectedActivity.pointsReward }} {{ store.locale === 'zh' ? '积分' : 'pts' }}</dd>
              </div>
            </dl>

            <div v-if="selectedActivity.quota && selectedActivity.remaining !== null" class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <div class="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                <span>{{ store.locale === 'zh' ? '报名进度' : 'Enrolment' }}</span>
                <span>{{ selectedActivity.quota - selectedActivity.remaining }}/{{ selectedActivity.quota }} {{ store.locale === 'zh' ? '人' : 'ppl' }}</span>
              </div>
              <div class="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  class="h-2 rounded-full transition-all duration-700"
                  :class="(selectedActivity.remaining / selectedActivity.quota) < 0.3 ? 'bg-amber-500' : 'bg-teal-500'"
                  :style="{ width: `${((selectedActivity.quota - selectedActivity.remaining) / selectedActivity.quota) * 100}%` }"
                />
              </div>
            </div>

            <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{{ actDesc(selectedActivity) }}</p>

            <div class="flex flex-wrap gap-3 pt-2">
              <button type="button" class="rounded-xl bg-teal-800 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-900 dark:bg-teal-600 dark:hover:bg-teal-500" @click="openBook">
                {{ t.exploreBookBtn }}
              </button>
              <button
                v-if="currentBookingRecord"
                type="button"
                class="rounded-xl border border-teal-300 bg-teal-50 px-5 py-2.5 text-sm font-medium text-teal-800 transition hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300"
                @click="openBookedInfo"
              >
                {{ store.locale === 'zh' ? '查看预约信息与凭证' : 'View booking & pass' }}
              </button>
              <button
                type="button"
                class="rounded-xl border px-5 py-2.5 text-sm font-medium transition"
                :class="checkedIn.has(selectedActivity.id)
                  ? 'border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-teal-500 hover:text-teal-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'"
                @click="doCheckin(selectedActivity)"
              >
                <span v-if="checkinDone === selectedActivity.id">✓ {{ t.exploreCheckinDone }}</span>
                <span v-else-if="checkedIn.has(selectedActivity.id)">✓ {{ store.locale === 'zh' ? '已签到' : 'Checked in' }}</span>
                <span v-else>{{ t.exploreCheckinBtn }}</span>
              </button>
            </div>
            <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{{ store.locale === 'zh' ? '系统将根据当前位置自动判定签到范围。' : 'Check-in range is validated by your current location.' }}</span>
              <span v-if="lastCheckinDistanceM !== null && checkinActivityId === selectedActivity.id">
                {{ t.exploreCheckinDistanceHint.replace('{distance}', String(lastCheckinDistanceM)) }}
              </span>
            </div>
            <p
              v-if="checkinError && checkinActivityId === selectedActivity.id"
              class="text-xs text-rose-600 dark:text-rose-400"
            >
              {{ checkinError }}
            </p>
            <p class="text-xs text-slate-400 dark:text-slate-500">{{ t.exploreBookSuccessHint }}</p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Merged: map + venue list + calendar (calendar only drives map filter) -->
    <div v-if="!selectedActivity" class="flex flex-col gap-5">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start">
        <!-- Venue sidebar -->
        <aside
          v-if="mapStore.mapReady"
          class="w-full xl:w-56 shrink-0 rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 overflow-hidden shadow-soft"
        >
          <div class="border-b border-slate-100 dark:border-slate-800 px-3 py-2.5">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {{ store.locale === 'zh' ? `视野内场馆 (${mapStore.visibleVenues.length})` : `In view (${mapStore.visibleVenues.length})` }}
            </p>
          </div>
          <div class="max-h-[min(52vh,520px)] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            <button
              v-for="v in mapStore.visibleVenues"
              :key="v.id"
              type="button"
              class="w-full text-left flex items-center gap-2.5 px-3 py-3 transition"
              :class="mapStore.activeVenueId === v.id
                ? 'bg-teal-50 dark:bg-teal-950/30'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'"
              @click="mapStore.setActiveVenue(v.id); mapStore.pinVenue(v.id)"
            >
              <span
                class="h-2 w-2 shrink-0 rounded-full"
                :class="{
                  'bg-teal-600': v.ichCategory === 'museum',
                  'bg-amber-600': v.ichCategory === 'craft',
                  'bg-purple-600': v.ichCategory === 'performing',
                  'bg-rose-600': v.ichCategory === 'festival',
                  'bg-green-600': v.ichCategory === 'culinary',
                }"
              />
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{{ venueName(v) }}</p>
                <p class="truncate text-[11px] text-slate-500 dark:text-slate-400">{{ v.city }}</p>
              </div>
            </button>
          </div>
        </aside>

        <!-- Map + venue panel -->
        <div class="flex min-w-0 flex-1 flex-col gap-4">
          <div
            ref="mapContainerRef"
            class="relative min-h-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-soft dark:border-slate-700 dark:bg-slate-900 sm:min-h-[420px] xl:min-h-[480px]"
          >
            <div
              v-if="mapStore.mapError"
              class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-50/95 dark:bg-slate-900/95"
            >
              <svg class="h-10 w-10 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 20.25l-5.25-5.25a7.5 7.5 0 1 1 10.606 0L9 20.25z" />
              </svg>
              <p class="text-sm text-slate-500 dark:text-slate-400">{{ t.exploreMapKeyMissing }}</p>
              <div class="mt-4 w-full max-w-sm px-4">
                <div
                  v-for="v in venues"
                  :key="v.id"
                  class="mb-2 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-teal-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-teal-700"
                  @click="mapStore.setActiveVenue(v.id)"
                >
                  <span :class="['flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold', categoryBadge(v)]">
                    {{ v.city.slice(0, 1) }}
                  </span>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{{ venueName(v) }}</p>
                    <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ v.city }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div
              id="amap-container"
              class="h-full w-full min-h-[360px] sm:min-h-[420px] xl:min-h-[480px] transition-[filter] duration-500"
              :style="{ filter: mapFilter }"
            />

            <div v-if="!mapStore.mapReady && !mapStore.mapError" class="absolute inset-0 flex items-center justify-center">
              <div class="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
            </div>

            <div
              v-if="mapStore.mapReady"
              class="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/85 px-3 py-1.5 text-xs text-slate-600 shadow-sm backdrop-blur-sm dark:bg-slate-900/85 dark:text-slate-300"
            >
              {{ t.exploreMapHint }}
            </div>
          </div>

          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-3"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 translate-y-3"
          >
            <div
              v-if="mapStore.activeVenue"
              class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-700 dark:bg-slate-900"
            >
              <div class="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-teal-50 to-teal-100 px-6 py-5 dark:from-teal-950/50 dark:to-teal-900/30">
                <img
                  v-if="venueImage(mapStore.activeVenue)"
                  :src="venueImage(mapStore.activeVenue)"
                  :alt="venueName(mapStore.activeVenue)"
                  class="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                  draggable="false"
                />
                <span :class="['rounded-full px-2.5 py-0.5 text-xs font-medium', categoryBadge(mapStore.activeVenue)]">
                  {{ venueType(mapStore.activeVenue) }}
                </span>
                <button
                  type="button"
                  class="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-slate-600 transition hover:bg-white dark:bg-slate-900/80 dark:text-slate-300"
                  @click="closeVenuePanel"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div class="space-y-4 p-4">
                <div>
                  <h3 class="font-display text-base font-semibold text-slate-900 dark:text-white">
                    {{ venueName(mapStore.activeVenue) }}
                  </h3>
                  <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{{ venueAddress(mapStore.activeVenue) }}</p>
                </div>

                <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{{ venueDesc(mapStore.activeVenue) }}</p>

                <dl class="space-y-1.5 text-xs">
                  <div class="flex gap-2">
                    <dt class="shrink-0 text-slate-400 dark:text-slate-500">{{ t.exploreOpenHours }}</dt>
                    <dd class="text-slate-700 dark:text-slate-300">{{ venueHours(mapStore.activeVenue) }}</dd>
                  </div>
                  <div class="flex gap-2">
                    <dt class="shrink-0 text-slate-400 dark:text-slate-500">{{ t.exploreVenueTel }}</dt>
                    <dd class="text-slate-700 dark:text-slate-300">{{ mapStore.activeVenue.tel }}</dd>
                  </div>
                  <div class="flex gap-2">
                    <dt class="shrink-0 text-slate-400 dark:text-slate-500">{{ t.exploreVenueTags }}</dt>
                    <dd class="flex flex-wrap gap-1">
                      <span
                        v-for="tag in venueTags(mapStore.activeVenue)"
                        :key="tag"
                        class="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      >{{ tag }}</span>
                    </dd>
                  </div>
                </dl>

                <div class="flex flex-col gap-2">
                  <button
                    type="button"
                    class="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 py-2 text-sm font-medium text-teal-800 transition hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-950/60"
                    :disabled="routeState === 'locating' || routeState === 'drawing'"
                    @click="navigateTo(mapStore.activeVenue!)"
                  >
                    <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 20.25l-5.25-5.25a7.5 7.5 0 1 1 10.606 0L9 20.25z" />
                    </svg>
                    <span v-if="routeState === 'locating'">{{ store.locale === 'zh' ? '获取位置中…' : 'Locating…' }}</span>
                    <span v-else-if="routeState === 'drawing'">{{ store.locale === 'zh' ? '规划路线中…' : 'Planning…' }}</span>
                    <span v-else>{{ store.locale === 'zh' ? '导航到这里' : 'Navigate here' }}</span>
                  </button>
                  <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0">
                    <div
                      v-if="routeMsg && routeVenueId === mapStore.activeVenue.id"
                      class="rounded-xl px-3 py-2 text-xs"
                      :class="routeState === 'geofence_ok'
                        ? 'bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                        : routeState === 'error'
                          ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                          : 'bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400'"
                    >
                      {{ routeMsg }}
                    </div>
                  </Transition>
                </div>

                <div v-if="mapStore.venueActivities(mapStore.activeVenue.id).length > 0">
                  <p class="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {{ store.locale === 'zh' ? '近期活动（随日历筛选）' : 'Events (calendar filter)' }}
                  </p>
                  <div class="space-y-2">
                    <div
                      v-for="a in mapStore.venueActivities(mapStore.activeVenue.id)"
                      :key="a.id"
                      class="cursor-pointer rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:border-teal-200 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-teal-800"
                      @click="openActivity(a)"
                    >
                      <p class="text-xs font-medium text-slate-800 dark:text-slate-200">{{ actTitle(a) }}</p>
                      <p class="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{{ a.date }} · {{ actTime(a) }}</p>
                      <div v-if="a.quota && a.remaining !== null" class="mt-2">
                        <div class="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">
                          <span>{{ store.locale === 'zh' ? '剩余名额' : 'Remaining' }}</span>
                          <span>{{ a.remaining }}/{{ a.quota }}</span>
                        </div>
                        <div class="h-1 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            class="h-1 rounded-full transition-all duration-500"
                            :class="(a.remaining / a.quota) < 0.3 ? 'bg-amber-500' : 'bg-teal-500'"
                            :style="{ width: `${((a.quota - a.remaining) / a.quota) * 100}%` }"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Calendar: iOS-style multi / range; filters map only -->
        <aside
          class="w-full shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-700 dark:bg-slate-900 xl:w-[320px]"
        >
          <div class="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="Previous month"
              @click="prevMonth"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div class="min-w-0 flex-1 text-center">
              <p class="text-[13px] font-semibold tracking-tight text-slate-900 dark:text-white">
                {{ store.locale === 'zh' ? `${calYear}年 ${monthNames[calMonth]}` : `${monthNamesEn[calMonth]} ${calYear}` }}
              </p>
              <p class="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                {{ store.locale === 'zh' ? `地图活动 · ${filteredEventCount}` : `On map · ${filteredEventCount}` }}
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                class="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 disabled:opacity-25 dark:text-slate-400 dark:hover:bg-slate-800"
                :disabled="mapStore.filterUndoStack.length === 0"
                aria-label="Undo"
                @click="undoCalendarFilter"
              >
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
              </button>
              <button
                type="button"
                class="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                aria-label="Clear selection"
                @click="clearCalendarFilterAndAnchor"
              >
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                type="button"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                aria-label="Next month"
                @click="nextMonth"
              >
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div class="mb-2 grid grid-cols-7 gap-y-1 text-center">
            <span
              v-for="d in (store.locale === 'zh' ? ['日','一','二','三','四','五','六'] : ['S','M','T','W','T','F','S'])"
              :key="d"
              class="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500"
            >{{ d }}</span>
          </div>

          <div class="grid grid-cols-7 gap-1">
            <button
              v-for="(cell, idx) in calDays"
              :key="idx"
              type="button"
              :disabled="cell.date === 0"
              class="relative flex aspect-square max-h-11 items-center justify-center rounded-full text-[13px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 disabled:cursor-default disabled:opacity-0"
              :class="[
                cell.date === 0 ? 'pointer-events-none' : 'cursor-pointer',
                isDateFiltered(cell.dateStr)
                  ? 'bg-teal-600 text-white shadow-sm dark:bg-teal-500'
                  : rangeAnchor === cell.dateStr
                    ? 'bg-teal-100 text-teal-900 ring-2 ring-teal-500 ring-offset-2 ring-offset-white dark:bg-teal-950/60 dark:text-teal-100 dark:ring-teal-400 dark:ring-offset-slate-900'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
                isToday(cell.dateStr) && !isDateFiltered(cell.dateStr) && rangeAnchor !== cell.dateStr
                  ? 'font-bold text-teal-700 dark:text-teal-400'
                  : '',
              ]"
              @click="onCalendarDayClick(cell.dateStr, cell.date === 0)"
            >
              <span v-if="cell.date !== 0">{{ cell.date }}</span>
              <span
                v-if="cell.hasActivity && cell.date !== 0 && !isDateFiltered(cell.dateStr)"
                class="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-amber-500 dark:bg-amber-400"
              />
              <span
                v-if="cell.hasActivity && cell.date !== 0 && isDateFiltered(cell.dateStr)"
                class="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white/90"
              />
            </button>
          </div>

          <p class="mt-3 text-center text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
            {{ store.locale === 'zh'
              ? '点选未选日期可单选或拖选范围（再点另一端）；已选日期再点可取消；垃圾桶清空，弯箭头撤销。'
              : 'Tap to start a range, tap again to add the span; tap a selected day to remove. Trash clears, curved arrow undoes.' }}
          </p>
        </aside>
      </div>
    </div>

    <!-- Floating venue card -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-95 translate-y-1"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100 translate-y-0"
        leave-to-class="opacity-0 scale-95 translate-y-1"
      >
        <div
          v-if="cardVisible && mapStore.pinnedVenue"
          class="fixed z-[300] w-64 rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
          :style="{ left: `${cardPos.x}px`, top: `${cardPos.y}px` }"
        >
          <div class="flex items-start gap-2 border-b border-slate-100 p-3 dark:border-slate-800">
            <span
              class="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
              :class="{
                'bg-teal-600': mapStore.pinnedVenue.ichCategory === 'museum',
                'bg-amber-600': mapStore.pinnedVenue.ichCategory === 'craft',
                'bg-purple-600': mapStore.pinnedVenue.ichCategory === 'performing',
                'bg-rose-600': mapStore.pinnedVenue.ichCategory === 'festival',
                'bg-green-600': mapStore.pinnedVenue.ichCategory === 'culinary',
              }"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {{ venueName(mapStore.pinnedVenue) }}
              </p>
              <p class="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {{ mapStore.pinnedVenue.city }} · {{ venueType(mapStore.pinnedVenue) }}
              </p>
            </div>
            <button
              type="button"
              class="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              @click="mapStore.pinVenue(null); cardVisible = false"
            >
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="p-3 space-y-2">
            <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {{ store.locale === 'zh' ? '活动预约' : 'Book Events' }}
            </p>
            <template v-if="mapStore.venueActivities(mapStore.pinnedVenue.id).length > 0">
              <button
                v-for="a in mapStore.venueActivities(mapStore.pinnedVenue.id).slice(0, 2)"
                :key="a.id"
                type="button"
                class="w-full rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-left transition hover:border-teal-200 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-teal-800"
                @click="openActivity(a)"
              >
                <p class="text-xs font-medium leading-snug text-slate-800 dark:text-slate-200">{{ actTitle(a) }}</p>
                <p class="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{{ a.date }}</p>
                <div v-if="a.quota && a.remaining !== null" class="mt-1.5">
                  <div class="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">
                    <span>{{ store.locale === 'zh' ? '名额' : 'Spots' }}</span>
                    <span :class="a.remaining <= 5 ? 'text-amber-600 dark:text-amber-400' : ''">
                      {{ a.remaining }}/{{ a.quota }}
                    </span>
                  </div>
                  <div class="h-1 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      class="h-1 rounded-full transition-all duration-500"
                      :class="(a.remaining / a.quota) < 0.3 ? 'bg-amber-500' : 'bg-teal-500'"
                      :style="{ width: `${((a.quota - a.remaining) / a.quota) * 100}%` }"
                    />
                  </div>
                </div>
              </button>
            </template>
            <p v-else class="text-xs text-slate-400 dark:text-slate-500">
              {{ store.locale === 'zh' ? '当前筛选下暂无活动' : 'No events for current filter' }}
            </p>
          </div>

          <div class="flex gap-2 border-t border-slate-100 px-3 py-2.5 dark:border-slate-800">
            <button
              type="button"
              class="flex-1 rounded-lg bg-teal-800 py-1.5 text-xs font-medium text-white transition hover:bg-teal-900 dark:bg-teal-600 dark:hover:bg-teal-500"
              @click="mapStore.setActiveVenue(mapStore.pinnedVenue!.id)"
            >
              {{ store.locale === 'zh' ? '查看详情' : 'View details' }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Book modal -->
    <Teleport to="body">
      <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showBookModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm" @click.self="closeBook">
          <div class="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900">
            <div class="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h3 class="font-display text-base font-semibold text-slate-900 dark:text-white">{{ t.exploreBookTitle }}</h3>
              <p v-if="selectedActivity" class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{{ actTitle(selectedActivity) }}</p>
            </div>
            <div v-if="bookDone" class="flex flex-col items-center gap-3 px-5 py-8 text-center">
              <div class="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-3xl dark:bg-teal-950/50">✓</div>
              <h4 class="font-display text-lg font-semibold text-teal-800 dark:text-teal-300">
                {{ bookMode === 'created' ? t.exploreBookSuccess : (store.locale === 'zh' ? '预约信息与凭证' : 'Booking info & pass') }}
              </h4>
              <p class="text-sm text-slate-500 dark:text-slate-400">
                {{ bookMode === 'created' ? t.exploreBookSuccessHint : (store.locale === 'zh' ? '可用于现场核验与信息确认。' : 'Use this pass for on-site verification.') }}
              </p>
              <div class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <p>{{ t.exploreBookNameLabel }}：{{ bookName }}</p>
                <p>{{ t.exploreBookPhoneLabel }}：{{ bookPhone }}</p>
                <p v-if="bookEmail">{{ store.locale === 'zh' ? '邮箱' : 'Email' }}：{{ bookEmail }}</p>
                <p>{{ t.exploreBookCountLabel }}：{{ bookingTotalCount }}（{{ t.exploreBookAdultsLabel }} {{ bookAdults }} / {{ t.exploreBookChildrenLabel }} {{ bookChildren }}）</p>
                <p>{{ t.exploreBookTransportLabel }}：{{ bookTransportMode === 'metro' ? t.exploreBookTransportMetro : bookTransportMode === 'bus' ? t.exploreBookTransportBus : bookTransportMode === 'car' ? t.exploreBookTransportCar : t.exploreBookTransportTaxi }}</p>
                <p v-if="bookNotes">{{ t.exploreBookNotesLabel }}：{{ bookNotes }}</p>
              </div>
              <div v-if="bookVoucher" class="w-full rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-left text-xs text-teal-800 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-200">
                <p>{{ `${t.exploreBookVoucherCode}：${bookVoucher.code}` }}</p>
                <p>
                  {{
                    `${t.exploreBookVoucherStatus}：${
                      bookVoucher.status === 'confirmed'
                        ? t.exploreBookVoucherStatusConfirmed
                        : t.exploreBookVoucherStatusPending
                    }`
                  }}
                </p>
                <p>{{ `${t.exploreBookVoucherCreatedAt}：${bookVoucher.createdAt}` }}</p>
              </div>
              <div
                v-if="bookVoucher"
                class="w-full rounded-xl border border-slate-200 bg-white p-3 text-left dark:border-slate-700 dark:bg-slate-900"
              >
                <p class="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {{ store.locale === 'zh' ? '入场凭证二维码' : 'Entry pass QR code' }}
                </p>
                <div class="mt-2 flex items-start gap-3">
                  <div class="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
                    <div :style="qrGridStyle" class="w-[174px] overflow-hidden rounded">
                      <span
                        v-for="(cell, idx) in flatQrCells"
                        :key="`qr-${idx}`"
                        class="h-[6px] w-[6px]"
                        :class="cell ? 'bg-slate-900 dark:bg-slate-100' : 'bg-white dark:bg-slate-950'"
                      />
                    </div>
                  </div>
                  <div class="min-w-0 text-[11px] text-slate-500 dark:text-slate-400">
                    <p>{{ store.locale === 'zh' ? '凭证号' : 'Pass code' }}: {{ bookVoucher.code }}</p>
                    <p class="mt-1">{{ store.locale === 'zh' ? '用于现场核验' : 'For on-site verification' }}</p>
                  </div>
                </div>
              </div>
              <p class="text-xs text-teal-600 dark:text-teal-400">+{{ selectedActivity?.pointsReward }} {{ store.locale === 'zh' ? '积分（签到后领取）' : 'pts (claim after check-in)' }}</p>
              <button type="button" class="mt-2 w-full rounded-xl bg-teal-800 py-2.5 text-sm font-medium text-white transition hover:bg-teal-900 dark:bg-teal-600" @click="closeBook">
                {{ store.locale === 'zh' ? '完成' : 'Done' }}
              </button>
            </div>
            <form v-else class="space-y-4 px-5 py-4" @submit.prevent="submitBook">
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">{{ t.exploreBookNameLabel }}</label>
                <input v-model="bookName" type="text" required class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">{{ t.exploreBookPhoneLabel }}</label>
                <input v-model="bookPhone" type="tel" required class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  {{ t.exploreBookEmailLabel }}
                </label>
                <input v-model="bookEmail" type="email" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  {{ t.exploreBookEmergencyLabel }}
                </label>
                <input v-model="bookEmergencyContact" type="text" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    {{ t.exploreBookAdultsLabel }}
                  </label>
                  <select v-model="bookAdults" :class="selectFieldClass">
                    <option v-for="n in 10" :key="`book-adult-${n}`" :value="n - 1">{{ n - 1 }}</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    {{ t.exploreBookChildrenLabel }}
                  </label>
                  <select v-model="bookChildren" :class="selectFieldClass">
                    <option v-for="n in 10" :key="`book-child-${n}`" :value="n - 1">{{ n - 1 }}</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  {{ t.exploreBookCountLabel }}: {{ bookingTotalCount }}
                </label>
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  {{ t.exploreBookTransportLabel }}
                </label>
                <select v-model="bookTransportMode" :class="selectFieldClass">
                  <option value="metro">{{ t.exploreBookTransportMetro }}</option>
                  <option value="bus">{{ t.exploreBookTransportBus }}</option>
                  <option value="car">{{ t.exploreBookTransportCar }}</option>
                  <option value="taxi">{{ t.exploreBookTransportTaxi }}</option>
                </select>
              </div>
              <div
                v-if="carParkingAdvice"
                class="rounded-xl border px-3 py-2 text-left text-xs"
                :class="carParkingAdvice.highPressure
                  ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                  : 'border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-200'"
              >
                {{ carParkingAdvice.message }}
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  {{ t.exploreBookNotesLabel }}
                </label>
                <textarea v-model="bookNotes" rows="2" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
              </div>
              <div class="space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
                <label class="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input v-model="bookHealthConfirmed" type="checkbox" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 dark:border-slate-600 dark:bg-slate-800" />
                  <span>{{ t.exploreBookHealthConfirm }}</span>
                </label>
                <label class="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input v-model="bookLiabilityConfirmed" type="checkbox" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 dark:border-slate-600 dark:bg-slate-800" />
                  <span>{{ t.exploreBookLiabilityConfirm }}</span>
                </label>
              </div>
              <div class="flex justify-between">
                <button type="button" class="text-xs text-teal-700 underline-offset-2 hover:underline dark:text-teal-400" @click="applyPresetToBooking">
                  {{ t.exploreBookUsePreset }}
                </button>
              </div>
              <p v-if="bookError" class="text-xs text-rose-600 dark:text-rose-400">{{ bookError }}</p>
              <div class="flex gap-3 pt-1">
                <button type="button" class="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300" @click="closeBook">
                  {{ store.locale === 'zh' ? '取消' : 'Cancel' }}
                </button>
                <button type="submit" class="flex-1 rounded-xl bg-teal-800 py-2.5 text-sm font-medium text-white transition hover:bg-teal-900 dark:bg-teal-600">
                  {{ t.exploreBookConfirm }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
