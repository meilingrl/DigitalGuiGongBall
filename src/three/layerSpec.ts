import { Color, DoubleSide, type Euler, type MeshPhysicalMaterialParameters, type Vector3 } from 'three'
import type { DesignConfig } from '../../shared/design'

export const materialPresets = {
  ivory: { color: '#cbb58e', roughness: 0.44, metalness: 0.025, clearcoat: 0.2 },
  jade: { color: '#4c8c78', roughness: 0.27, metalness: 0.06, clearcoat: 0.6 },
  bronze: { color: '#9b713e', roughness: 0.31, metalness: 0.82, clearcoat: 0.15 },
} as const

export function layerRadius(index: number, count: number): number {
  return 1.6 - index / (count - 1) * 1.1
}

export function layerMaterialParameters(material: DesignConfig['material'], index: number): MeshPhysicalMaterialParameters {
  const preset = materialPresets[material]
  return {
    ...preset,
    color: new Color(preset.color).offsetHSL(0, 0, -index * 0.025),
    clearcoatRoughness: 0.3, side: DoubleSide, envMapIntensity: 0.65,
  }
}

export function setLayerRotation(rotation: Euler, index: number): void {
  rotation.set(index * 0.13, index * 0.27, index * 0.085)
}

/** Mutate an existing vector so the animation path does not allocate each frame. */
export function setLayerPosition(position: Vector3, index: number, count: number, separation: number): Vector3 {
  return position.set(
    (index - (count - 1) / 2) * 1.24 * separation,
    Math.sin(index * 0.9) * 0.18 * separation,
    0,
  )
}
