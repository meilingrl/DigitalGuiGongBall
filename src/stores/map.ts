/**
 * stores/map.ts
 * Explore 地图：场馆联动 + 按「选中日期集合」筛选地图上的活动点位。
 * activityFilterDates 为空数组 → 不筛选，显示全部活动；非空 → 仅显示日期落在集合内的活动。
 */

import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { AMapAdapter } from '../map/AMapAdapter'
import { venues, activities, type Venue, type Activity } from '../data/explore'
import type { BoundsRect } from '../map/types'

export const useMapStore = defineStore('map', () => {
  const adapter = shallowRef<AMapAdapter | null>(null)

  const activeVenueId = ref<string | null>(null)

  const activeVenue = computed<Venue | null>(
    () => venues.find((v) => v.id === activeVenueId.value) ?? null,
  )

  function setActiveVenue(id: string | null): void {
    activeVenueId.value = id
    if (id && adapter.value) {
      const venue = venues.find((v) => v.id === id)
      if (venue) {
        adapter.value.panTo({ lng: venue.lng, lat: venue.lat })
        adapter.value.setZoom(13)
      }
    }
  }

  const visibleVenueIds = ref<Set<string>>(new Set(venues.map((v) => v.id)))

  const visibleVenues = computed<Venue[]>(() =>
    venues.filter((v) => visibleVenueIds.value.has(v.id)),
  )

  function refreshVisibleVenues(): void {
    if (!adapter.value) {
      visibleVenueIds.value = new Set(venues.map((v) => v.id))
      return
    }
    const bounds: BoundsRect | null = adapter.value.getBounds()
    if (!bounds) {
      visibleVenueIds.value = new Set(venues.map((v) => v.id))
      return
    }
    const { southWest: sw, northEast: ne } = bounds
    const ids = new Set<string>()
    venues.forEach((v) => {
      if (v.lng >= sw.lng && v.lng <= ne.lng && v.lat >= sw.lat && v.lat <= ne.lat) {
        ids.add(v.id)
      }
    })
    visibleVenueIds.value = ids.size > 0 ? ids : new Set(venues.map((v) => v.id))
  }

  // ── Activity filter: multi-date (calendar), empty = show all ────────────────
  const activityFilterDates = ref<string[]>([])
  const filterUndoStack = ref<string[][]>([])

  const visibleActivities = computed<Activity[]>(() => {
    if (activityFilterDates.value.length === 0) return activities
    const set = new Set(activityFilterDates.value)
    return activities.filter((a) => set.has(a.date))
  })

  function venueActivities(venueId: string): Activity[] {
    return visibleActivities.value.filter((a) => a.venueId === venueId)
  }

  /** Replace filter list; optionally record undo snapshot before change */
  function commitActivityFilter(next: string[], recordUndo: boolean): void {
    const sorted = [...new Set(next)].sort()
    if (recordUndo) {
      filterUndoStack.value.push([...activityFilterDates.value])
      if (filterUndoStack.value.length > 48) filterUndoStack.value.shift()
    }
    activityFilterDates.value = sorted
  }

  function undoActivityFilter(): void {
    const prev = filterUndoStack.value.pop()
    if (prev) activityFilterDates.value = [...prev]
  }

  /** 清空筛选 → 地图显示全部活动；记入撤销栈 */
  function clearActivityFilter(): void {
    filterUndoStack.value.push([...activityFilterDates.value])
    if (filterUndoStack.value.length > 48) filterUndoStack.value.shift()
    activityFilterDates.value = []
  }

  const pinnedVenueId = ref<string | null>(null)

  const pinnedVenue = computed<Venue | null>(
    () => venues.find((v) => v.id === pinnedVenueId.value) ?? null,
  )

  function pinVenue(id: string | null): void {
    pinnedVenueId.value = id
  }

  const mapReady = ref(false)
  const mapError = ref(false)

  function setAdapter(a: AMapAdapter): void {
    adapter.value = a
    mapReady.value = true
    mapError.value = false
    a.on('moveend', refreshVisibleVenues)
    a.on('zoomend', refreshVisibleVenues)
    refreshVisibleVenues()
  }

  function reset(): void {
    if (adapter.value) {
      adapter.value.off('moveend', refreshVisibleVenues)
      adapter.value.off('zoomend', refreshVisibleVenues)
      adapter.value.destroy()
      adapter.value = null
    }
    activeVenueId.value = null
    pinnedVenueId.value = null
    visibleVenueIds.value = new Set(venues.map((v) => v.id))
    activityFilterDates.value = []
    filterUndoStack.value = []
    mapReady.value = false
    mapError.value = false
  }

  function setError(): void {
    mapError.value = true
    mapReady.value = false
  }

  return {
    adapter,
    activeVenueId,
    activeVenue,
    visibleVenues,
    pinnedVenue,
    pinnedVenueId,
    mapReady,
    mapError,
    activityFilterDates,
    filterUndoStack,
    visibleActivities,
    setAdapter,
    setActiveVenue,
    commitActivityFilter,
    undoActivityFilter,
    clearActivityFilter,
    pinVenue,
    refreshVisibleVenues,
    venueActivities,
    reset,
    setError,
  }
})
