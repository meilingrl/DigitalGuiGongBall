import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { createPinia, disposePinia, setActivePinia, storeToRefs } from 'pinia'
import { useAppStore } from '../src/stores/app.js'
import { usePreferencesStore } from '../src/stores/preferences.js'

class MemoryStorage implements Storage {
  private data = new Map<string, string>()
  get length() { return this.data.size }
  key(index: number) { return [...this.data.keys()][index] ?? null }
  getItem(key: string) { return this.data.get(key) ?? null }
  setItem(key: string, value: string) { this.data.set(key, value) }
  removeItem(key: string) { this.data.delete(key) }
  clear() { this.data.clear() }
}

function browser(t: TestContext, systemDark: boolean) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const storage = new MemoryStorage()
  const matchMedia = (media: string): MediaQueryList => ({
    matches: systemDark && media === '(prefers-color-scheme: dark)',
    media, onchange: null,
    addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {},
    dispatchEvent() { return true },
  })
  Object.defineProperty(globalThis, 'window', {
    configurable: true, value: { localStorage: storage, matchMedia },
  })
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, 'window', descriptor)
    else Reflect.deleteProperty(globalThis, 'window')
  })
  return storage
}

function session(t: TestContext) {
  const pinia = createPinia()
  setActivePinia(pinia)
  t.after(() => disposePinia(pinia))
  return pinia
}

test('saved theme overrides the system and toggling persists for the next session', (t) => {
  const storage = browser(t, true)
  storage.setItem('theme', 'light')
  const preferences = usePreferencesStore(session(t))
  preferences.initTheme()
  assert.equal(preferences.theme, 'light')

  preferences.toggleTheme()
  assert.equal(preferences.theme, 'dark')
  assert.equal(storage.getItem('theme'), 'dark')
  const reopened = usePreferencesStore(session(t))
  reopened.initTheme()
  assert.equal(reopened.theme, 'dark')
  reopened.setTheme('light')
  assert.equal(reopened.theme, 'light')
  assert.equal(storage.getItem('theme'), 'light')
})

for (const systemDark of [true, false]) {
  test(`absent or invalid saved theme uses the ${systemDark ? 'dark' : 'light'} system without writing a preference`, (t) => {
    const storage = browser(t, systemDark)
    for (const saved of [null, 'obsolete-theme']) {
      storage.clear()
      if (saved) storage.setItem('theme', saved)
      const preferences = usePreferencesStore(session(t))
      preferences.initTheme()
      assert.equal(preferences.theme, systemDark ? 'dark' : 'light')
      assert.equal(storage.getItem('theme'), saved)
    }
  })
}

test('legacy settings and active pages share theme actions, mutable state and locale translations', (t) => {
  const storage = browser(t, false)
  const pinia = session(t)
  const legacy = useAppStore(pinia)
  const preferences = usePreferencesStore(pinia)
  const legacyRefs = storeToRefs(legacy)
  const activeRefs = storeToRefs(preferences)
  const languageLabel = () => legacy.t.languageLabel

  storage.setItem('theme', 'dark')
  legacy.initTheme()
  assert.equal(activeRefs.theme.value, 'dark')
  legacy.toggleTheme()
  assert.equal(activeRefs.theme.value, 'light')
  assert.equal(storage.getItem('theme'), 'light')
  legacy.setTheme('dark')
  assert.equal(activeRefs.theme.value, 'dark')
  preferences.toggleTheme()
  assert.equal(legacyRefs.theme.value, 'light')
  preferences.setTheme('dark')
  assert.equal(legacyRefs.theme.value, 'dark')
  legacyRefs.theme.value = 'light'
  assert.equal(activeRefs.theme.value, 'light')
  preferences.$patch({ theme: 'dark' })
  assert.equal(legacy.$state.theme, 'dark')

  assert.equal(preferences.locale, 'zh')
  assert.equal(languageLabel(), '界面语言')
  legacy.setLocale('en')
  assert.equal(activeRefs.locale.value, 'en')
  assert.equal(languageLabel(), 'Language')
  preferences.toggleLocale()
  assert.equal(legacyRefs.locale.value, 'zh')
  assert.equal(languageLabel(), '界面语言')
  preferences.setLocale('en')
  assert.equal(legacy.locale, 'en')
  legacy.toggleLocale()
  assert.equal(preferences.locale, 'zh')
  activeRefs.locale.value = 'en'
  assert.equal(languageLabel(), 'Language')
  legacy.$patch({ locale: 'zh' })
  assert.equal(preferences.locale, 'zh')
})

test('preferences are owned by a Pinia session rather than shared across apps', (t) => {
  browser(t, false)
  const first = usePreferencesStore(session(t))
  first.setTheme('dark')
  first.setLocale('en')
  const second = usePreferencesStore(session(t))
  assert.equal(second.theme, 'light')
  assert.equal(second.locale, 'zh')
  second.initTheme()
  assert.equal(second.theme, 'dark')
  assert.equal(second.locale, 'zh', 'locale keeps its existing non-persistent behavior')
  assert.equal(first.locale, 'en')
})
