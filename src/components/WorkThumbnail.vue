<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Work } from '../../shared/design'
import DesignPreview from './DesignPreview.vue'
const props = defineProps<{ work: Work }>()
const failed = ref(false)
const current = computed(() => props.work.previewVersion === props.work.version && !failed.value)
const url = computed(() => `/api/works/${encodeURIComponent(props.work.id)}/preview?version=${props.work.version}`)
watch(() => `${props.work.id}:${props.work.version}:${props.work.previewVersion}`, () => { failed.value = false })
</script>

<template>
  <div class="work-thumbnail">
    <img v-if="current" :src="url" :alt="`${work.title} · 保存配置的三维预览`" loading="lazy" @error="failed = true" />
    <template v-else><DesignPreview :config="work.config" /><span class="thumbnail-pending">{{ failed ? '预览暂不可用' : '保存后生成三维预览' }}</span></template>
    <span v-if="current" class="thumbnail-caption">三维实景 · v{{ work.version }}</span>
  </div>
</template>

<style scoped>
.work-thumbnail{position:relative;aspect-ratio:4/3;overflow:hidden;background:var(--studio-tint);display:grid;place-items:center;width:100%}
.work-thumbnail img{width:100%;height:100%;object-fit:cover;display:block}
.work-thumbnail :deep(.design-preview){width:76%;max-height:210px}
.thumbnail-caption,.thumbnail-pending{position:absolute;bottom:13px;left:16px;font-size:9px;letter-spacing:1px;color:var(--studio-muted);background:color-mix(in srgb,var(--studio-panel) 88%,transparent);padding:5px 8px;border-radius:3px}
.thumbnail-pending{left:50%;transform:translateX(-50%);white-space:nowrap}
.work-thumbnail :deep(svg text){display:none}
</style>
