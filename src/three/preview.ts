import { Color, DoubleSide, Group, Mesh, MeshPhysicalMaterial, type Plane } from 'three'
import type { DesignConfig } from '../../shared/design'
import { getStageLayout } from './layout'
import { createShellGeometry, materialPresets } from './ornament'

export function sameTopology(a: DesignConfig | undefined, b: DesignConfig): boolean {
  return !!a && a.templateId === b.templateId && a.layers === b.layers
    && a.patternScale === b.patternScale && a.aperture === b.aperture
}

/** An isolated snapshot never advances animation or borrows a mutable live material. */
export function createPreviewObject(config: DesignConfig, renderedConfig: DesignConfig | undefined, liveLayers: Mesh[], clipPlane: Plane) {
  const group = new Group()
  const reuseGeometry = sameTopology(renderedConfig, config) && liveLayers.length === config.layers
  const layout = getStageLayout(config, 4 / 3)
  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    for (const child of group.children) {
      const mesh = child as Mesh
      if (!reuseGeometry) mesh.geometry.dispose()
      ;(mesh.material as MeshPhysicalMaterial).dispose()
    }
    group.clear()
  }
  try {
    for (let index = 0; index < config.layers; index++) {
      const preset = materialPresets[config.material]
      const material = new MeshPhysicalMaterial({
        ...preset,
        color: new Color(preset.color).offsetHSL(0, 0, -index * 0.025),
        clearcoatRoughness: 0.3, side: DoubleSide, envMapIntensity: 0.65,
        clippingPlanes: [clipPlane],
      })
      let mesh: Mesh
      try {
        const geometry = reuseGeometry ? liveLayers[index]!.geometry
          : createShellGeometry(config, 1.6 - index / (config.layers - 1) * 1.1)
        mesh = new Mesh(geometry, material)
      } catch (error) {
        material.dispose()
        throw error
      }
      group.add(mesh)
      mesh.rotation.set(index * 0.13, index * 0.27, index * 0.085)
      mesh.position.copy(layout.positions[index]!)
      mesh.visible = config.activeLayer === 0 || config.activeLayer === index + 1
    }
    return { group, dispose }
  } catch (error) {
    dispose()
    throw error
  }
}

/** WebGL readback starts at the bottom left; Canvas ImageData starts at the top left. */
export function uprightRgba(pixels: Uint8Array, width: number, height: number): Uint8ClampedArray<ArrayBuffer> {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || pixels.length !== width * height * 4) {
    throw new Error('Invalid preview pixel dimensions')
  }
  const upright = new Uint8ClampedArray(pixels.length)
  const stride = width * 4
  for (let row = 0; row < height; row++) {
    upright.set(pixels.subarray(row * stride, (row + 1) * stride), (height - row - 1) * stride)
  }
  return upright
}

/** WebGL often reports unsupported targets via status/error flags rather than exceptions. */
export function canReadPreview(gl: Pick<WebGL2RenderingContext,
  'isContextLost' | 'checkFramebufferStatus' | 'getError' | 'FRAMEBUFFER' | 'FRAMEBUFFER_COMPLETE' | 'NO_ERROR'>): boolean {
  return !gl.isContextLost() && gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
    && gl.getError() === gl.NO_ERROR
}

/** PNG has no quality option, so reduce dimensions only when its actual bytes exceed the budget. */
export function compactPreview(encode: (width: number, height: number) => string): string | undefined {
  for (const width of [480, 400, 320, 240, 160]) {
    const dataUrl = encode(width, width * 3 / 4)
    const prefix = 'data:image/png;base64,'
    if (!dataUrl.startsWith(prefix)) return undefined
    const base64 = dataUrl.slice(prefix.length)
    if (!base64 || base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return undefined
    const bytes = base64.length * 3 / 4 - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0)
    if (bytes <= 256 * 1024) return dataUrl
  }
  return undefined
}
