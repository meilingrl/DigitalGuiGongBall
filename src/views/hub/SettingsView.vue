<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAppStore } from '../../stores/app'
import { useExploreProfileStore, type TransportMode } from '../../stores/exploreProfile'

const store = useAppStore()
const exploreProfileStore = useExploreProfileStore()
exploreProfileStore.hydrateFromStorage()

// ── active section ────────────────────────────────────────────────────────────
type Section = 'account' | 'binding' | 'privacy' | 'preferences' | 'feedback' | 'display'
const activeSection = ref<Section>('account')

const sections: { key: Section; icon: string; labelZh: string; labelEn: string }[] = [
  { key: 'account',     icon: '🔐', labelZh: '账户安全',   labelEn: 'Account & Security' },
  { key: 'binding',     icon: '🔗', labelZh: '绑定信息',   labelEn: 'Linked Accounts' },
  { key: 'privacy',     icon: '🛡️', labelZh: '隐私设置',   labelEn: 'Privacy' },
  { key: 'preferences', icon: '🎛️', labelZh: '偏好设置',   labelEn: 'Preferences' },
  { key: 'feedback',    icon: '💬', labelZh: '意见反馈',   labelEn: 'Feedback' },
  { key: 'display',     icon: '🌐', labelZh: '语言与显示', labelEn: 'Language & Display' },
]

function label(zh: string, en: string) {
  return store.locale === 'zh' ? zh : en
}

// ── account section state ─────────────────────────────────────────────────────
const showCurrentPwd = ref(false)
const showNewPwd = ref(false)
const showConfirmPwd = ref(false)
const currentPwd = ref('')
const newPwd = ref('')
const confirmPwd = ref('')
const displayNameInput = ref(store.displayName)
const presetNameInput = ref(exploreProfileStore.preset.contactName)
const presetPhoneInput = ref(exploreProfileStore.preset.phone)
const presetEmailInput = ref(exploreProfileStore.preset.email)
const presetEmergencyInput = ref(exploreProfileStore.preset.emergencyContact)
const presetTransport = ref<TransportMode>(exploreProfileStore.preset.transportMode)
const presetAdults = ref(exploreProfileStore.preset.adults)
const presetChildren = ref(exploreProfileStore.preset.children)
const presetSaved = ref(false)

// ── binding section state ─────────────────────────────────────────────────────
const emailInput = ref('l**n@example.com')
const phoneInput = ref('138****5678')

const thirdPartyBindings = [
  { id: 'wechat',  icon: '💬', nameZh: '微信',    nameEn: 'WeChat',    bound: true  },
  { id: 'qq',      icon: '🐧', nameZh: 'QQ',       nameEn: 'QQ',        bound: false },
  { id: 'weibo',   icon: '📢', nameZh: '微博',     nameEn: 'Weibo',     bound: true  },
  { id: 'github',  icon: '🐙', nameZh: 'GitHub',   nameEn: 'GitHub',    bound: false },
]

// ── privacy section state ─────────────────────────────────────────────────────
const profileVisibility = ref<'public' | 'friends' | 'private'>('public')
const allowComments = ref(true)
const showInSearch = ref(true)
const shareActivity = ref(true)
const allowCollabInvite = ref(true)

// ── preferences section state ─────────────────────────────────────────────────
const notifyLikes = ref(true)
const notifyComments = ref(true)
const notifyCollabs = ref(false)
const notifySystem = ref(true)
const autoSave = ref(true)
const reduceMotion = ref(false)
const compactMode = ref(false)
const defaultTool = ref<'sculpt' | 'relief' | 'perforate' | 'polish' | 'texture'>('sculpt')

const toolOptions: { key: typeof defaultTool.value; labelZh: string; labelEn: string }[] = [
  { key: 'sculpt',    labelZh: '雕刻',   labelEn: 'Sculpt'    },
  { key: 'relief',    labelZh: '浮雕',   labelEn: 'Relief'    },
  { key: 'perforate', labelZh: '镂空',   labelEn: 'Perforate' },
  { key: 'polish',    labelZh: '抛光',   labelEn: 'Polish'    },
  { key: 'texture',   labelZh: '纹理',   labelEn: 'Texture'   },
]

// ── feedback section state ────────────────────────────────────────────────────
const feedbackType = ref<'bug' | 'suggestion' | 'content' | 'other'>('suggestion')
const feedbackTitle = ref('')
const feedbackDetail = ref('')
const feedbackContact = ref('')
const feedbackAllowFollowup = ref(true)
const feedbackTouched = ref(false)
const isSubmittingFeedback = ref(false)
const feedbackSubmitted = ref(false)

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phoneRegex = /^1\d{10}$/

const feedbackTitleValid = computed(() => {
  const len = feedbackTitle.value.trim().length
  return len >= 5 && len <= 50
})

const feedbackDetailValid = computed(() => {
  const len = feedbackDetail.value.trim().length
  return len >= 10 && len <= 500
})

const feedbackContactValid = computed(() => {
  const v = feedbackContact.value.trim()
  if (!v) return true
  return emailRegex.test(v) || phoneRegex.test(v)
})

const canSubmitFeedback = computed(() =>
  feedbackTitleValid.value && feedbackDetailValid.value && feedbackContactValid.value && !isSubmittingFeedback.value,
)

const feedbackDetailCount = computed(() => feedbackDetail.value.trim().length)

function resetFeedbackForm(clearSuccess = true) {
  feedbackType.value = 'suggestion'
  feedbackTitle.value = ''
  feedbackDetail.value = ''
  feedbackContact.value = ''
  feedbackAllowFollowup.value = true
  feedbackTouched.value = false
  isSubmittingFeedback.value = false
  if (clearSuccess) feedbackSubmitted.value = false
}

function submitFeedback() {
  feedbackTouched.value = true
  feedbackSubmitted.value = false
  if (!canSubmitFeedback.value) return
  isSubmittingFeedback.value = true
  window.setTimeout(() => {
    resetFeedbackForm(false)
    feedbackSubmitted.value = true
  }, 700)
}

function saveExplorePreset() {
  exploreProfileStore.savePreset({
    contactName: presetNameInput.value.trim(),
    phone: presetPhoneInput.value.trim(),
    email: presetEmailInput.value.trim(),
    emergencyContact: presetEmergencyInput.value.trim(),
    transportMode: presetTransport.value,
    adults: presetAdults.value,
    children: presetChildren.value,
  })
  presetSaved.value = true
  window.setTimeout(() => {
    presetSaved.value = false
  }, 1800)
}

function resetExplorePreset() {
  exploreProfileStore.resetPreset()
  presetNameInput.value = ''
  presetPhoneInput.value = ''
  presetEmailInput.value = ''
  presetEmergencyInput.value = ''
  presetTransport.value = 'metro'
  presetAdults.value = 1
  presetChildren.value = 0
  presetSaved.value = false
}
</script>

<template>
  <div>
    <header class="mb-8">
      <p class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ store.t.settings }}</p>
      <h2 class="font-display mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
        {{ store.locale === 'zh' ? '个人设置' : 'Settings' }}
      </h2>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {{ store.locale === 'zh' ? '管理你的账户、隐私与偏好。' : 'Manage your account, privacy and preferences.' }}
      </p>
    </header>

    <div class="flex gap-6 flex-col lg:flex-row">
      <!-- Side nav -->
      <nav class="flex shrink-0 flex-col gap-0.5 lg:w-32">
        <button
          v-for="sec in sections"
          :key="sec.key"
          type="button"
          class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors text-left"
          :class="
            activeSection === sec.key
              ? 'bg-teal-50 text-teal-800 font-medium dark:bg-teal-950/50 dark:text-teal-200'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60'
          "
          @click="activeSection = sec.key"
        >
          <span class="text-base leading-none">{{ sec.icon }}</span>
          <span>{{ label(sec.labelZh, sec.labelEn) }}</span>
        </button>
      </nav>

      <!-- Content panel -->
      <div class="min-w-0 flex-1 space-y-6">

        <!-- ──────────────────────────────────────────────── -->
        <!-- ACCOUNT & SECURITY                               -->
        <!-- ──────────────────────────────────────────────── -->
        <template v-if="activeSection === 'account'">

          <!-- Display name -->
          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 class="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {{ label('显示名称', 'Display Name') }}
            </h3>
            <p class="mb-4 text-xs text-slate-500 dark:text-slate-400">
              {{ label('这是其他用户看到的昵称。', 'This is the nickname other users will see.') }}
            </p>
            <div class="flex gap-3">
              <input
                v-model="displayNameInput"
                type="text"
                class="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
                :placeholder="label('输入昵称…', 'Enter display name…')"
              />
              <button type="button" class="rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500">
                {{ label('保存', 'Save') }}
              </button>
            </div>
          </section>

          <!-- Change password -->
          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 class="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {{ label('修改密码', 'Change Password') }}
            </h3>
            <p class="mb-5 text-xs text-slate-500 dark:text-slate-400">
              {{ label('建议使用包含大小写字母、数字和符号的强密码。', 'Use a strong password containing uppercase, lowercase, numbers and symbols.') }}
            </p>
            <div class="max-w-sm space-y-4">
              <!-- Current password -->
              <div>
                <label class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  {{ label('当前密码', 'Current Password') }}
                </label>
                <div class="relative">
                  <input
                    v-model="currentPwd"
                    :type="showCurrentPwd ? 'text' : 'password'"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 pr-10 text-sm outline-none transition focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
                    :placeholder="label('输入当前密码', 'Enter current password')"
                  />
                  <button type="button" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" @click="showCurrentPwd = !showCurrentPwd">
                    <svg v-if="!showCurrentPwd" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>
                  </button>
                </div>
              </div>
              <!-- New password -->
              <div>
                <label class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  {{ label('新密码', 'New Password') }}
                </label>
                <div class="relative">
                  <input
                    v-model="newPwd"
                    :type="showNewPwd ? 'text' : 'password'"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 pr-10 text-sm outline-none transition focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
                    :placeholder="label('输入新密码（至少 8 位）', 'New password (min 8 chars)')"
                  />
                  <button type="button" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" @click="showNewPwd = !showNewPwd">
                    <svg v-if="!showNewPwd" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>
                  </button>
                </div>
                <!-- Strength bar -->
                <div class="mt-2 flex gap-1">
                  <div v-for="i in 4" :key="i" class="h-1 flex-1 rounded-full transition-colors"
                    :class="newPwd.length === 0 ? 'bg-slate-200 dark:bg-slate-700' : newPwd.length < 4 ? (i === 1 ? 'bg-rose-400' : 'bg-slate-200 dark:bg-slate-700') : newPwd.length < 8 ? (i <= 2 ? 'bg-amber-400' : 'bg-slate-200 dark:bg-slate-700') : newPwd.length < 12 ? (i <= 3 ? 'bg-teal-400' : 'bg-slate-200 dark:bg-slate-700') : 'bg-teal-600'"
                  />
                </div>
              </div>
              <!-- Confirm password -->
              <div>
                <label class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  {{ label('确认新密码', 'Confirm New Password') }}
                </label>
                <div class="relative">
                  <input
                    v-model="confirmPwd"
                    :type="showConfirmPwd ? 'text' : 'password'"
                    class="w-full rounded-xl border bg-slate-50 px-3 py-2 pr-10 text-sm outline-none transition focus:ring-1 focus:ring-teal-500/20 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
                    :class="confirmPwd && confirmPwd !== newPwd ? 'border-rose-400 focus:border-rose-400 dark:border-rose-500' : 'border-slate-200 focus:border-teal-500 dark:border-slate-700'"
                    :placeholder="label('再次输入新密码', 'Re-enter new password')"
                  />
                  <button type="button" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" @click="showConfirmPwd = !showConfirmPwd">
                    <svg v-if="!showConfirmPwd" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>
                  </button>
                </div>
                <p v-if="confirmPwd && confirmPwd !== newPwd" class="mt-1 text-[11px] text-rose-500">
                  {{ label('两次输入的密码不一致', 'Passwords do not match') }}
                </p>
              </div>
              <button type="button" class="mt-1 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-800 disabled:opacity-40 dark:bg-teal-600 dark:hover:bg-teal-500"
                :disabled="!currentPwd || !newPwd || newPwd !== confirmPwd">
                {{ label('更新密码', 'Update Password') }}
              </button>
            </div>
          </section>

          <!-- Danger zone -->
          <section class="rounded-2xl border border-rose-200 bg-white p-6 shadow-soft dark:border-rose-900/60 dark:bg-slate-900">
            <h3 class="mb-1 text-sm font-semibold text-rose-700 dark:text-rose-400">
              {{ label('危险操作', 'Danger Zone') }}
            </h3>
            <p class="mb-4 text-xs text-slate-500 dark:text-slate-400">
              {{ label('以下操作不可撤销，请谨慎操作。', 'The following actions are irreversible. Proceed with caution.') }}
            </p>
            <div class="flex flex-wrap gap-3">
              <button type="button" class="rounded-xl border border-rose-300 px-4 py-2 text-sm text-rose-600 transition hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30">
                {{ label('退出所有设备', 'Sign out all devices') }}
              </button>
              <button type="button" class="rounded-xl border border-rose-300 px-4 py-2 text-sm text-rose-600 transition hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30">
                {{ label('注销账户', 'Delete Account') }}
              </button>
            </div>
          </section>
        </template>

        <!-- ──────────────────────────────────────────────── -->
        <!-- BINDING                                          -->
        <!-- ──────────────────────────────────────────────── -->
        <template v-else-if="activeSection === 'binding'">

          <!-- Email -->
          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 class="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {{ label('邮箱地址', 'Email Address') }}
            </h3>
            <div class="flex max-w-sm items-center gap-3">
              <div class="relative flex-1">
                <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                <input v-model="emailInput" type="email" class="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
              </div>
              <button type="button" class="shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:border-teal-500 hover:text-teal-700 dark:border-slate-600 dark:text-slate-300 dark:hover:border-teal-500">
                {{ label('发送验证', 'Verify') }}
              </button>
            </div>
            <p class="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
              {{ label('邮箱用于登录与接收通知，修改后需重新验证。', 'Used for login and notifications. Re-verification required after changes.') }}
            </p>
          </section>

          <!-- Phone -->
          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 class="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {{ label('手机号码', 'Phone Number') }}
            </h3>
            <div class="flex max-w-sm items-center gap-3">
              <div class="relative flex-1">
                <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                <input v-model="phoneInput" type="tel" class="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
              </div>
              <button type="button" class="shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:border-teal-500 hover:text-teal-700 dark:border-slate-600 dark:text-slate-300 dark:hover:border-teal-500">
                {{ label('更换号码', 'Change') }}
              </button>
            </div>
          </section>

          <!-- Third-party -->
          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 class="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {{ label('第三方账号', 'Third-party Accounts') }}
            </h3>
            <div class="space-y-3">
              <div
                v-for="item in thirdPartyBindings"
                :key="item.id"
                class="flex items-center justify-between rounded-xl border border-slate-100 p-4 dark:border-slate-800"
              >
                <div class="flex items-center gap-3">
                  <span class="text-xl leading-none">{{ item.icon }}</span>
                  <div>
                    <p class="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {{ store.locale === 'zh' ? item.nameZh : item.nameEn }}
                    </p>
                    <p class="text-[11px]" :class="item.bound ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'">
                      {{ item.bound ? label('已绑定', 'Connected') : label('未绑定', 'Not connected') }}
                    </p>
                  </div>
                </div>
                <button type="button" class="rounded-lg border px-3 py-1.5 text-xs font-medium transition"
                  :class="item.bound
                    ? 'border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-rose-700 dark:hover:text-rose-400'
                    : 'border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-400 dark:hover:bg-teal-950/30'"
                >
                  {{ item.bound ? label('解绑', 'Disconnect') : label('绑定', 'Connect') }}
                </button>
              </div>
            </div>
          </section>
        </template>

        <!-- ──────────────────────────────────────────────── -->
        <!-- PRIVACY                                          -->
        <!-- ──────────────────────────────────────────────── -->
        <template v-else-if="activeSection === 'privacy'">

          <!-- Profile visibility -->
          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 class="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {{ label('个人主页可见性', 'Profile Visibility') }}
            </h3>
            <div class="space-y-2">
              <label
                v-for="opt in ([
                  { key: 'public',  labelZh: '所有人可见',     labelEn: 'Everyone',    descZh: '任何人都可以查看你的主页和作品。', descEn: 'Anyone can view your profile and works.' },
                  { key: 'friends', labelZh: '仅关注者可见',   labelEn: 'Followers only', descZh: '仅相互关注的用户可查看。', descEn: 'Only mutual followers can view.' },
                  { key: 'private', labelZh: '完全私密',       labelEn: 'Private',     descZh: '仅自己可见，其他人无法访问。', descEn: 'Only visible to you.' },
                ] as const)"
                :key="opt.key"
                class="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition"
                :class="profileVisibility === opt.key
                  ? 'border-teal-400 bg-teal-50/60 dark:border-teal-600 dark:bg-teal-950/30'
                  : 'border-slate-100 hover:border-slate-200 dark:border-slate-800 dark:hover:border-slate-700'"
                @click="profileVisibility = opt.key"
              >
                <span class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition"
                  :class="profileVisibility === opt.key ? 'border-teal-600 dark:border-teal-400' : 'border-slate-300 dark:border-slate-600'">
                  <span v-if="profileVisibility === opt.key" class="h-1.5 w-1.5 rounded-full bg-teal-600 dark:bg-teal-400" />
                </span>
                <div>
                  <p class="text-sm font-medium text-slate-800 dark:text-slate-200">{{ store.locale === 'zh' ? opt.labelZh : opt.labelEn }}</p>
                  <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{{ store.locale === 'zh' ? opt.descZh : opt.descEn }}</p>
                </div>
              </label>
            </div>
          </section>

          <!-- Toggle controls -->
          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 class="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {{ label('互动与数据', 'Interactions & Data') }}
            </h3>
            <div class="divide-y divide-slate-100 dark:divide-slate-800">
              <div v-for="item in ([
                { model: allowComments,    key: 'allowComments',    labelZh: '允许他人评论我的作品',   labelEn: 'Allow comments on my works' },
                { model: showInSearch,     key: 'showInSearch',     labelZh: '允许在搜索中被发现',     labelEn: 'Appear in search results' },
                { model: shareActivity,    key: 'shareActivity',    labelZh: '公开活跃记录（热力图）', labelEn: 'Show activity heatmap publicly' },
                { model: allowCollabInvite,key: 'allowCollabInvite',labelZh: '允许他人发起协作邀请',   labelEn: 'Allow collaboration invites' },
              ] as const)" :key="item.key" class="flex items-center justify-between py-3.5">
                <span class="text-sm text-slate-700 dark:text-slate-300">{{ store.locale === 'zh' ? item.labelZh : item.labelEn }}</span>
                <button type="button"
                  class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none"
                  :class="item.model ? 'bg-teal-600 dark:bg-teal-500' : 'bg-slate-200 dark:bg-slate-700'"
                  @click="
                    item.key === 'allowComments' ? allowComments = !allowComments :
                    item.key === 'showInSearch' ? showInSearch = !showInSearch :
                    item.key === 'shareActivity' ? shareActivity = !shareActivity :
                    allowCollabInvite = !allowCollabInvite
                  "
                >
                  <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                    :class="item.model ? 'translate-x-[18px]' : 'translate-x-[3px]'" />
                </button>
              </div>
            </div>
          </section>
        </template>

        <!-- ──────────────────────────────────────────────── -->
        <!-- PREFERENCES                                      -->
        <!-- ──────────────────────────────────────────────── -->
        <template v-else-if="activeSection === 'preferences'">
          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 class="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {{ label('探访预约预设', 'Explore Booking Preset') }}
            </h3>
            <p class="mb-4 text-xs text-slate-500 dark:text-slate-400">
              {{ label('保存常用信息，预约活动时自动回填。', 'Save frequent info and auto-fill your Explore bookings.') }}
            </p>
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input v-model="presetNameInput" type="text" class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" :placeholder="label('姓名', 'Name')" />
              <input v-model="presetPhoneInput" type="tel" class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" :placeholder="label('手机号', 'Phone')" />
              <input v-model="presetEmailInput" type="email" class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" :placeholder="label('邮箱（选填）', 'Email (optional)')" />
              <input v-model="presetEmergencyInput" type="text" class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" :placeholder="label('紧急联系人（选填）', 'Emergency contact (optional)')" />
              <select v-model="presetTransport" class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                <option value="metro">{{ label('地铁', 'Metro') }}</option>
                <option value="bus">{{ label('公交', 'Bus') }}</option>
                <option value="car">{{ label('自驾', 'Car') }}</option>
                <option value="taxi">{{ label('打车', 'Taxi') }}</option>
              </select>
              <div class="flex gap-2">
                <select v-model="presetAdults" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  <option v-for="n in 10" :key="`preset-adult-${n}`" :value="n - 1">
                    {{ label(`成人 ${n - 1}`, `Adults ${n - 1}`) }}
                  </option>
                </select>
                <select v-model="presetChildren" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  <option v-for="n in 10" :key="`preset-child-${n}`" :value="n - 1">
                    {{ label(`儿童 ${n - 1}`, `Children ${n - 1}`) }}
                  </option>
                </select>
              </div>
            </div>
            <div class="mt-4 flex flex-wrap gap-3">
              <button type="button" class="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-600 transition hover:border-slate-400 dark:border-slate-600 dark:text-slate-300" @click="resetExplorePreset">
                {{ label('重置预设', 'Reset Preset') }}
              </button>
              <button type="button" class="rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500" @click="saveExplorePreset">
                {{ label('保存预设', 'Save Preset') }}
              </button>
              <span v-if="presetSaved" class="text-sm text-teal-600 dark:text-teal-400">
                {{ label('已保存', 'Saved') }}
              </span>
            </div>
          </section>

          <!-- Notifications -->
          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 class="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {{ label('通知设置', 'Notifications') }}
            </h3>
            <div class="divide-y divide-slate-100 dark:divide-slate-800">
              <div v-for="item in ([
                { model: notifyLikes,    key: 'notifyLikes',    labelZh: '有人点赞了我的作品',   labelEn: 'Someone liked my work' },
                { model: notifyComments, key: 'notifyComments', labelZh: '有人评论了我的作品',   labelEn: 'Someone commented on my work' },
                { model: notifyCollabs,  key: 'notifyCollabs',  labelZh: '收到协作房间邀请',     labelEn: 'Co-op room invite received' },
                { model: notifySystem,   key: 'notifySystem',   labelZh: '系统公告与维护通知',   labelEn: 'System announcements & maintenance' },
              ] as const)" :key="item.key" class="flex items-center justify-between py-3.5">
                <span class="text-sm text-slate-700 dark:text-slate-300">{{ store.locale === 'zh' ? item.labelZh : item.labelEn }}</span>
                <button type="button"
                  class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none"
                  :class="item.model ? 'bg-teal-600 dark:bg-teal-500' : 'bg-slate-200 dark:bg-slate-700'"
                  @click="
                    item.key === 'notifyLikes' ? notifyLikes = !notifyLikes :
                    item.key === 'notifyComments' ? notifyComments = !notifyComments :
                    item.key === 'notifyCollabs' ? notifyCollabs = !notifyCollabs :
                    notifySystem = !notifySystem
                  "
                >
                  <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                    :class="item.model ? 'translate-x-[18px]' : 'translate-x-[3px]'" />
                </button>
              </div>
            </div>
          </section>

          <!-- Editor & UX -->
          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 class="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {{ label('编辑器与体验', 'Editor & Experience') }}
            </h3>

            <!-- Toggle rows -->
            <div class="divide-y divide-slate-100 dark:divide-slate-800">
              <div v-for="item in ([
                { model: autoSave,     key: 'autoSave',     labelZh: '自动保存雕刻进度',    labelEn: 'Auto-save carving progress',  descZh: '每 60 秒自动保存一次', descEn: 'Saves every 60 seconds' },
                { model: reduceMotion, key: 'reduceMotion', labelZh: '减少动画效果',         labelEn: 'Reduce motion',               descZh: '关闭视差与过渡动画', descEn: 'Disables parallax and transitions' },
                { model: compactMode,  key: 'compactMode',  labelZh: '紧凑显示模式',         labelEn: 'Compact display mode',        descZh: '缩小卡片和间距', descEn: 'Denser card & spacing layout' },
              ] as const)" :key="item.key" class="flex items-center justify-between py-3.5">
                <div>
                  <p class="text-sm text-slate-700 dark:text-slate-300">{{ store.locale === 'zh' ? item.labelZh : item.labelEn }}</p>
                  <p class="text-[11px] text-slate-400 dark:text-slate-500">{{ store.locale === 'zh' ? item.descZh : item.descEn }}</p>
                </div>
                <button type="button"
                  class="ml-4 relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none"
                  :class="item.model ? 'bg-teal-600 dark:bg-teal-500' : 'bg-slate-200 dark:bg-slate-700'"
                  @click="
                    item.key === 'autoSave' ? autoSave = !autoSave :
                    item.key === 'reduceMotion' ? reduceMotion = !reduceMotion :
                    compactMode = !compactMode
                  "
                >
                  <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                    :class="item.model ? 'translate-x-[18px]' : 'translate-x-[3px]'" />
                </button>
              </div>
            </div>

            <!-- Default tool -->
            <div class="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
              <p class="mb-3 text-sm text-slate-700 dark:text-slate-300">{{ label('默认雕刻工具', 'Default Carving Tool') }}</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="opt in toolOptions"
                  :key="opt.key"
                  type="button"
                  class="rounded-xl border px-3.5 py-1.5 text-sm transition"
                  :class="defaultTool === opt.key
                    ? 'border-teal-600 bg-teal-50 font-medium text-teal-800 dark:border-teal-500 dark:bg-teal-950/40 dark:text-teal-200'
                    : 'border-slate-200 text-slate-600 hover:border-teal-400 dark:border-slate-700 dark:text-slate-400 dark:hover:border-teal-600'"
                  @click="defaultTool = opt.key"
                >
                  {{ store.locale === 'zh' ? opt.labelZh : opt.labelEn }}
                </button>
              </div>
            </div>
          </section>
        </template>

        <!-- ──────────────────────────────────────────────── -->
        <!-- FEEDBACK                                         -->
        <!-- ──────────────────────────────────────────────── -->
        <template v-else-if="activeSection === 'feedback'">
          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 class="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {{ store.t.settingsFeedback }}
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">{{ store.t.feedbackIntro }}</p>
            <p class="mt-1 mb-5 text-xs text-slate-500 dark:text-slate-400">{{ store.t.feedbackBody }}</p>

            <div class="space-y-4">
              <div>
                <label class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  {{ store.t.feedbackTypeLabel }}
                </label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="opt in ([
                      { key: 'bug', label: store.t.feedbackTypeBug },
                      { key: 'suggestion', label: store.t.feedbackTypeSuggestion },
                      { key: 'content', label: store.t.feedbackTypeContent },
                      { key: 'other', label: store.t.feedbackTypeOther },
                    ] as const)"
                    :key="opt.key"
                    type="button"
                    class="rounded-xl border px-3.5 py-1.5 text-sm transition"
                    :class="feedbackType === opt.key
                      ? 'border-teal-600 bg-teal-50 font-medium text-teal-800 dark:border-teal-500 dark:bg-teal-950/40 dark:text-teal-200'
                      : 'border-slate-200 text-slate-600 hover:border-teal-400 dark:border-slate-700 dark:text-slate-400 dark:hover:border-teal-600'"
                    @click="feedbackType = opt.key"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <div>
                <label class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  {{ store.t.feedbackTitleLabel }}
                </label>
                <input
                  v-model="feedbackTitle"
                  type="text"
                  class="w-full rounded-xl border bg-slate-50 px-3 py-2 text-sm outline-none transition focus:ring-1 focus:ring-teal-500/20 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
                  :class="feedbackTouched && !feedbackTitleValid ? 'border-rose-400 focus:border-rose-400 dark:border-rose-500' : 'border-slate-200 focus:border-teal-500 dark:border-slate-700'"
                  :placeholder="store.t.feedbackTitlePlaceholder"
                  @blur="feedbackTouched = true"
                />
                <p v-if="feedbackTouched && !feedbackTitleValid" class="mt-1 text-[11px] text-rose-500">
                  {{ store.t.feedbackErrorTitleRequired }}
                </p>
              </div>

              <div>
                <label class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  {{ store.t.feedbackDetailLabel }}
                </label>
                <textarea
                  v-model="feedbackDetail"
                  rows="5"
                  class="w-full rounded-xl border bg-slate-50 px-3 py-2 text-sm outline-none transition focus:ring-1 focus:ring-teal-500/20 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
                  :class="feedbackTouched && !feedbackDetailValid ? 'border-rose-400 focus:border-rose-400 dark:border-rose-500' : 'border-slate-200 focus:border-teal-500 dark:border-slate-700'"
                  :placeholder="store.t.feedbackDetailPlaceholder"
                  @blur="feedbackTouched = true"
                />
                <div class="mt-1 flex items-center justify-between">
                  <p v-if="feedbackTouched && !feedbackDetailValid" class="text-[11px] text-rose-500">
                    {{ store.t.feedbackErrorDetailRequired }}
                  </p>
                  <span class="ml-auto text-[11px] text-slate-400 dark:text-slate-500">
                    {{ feedbackDetailCount }}/500
                  </span>
                </div>
              </div>

              <div>
                <label class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  {{ store.t.feedbackContactLabel }}
                </label>
                <input
                  v-model="feedbackContact"
                  type="text"
                  class="w-full rounded-xl border bg-slate-50 px-3 py-2 text-sm outline-none transition focus:ring-1 focus:ring-teal-500/20 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
                  :class="feedbackTouched && !feedbackContactValid ? 'border-rose-400 focus:border-rose-400 dark:border-rose-500' : 'border-slate-200 focus:border-teal-500 dark:border-slate-700'"
                  :placeholder="store.t.feedbackContactPlaceholder"
                  @blur="feedbackTouched = true"
                />
                <p v-if="feedbackTouched && !feedbackContactValid" class="mt-1 text-[11px] text-rose-500">
                  {{ store.t.feedbackErrorContactInvalid }}
                </p>
              </div>

              <label class="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
                <input
                  v-model="feedbackAllowFollowup"
                  type="checkbox"
                  class="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 dark:border-slate-600 dark:bg-slate-800"
                />
                <span class="text-sm text-slate-700 dark:text-slate-300">{{ store.t.feedbackAllowFollowup }}</span>
              </label>

              <div class="flex flex-wrap gap-3">
                <button
                  type="button"
                  class="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-600 transition hover:border-slate-400 dark:border-slate-600 dark:text-slate-300"
                  @click="resetFeedbackForm"
                >
                  {{ store.t.feedbackReset }}
                </button>
                <button
                  type="button"
                  class="rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800 disabled:opacity-40 dark:bg-teal-600 dark:hover:bg-teal-500"
                  :disabled="!canSubmitFeedback"
                  @click="submitFeedback"
                >
                  {{ isSubmittingFeedback ? store.t.feedbackSubmitting : store.t.feedbackSubmit }}
                </button>
              </div>

              <div
                v-if="feedbackSubmitted"
                class="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-300"
              >
                {{ store.t.feedbackSuccess }}
              </div>
            </div>
          </section>
        </template>

        <!-- ──────────────────────────────────────────────── -->
        <!-- LANGUAGE & DISPLAY                               -->
        <!-- ──────────────────────────────────────────────── -->
        <template v-else-if="activeSection === 'display'">

          <!-- Language -->
          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 class="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{{ store.t.languageLabel }}</h3>
            <p class="mb-4 text-xs text-slate-500 dark:text-slate-400">
              {{ label('切换全站界面语言。', 'Switch the interface language for the entire site.') }}
            </p>
            <div class="inline-flex rounded-xl border border-slate-200 p-1 dark:border-slate-700">
              <button
                type="button"
                class="rounded-lg px-4 py-2 text-sm font-medium transition"
                :class="store.locale === 'zh'
                  ? 'bg-teal-50 text-teal-900 dark:bg-teal-950/60 dark:text-teal-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'"
                @click="store.setLocale('zh')"
              >
                {{ store.t.languageZh }}
              </button>
              <button
                type="button"
                class="rounded-lg px-4 py-2 text-sm font-medium transition"
                :class="store.locale === 'en'
                  ? 'bg-teal-50 text-teal-900 dark:bg-teal-950/60 dark:text-teal-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'"
                @click="store.setLocale('en')"
              >
                {{ store.t.languageEn }}
              </button>
            </div>
          </section>

          <!-- Theme -->
          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h3 class="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {{ label('外观主题', 'Appearance') }}
            </h3>
            <p class="mb-4 text-xs text-slate-500 dark:text-slate-400">{{ store.t.settingsThemeHint }}</p>
            <div class="flex gap-3">
              <button
                type="button"
                class="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition"
                :class="store.theme === 'light'
                  ? 'border-teal-500 bg-teal-50 text-teal-800 dark:border-teal-600 dark:bg-teal-950/50 dark:text-teal-200'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400'"
                @click="store.setTheme('light')"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                {{ label('浅色', 'Light') }}
              </button>
              <button
                type="button"
                class="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition"
                :class="store.theme === 'dark'
                  ? 'border-teal-500 bg-teal-50 text-teal-800 dark:border-teal-600 dark:bg-teal-950/50 dark:text-teal-200'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400'"
                @click="store.setTheme('dark')"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
                {{ label('深色', 'Dark') }}
              </button>
            </div>
          </section>
        </template>

      </div>
    </div>
  </div>
</template>
