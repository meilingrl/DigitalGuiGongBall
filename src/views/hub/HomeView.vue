<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { defaultConfigs, type Work } from '../../../shared/design'
import { inspirations } from '../../../shared/inspirations'
import AtelierScene from '../../components/AtelierScene.vue'
import WorkThumbnail from '../../components/WorkThumbnail.vue'
import { api, errorMessage } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import { useAppStore } from '../../stores/app'
const auth = useAuthStore()
const app = useAppStore()
const works = ref<Work[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
let epoch = 0
async function load() {
  if (!auth.user) return
  const userId = auth.user.id
  const current = ++epoch
  loading.value = true; error.value = ''
  try {
    const result = await api<{ works: Work[]; pagination: { total: number } }>('/api/works?page=1&pageSize=3&state=active', { expectedUserId: userId })
    if (current !== epoch) return
    works.value = result.works; total.value = result.pagination.total
  } catch (cause) { if (current === epoch) error.value = errorMessage(cause) }
  finally { if (current === epoch) loading.value = false }
}
onMounted(load)
onBeforeUnmount(() => { epoch++ })
</script>

<template>
  <div class="studio-page home-page">
    <section class="home-hero">
      <div class="home-copy"><p class="eyebrow">LINGNAN CRAFT / A DIGITAL EXPLORATION</p><h1>一球之内，<br /><em>层层有天地。</em></h1><p>从岭南工艺的好奇开始。看见镂空的节奏，拆解套叠的结构，再把你的理解，做成一件数字作品。</p><div class="home-hero-actions"><RouterLink class="primary-button" to="/hub/studies/nested-structure">从三维导览开始 →</RouterLink><RouterLink class="text-button" to="/hub/workshop">直接进入创作工坊 ↗</RouterLink></div><div class="home-caption"><span>01 / 观察</span><span>02 / 创作</span><span>03 / 留存</span></div></div>
      <div class="home-stage"><AtelierScene :config="{ ...defaultConfigs.linglong, cutaway: true }" :theme="app.theme" /><span class="home-stage-caption">拖动，看看球壳之后的空间</span></div>
    </section>
    <section class="home-studies"><div class="section-heading"><div><p class="eyebrow">UNDERSTAND BEFORE YOU CREATE</p><h2>带着发现，开始创作</h2></div><RouterLink class="text-button" to="/hub/museum">全部文化导览 →</RouterLink></div><div class="journey-grid"><RouterLink v-for="(study, index) in inspirations" :key="study.id" :to="`/hub/studies/${study.id}`" class="journey-card"><span class="journey-index">0{{ index + 1 }} /</span><h3>{{ study.title }}</h3><p>{{ study.summary }}</p><span class="text-button">阅读与三维观察 ↗</span></RouterLink></div></section>
    <section class="home-recent"><div class="section-heading"><div><p class="eyebrow">YOUR CONTINUING STORY</p><h2>{{ auth.user ? `${auth.user.displayName}，继续你的探索` : '把每次发现，留下来' }}</h2></div><RouterLink v-if="auth.user" class="text-button" to="/hub/works">全部 {{ total }} 件作品 →</RouterLink></div>
      <div v-if="!auth.user" class="home-invitation"><span class="note-seal">存</span><div><h3>无需登录，也可以先看、先玩。</h3><p>找到喜欢的结构后，创建账号就能保存作品、生成三维预览，并在下次打开时继续。</p></div><RouterLink class="secondary-button" to="/login">开启我的工坊 ↗</RouterLink></div>
      <div v-else-if="loading" class="notice" role="status">正在读取最近作品…</div>
      <div v-else-if="error" class="notice error" role="alert">{{ error }}<button class="text-button" @click="load">重新读取最近作品</button></div>
      <div v-else-if="works.length" class="works-grid"><article v-for="work in works" :key="work.id" class="work-card"><RouterLink :to="`/hub/works/${work.id}`" :aria-label="`查看 ${work.title}`"><WorkThumbnail :work="work" /></RouterLink><div class="work-copy"><div class="card-title"><h3><RouterLink :to="`/hub/works/${work.id}`">{{ work.title }}</RouterLink></h3><span>v{{ work.version }}</span></div><p>{{ work.description || '一件等待继续探索的数字创作。' }}</p><RouterLink class="template-link" :to="`/atelier/${work.id}`">继续创作 <span>↗</span></RouterLink></div></article></div>
      <div v-else class="home-invitation"><span class="note-seal">始</span><div><h3>你的第一件作品，从一个纹样开始。</h3><p>调整层数、开孔和材料。保存后，作品和灵感来源会一起留在这里。</p></div><RouterLink class="primary-button" to="/hub/workshop">选择创作模板 →</RouterLink></div>
    </section>
    <p class="home-footnote">数字结构是理解传统工艺的一扇窗口。本项目使用原创程序化模型与数字材料，不涉及真实象牙制品。</p>
  </div>
</template>

<style scoped>
.home-page{padding-top:36px}.home-hero{display:grid;grid-template-columns:1fr 1.05fr;border:1px solid var(--studio-line);border-radius:8px;overflow:hidden;background:var(--studio-panel)}.home-copy{padding:48px 38px}.home-copy h1{font:500 clamp(36px,4vw,56px)/1.45 "Songti SC",Georgia,serif;letter-spacing:4px;margin:26px 0 20px}.home-copy h1 em{font-style:normal;color:var(--studio-gold)}.home-copy>p:not(.eyebrow){max-width:360px;color:var(--studio-muted);font-size:13px;line-height:2}.home-hero-actions{display:flex;align-items:center;gap:20px;flex-wrap:wrap;margin-top:26px}.home-caption{display:flex;gap:28px;border-top:1px solid var(--studio-line);margin-top:40px;padding-top:20px;font-size:9px;letter-spacing:1.5px;color:var(--studio-gold)}.home-stage{position:relative;min-height:470px}.home-stage-caption{position:absolute;bottom:31px;left:20px;right:20px;text-align:center;font-size:10px;letter-spacing:2px;pointer-events:none;color:var(--studio-muted)}.home-stage :deep(.atelier-scene__label){display:none}.home-studies,.home-recent{margin-top:52px}.journey-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}.journey-card{padding:26px;border:1px solid var(--studio-line);border-radius:6px;background:var(--studio-panel);transition:border-color .2s}.journey-card:hover{border-color:var(--studio-gold)}.journey-index{font:20px Georgia,serif;color:var(--studio-gold)}.journey-card h3{font:500 21px "Songti SC",Georgia,serif;letter-spacing:1px;margin:22px 0 13px}.journey-card p{font-size:12px;line-height:1.9;color:var(--studio-muted);min-height:46px;margin-bottom:25px}.home-invitation{display:flex;align-items:center;gap:24px;padding:28px;border:1px solid var(--studio-line);border-radius:6px;background:var(--studio-panel)}.home-invitation>div{flex:1}.home-invitation h3{font-size:15px}.home-invitation p{font-size:12px;line-height:1.9;color:var(--studio-muted);margin-top:8px}.home-footnote{font-size:10px;line-height:1.8;color:var(--studio-muted);border-top:1px solid var(--studio-line);padding-top:25px;margin-top:42px}
@media(max-width:760px){.home-hero{grid-template-columns:1fr}.home-copy{padding:30px 24px}.home-copy h1{font-size:38px}.home-stage{min-height:330px;order:-1}.home-caption{margin-top:26px}.journey-grid{grid-template-columns:1fr;gap:14px}.journey-card{padding:23px}.journey-card h3{margin-top:15px}.journey-card p{min-height:0;margin-bottom:20px}.home-studies,.home-recent{margin-top:35px}.home-invitation{flex-wrap:wrap;padding:22px;gap:17px}.home-invitation>div{flex-basis:70%}.home-invitation>a{margin-left:57px}.section-heading>.text-button{display:inline-block;margin-top:12px}}
</style>
