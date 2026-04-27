import { defineStore } from 'pinia'
import { ref } from 'vue'

export type TransportMode = 'metro' | 'bus' | 'car' | 'taxi'

export interface ExploreProfilePreset {
  contactName: string
  phone: string
  email: string
  emergencyContact: string
  transportMode: TransportMode
  adults: number
  children: number
}

const STORAGE_KEY = 'explore_profile_preset_v1'

const defaultPreset: ExploreProfilePreset = {
  contactName: '',
  phone: '',
  email: '',
  emergencyContact: '',
  transportMode: 'metro',
  adults: 1,
  children: 0,
}

function sanitizeCount(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(0, Math.min(9, Math.floor(value)))
}

export const useExploreProfileStore = defineStore('explore-profile', () => {
  const preset = ref<ExploreProfilePreset>({ ...defaultPreset })
  const hydrated = ref(false)

  function hydrateFromStorage(): void {
    if (hydrated.value || typeof window === 'undefined') return
    hydrated.value = true
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as Partial<ExploreProfilePreset>
      preset.value = {
        contactName: typeof parsed.contactName === 'string' ? parsed.contactName : '',
        phone: typeof parsed.phone === 'string' ? parsed.phone : '',
        email: typeof parsed.email === 'string' ? parsed.email : '',
        emergencyContact: typeof parsed.emergencyContact === 'string' ? parsed.emergencyContact : '',
        transportMode:
          parsed.transportMode === 'metro' ||
          parsed.transportMode === 'bus' ||
          parsed.transportMode === 'car' ||
          parsed.transportMode === 'taxi'
            ? parsed.transportMode
            : 'metro',
        adults: sanitizeCount(parsed.adults, 1),
        children: sanitizeCount(parsed.children, 0),
      }
    } catch {
      preset.value = { ...defaultPreset }
    }
  }

  function persist(): void {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preset.value))
  }

  function savePreset(next: ExploreProfilePreset): void {
    preset.value = {
      ...next,
      adults: sanitizeCount(next.adults, 1),
      children: sanitizeCount(next.children, 0),
    }
    persist()
  }

  function resetPreset(): void {
    preset.value = { ...defaultPreset }
    persist()
  }

  return {
    preset,
    hydrateFromStorage,
    savePreset,
    resetPreset,
  }
})
