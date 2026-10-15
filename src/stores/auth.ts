import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { User } from '../../shared/design'
import { api, ApiError, errorMessage } from '../lib/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const initialized = ref(false)
  const error = ref('')
  let restoring: Promise<void> | null = null

  async function restore(force = false): Promise<void> {
    if (restoring) return restoring
    if (initialized.value && !force) return
    restoring = (async () => {
      error.value = ''
      try { user.value = (await api<{ user: User }>('/api/auth/me')).user }
      catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) user.value = null
        else error.value = errorMessage(cause)
      } finally { initialized.value = true; restoring = null }
    })()
    return restoring
  }

  async function signIn(username: string, password: string, displayName?: string) {
    const path = displayName === undefined ? '/api/auth/login' : '/api/auth/register'
    const result = await api<{ user: User }>(path, { method: 'POST', body: { username, password, ...(displayName === undefined ? {} : { displayName }) } })
    user.value = result.user
    initialized.value = true
    error.value = ''
  }

  async function signOut() {
    await api('/api/auth/logout', { method: 'POST' })
    user.value = null
    error.value = ''
    initialized.value = true
  }

  return { user, initialized, error, restore, signIn, signOut }
})
