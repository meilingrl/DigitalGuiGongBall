import { Group, Mesh, MeshPhysicalMaterial, type Plane } from 'three'
import type { DesignConfig } from '../../shared/design'
import { getLayerPattern } from '../../shared/layerDesign'
import { getStageLayout } from './layout'
import { createShellGeometry } from './ornament'
import { layerMaterialParameters, layerRadius, setLayerRotation } from './layerSpec'

export function sameTopology(a: DesignConfig | undefined, b: DesignConfig): boolean {
  if (!a || a.layers !== b.layers) return false
  for (let index = 0; index < b.layers; index++) {
    const first = getLayerPattern(a, index)
    const second = getLayerPattern(b, index)
    if (first.templateId !== second.templateId || first.patternScale !== second.patternScale
      || first.aperture !== second.aperture) return false
  }
  return true
}

/** An isolated snapshot never advances animation or borrows a mutable live material. */
export function createPreviewObject(config: DesignConfig, renderedConfig: DesignConfig | undefined, liveLayers: readonly Mesh[], clipPlane: Plane) {
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
      const material = new MeshPhysicalMaterial({
        ...layerMaterialParameters(config.material, index), clippingPlanes: [clipPlane],
      })
      let mesh: Mesh
      try {
        const geometry = reuseGeometry ? liveLayers[index]!.geometry
          : createShellGeometry(getLayerPattern(config, index), layerRadius(index, config.layers))
        mesh = new Mesh(geometry, material)
      } catch (error) {
        material.dispose()
        throw error
      }
      group.add(mesh)
      setLayerRotation(mesh.rotation, index)
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

/** Composite straight-alpha, display-space readback over the studio background. */
export function encodePreviewPixels(pixels: Uint8Array, width: number, height: number, backgroundColor: string): string | undefined {
  const source = document.createElement('canvas')
  source.width = width
  source.height = height
  const sourceContext = source.getContext('2d')
  if (!sourceContext) return undefined
  sourceContext.putImageData(new ImageData(uprightRgba(pixels, width, height), width, height), 0, 0)
  const output = document.createElement('canvas')
  const outputContext = output.getContext('2d')
  if (!outputContext) return undefined
  return compactPreview((outputWidth, outputHeight) => {
    output.width = outputWidth
    output.height = outputHeight
    outputContext.imageSmoothingEnabled = true
    outputContext.imageSmoothingQuality = 'high'
    outputContext.fillStyle = backgroundColor
    outputContext.fillRect(0, 0, outputWidth, outputHeight)
    outputContext.drawImage(source, 0, 0, outputWidth, outputHeight)
    return output.toDataURL('image/png')
  })
}
