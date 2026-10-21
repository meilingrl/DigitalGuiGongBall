import { Vector3 } from 'three'
import type { DesignConfig } from '../../shared/design'
import { layerRadius, setLayerPosition } from './layerSpec'

/** Fit the actual visible shell bounds, including a sensible close view of a focused inner shell. */
export function getStageLayout(config: DesignConfig, aspect: number) {
  const positions = Array.from({ length: config.layers }, (_, index) =>
    setLayerPosition(new Vector3(), index, config.layers, config.separation))
  let minX = Infinity
  let maxX = -Infinity
  let minY = config.activeLayer ? Infinity : -1.95
  let maxY = -Infinity
  let maxRadius = 0
  for (let index = 0; index < config.layers; index++) {
    if (config.activeLayer && config.activeLayer !== index + 1) continue
    const radius = layerRadius(index, config.layers)
    const position = positions[index]!
    minX = Math.min(minX, position.x - radius)
    maxX = Math.max(maxX, position.x + radius)
    minY = Math.min(minY, position.y - radius)
    maxY = Math.max(maxY, position.y + radius)
    maxRadius = Math.max(maxRadius, radius)
  }
  const target = new Vector3((minX + maxX) / 2, (minY + maxY) / 2, 0)
  const halfWidth = (maxX - minX) / 2 + 0.12
  const halfHeight = (maxY - minY) / 2 + 0.12
  const distance = Math.max(2.7,
    Math.max(halfHeight, halfWidth / Math.max(aspect, 0.38)) / Math.tan(Math.PI * 17.5 / 180) * 1.17 + maxRadius * 0.25,
  )
  return { positions, target, distance }
}
