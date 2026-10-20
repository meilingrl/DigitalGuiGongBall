<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { api, errorMessage } from '../../lib/api'
import type { Template } from '../../../shared/design'
import { useAuthStore } from '../../stores/auth'
import { inspirations } from '../../../shared/inspirations'
import { templates as courseTemplates } from '../../data/content'
const auth = useAuthStore()
const route = useRoute()
const courseInspiration = computed(() => courseTemplates.find(item => item.id === route.query.legacy))
const templates = ref<Template[]>([])
const loading = ref(true)
const error = ref('')
async function load() {
  loading.value = true; error.value = ''
  try { templates.value = (await api<{ templates: Template[] }>('/api/templates')).templates }
  catch (cause) { error.value = errorMessage(cause) }
  finally { loading.value = false }
}
onMounted(load)
</script>

<template>
  <div class="studio-page">
    <header class="page-intro"><div><p class="eyebrow">THE DIGITAL CRAFT COLLECTION</p><h1>创作工坊<span class="title-dot">·</span></h1></div><RouterLink class="secondary-button" to="/hub/works">我的作品 ↗</RouterLink></header>
    <p v-if="courseInspiration" class="notice workshop-legacy-note">你从课程概念「{{ courseInspiration.nameZh }}」来到这里。这一概念尚未实现为三维模型；可以从下方三种真实可编辑的纹样中，选择一个继续探索。</p>
    <section class="workshop-hero">
      <div class="hero-copy"><span class="hero-number">02 / MAKE IT YOUR OWN</span><h2>从一处纹样，<br /><em>生长出你的玲珑。</em></h2><p>{{ auth.user ? `${auth.user.displayName}，` : '' }}选择一个起点，调整结构、材质与观察方式。也可以先阅读对应导览，再带着灵感进入工坊。</p><a href="#templates" class="primary-button">选择模板，开始创作 ↓</a><div class="hero-facts"><span><strong>3</strong>种数字纹样</span><span><strong>2–6</strong>层嵌套结构</span><span><strong>3</strong>种数字材料</span></div></div>
      <div class="hero-illustration" aria-hidden="true"><div class="orb-line orb-one" /><div class="orb-line orb-two" /><div class="orb-line orb-three" /><div class="orb-line orb-four" /><div class="orb-line orb-five" /><div class="orb-line orb-six" /><span class="orb-core" /><span class="hero-caption">虚实相生 / LAYER BY LAYER</span><span class="hero-coordinate">23°N · LINGNAN</span></div>
    </section>
    <section id="templates" class="template-section"><div class="section-heading"><div><p class="eyebrow">CHOOSE YOUR STARTING POINT</p><h2>从一个纹样开始</h2></div><p class="muted">模板只是起点，结构由你定义。</p></div>
      <div v-if="loading" class="empty-panel" role="status">正在从后端读取模板…</div>
      <div v-else-if="error" class="notice error" role="alert">{{ error }}<button class="secondary-button" @click="load">重试加载</button></div>
      <div v-else class="template-grid"><article v-for="(item, index) in templates" :key="item.id" class="template-card"><div class="template-art template-art--render"><span class="card-number">0{{ index + 1 }}</span><img :src="`/materials/workshop/previews/workshop-${item.id}-v1.0.png`" :alt="`${item.name}模板 · ${item.config.layers}层默认结构的三维实景`" loading="lazy" /><span class="material-tag">{{ item.subtitle }}</span></div><div class="template-copy"><div class="card-title"><h3>{{ item.name }}</h3><span>{{ item.config.layers }} 层</span></div><p>{{ item.description }}</p><RouterLink class="template-study-link text-button" :to="`/hub/studies/${inspirations.find(study => study.templateId === item.id)?.id}`">先看看结构与文化导览 →</RouterLink><RouterLink class="template-link" :to="`/atelier?template=${item.id}`">以此开始 <span>↗</span></RouterLink></div></article></div>
    </section>
    <aside class="craft-note"><span class="note-seal">艺</span><div><h3>以数字理解工艺，以创作致敬传承。</h3><p>鬼工球以层层套叠、可独立转动的镂空球体见长。本工坊用原创程序化纹样探索这一结构，数字作品不等同于传统实物雕刻，也不涉及真实象牙材料。</p><RouterLink to="/hub/museum" class="text-button">走进文化展馆 →</RouterLink></div></aside>
  </div>
</template>
