import type { DesignConfig, DesignConfigV2 } from './design.js'
import type { LayerPattern, LayerRole } from './layerPattern.js'

export function getLayerPattern(config: DesignConfig, index: number): LayerPattern {
  const pattern = config.schemaVersion === 2 && index === 0
    ? config.layerPatterns.outer
    : config.schemaVersion === 2 && index === config.layers - 1
      ? config.layerPatterns.inner
      : config
  return { templateId: pattern.templateId, patternScale: pattern.patternScale, aperture: pattern.aperture }
}

export function withLayerPattern(config: DesignConfig, role: LayerRole, patch: Partial<LayerPattern>): DesignConfigV2 {
  const outer = getLayerPattern(config, 0)
  const inner = getLayerPattern(config, config.layers - 1)
  return {
    ...config, schemaVersion: 2,
    layerPatterns: { outer, inner, [role]: { ...(role === 'outer' ? outer : inner), ...patch } },
  }
}
