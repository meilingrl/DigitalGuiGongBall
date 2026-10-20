<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { errorMessage } from '../lib/api'
import ThemeToggle from '../components/ThemeToggle.vue'
import DesignPreview from '../components/DesignPreview.vue'
import { defaultConfig } from '../../shared/design'
import { safeReturnPath } from '../lib/journey'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const mode = ref<'login' | 'register'>('login')
const username = ref('')
const displayName = ref('')
const password = ref('')
const submitting = ref(false)
const error = ref('')
async function submit() {
  submitting.value = true
  error.value = ''
  try {
    await auth.signIn(username.value, password.value, mode.value === 'register' ? displayName.value : undefined)
    await router.push(safeReturnPath(route.query.redirect))
  } catch (cause) { error.value = errorMessage(cause) }
  finally { submitting.value = false }
}
function switchMode() { mode.value = mode.value === 'login' ? 'register' : 'login'; error.value = '' }
</script>

<template>
  <main class="studio-login">
    <ThemeToggle layout="fixed" />
    <section class="login-story">
      <RouterLink to="/hub/home" class="studio-wordmark"><span class="brand-seal">玲</span>数字鬼工球<span class="brand-en">DIGITAL GUIGONG</span></RouterLink>
      <div class="login-art"><DesignPreview :config="{ ...defaultConfig, layers: 6 }" /><span class="art-annotation">层层相套 · 内外相通</span></div>
      <p class="eyebrow">LINGNAN CRAFT · DIGITAL ATELIER</p>
      <h1>方寸之间，<br />另有天地。</h1>
      <p class="story-copy">从一重球壳到层层玲珑。以三维结构探索岭南工艺，留下属于你的数字作品。</p>
      <p class="story-foot">非遗文化 × 参数化设计 × 持久创作</p>
    </section>
    <section class="login-form-panel">
      <div class="login-form-inner">
        <span class="eyebrow">YOUR PERSONAL ATELIER</span>
        <h2>{{ mode === 'login' ? '回到你的工坊' : '开启第一件作品' }}</h2>
        <p class="muted">{{ mode === 'login' ? '登录后继续创作，作品会保存在本地后端数据库。' : '创建本地账号，让每一次探索都有迹可循。' }}</p>
        <p v-if="route.query.redirect" class="login-intent">登录后回到刚才的创作，保留模板和导览来源。</p>
        <div v-if="auth.error" class="notice error" role="alert">{{ auth.error }}<button class="text-button" @click="auth.restore(true)">重新连接</button></div>
        <form class="studio-form" @submit.prevent="submit">
          <label>用户名<input v-model="username" name="username" autocomplete="username" required pattern="[a-zA-Z0-9_]{3,32}" minlength="3" maxlength="32" placeholder="3–32 位字母、数字或下划线" /></label>
          <label v-if="mode === 'register'">显示名称<input v-model="displayName" name="displayName" autocomplete="nickname" required maxlength="40" placeholder="作品中使用的名字" /></label>
          <label>密码<input v-model="password" type="password" name="password" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" required minlength="8" maxlength="128" placeholder="至少 8 位字符" /></label>
          <p v-if="error" class="notice error" role="alert">{{ error }}</p>
          <button class="primary-button full" type="submit" :disabled="submitting">{{ submitting ? '正在连接工坊…' : mode === 'login' ? '登录工坊 →' : '注册并进入工坊 →' }}</button>
        </form>
        <p class="switch-mode">{{ mode === 'login' ? '第一次来？' : '已有账号？' }}<button class="text-button" @click="switchMode">{{ mode === 'login' ? '创建账号' : '返回登录' }}</button></p>
        <RouterLink class="login-explore text-button" to="/hub/museum">先看看文化与三维导览 →</RouterLink>
        <div class="local-note"><span class="status-dot" />本地全栈演示<p>无需外部服务。可使用已初始化的演示账号，也可以直接创建自己的账号。</p></div>
      </div>
    </section>
  </main>
</template>
