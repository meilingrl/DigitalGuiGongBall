<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { templates, type DesignConfig } from '../../../shared/design'
import AtelierScene from '../../components/AtelierScene.vue'
import CultureImage from '../../components/culture/CultureImage.vue'
import { createObservationConfig, findStudy, studies, studyCreationPath, type ObservationMode } from '../../data/studies'
import { usePreferencesStore } from '../../stores/preferences'

const route = useRoute()
const app = usePreferencesStore()
const study = computed(() => findStudy(route.params.id))
const config = ref<DesignConfig>()
const mode = ref<ObservationMode>('whole')
const scene = ref<InstanceType<typeof AtelierScene> | null>(null)
const sceneReady = ref(false)
const modes: { id: ObservationMode; number: string; label: string }[] = [
  { id: 'whole', number: '01', label: '完整' },
  { id: 'cutaway', number: '02', label: '剖开' },
  { id: 'separated', number: '03', label: '展开' },
]
const templateName = computed(() => templates.find(item => item.id === study.value?.templateId)?.name)
const nextStudy = computed(() => {
  const index = studies.findIndex(item => item.id === study.value?.id)
  return studies[(index + 1) % studies.length]
})

watch(study, () => {
  mode.value = 'whole'
  config.value = createObservationConfig(study.value?.id, 'whole')
  sceneReady.value = false
}, { immediate: true })

function chooseMode(nextMode: ObservationMode) {
  mode.value = nextMode
  config.value = createObservationConfig(study.value?.id, nextMode)
}

async function resetObservation() {
  chooseMode('whole')
  await nextTick()
  scene.value?.resetView()
}
</script>

<template>
  <div v-if="study && config" class="studio-page study-page">
    <nav class="study-breadcrumb" aria-label="当前位置"><RouterLink to="/hub/museum">文化导览</RouterLink><span aria-hidden="true">/</span><span>导览 {{ study.number }}</span></nav>
    <header class="study-header">
      <div><p class="eyebrow">STUDY {{ study.number }} / LOOK, UNDERSTAND, CREATE</p><h1>{{ study.title }}<span class="title-dot">·</span></h1><p class="study-subtitle">{{ study.subtitle }}</p></div>
      <div class="study-reading-time"><span>{{ study.readTime }}</span><span>免费公开 · 含三维观察</span></div>
    </header>

    <div class="study-layout">
      <article class="study-article" aria-label="导览正文">
        <p class="study-lead">{{ study.lead }}</p>
        <div class="study-article-image"><CultureImage :kind="study.image" caption /></div>
        <section v-for="(section, index) in study.sections" :key="section.title" class="study-section">
          <span class="study-section-number">0{{ index + 1 }}</span><h2>{{ section.title }}</h2><p>{{ section.body }}</p>
          <a v-if="section.source" :href="section.source.url" target="_blank" rel="noopener noreferrer" class="study-source">资料来源：{{ section.source.label }} ↗</a>
        </section>
        <blockquote class="study-question"><span>留给你的观察</span><p>{{ study.question }}</p></blockquote>
      </article>

      <section class="study-observation" aria-labelledby="observation-title">
        <div class="study-observation-heading"><div><p class="eyebrow">LOOK A LITTLE CLOSER</p><h2 id="observation-title">亲手看一看</h2></div><span>「{{ templateName }}」结构示意</span></div>
        <div class="study-mode-tabs" role="group" aria-label="观察步骤">
          <button v-for="item in modes" :key="item.id" type="button" :aria-pressed="mode === item.id" :class="{ selected: mode === item.id }" @click="chooseMode(item.id)"><span>{{ item.number }}</span>{{ item.label }}</button>
        </div>
        <div class="study-scene" role="region" aria-label="可交互三维结构观察" aria-describedby="observation-hint">
          <AtelierScene :key="study.id" ref="scene" :config="config" :theme="app.theme" @ready="sceneReady = true" @error="sceneReady = false" />
          <div v-if="sceneReady" class="study-scene-toolbar"><button type="button" :aria-pressed="config.autoRotate" @click="config.autoRotate = !config.autoRotate">{{ config.autoRotate ? '暂停旋转' : '自动旋转' }}</button><button type="button" @click="scene?.resetView()">视角复位</button></div>
        </div>
        <p id="observation-hint" class="study-scene-hint">拖动旋转 · 滚轮或双指缩放<span>步骤与下方控件会直接改变三维模型。</span></p>
        <div class="study-step-copy" aria-live="polite"><p class="eyebrow">{{ modes.find(item => item.id === mode)?.number }} / OBSERVE</p><h3>{{ study.observation[mode].title }}</h3><p>{{ study.observation[mode].text }}</p></div>
        <div class="study-observation-controls">
          <label for="study-layer">聚焦球层<select id="study-layer" v-model.number="config.activeLayer"><option :value="0">全部 {{ config.layers }} 层</option><option v-for="layer in config.layers" :key="layer" :value="layer">第 {{ layer }} 层{{ layer === 1 ? ' · 最外层' : layer === config.layers ? ' · 最内层' : '' }}</option></select></label>
          <label for="study-aperture">开孔大小 <output>{{ Math.round(config.aperture * 100) }}%</output><input id="study-aperture" v-model.number="config.aperture" type="range" min="0.35" max="0.8" step="0.01" /></label>
          <label for="study-density">纹样密度 <output>{{ config.patternScale }}</output><input id="study-density" v-model.number="config.patternScale" type="range" min="8" max="24" step="1" /></label>
          <button type="button" class="study-reset" @click="resetObservation">恢复初始观察 ↺</button>
        </div>
        <p class="study-model-note">原创程序化模型，用于解释结构。剖开与展开是数字观察方式，非文物扫描、实物拆解或制造方案；点击下方创作按钮，可带着当前观察中的调整进入工坊。</p>
      </section>
    </div>

    <section class="study-creation" aria-labelledby="creation-title">
      <span class="study-creation-number" aria-hidden="true">作</span><div><p class="eyebrow">FROM OBSERVATION TO YOUR OWN EXPRESSION</p><h2 id="creation-title">把观察，变成你的作品。</h2><p>{{ study.experiment }}</p><small>将保留当前观察中的结构与材料，并记录导览来源；登录后继续编辑保存。</small></div>
      <RouterLink :to="studyCreationPath(study, config)" class="primary-button">继续创作「{{ templateName }}」 ↗</RouterLink>
    </section>
    <nav class="study-next" aria-label="更多导览"><RouterLink to="/hub/museum">← 全部文化导览</RouterLink><RouterLink v-if="nextStudy" :to="`/hub/studies/${nextStudy.id}`">下一篇：{{ nextStudy.title }} →</RouterLink></nav>
    <p class="study-resource-note">图片沿用原课程资源，非本项目藏品记录；本文博物馆引文对应对象以来源网页的藏品号为准。数字结构、模板名称与创作建议为本项目的教学解释。</p>
  </div>
  <div v-else class="studio-page study-not-found"><p class="eyebrow">STUDY NOT FOUND</p><h1>这篇导览暂时找不到。</h1><p>链接可能有误。回到文化导览，选择一篇内容继续观察。</p><RouterLink to="/hub/museum" class="primary-button">返回文化导览 →</RouterLink></div>
</template>

<style scoped>
.study-breadcrumb { display:flex; gap:13px; color:var(--studio-muted); font-size:10px; margin-bottom:28px; }
.study-breadcrumb a:hover { color:var(--studio-accent); }
.study-header { display:flex; justify-content:space-between; gap:25px; align-items:flex-end; padding-bottom:32px; border-bottom:1px solid var(--studio-line); }
.study-header h1 { font-family:"Songti SC","Noto Serif CJK SC",Georgia,serif; font-size:clamp(31px,3.1vw,43px); font-weight:500; letter-spacing:3px; line-height:1.5; margin:11px 0 13px; }
.study-subtitle { font-family:"Songti SC",serif; font-size:17px; color:var(--studio-muted); letter-spacing:1px; }
.study-reading-time { display:flex; flex-direction:column; align-items:flex-end; gap:8px; color:var(--studio-muted); font-size:10px; white-space:nowrap; padding-bottom:3px; }
.study-reading-time span:first-child { color:var(--studio-gold); }
.study-layout { display:grid; grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr); gap:50px; padding-top:36px; align-items:start; }
.study-article { min-width:0; }
.study-lead { font-family:"Songti SC",Georgia,serif; font-size:18px; line-height:1.95; }
.study-article-image { height:240px; border-radius:4px; overflow:hidden; margin:25px 0 35px; }
.study-section { position:relative; padding-left:35px; margin-top:32px; }
.study-section-number { position:absolute; left:0; top:3px; font-family:Georgia,serif; font-size:12px; color:var(--studio-gold); }
.study-section h2 { font-family:"Songti SC",serif; font-size:22px; font-weight:500; margin-bottom:13px; }
.study-section>p { font-size:13px; line-height:2.1; color:var(--studio-muted); text-align:justify; }
.study-source { display:block; margin-top:15px; font-size:10px; line-height:1.9; color:var(--studio-accent); text-decoration:underline; text-underline-offset:3px; overflow-wrap:anywhere; }
.study-source:hover { color:var(--studio-gold); }
.study-question { border-left:2px solid var(--studio-gold); padding:5px 0 5px 20px; margin:36px 0 0 35px; }
.study-question span { color:var(--studio-gold); font-size:10px; letter-spacing:1px; }
.study-question p { font-family:"Songti SC",serif; font-size:19px; line-height:1.8; margin-top:11px; }
.study-observation { min-width:0; border:1px solid var(--studio-line); border-radius:6px; overflow:hidden; background:var(--studio-panel); }
.study-observation-heading { display:flex; align-items:center; justify-content:space-between; gap:15px; padding:22px 24px; }
.study-observation-heading h2 { font-family:"Songti SC",serif; font-size:25px; font-weight:500; letter-spacing:2px; margin-top:4px; }
.study-observation-heading>span { color:var(--studio-muted); font-size:10px; }
.study-mode-tabs { display:grid; grid-template-columns:repeat(3,1fr); border-block:1px solid var(--studio-line); }
.study-mode-tabs button { display:flex; gap:9px; justify-content:center; align-items:center; padding:15px 10px; border-right:1px solid var(--studio-line); font-size:12px; color:var(--studio-muted); background:var(--studio-panel); cursor:pointer; }
.study-mode-tabs button:last-child { border-right:0; }
.study-mode-tabs button>span { font-family:Georgia,serif; color:var(--studio-gold); font-size:10px; }
.study-mode-tabs button.selected { color:var(--studio-accent); background:var(--studio-tint); box-shadow:inset 0 -2px var(--studio-accent); }
.study-mode-tabs button:hover { background:var(--studio-tint); }
.study-scene { height:400px; position:relative; }
.study-scene-toolbar { position:absolute; left:50%; transform:translateX(-50%); bottom:20px; display:flex; gap:8px; white-space:nowrap; }
.study-scene-toolbar button { padding:8px 12px; font-size:10px; border:1px solid var(--studio-line); border-radius:4px; color:var(--studio-ink); background:color-mix(in srgb,var(--studio-panel) 90%,transparent); cursor:pointer; }
.study-scene-toolbar button[aria-pressed=true] { border-color:var(--studio-accent); background:var(--studio-tint); }
.study-scene-hint { text-align:center; padding:13px 18px; font-size:9px; line-height:1.8; color:var(--studio-muted); border-bottom:1px solid var(--studio-line); }
.study-scene-hint>span { display:block; }
.study-step-copy { padding:23px 25px 18px; min-height:155px; }
.study-step-copy h3 { font-family:"Songti SC",serif; font-size:21px; font-weight:500; margin:9px 0 8px; }
.study-step-copy>p:not(.eyebrow) { font-size:12px; line-height:1.9; color:var(--studio-muted); }
.study-observation-controls { padding:0 25px 22px; display:grid; grid-template-columns:1fr 1fr; gap:20px 22px; }
.study-observation-controls label { color:var(--studio-muted); font-size:11px; }
.study-observation-controls label:first-child { grid-column:1/-1; display:flex; align-items:center; justify-content:space-between; gap:18px; border-block:1px solid var(--studio-line); padding:14px 0; }
.study-observation-controls select { min-width:160px; max-width:70%; background:var(--studio-bg); color:var(--studio-ink); border:1px solid var(--studio-line); font-size:11px; padding:8px; border-radius:3px; }
.study-observation-controls output { float:right; color:var(--studio-ink); }
.study-observation-controls input[type=range] { display:block; width:100%; margin-top:10px; height:20px; accent-color:var(--studio-accent); cursor:pointer; }
.study-reset { grid-column:1/-1; justify-self:start; color:var(--studio-accent); font-size:10px; cursor:pointer; }
.study-model-note { background:var(--studio-tint); padding:17px 25px; font-size:10px; line-height:1.9; color:var(--studio-muted); }
.study-creation { display:flex; align-items:center; gap:25px; padding:34px; border:1px solid var(--studio-line); background:var(--studio-tint); margin-top:46px; border-radius:5px; }
.study-creation-number { font-family:"Songti SC",serif; color:var(--studio-gold); font-size:45px; border:1px solid var(--studio-gold); padding:4px 10px; line-height:1.5; flex-shrink:0; }
.study-creation>div { flex:1; }
.study-creation h2 { font-family:"Songti SC",serif; font-size:25px; font-weight:500; margin:9px 0 10px; }
.study-creation>div>p:not(.eyebrow) { color:var(--studio-muted); font-size:12px; line-height:1.9; max-width:550px; }
.study-creation small { display:block; color:var(--studio-muted); font-size:9px; line-height:1.8; margin-top:10px; }
.study-creation>a { flex-shrink:0; font-size:12px; }
.study-next { display:flex; justify-content:space-between; gap:20px; padding:28px 0; border-bottom:1px solid var(--studio-line); font-size:11px; color:var(--studio-accent); }
.study-resource-note { font-size:9px; line-height:1.9; color:var(--studio-muted); text-align:center; max-width:800px; margin:22px auto 0; }
.study-not-found { min-height:70vh; display:flex; flex-direction:column; align-items:flex-start; justify-content:center; gap:22px; }
.study-not-found h1 { font-family:"Songti SC",serif; font-size:32px; }
.study-not-found>p:not(.eyebrow) { color:var(--studio-muted); font-size:13px; line-height:1.9; }
@media(max-width:1050px) { .study-layout { gap:30px; grid-template-columns:minmax(0,1fr) minmax(0,1.1fr); }.study-observation-heading { padding:20px; }.study-observation-heading>span { font-size:9px; }.study-scene { height:350px; }.study-observation-controls { padding-inline:20px; gap:20px 14px; }.study-creation { flex-wrap:wrap; }.study-creation>a { margin-left:88px; } }
@media(max-width:760px) { .study-breadcrumb { margin-bottom:22px; }.study-header { display:block; padding-bottom:25px; }.study-header h1 { font-size:31px; letter-spacing:1px; }.study-subtitle { font-size:15px; line-height:1.8; }.study-reading-time { flex-direction:row; justify-content:space-between; font-size:9px; margin-top:20px; }.study-layout { display:flex; flex-direction:column; gap:32px; padding-top:27px; }.study-observation { width:100%; order:-1; }.study-scene { height:360px; }.study-observation-heading { padding:20px; }.study-observation-heading h2 { font-size:24px; }.study-step-copy { padding:22px 20px 18px; min-height:0; }.study-observation-controls { padding:0 20px 22px; }.study-observation-controls select { font-size:12px; }.study-observation-controls input[type=range] { height:26px; }.study-scene-hint { font-size:10px; }.study-lead { font-size:18px; }.study-article-image { height:250px; }.study-section { padding-left:28px; margin-top:30px; }.study-section>p { font-size:14px; line-height:2; }.study-section h2 { font-size:23px; }.study-source { font-size:11px; }.study-question { margin-left:28px; }.study-model-note { padding:16px 20px; }.study-creation { padding:25px 20px; gap:17px; margin-top:33px; align-items:flex-start; }.study-creation-number { font-size:30px; padding:3px 7px; }.study-creation h2 { font-size:23px; line-height:1.6; }.study-creation>div { min-width:0; }.study-creation>a { margin-left:0; width:100%; }.study-creation small { font-size:10px; }.study-next { flex-direction:column; gap:20px; font-size:12px; }.study-resource-note { font-size:10px; text-align:left; } }
@media(max-width:380px) { .study-scene { height:320px; }.study-observation-heading>span { max-width:80px; line-height:1.8; text-align:right; }.study-header h1 { font-size:28px; }.study-reading-time { flex-wrap:wrap; } }
</style>
