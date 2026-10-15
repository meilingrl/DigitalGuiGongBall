<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import ThemeToggle from '../components/ThemeToggle.vue'
import { useAuthStore } from '../stores/auth'
import { useAppStore } from '../stores/app'
import { errorMessage } from '../lib/api'
const auth = useAuthStore()
const app = useAppStore()
const route = useRoute()
const router = useRouter()
const logoutError = ref('')
const loggingOut = ref(false)
const legacy = computed(() => !['hub-workshop', 'hub-works', 'hub-museum'].includes(String(route.name)))
async function logout() {
  loggingOut.value = true; logoutError.value = ''
  try { await auth.signOut(); await router.push('/login') }
  catch (cause) { logoutError.value = errorMessage(cause) }
  finally { loggingOut.value = false }
}
</script>

<template>
  <div class="studio-shell">
    <header class="studio-header"><RouterLink to="/hub/workshop" class="studio-wordmark"><span class="brand-seal">玲</span>数字鬼工球<span class="brand-en">DIGITAL GUIGONG</span></RouterLink><nav class="studio-nav" aria-label="主导航"><RouterLink to="/hub/workshop">创作工坊</RouterLink><RouterLink to="/hub/works">我的作品</RouterLink><RouterLink to="/hub/museum">文化展馆</RouterLink><details class="legacy-menu"><summary>课程原型 <span>⌄</span></summary><div><p>以下为历史课程演示</p><RouterLink to="/hub/dashboard">原型工作台</RouterLink><RouterLink to="/hub/legacy-workshop">原型模板与投稿</RouterLink><RouterLink to="/hub/explore">探访与模拟预约</RouterLink><RouterLink to="/hub/social">模拟社交</RouterLink><RouterLink to="/hub/mall">演示积分与商城</RouterLink><RouterLink to="/hub/stats">原型统计</RouterLink><RouterLink to="/hub/settings">原型设置</RouterLink></div></details></nav><div class="studio-account"><span class="user-name">{{ auth.user?.displayName }}</span><ThemeToggle layout="inline" size="sm" /><button class="text-button" :disabled="loggingOut" @click="logout">{{ loggingOut ? '退出中' : '退出' }}</button></div></header>
    <p v-if="logoutError" class="notice error" role="alert">{{ logoutError }}</p>
    <div v-if="legacy" class="legacy-banner">课程原型存档：此区域的积分、社交、预约与统计包含模拟或浏览器本地数据，不属于本轮后端作品系统。<RouterLink to="/hub/workshop">返回真实创作流程 →</RouterLink></div>
    <div v-if="route.name === 'hub-museum'" class="museum-banner">文化内容为课程素材；答题、投稿与积分仍为课程演示。<button class="text-button" @click="app.toggleLocale()">{{ app.locale === 'zh' ? 'EN / 中文' : '中文 / EN' }}</button></div>
    <main :class="{ 'legacy-content': legacy || route.name === 'hub-museum' }"><RouterView /></main>
    <footer class="studio-footer"><span>数字鬼工球 / DIGITAL GUIGONG BALL</span><span>以结构探索工艺，以数字延续好奇。</span></footer>
  </div>
</template>
