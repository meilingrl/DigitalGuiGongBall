<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api, errorMessage } from '../../lib/api'
import type { Template } from '../../../shared/design'
import DesignPreview from '../../components/DesignPreview.vue'
import { useAuthStore } from '../../stores/auth'
const auth = useAuthStore()
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
    <section class="workshop-hero">
      <div class="hero-copy"><span class="hero-number">01 / EXPLORE THE INNER WORLD</span><h2>不止于表面。<br /><em>让玲珑，层层可见。</em></h2><p>{{ auth.user?.displayName }}，从一个纹样开始。旋转、剖开、展开，在虚实之间理解鬼工球的空间秩序。</p><a href="#templates" class="primary-button">选择模板，开始创作 ↓</a><div class="hero-facts"><span><strong>3</strong>种数字纹样</span><span><strong>2–6</strong>层嵌套结构</span><span><strong>∞</strong>次探索可能</span></div></div>
      <div class="hero-illustration" aria-hidden="true"><div class="orb-line orb-one" /><div class="orb-line orb-two" /><div class="orb-line orb-three" /><div class="orb-line orb-four" /><div class="orb-line orb-five" /><div class="orb-line orb-six" /><span class="orb-core" /><span class="hero-caption">虚实相生 / LAYER BY LAYER</span><span class="hero-coordinate">23°N · LINGNAN</span></div>
    </section>
    <section id="templates" class="template-section"><div class="section-heading"><div><p class="eyebrow">CHOOSE YOUR STARTING POINT</p><h2>从一个纹样开始</h2></div><p class="muted">模板只是起点，结构由你定义。</p></div>
      <div v-if="loading" class="empty-panel" role="status">正在从后端读取模板…</div>
      <div v-else-if="error" class="notice error" role="alert">{{ error }}<button class="secondary-button" @click="load">重试加载</button></div>
      <div v-else class="template-grid"><article v-for="(item, index) in templates" :key="item.id" class="template-card"><div class="template-art"><span class="card-number">0{{ index + 1 }}</span><DesignPreview :config="item.config" /><span class="material-tag">{{ item.subtitle }}</span></div><div class="template-copy"><div class="card-title"><h3>{{ item.name }}</h3><span>{{ item.config.layers }} 层</span></div><p>{{ item.description }}</p><RouterLink class="template-link" :to="`/atelier?template=${item.id}`">以此开始 <span>↗</span></RouterLink></div></article></div>
    </section>
    <aside class="craft-note"><span class="note-seal">艺</span><div><h3>以数字理解工艺，以创作致敬传承。</h3><p>鬼工球以层层套叠、可独立转动的镂空球体见长。本工坊用原创程序化纹样探索这一结构，数字作品不等同于传统实物雕刻，也不涉及真实象牙材料。</p><RouterLink to="/hub/museum" class="text-button">走进文化展馆 →</RouterLink></div></aside>
  </div>
</template>
