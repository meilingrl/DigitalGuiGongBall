<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import WavyLines from '../components/WavyLines.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import logoUrl from '../assets/materials/images/branding/brand-logo-primary-v1.0.png'

const store = useAppStore()
const router = useRouter()

const username = ref('')
const password = ref('')
const remember = ref(false)
const submitting = ref(false)

function onSubmit() {
  submitting.value = true
  window.setTimeout(() => {
    submitting.value = false
    router.push({ name: 'hub-dashboard' })
  }, 400)
}
</script>

<template>
  <div
    class="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden p-6 sm:p-8"
    :class="
      store.theme === 'dark'
        ? 'bg-slate-950 text-slate-100'
        : 'bg-slate-100 text-slate-900'
    "
  >
    <WavyLines />

    <ThemeToggle layout="fixed" />

    <!-- 等宽双栏：竖向分隔线在卡片水平正中；窄屏纵向堆叠 -->
    <div
      class="relative z-10 mx-auto grid w-full max-w-[880px] min-h-[420px] grid-cols-1 overflow-hidden rounded-xl border shadow-xl backdrop-blur-sm md:grid-cols-2"
      :class="
        store.theme === 'dark'
          ? 'border-slate-700/90 bg-slate-900/85 shadow-black/50'
          : 'border-slate-200/90 bg-white/80 shadow-slate-900/10'
      "
    >
      <!-- 左侧：品牌与 Logo（资源：src/assets/materials/images/branding/brand-logo-primary-v1.0.png） -->
      <div
        class="flex flex-col items-center justify-center px-8 py-10 text-center md:py-12"
      >
        <img
          :src="logoUrl"
          class="mb-5 h-[100px] w-[100px] shrink-0 object-contain transition"
          :class="
            store.theme === 'dark'
              ? 'invert brightness-110'
              : 'mix-blend-multiply'
          "
          :alt="
            store.locale === 'zh'
              ? '数字鬼工球标志'
              : 'Digital Guigong Ball logo'
          "
        />
        <h1 class="text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
          {{ store.locale === 'zh' ? '数字鬼工球' : 'Digital Guigong Ball' }}
        </h1>
        <p
          class="mt-2 max-w-[260px] text-sm leading-relaxed"
          :class="
            store.theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          "
        >
          {{
            store.locale === 'zh'
              ? '岭南鬼工球技艺的数字化体验与传承'
              : 'Digital experience and heritage of the Guigong ivory sphere craft'
          }}
        </p>
      </div>

      <!-- 右侧：表单（与左栏等宽，内容在栏内水平居中） -->
      <div
        class="flex w-full flex-col items-center justify-center border-t px-8 py-10 md:border-l md:border-t-0 md:py-12"
        :class="
          store.theme === 'dark'
            ? 'border-slate-700/80'
            : 'border-slate-200/90'
        "
      >
        <div class="w-full max-w-[320px]">
          <h2 class="mb-6 text-xl font-semibold tracking-tight">
            {{ store.locale === 'zh' ? '登录' : 'Sign in' }}
          </h2>

          <form class="space-y-5" @submit.prevent="onSubmit">
            <div>
              <label
                for="login-username"
                class="mb-1.5 block text-sm font-medium"
                :class="
                  store.theme === 'dark'
                    ? 'text-slate-300'
                    : 'text-slate-700'
                "
              >
                {{ store.locale === 'zh' ? '用户名' : 'Username' }}
              </label>
              <input
                id="login-username"
                v-model="username"
                type="text"
                name="username"
                autocomplete="username"
                required
                class="w-full rounded-xl border bg-white/90 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100"
                :class="
                  store.theme === 'dark'
                    ? 'border-slate-600'
                    : 'border-slate-200'
                "
                :placeholder="
                  store.locale === 'zh' ? '请输入用户名' : 'Enter username'
                "
              />
            </div>

            <div>
              <label
                for="login-password"
                class="mb-1.5 block text-sm font-medium"
                :class="
                  store.theme === 'dark'
                    ? 'text-slate-300'
                    : 'text-slate-700'
                "
              >
                {{ store.locale === 'zh' ? '密码' : 'Password' }}
              </label>
              <input
                id="login-password"
                v-model="password"
                type="password"
                name="password"
                autocomplete="current-password"
                required
                class="w-full rounded-xl border bg-white/90 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100"
                :class="
                  store.theme === 'dark'
                    ? 'border-slate-600'
                    : 'border-slate-200'
                "
                :placeholder="
                  store.locale === 'zh' ? '请输入密码' : 'Enter password'
                "
              />
            </div>

            <div class="flex items-center justify-between gap-3 text-sm">
              <label
                class="flex cursor-pointer items-center gap-2"
                :class="
                  store.theme === 'dark'
                    ? 'text-slate-400'
                    : 'text-slate-600'
                "
              >
                <input
                  v-model="remember"
                  type="checkbox"
                  class="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500/30 dark:border-slate-600 dark:bg-slate-800"
                />
                {{ store.locale === 'zh' ? '记住我' : 'Remember me' }}
              </label>
              <button
                type="button"
                class="text-teal-700 hover:text-teal-800 hover:underline dark:text-teal-400 dark:hover:text-teal-300"
              >
                {{ store.locale === 'zh' ? '忘记密码？' : 'Forgot password?' }}
              </button>
            </div>

            <button
              type="submit"
              :disabled="submitting"
              class="flex w-full items-center justify-center rounded-xl bg-teal-600 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-teal-500 dark:hover:bg-teal-400"
            >
              {{
                submitting
                  ? store.locale === 'zh'
                    ? '登录中…'
                    : 'Signing in…'
                  : store.locale === 'zh'
                    ? '登录'
                    : 'Sign in'
              }}
            </button>
          </form>

          <p
            class="mt-6 text-center text-xs"
            :class="
              store.theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
            "
          >
            {{
              store.locale === 'zh'
                ? '演示：提交后进入工作台'
                : 'Demo: submit opens the hub'
            }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
