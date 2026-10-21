<script setup lang="ts">
import { computed } from 'vue'
import type { DesignConfig } from '../../../shared/design'

const config = defineModel<DesignConfig>({ required: true })

// Replace the model at the public boundary; the document owns normalization,
// synchronous dirty tracking, and draft persistence.
function parameter<Key extends keyof DesignConfig>(key: Key) {
  return computed({
    get: () => config.value[key],
    set: (value: DesignConfig[Key]) => {
      config.value = { ...config.value, [key]: value }
    }
  })
}
const layers = parameter('layers')
const patternScale = parameter('patternScale')
const aperture = parameter('aperture')
const separation = parameter('separation')
const cutaway = parameter('cutaway')
const activeLayer = parameter('activeLayer')
const selectedMaterial = parameter('material')
</script>

<template>
  <section class="control-section">
    <div class="control-heading">
      <span>01</span>
      <h2>结构与纹样</h2>
    </div>
    <label class="control-label">
      嵌套层数
      <output>{{ config.layers }} 层</output>
      <input
        v-model.number="layers"
        aria-label="嵌套层数"
        type="range"
        min="2"
        max="6"
        step="1"
      />
    </label>
    <label class="control-label">
      纹样密度
      <output>{{ config.patternScale }}</output>
      <input
        v-model.number="patternScale"
        aria-label="纹样密度"
        type="range"
        min="8"
        max="24"
        step="1"
      />
    </label>
    <label class="control-label">
      开孔尺度
      <output>{{ Math.round(config.aperture * 100) }}%</output>
      <input
        v-model.number="aperture"
        aria-label="开孔尺度"
        type="range"
        min=".35"
        max=".8"
        step=".01"
      />
    </label>
  </section>
  <section class="control-section">
    <div class="control-heading">
      <span>02</span>
      <h2>观察内部</h2>
    </div>
    <label class="control-label">
      分层展开
      <output>{{ Math.round(config.separation * 100) }}%</output>
      <input
        v-model.number="separation"
        aria-label="分层展开"
        type="range"
        min="0"
        max="1"
        step=".01"
      />
    </label>
    <label class="switch-label">
      <span>
        剖视结构
        <small>切去部分球壳，观察套叠关系</small>
      </span>
      <input v-model="cutaway" type="checkbox" aria-label="剖视结构" />
    </label>
    <label class="control-label">
      聚焦图层
      <select v-model.number="activeLayer" aria-label="聚焦图层">
        <option :value="0">查看全部图层</option>
        <option v-for="layer in config.layers" :key="layer" :value="layer">
          第 {{ layer }} 层{{ layer === 1 ? '（最外层）' : '' }}
        </option>
      </select>
    </label>
  </section>
  <section class="control-section">
    <div class="control-heading">
      <span>03</span>
      <h2>材质与光泽</h2>
    </div>
    <div class="material-options">
      <button
        v-for="material in ['ivory', 'jade', 'bronze'] as const"
        :key="material"
        class="material-choice"
        :class="{ selected: config.material === material }"
        :aria-pressed="config.material === material"
        @click="selectedMaterial = material"
      >
        <span :class="`material-swatch ${material}`" />
        {{
          material === 'ivory' ? '暖瓷' : material === 'jade' ? '青玉' : '古铜'
        }}
      </button>
    </div>
  </section>
</template>
