<script setup lang="ts">
import nestedImage from '../../assets/materials/images/museum/gallery/museum-gallery-02-v1.0.png'
import openworkImage from '../../assets/materials/images/museum/gallery/museum-gallery-03-v1.0.png'
import type { Study } from '../../data/studies'

defineProps<{ kind: Study['image']; caption?: boolean; eager?: boolean }>()
const images = {
  nested: { src: nestedImage, alt: '课程原有参考图：开孔球体及其内部层次', label: '课程原有参考图 · 用于观察层次' },
  openwork: { src: openworkImage, alt: '课程原有参考图：花卉浮雕与内部星形镂空', label: '课程原有参考图 · 用于观察纹样' },
  digital: { src: '/materials/museum/exhibitions/1.webp', alt: '课程原有概念图：展柜中的多层镂空球体', label: '课程原有概念图 · 非真实展览记录' },
}
</script>

<template>
  <figure class="culture-image" :class="`culture-image--${kind}`">
    <img :src="images[kind].src" :alt="images[kind].alt" :loading="eager ? 'eager' : 'lazy'" />
    <figcaption v-if="caption">{{ images[kind].label }}<span>图像不对应本文引文藏品。</span></figcaption>
  </figure>
</template>

<style scoped>
.culture-image { margin:0; width:100%; height:100%; overflow:hidden; position:relative; background:#d6d1c4; }
.culture-image img { display:block; width:100%; height:100%; object-fit:cover; }
.culture-image--nested img { object-position:38% 45%; }
.culture-image--openwork img { object-position:50% 44%; }
.culture-image--digital img { object-position:50% 50%; }
.culture-image figcaption { position:absolute; left:0; right:0; bottom:0; padding:28px 18px 12px; background:linear-gradient(transparent,#111b16c9); font-size:9px; line-height:1.8; letter-spacing:.3px; color:#fffdf1; }
.culture-image figcaption span { display:block; opacity:.75; }
</style>
