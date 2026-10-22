<script setup lang="ts">
import { computed, ref } from 'vue'
import { templates, type DesignConfig } from '../../../shared/design'
import { getLayerPattern, withLayerPattern } from '../../../shared/layerDesign'
import type { LayerPattern, LayerRole } from '../../../shared/layerPattern'

const config = defineModel<DesignConfig>({ required: true })
const selectedRole = ref<LayerRole>('outer')
const roles = [
  { id: 'outer', name: '外层' },
  { id: 'inner', name: '内层' },
] as const
const roleName = computed(() => selectedRole.value === 'outer' ? '外层' : '内层')
const selectedPattern = computed(() => patternFor(selectedRole.value))

function patternFor(role: LayerRole) {
  return getLayerPattern(config.value, role === 'outer' ? 0 : config.value.layers - 1)
}
function patternName(pattern: LayerPattern) {
  return templates.find(template => template.id === pattern.templateId)!.name
}
function parameter<Key extends keyof LayerPattern>(key: Key) {
  return computed({
    get: () => selectedPattern.value[key],
    set: (value: LayerPattern[Key]) => {
      config.value = withLayerPattern(config.value, selectedRole.value, { [key]: value })
    },
  })
}
const templateId = parameter('templateId')
const patternScale = parameter('patternScale')
const aperture = parameter('aperture')
function focusSelectedLayer() {
  config.value = {
    ...config.value,
    activeLayer: selectedRole.value === 'outer' ? 1 : config.value.layers,
  }
}
</script>

<template>
  <div class="layer-pattern-editor">
    <div class="layer-role-options" role="group" aria-label="选择编辑图层">
      <button
        v-for="role in roles"
        :key="role.id"
        type="button"
        class="layer-role-choice"
        :class="{ selected: selectedRole === role.id }"
        :aria-label="`编辑${role.name}`"
        :aria-pressed="selectedRole === role.id"
        @click="selectedRole = role.id"
      >
        <strong>{{ role.name }}</strong>
        <span>{{ patternName(patternFor(role.id)) }}</span>
        <small>
          密度 {{ patternFor(role.id).patternScale }} · 开孔
          {{ Math.round(patternFor(role.id).aperture * 100) }}%
        </small>
      </button>
    </div>
    <label class="control-label">
      {{ roleName }}纹样
      <select v-model="templateId" :aria-label="`${roleName}纹样`">
        <option v-for="template in templates" :key="template.id" :value="template.id">
          {{ template.name }}
        </option>
      </select>
    </label>
    <label class="control-label">
      {{ roleName }}纹样密度
      <output>{{ selectedPattern.patternScale }}</output>
      <input
        v-model.number="patternScale"
        :aria-label="`${roleName}纹样密度`"
        type="range"
        min="8"
        max="24"
        step="1"
      />
    </label>
    <label class="control-label">
      {{ roleName }}开孔尺度
      <output>{{ Math.round(selectedPattern.aperture * 100) }}%</output>
      <input
        v-model.number="aperture"
        :aria-label="`${roleName}开孔尺度`"
        type="range"
        min=".35"
        max=".8"
        step=".01"
      />
    </label>
    <button type="button" class="secondary-button layer-focus" @click="focusSelectedLayer">
      单独观察{{ roleName }}
    </button>
    <p class="middle-layer-note">
      中间层沿用起始参数：{{ patternName(config) }} · 密度
      {{ config.patternScale }} · 开孔 {{ Math.round(config.aperture * 100) }}%。
      <span v-if="config.layers === 2">当前两层结构没有中间层。</span>
      切换编辑对象不改变观察视角。
    </p>
  </div>
</template>

<style scoped>
.layer-role-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 20px;
}
.layer-role-choice {
  display: grid;
  gap: 7px;
  min-width: 0;
  padding: 13px 9px;
  border: 1px solid var(--studio-line);
  border-radius: 4px;
  background: var(--studio-bg);
  color: var(--studio-muted);
  text-align: left;
  cursor: pointer;
}
.layer-role-choice.selected {
  border-color: var(--studio-accent);
  background: var(--studio-panel);
  color: var(--studio-accent);
  box-shadow: inset 0 0 0 1px var(--studio-accent);
}
.layer-role-choice strong {
  font-size: 12px;
  font-weight: 500;
}
.layer-role-choice span {
  font-size: 12px;
  color: var(--studio-ink);
}
.layer-role-choice small {
  font-size: 10px;
  line-height: 1.6;
}
.layer-role-choice:focus-visible {
  outline: 2px solid var(--studio-accent);
  outline-offset: 3px;
}
.layer-role-choice:disabled {
  cursor: default;
  opacity: .55;
}
.layer-focus {
  margin-top: 16px;
  width: 100%;
}
.middle-layer-note {
  margin-top: 14px;
  color: var(--studio-muted);
  font-size: 10px;
  line-height: 1.9;
}
@media (max-width: 760px) {
  .layer-role-choice { padding: 15px 12px; }
  .layer-role-choice small, .middle-layer-note { font-size: 11px; }
}
</style>
