<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import ThemeToggle from '../components/ThemeToggle.vue'
import { useAuthStore } from '../stores/auth'
import { errorMessage } from '../lib/api'
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const logoutError = ref('')
const loggingOut = ref(false)
const legacyMenu = ref<HTMLDetailsElement | null>(null)
watch(() => route.fullPath, () => legacyMenu.value?.removeAttribute('open'))
const legacy = computed(() => !['hub-home', 'hub-workshop', 'hub-works', 'hub-work-detail', 'hub-museum', 'hub-study'].includes(String(route.name)))
async function logout() {
  loggingOut.value = true; logoutError.value = ''
  try { await auth.signOut(); await router.push('/hub/home') }
  catch (cause) { logoutError.value = errorMessage(cause) }
  finally { loggingOut.value = false }
}
</script>

<template>
  <div class="studio-shell">
    <header class="studio-header">
      <RouterLink to="/hub/home" class="studio-wordmark"><span class="brand-seal">玲</span>数字鬼工球<span class="brand-en">DIGITAL GUIGONG</span></RouterLink>
      <nav class="studio-nav" aria-label="主导航"><RouterLink to="/hub/home">首页</RouterLink><RouterLink to="/hub/museum" :class="{ 'router-link-active': route.name === 'hub-study' }">文化导览</RouterLink><RouterLink to="/hub/workshop">创作工坊</RouterLink><RouterLink to="/hub/works">我的作品</RouterLink></nav>
      <div class="studio-account"><span v-if="auth.user" class="user-name">{{ auth.user.displayName }}</span><ThemeToggle layout="inline" size="sm" /><button v-if="auth.user" class="text-button" :disabled="loggingOut" @click="logout">{{ loggingOut ? '退出中' : '退出' }}</button><RouterLink v-else class="text-button" to="/login">登录 / 注册</RouterLink></div>
    </header>
    <p v-if="logoutError" class="notice error" role="alert">{{ logoutError }}</p>
    <div v-if="legacy" class="legacy-banner">课程原型存档：此区域的积分、社交、预约与统计包含模拟或浏览器本地数据，不属于本轮后端作品系统。<RouterLink to="/hub/workshop">返回真实创作流程 →</RouterLink></div>
    <p v-if="auth.error" class="notice error" role="alert">账号服务连接失败：{{ auth.error }}<button class="text-button" @click="auth.restore(true)">重新连接账号服务</button></p>
    <main :class="{ 'legacy-content': legacy }"><RouterView v-if="!route.meta.requiresAuth || auth.user" :key="`${String(route.name)}:${String(route.params.id ?? '')}:${auth.user?.id ?? 'guest'}`" /><div v-else class="empty-panel" role="status">正在离开个人作品，返回公开首页…</div></main>
    <footer class="studio-footer"><div><span>数字鬼工球 / DIGITAL GUIGONG BALL</span><p>以结构探索工艺，以数字延续好奇。</p></div><details ref="legacyMenu" class="legacy-menu"><summary>查看课程原型存档 ⌄</summary><div><p>保留原始课程记录 · 含模拟数据</p><RouterLink to="/hub/legacy-dashboard">原型工作台</RouterLink><RouterLink to="/hub/legacy-museum">原型文化展馆</RouterLink><RouterLink to="/hub/legacy-workshop">原型模板与投稿</RouterLink><RouterLink to="/hub/explore">探访与模拟预约</RouterLink><RouterLink to="/hub/social">模拟社交</RouterLink><RouterLink to="/hub/mall">演示积分与商城</RouterLink><RouterLink to="/hub/stats">原型统计</RouterLink><RouterLink to="/hub/settings">原型设置</RouterLink></div></details></footer>
  </div>
</template>
