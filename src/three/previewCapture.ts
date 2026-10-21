import { Color, HalfFloatType, Vector4, WebGLRenderTarget, type ColorRepresentation, type Group, type PerspectiveCamera, type Plane, type Scene, type Vector3, type Mesh, type WebGLRenderer } from 'three'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import type { DesignConfig } from '../../shared/design'
import { canReadPreview, createPreviewObject, encodePreviewPixels } from './preview'
import { getStageLayout } from './layout'

/** Only the renderer operations used by capture; native WebGLRenderer satisfies this port. */
export interface PreviewRenderer {
  getContext(): Parameters<typeof canReadPreview>[0]
  getRenderTarget(): WebGLRenderTarget | null
  getActiveCubeFace(): number
  getActiveMipmapLevel(): number
  getViewport(out: Vector4): Vector4
  getScissor(out: Vector4): Vector4
  getScissorTest(): boolean
  getClearColor(out: Color): Color
  getClearAlpha(): number
  setClearColor(color: ColorRepresentation, alpha: number): void
  setRenderTarget(target: WebGLRenderTarget | null, face?: number, mip?: number): void
  setViewport(viewport: Vector4): void
  setScissor(scissor: Vector4): void
  setScissorTest(enabled: boolean): void
  render(scene: Scene, camera: PerspectiveCamera): void
  readRenderTargetPixels(target: WebGLRenderTarget, x: number, y: number, width: number, height: number, pixels: Uint8Array): void
}

export interface PreviewGpu {
  renderer: PreviewRenderer
  createOutputPass(): { render(output: WebGLRenderTarget, input: WebGLRenderTarget): void; dispose(): void }
}

export interface PreviewContext {
  scene: Scene
  camera: PerspectiveCamera
  viewTarget: Vector3
  object: Group
  pedestal: Group
  clipPlane: Plane
  liveLayers: readonly Mesh[]
  renderedConfig: DesignConfig | undefined
  backgroundColor: string
}

export type PreviewEncoder = (pixels: Uint8Array, width: number, height: number, backgroundColor: string) => string | undefined

/** The native pass closes over the stage's existing renderer, never a second context. */
export function createPreviewGpu(renderer: WebGLRenderer): PreviewGpu {
  return {
    renderer,
    createOutputPass() {
      const pass = new OutputPass()
      // HDR blending yields premultiplied RGB. ImageData needs straight alpha;
      // unpremultiply before nonlinear ACES/sRGB to preserve shadow/edge colours.
      const sample = 'gl_FragColor = texture2D( tDiffuse, vUv );'
      if (!pass.material.fragmentShader.includes(sample)) {
        pass.dispose()
        throw new Error('Unsupported preview output shader')
      }
      pass.material.fragmentShader = pass.material.fragmentShader.replace(sample,
        `${sample}\n gl_FragColor.rgb = gl_FragColor.a > 0.0 ? gl_FragColor.rgb / gl_FragColor.a : vec3(0.0);`)
      return {
        render: (output, input) => pass.render(renderer, output, input, 0, false),
        dispose: () => pass.dispose(),
      }
    },
  }
}

/** Capture the acknowledged config without advancing the live editor or its controls. */
export function captureWorkPreview(config: DesignConfig, context: PreviewContext, gpu: PreviewGpu,
  encode: PreviewEncoder = encodePreviewPixels): string | undefined {
  const { scene, camera: liveCamera, viewTarget, object, pedestal, clipPlane, liveLayers, renderedConfig, backgroundColor } = context
  const { renderer } = gpu
  try {
    if (renderer.getContext().isContextLost()) return undefined
    const requested = { ...config }
    const previousTarget = renderer.getRenderTarget()
    const previousFace = renderer.getActiveCubeFace()
    const previousMip = renderer.getActiveMipmapLevel()
    const previousViewport = renderer.getViewport(new Vector4())
    const previousScissor = renderer.getScissor(new Vector4())
    const previousScissorTest = renderer.getScissorTest()
    const previousBackground = scene.background
    const previousClearColor = renderer.getClearColor(new Color())
    const previousClearAlpha = renderer.getClearAlpha()
    const previousVisible = object.visible
    const previousPedestalScale = pedestal.scale.clone()
    const previousClip = clipPlane.constant
    let snapshot: ReturnType<typeof createPreviewObject> | undefined
    let target: WebGLRenderTarget | undefined
    let outputTarget: WebGLRenderTarget | undefined
    let outputPass: ReturnType<PreviewGpu['createOutputPass']> | undefined
    try {
      snapshot = createPreviewObject(requested, renderedConfig, liveLayers, clipPlane)
      snapshot.group.rotation.copy(object.rotation)
      scene.add(snapshot.group)
      snapshot.group.updateMatrixWorld(true)
      const layout = getStageLayout(requested, 4 / 3)
      const centre = snapshot.group.localToWorld(layout.target)
      // Cloning also preserves OrbitControls' private damping/gesture state.
      const camera = liveCamera.clone()
      camera.aspect = 4 / 3
      camera.zoom = 1
      camera.clearViewOffset()
      const direction = liveCamera.position.clone().sub(viewTarget)
      if (direction.lengthSq() < 1e-12) direction.set(0.34, 0.17, 1)
      camera.position.copy(direction.normalize().multiplyScalar(layout.distance).add(centre))
      camera.lookAt(centre)
      camera.updateProjectionMatrix()
      object.visible = false
      pedestal.scale.x = 1 + requested.separation * requested.layers * 0.32
      clipPlane.constant = requested.cutaway ? 0.12 : 9
      // Scene Color is a direct clear onscreen. Composite it outside HDR.
      scene.background = null
      renderer.setClearColor(0x000000, 0)
      const width = 960
      const height = 720
      target = new WebGLRenderTarget(width, height, {
        type: HalfFloatType, depthBuffer: true, stencilBuffer: false,
      })
      renderer.setRenderTarget(target)
      renderer.setScissorTest(false)
      renderer.render(scene, camera)
      if (!canReadPreview(renderer.getContext())) return undefined
      outputTarget = new WebGLRenderTarget(width, height, { depthBuffer: false, stencilBuffer: false })
      outputPass = gpu.createOutputPass()
      outputPass.render(outputTarget, target)
      const pixels = new Uint8Array(width * height * 4)
      renderer.readRenderTargetPixels(outputTarget, 0, 0, width, height, pixels)
      if (!canReadPreview(renderer.getContext())) return undefined
      return encode(pixels, width, height, backgroundColor)
    } finally {
      object.visible = previousVisible
      pedestal.scale.copy(previousPedestalScale)
      clipPlane.constant = previousClip
      scene.background = previousBackground
      if (snapshot) scene.remove(snapshot.group)
      // Release temporary resources even if GPU state restoration throws.
      try {
        let restoreFailed = false
        for (const restore of [
          () => renderer.setClearColor(previousClearColor, previousClearAlpha),
          () => renderer.setRenderTarget(previousTarget, previousFace, previousMip),
          () => renderer.setViewport(previousViewport),
          () => renderer.setScissor(previousScissor),
          () => renderer.setScissorTest(previousScissorTest),
        ]) {
          try { restore() } catch { restoreFailed = true }
        }
        if (restoreFailed) throw new Error('Preview GPU state restoration failed')
      } finally {
        snapshot?.dispose()
        outputPass?.dispose()
        outputTarget?.dispose()
        target?.dispose()
      }
    }
  } catch { return undefined }
}
