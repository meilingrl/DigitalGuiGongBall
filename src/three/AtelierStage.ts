import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import type { DesignConfig } from '../../shared/design'
import { createOrnamentLayers, materialPresets } from './ornament'
import { disposeObject } from './resources'
import { getStageLayout } from './layout'
import { canReadPreview, compactPreview, createPreviewObject, sameTopology, uprightRgba } from './preview'

type Theme = 'light' | 'dark'
interface StageEvents { ready: () => void; error: (message: string) => void }

/** One canvas owns one scene and all GPU resources for the workshop lifetime. */
export class AtelierStage {
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100)
  private readonly object = new THREE.Group()
  private readonly pedestal = new THREE.Group()
  private renderer!: THREE.WebGLRenderer
  private controls!: OrbitControls
  private observer?: ResizeObserver
  private environment?: THREE.WebGLRenderTarget
  private readonly clipPlane = new THREE.Plane(new THREE.Vector3(-0.24, 0, -1).normalize(), 3)
  private layers: THREE.Mesh[] = []
  // Unlike config, this changes only after the debounced geometry build succeeds.
  private renderedConfig?: DesignConfig
  private config: DesignConfig
  private theme: Theme
  private frame = 0
  private rebuildTimer?: ReturnType<typeof setTimeout>
  private destroyed = false
  private contextLost = false
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  private separation = 0
  private fitting = true
  private lastTime = 0
  private lastInteraction = 0
  private readonly container: HTMLElement
  private readonly events: StageEvents

  constructor(container: HTMLElement, config: DesignConfig, theme: Theme, events: StageEvents) {
    this.container = container
    this.events = events
    this.config = { ...config }
    this.theme = theme
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true })
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
      this.renderer.outputColorSpace = THREE.SRGBColorSpace
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping
      this.renderer.toneMappingExposure = 1.12
      this.renderer.localClippingEnabled = true
      this.renderer.domElement.setAttribute('aria-label', '可旋转与缩放的原创多层镂空球三维预览')
      this.renderer.domElement.setAttribute('role', 'img')
      container.appendChild(this.renderer.domElement)
      this.controls = new OrbitControls(this.camera, this.renderer.domElement)
      this.controls.enableDamping = true
      this.controls.dampingFactor = 0.07
      this.controls.enablePan = false
      this.controls.minDistance = 2.7
      this.controls.maxDistance = 42
      this.controls.maxPolarAngle = Math.PI * 0.89
      this.controls.autoRotateSpeed = 0.58
      this.controls.addEventListener('start', this.onInteraction)
      this.scene.add(this.object, this.pedestal)
      this.setupLighting()
      this.setupPedestal()
      this.applyTheme(theme)
      this.separation = config.separation
      this.buildLayers()
      this.resetView()
      this.resize()
      this.observer = new ResizeObserver(this.resize)
      this.observer.observe(container)
      this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost)
      this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored)
      this.frame = requestAnimationFrame(this.animate)
      this.events.ready()
    } catch (error) {
      this.dispose()
      throw error
    }
  }

  private setupLighting() {
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    const room = new RoomEnvironment()
    this.environment = pmrem.fromScene(room, 0.04)
    this.scene.environment = this.environment.texture
    room.dispose()
    pmrem.dispose()
    this.scene.add(new THREE.HemisphereLight('#fff5e2', '#746c60', 0.9))
    const key = new THREE.DirectionalLight('#fff2d9', 2.0)
    key.position.set(-3, 5, 5)
    const rim = new THREE.DirectionalLight('#f8edd6', 1.2)
    rim.position.set(4, 2, -3)
    const fill = new THREE.DirectionalLight('#d8ece8', 0.5)
    fill.position.set(1, -0.5, 4)
    this.scene.add(key, rim, fill)
  }

  private setupPedestal() {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.22, 1.28, 0.13, 96),
      new THREE.MeshStandardMaterial({ color: '#73685b', roughness: 0.86 }),
    )
    base.position.y = -1.81
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(1.21, 1.21, 0.018, 96),
      new THREE.MeshStandardMaterial({ color: '#b59765', roughness: 0.4, metalness: 0.7 }),
    )
    rim.position.y = -1.735
    const support = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.36, 0.13, 48),
      new THREE.MeshStandardMaterial({ color: '#806e50', roughness: 0.45, metalness: 0.45 }),
    )
    support.position.y = -1.66
    this.pedestal.add(base, rim, support)
    // A procedural contact shadow keeps the studio scene light on mobile GPUs.
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 128
    const context = canvas.getContext('2d')
    if (context) {
      const gradient = context.createRadialGradient(64, 64, 9, 64, 64, 64)
      gradient.addColorStop(0, 'rgba(28,22,14,0.26)')
      gradient.addColorStop(0.5, 'rgba(28,22,14,0.13)')
      gradient.addColorStop(1, 'rgba(28,22,14,0)')
      context.fillStyle = gradient
      context.fillRect(0, 0, 128, 128)
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(5.6, 5.6),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }),
      )
      shadow.rotation.x = -Math.PI / 2
      shadow.position.y = -1.883
      this.pedestal.add(shadow)
    }
  }

  private applyTheme(theme: Theme) {
    this.theme = theme
    const background = theme === 'light' ? '#eeeae0' : '#141c1a'
    this.scene.background = new THREE.Color(background)
    this.scene.fog = new THREE.Fog(background, 55, 95)
    this.renderer.toneMappingExposure = theme === 'light' ? 0.9 : 0.79
    const base = this.pedestal.children[0] as THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial> | undefined
    base?.material.color.set(theme === 'light' ? '#8b8070' : '#3b4640')
  }

  private buildLayers() {
    for (const layer of this.layers) {
      this.object.remove(layer)
      disposeObject(layer)
    }
    this.layers = []
    const nextLayers = createOrnamentLayers(this.config)
    this.layers = nextLayers
    this.renderedConfig = { ...this.config }
    for (const layer of this.layers) {
      const material = layer.material as THREE.MeshPhysicalMaterial
      material.clippingPlanes = [this.clipPlane]
      this.object.add(layer)
    }
    this.updateLayerVisibility()
  }

  private updateLayerVisibility() {
    this.layers.forEach((layer, index) => {
      layer.visible = this.config.activeLayer === 0 || this.config.activeLayer === index + 1
    })
  }

  setConfig(config: DesignConfig) {
    if (this.destroyed) return
    const previous = this.config
    this.config = { ...config }
    const topologyChanged = !sameTopology(previous, config)
    if (topologyChanged) {
      clearTimeout(this.rebuildTimer)
      this.rebuildTimer = setTimeout(() => {
        try { this.buildLayers() } catch { this.events.error('纹样生成失败，请降低密度后重试。') }
      }, 85)
    } else if (previous.material !== config.material) {
      this.layers.forEach((layer, index) => {
        const material = layer.material as THREE.MeshPhysicalMaterial
        const preset = materialPresets[config.material]
        material.color.set(preset.color).offsetHSL(0, 0, -index * 0.025)
        material.roughness = preset.roughness
        material.metalness = preset.metalness
        material.clearcoat = preset.clearcoat
      })
    }
    if (previous.separation !== config.separation || previous.layers !== config.layers || previous.activeLayer !== config.activeLayer) this.fitting = true
    this.updateLayerVisibility()
  }

  setTheme(theme: Theme) { if (!this.destroyed && theme !== this.theme) this.applyTheme(theme) }

  private fit() {
    const layout = getStageLayout(this.config, this.camera.aspect)
    return { target: this.object.localToWorld(layout.target), distance: layout.distance }
  }

  resetView() {
    if (this.destroyed) return
    this.object.rotation.set(0.05, 0.32, -0.025)
    const fit = this.fit()
    this.controls.target.copy(fit.target)
    this.camera.position.set(0.34, 0.17, 1).normalize().multiplyScalar(fit.distance).add(this.controls.target)
    this.controls.update()
    this.fitting = false
  }

  exportImage(): string | undefined {
    if (this.destroyed || this.contextLost) return undefined
    try {
      this.renderer.render(this.scene, this.camera)
      return this.renderer.domElement.toDataURL('image/png')
    } catch { return undefined }
  }

  /** Capture the saved attempt, including an older retry, without advancing the live editor. */
  exportPreview(config: DesignConfig): string | undefined {
    if (this.destroyed || this.contextLost) return undefined
    try {
      if (this.renderer.getContext().isContextLost()) return undefined
      const requested = { ...config }
      const previousTarget = this.renderer.getRenderTarget()
      const previousFace = this.renderer.getActiveCubeFace()
      const previousMip = this.renderer.getActiveMipmapLevel()
      const previousViewport = this.renderer.getViewport(new THREE.Vector4())
      const previousScissor = this.renderer.getScissor(new THREE.Vector4())
      const previousScissorTest = this.renderer.getScissorTest()
      const previousBackground = this.scene.background
      const previousClearColor = this.renderer.getClearColor(new THREE.Color())
      const previousClearAlpha = this.renderer.getClearAlpha()
      const previousVisible = this.object.visible
      const previousPedestalScale = this.pedestal.scale.clone()
      const previousClip = this.clipPlane.constant
      let snapshot: ReturnType<typeof createPreviewObject> | undefined
      let target: THREE.WebGLRenderTarget | undefined
      let outputTarget: THREE.WebGLRenderTarget | undefined
      let outputPass: OutputPass | undefined
      try {
        snapshot = createPreviewObject(requested, this.renderedConfig, this.layers, this.clipPlane)
        snapshot.group.rotation.copy(this.object.rotation)
        this.scene.add(snapshot.group)
        snapshot.group.updateMatrixWorld(true)
        const layout = getStageLayout(requested, 4 / 3)
        const centre = snapshot.group.localToWorld(layout.target)
        // A separate camera preserves OrbitControls' private damping/gesture state.
        const camera = this.camera.clone()
        camera.aspect = 4 / 3
        camera.zoom = 1
        camera.clearViewOffset()
        const direction = this.camera.position.clone().sub(this.controls.target)
        if (direction.lengthSq() < 1e-12) direction.set(0.34, 0.17, 1)
        camera.position.copy(direction.normalize().multiplyScalar(layout.distance).add(centre))
        camera.lookAt(centre)
        camera.updateProjectionMatrix()
        this.object.visible = false
        this.pedestal.scale.x = 1 + requested.separation * requested.layers * 0.32
        this.clipPlane.constant = requested.cutaway ? 0.12 : 9
        // A scene Color is a direct clear onscreen, not a tone-mapped material.
        // Keep it outside the HDR pass so thumbnail and studio backgrounds match.
        this.scene.background = null
        this.renderer.setClearColor(0x000000, 0)

        // Offscreen rendering uses this renderer/context and never resizes its visible canvas.
        const width = 960
        const height = 720
        target = new THREE.WebGLRenderTarget(width, height, {
          type: THREE.HalfFloatType, depthBuffer: true, stencilBuffer: false,
        })
        this.renderer.setRenderTarget(target)
        this.renderer.setScissorTest(false)
        this.renderer.render(this.scene, camera)
        if (this.contextLost || !canReadPreview(this.renderer.getContext())) return undefined
        // Three renders linear HDR into offscreen targets. Its output pass applies
        // the renderer's ACES exposure and sRGB transfer before byte readback.
        outputTarget = new THREE.WebGLRenderTarget(width, height, { depthBuffer: false, stencilBuffer: false })
        outputPass = new OutputPass()
        // Alpha blending into a transparent HDR buffer produces premultiplied RGB.
        // Unpremultiply before nonlinear ACES/sRGB, since ImageData takes straight
        // alpha; doing it afterward would darken the contact shadow and edges.
        const sample = 'gl_FragColor = texture2D( tDiffuse, vUv );'
        if (!outputPass.material.fragmentShader.includes(sample)) return undefined
        outputPass.material.fragmentShader = outputPass.material.fragmentShader.replace(sample,
          `${sample}\n gl_FragColor.rgb = gl_FragColor.a > 0.0 ? gl_FragColor.rgb / gl_FragColor.a : vec3(0.0);`)
        outputPass.render(this.renderer, outputTarget, target, 0, false)
        const pixels = new Uint8Array(width * height * 4)
        this.renderer.readRenderTargetPixels(outputTarget, 0, 0, width, height, pixels)
        if (this.contextLost || !canReadPreview(this.renderer.getContext())) return undefined
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
          outputContext.fillStyle = this.theme === 'light' ? '#eeeae0' : '#141c1a'
          outputContext.fillRect(0, 0, outputWidth, outputHeight)
          outputContext.drawImage(source, 0, 0, outputWidth, outputHeight)
          return output.toDataURL('image/png')
        })
      } finally {
        this.object.visible = previousVisible
        this.pedestal.scale.copy(previousPedestalScale)
        this.clipPlane.constant = previousClip
        this.scene.background = previousBackground
        if (snapshot) {
          this.scene.remove(snapshot.group)
          snapshot.dispose()
        }
        // Dispose even if context restoration itself fails during GPU loss.
        try {
          this.renderer.setClearColor(previousClearColor, previousClearAlpha)
          this.renderer.setRenderTarget(previousTarget, previousFace, previousMip)
          this.renderer.setViewport(previousViewport)
          this.renderer.setScissor(previousScissor)
          this.renderer.setScissorTest(previousScissorTest)
        } finally {
          outputPass?.dispose()
          outputTarget?.dispose()
          target?.dispose()
        }
      }
    } catch { return undefined }
  }

  private readonly resize = () => {
    if (this.destroyed) return
    const width = Math.max(this.container.clientWidth, 1)
    const height = Math.max(this.container.clientHeight, 1)
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.fitting = true
  }

  private readonly onInteraction = () => {
    this.lastInteraction = performance.now()
    this.fitting = false
  }

  private readonly onContextLost = (event: Event) => {
    event.preventDefault()
    this.contextLost = true
    cancelAnimationFrame(this.frame)
    this.events.error('三维图形连接已中断。可尝试重新加载预览，作品参数仍然保留。')
  }

  private readonly onContextRestored = () => {
    if (this.destroyed) return
    this.contextLost = false
    this.lastTime = 0
    this.frame = requestAnimationFrame(this.animate)
    this.events.ready()
  }

  private readonly animate = (time: number) => {
    if (this.destroyed || this.contextLost) return
    this.frame = requestAnimationFrame(this.animate)
    if (document.hidden) return
    const delta = Math.min((time - this.lastTime) / 1000 || 0.016, 0.05)
    this.lastTime = time
    const ease = this.reducedMotion.matches ? 1 : 1 - Math.exp(-delta * 7)
    this.separation = THREE.MathUtils.lerp(this.separation, this.config.separation, ease)
    const centre = (this.config.layers - 1) / 2
    this.layers.forEach((layer, index) => {
      layer.position.x = (index - centre) * 1.24 * this.separation
      layer.position.y = Math.sin(index * 0.9) * 0.18 * this.separation
    })
    this.pedestal.scale.x = 1 + this.separation * this.config.layers * 0.32
    this.clipPlane.constant = THREE.MathUtils.lerp(this.clipPlane.constant, this.config.cutaway ? 0.12 : 9, ease)
    if (this.fitting) {
      const fit = this.fit()
      const offset = this.camera.position.clone().sub(this.controls.target)
      const distance = THREE.MathUtils.lerp(offset.length(), fit.distance, ease)
      this.controls.target.lerp(fit.target, ease)
      this.camera.position.copy(offset.normalize().multiplyScalar(distance).add(this.controls.target))
      if (Math.abs(distance - fit.distance) < 0.005 && this.controls.target.distanceTo(fit.target) < 0.005) this.fitting = false
    }
    this.controls.autoRotate = this.config.autoRotate && !this.reducedMotion.matches && time - this.lastInteraction > 2400
    this.controls.update(delta)
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    if (this.destroyed) return
    this.destroyed = true
    clearTimeout(this.rebuildTimer)
    cancelAnimationFrame(this.frame)
    this.observer?.disconnect()
    this.controls?.removeEventListener('start', this.onInteraction)
    this.controls?.dispose()
    this.renderer?.domElement.removeEventListener('webglcontextlost', this.onContextLost)
    this.renderer?.domElement.removeEventListener('webglcontextrestored', this.onContextRestored)
    disposeObject(this.scene)
    this.scene.environment = null
    this.environment?.dispose()
    this.renderer?.renderLists.dispose()
    this.renderer?.dispose()
    this.renderer?.forceContextLoss()
    this.renderer?.domElement.remove()
    this.layers = []
    this.scene.clear()
  }
}
