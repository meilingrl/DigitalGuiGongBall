<script setup lang="ts">
import { computed } from 'vue'
import type { DesignConfig } from '../../shared/design'
const props = defineProps<{ config: DesignConfig }>()
const colors = { ivory: '#caa775', jade: '#559d8b', bronze: '#aa7650' }
const lines = computed(() => Array.from({ length: props.config.layers }, (_, index) => ({ r: 67 - index * 8, angle: index * 19 })))
</script>

<template>
  <svg viewBox="0 0 240 190" class="design-preview" role="img" :aria-label="`${config.layers} 层${config.material === 'jade' ? '青玉' : config.material === 'bronze' ? '古铜' : '暖瓷'}配置示意`">
    <ellipse cx="120" cy="171" rx="60" ry="5" fill="currentColor" opacity=".07" />
    <g :stroke="colors[config.material]" fill="none" stroke-width="1.3" transform="translate(120 87)">
      <g v-for="line in lines" :key="line.r" :transform="`rotate(${line.angle})`">
        <circle :r="line.r" opacity=".65" />
        <ellipse :rx="line.r * .38" :ry="line.r" />
        <ellipse :rx="line.r" :ry="line.r * .38" />
        <ellipse v-if="config.templateId !== 'linglong'" :rx="line.r * .6" :ry="line.r" transform="rotate(60)" opacity=".7" />
      </g>
      <circle r="5" fill="currentColor" opacity=".4" />
    </g>
    <text x="120" y="189" text-anchor="middle" fill="currentColor" opacity=".5" font-size="9" letter-spacing="3">参数示意 · 进入查看三维</text>
  </svg>
</template>
