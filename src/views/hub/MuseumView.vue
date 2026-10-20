<script setup lang="ts">
import { RouterLink } from 'vue-router'
import CultureImage from '../../components/culture/CultureImage.vue'
import { studies } from '../../data/studies'
</script>

<template>
  <div class="studio-page culture-page">
    <header class="page-intro">
      <div><p class="eyebrow">A CLOSER LOOK AT CHINESE CRAFT</p><h1>文化导览<span class="title-dot">·</span></h1></div>
      <span class="culture-intro-note">慢下来，看见层层之间。</span>
    </header>

    <section class="culture-hero" aria-labelledby="culture-title">
      <div class="culture-hero-copy">
        <p class="eyebrow">THE ART OF LOOKING WITHIN</p>
        <h2 id="culture-title">方寸之间，<br /><em>自有天地。</em></h2>
        <p>一处开孔，是看向内部的窗。<br />从鬼工球的嵌套结构出发，发现纹样、<br class="culture-desktop-break" />空间与光的关系，再把好奇变成创作。</p>
        <RouterLink to="/hub/studies/nested-structure" class="primary-button">开启第一篇导览 <span aria-hidden="true">↗</span></RouterLink>
        <div class="culture-hero-foot"><span>阅读</span><i aria-hidden="true" /><span>三维观察</span><i aria-hidden="true" /><span>亲手创作</span></div>
      </div>
      <div class="culture-hero-image"><CultureImage kind="digital" caption eager /><span class="culture-image-seal" aria-hidden="true">观<br />微</span></div>
    </section>

    <section class="culture-guides" aria-labelledby="culture-guides-title">
      <div class="section-heading"><div><p class="eyebrow">THREE WAYS TO BEGIN</p><h2 id="culture-guides-title">从看见，到理解</h2></div><p class="muted">三篇短导览，每一篇都有可亲手探索的结构。</p></div>
      <div class="culture-guide-grid">
        <article v-for="study in studies" :key="study.id" class="culture-guide-card">
          <RouterLink :to="`/hub/studies/${study.id}`" class="culture-guide-image" tabindex="-1" aria-hidden="true"><CultureImage :kind="study.image" /><span>{{ study.number }} / STUDY</span></RouterLink>
          <div class="culture-guide-copy">
            <p class="culture-guide-meta">{{ study.readTime }}<span>含三维观察</span></p>
            <h3><RouterLink :to="`/hub/studies/${study.id}`">{{ study.title }}</RouterLink></h3>
            <p>{{ study.summary }}</p>
            <RouterLink :to="`/hub/studies/${study.id}`" class="culture-guide-link">阅读并观察 <span aria-hidden="true">↗</span></RouterLink>
          </div>
        </article>
      </div>
    </section>

    <aside class="culture-invitation">
      <span class="culture-note-seal" aria-hidden="true">知</span>
      <div><p class="eyebrow">MAKE ROOM FOR CURIOSITY</p><h2>理解传统，也从一次尝试开始。</h2><p>数字模型让结构变得可见。旋转、剖开、展开，再用原创程序化纹样表达你的观察。</p><RouterLink to="/hub/workshop" class="text-button">已有灵感？选择创作模板 →</RouterLink></div>
      <span class="culture-invitation-line" aria-hidden="true">观物 · 知理 · 创作</span>
    </aside>
    <p class="culture-resource-note">本页图像沿用原课程资源，作为参考与氛围配图；不作为本项目的藏品、真实展览或文物复原证据。文中具体藏品资料可在各篇导览中查看博物馆来源。</p>
  </div>
</template>

<style scoped>
.culture-intro-note { color:var(--studio-muted); font-family:"Songti SC",serif; font-size:13px; letter-spacing:2px; }
.culture-hero { display:grid; grid-template-columns:.85fr 1.15fr; min-height:440px; border:1px solid var(--studio-line); border-radius:6px; background:var(--studio-panel); overflow:hidden; }
.culture-hero-copy { padding:44px 30px 30px 40px; }
.culture-hero-copy h2 { font-family:"Songti SC","Noto Serif CJK SC",Georgia,serif; font-size:clamp(35px,3.8vw,51px); font-weight:400; letter-spacing:5px; line-height:1.55; margin:24px 0 18px; }
.culture-hero-copy h2 em { color:var(--studio-gold); font-style:normal; }
.culture-hero-copy>p:not(.eyebrow) { color:var(--studio-muted); font-size:12px; line-height:2.1; margin-bottom:25px; }
.culture-hero-image { min-height:440px; position:relative; }
.culture-image-seal { position:absolute; right:24px; top:25px; color:#fcf0d6; border:1px solid #dfc69c8a; font-family:"Songti SC",serif; font-size:20px; line-height:1.5; padding:9px 8px; }
.culture-hero-foot { display:flex; align-items:center; gap:12px; margin-top:30px; color:var(--studio-muted); font-size:9px; letter-spacing:1px; }
.culture-hero-foot i { width:20px; height:1px; background:var(--studio-line); }
.culture-guides { padding-top:48px; }
.culture-guide-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:23px; }
.culture-guide-card { border:1px solid var(--studio-line); border-radius:6px; background:var(--studio-panel); overflow:hidden; }
.culture-guide-image { height:218px; display:block; position:relative; overflow:hidden; }
.culture-guide-image>span { position:absolute; top:14px; left:16px; padding:5px 8px; color:#fff9eb; background:#20382fbb; font-size:9px; letter-spacing:1.4px; }
.culture-guide-image :deep(img) { transition:transform .5s; }
.culture-guide-card:hover :deep(img) { transform:scale(1.035); }
.culture-guide-copy { padding:23px 22px 20px; }
.culture-guide-meta { display:flex; justify-content:space-between; color:var(--studio-gold); font-size:9px; letter-spacing:.5px; }
.culture-guide-meta span { color:var(--studio-muted); }
.culture-guide-copy h3 { font-family:"Songti SC",Georgia,serif; font-size:23px; font-weight:500; margin:13px 0 10px; letter-spacing:1px; }
.culture-guide-copy>p:not(.culture-guide-meta) { font-size:12px; line-height:1.9; color:var(--studio-muted); min-height:46px; }
.culture-guide-link { display:flex; justify-content:space-between; margin-top:23px; padding-top:16px; border-top:1px solid var(--studio-line); color:var(--studio-accent); font-size:11px; }
.culture-guide-link span { font-size:15px; }
.culture-invitation { display:flex; gap:25px; align-items:center; margin-top:43px; padding:30px; border:1px solid var(--studio-line); background:var(--studio-tint); border-radius:5px; }
.culture-note-seal { display:grid; place-items:center; flex-shrink:0; width:52px; height:66px; border:1px solid var(--studio-gold); color:var(--studio-gold); font-family:"Songti SC",serif; font-size:33px; }
.culture-invitation h2 { font-family:"Songti SC",serif; font-size:23px; font-weight:500; margin:7px 0 10px; }
.culture-invitation p:not(.eyebrow) { color:var(--studio-muted); font-size:12px; line-height:1.9; margin-bottom:13px; }
.culture-invitation-line { margin-left:auto; flex-shrink:0; color:var(--studio-gold); font-size:11px; writing-mode:vertical-rl; letter-spacing:4px; }
.culture-resource-note { font-size:9px; line-height:1.9; color:var(--studio-muted); max-width:770px; margin:23px auto 0; text-align:center; }
@media(max-width:1000px) { .culture-hero-copy { padding:30px 25px; }.culture-hero { grid-template-columns:.95fr 1.05fr; }.culture-guide-copy { padding:20px 17px; }.culture-guide-copy h3 { font-size:20px; }.culture-guide-image { height:190px; }.culture-guide-copy>p:not(.culture-guide-meta) { min-height:69px; } }
@media(max-width:760px) { .culture-intro-note { display:none; }.culture-hero { grid-template-columns:1fr; }.culture-hero-image { min-height:0; height:230px; order:-1; }.culture-hero-copy { padding:27px 25px; }.culture-hero-copy h2 { font-size:37px; letter-spacing:3px; margin:18px 0 14px; }.culture-hero-copy>p:not(.eyebrow) { font-size:12px; }.culture-hero-foot { margin-top:23px; }.culture-desktop-break { display:none; }.culture-guides { padding-top:33px; }.culture-guide-grid { grid-template-columns:1fr; gap:24px; }.culture-guide-image { height:240px; }.culture-guide-copy { padding:22px; }.culture-guide-copy h3 { font-size:24px; }.culture-guide-copy>p:not(.culture-guide-meta) { min-height:0; }.culture-invitation { padding:23px 20px; gap:17px; align-items:flex-start; margin-top:30px; }.culture-note-seal { width:37px; height:49px; font-size:25px; }.culture-invitation h2 { font-size:21px; line-height:1.6; }.culture-invitation-line { display:none; }.culture-resource-note { font-size:10px; text-align:left; } }
</style>
