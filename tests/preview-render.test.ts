import assert from 'node:assert/strict'
import test from 'node:test'
import { ACESFilmicToneMapping, Color, Group, MeshPhysicalMaterial, PerspectiveCamera, Plane, Scene, SRGBColorSpace, Vector3, Vector4 } from 'three'
import { defaultConfig, type DesignConfig } from '../shared/design'
import { createOrnamentLayers } from '../src/three/ornament'
import { disposeObject } from '../src/three/resources'
import * as preview from '../src/three/preview'
import { AtelierStage } from '../src/three/AtelierStage'

test('preview reflects requested pending topology rather than the last built shells', () => {
  assert.equal(typeof preview.createPreviewObject, 'function')
  const rendered = { ...defaultConfig, layers: 2, patternScale: 8 }
  const live = createOrnamentLayers(rendered)
  const requested: DesignConfig = { ...rendered, templateId: 'ruyi', layers: 3, separation: 1, activeLayer: 3, material: 'jade' }
  const snapshot = preview.createPreviewObject(requested, rendered, live, new Plane())
  try {
    assert.equal(snapshot.group.children.length, 3)
    assert.deepEqual(snapshot.group.children.map((layer) => layer.visible), [false, false, true])
    assert.equal(snapshot.group.children[2]!.position.x, 1.24)
    assert.notEqual(snapshot.group.children[0]!.geometry, live[0]!.geometry)
    assert.equal(live[0]!.position.x, 0, 'pending snapshot must not advance the live separation animation')
    assert.equal(live[0]!.visible, true)
  } finally {
    snapshot.dispose()
    live.forEach(disposeObject)
  }
})

test('same topology reuses GPU geometry but snapshot material and cleanup cannot alter live shells', () => {
  const rendered = { ...defaultConfig, layers: 2, patternScale: 8 }
  const live = createOrnamentLayers(rendered)
  const material = live[0]!.material as MeshPhysicalMaterial
  const originalColor = material.color.getHex()
  let geometryDisposals = 0
  let materialDisposals = 0
  live[0]!.geometry.addEventListener('dispose', () => geometryDisposals++)
  material.addEventListener('dispose', () => materialDisposals++)
  const snapshot = preview.createPreviewObject({ ...rendered, material: 'bronze', separation: 0.5 }, rendered, live, new Plane())
  assert.equal(snapshot.group.children[0]!.geometry, live[0]!.geometry)
  assert.notEqual(snapshot.group.children[0]!.material, material)
  assert.notEqual((snapshot.group.children[0]!.material as MeshPhysicalMaterial).color.getHex(), originalColor)
  assert.equal(snapshot.group.children[0]!.position.x, -0.31)
  snapshot.dispose()
  snapshot.dispose()
  assert.equal(geometryDisposals, 0)
  assert.equal(materialDisposals, 0)
  assert.equal(material.color.getHex(), originalColor)
  live.forEach(disposeObject)
})

test('temporary geometry is released exactly once after a distinct retry config snapshot', () => {
  const snapshot = preview.createPreviewObject({ ...defaultConfig, layers: 2, patternScale: 8 }, undefined, [], new Plane())
  let disposed = 0
  snapshot.group.children[0]!.geometry.addEventListener('dispose', () => disposed++)
  snapshot.dispose()
  snapshot.dispose()
  assert.equal(disposed, 1)
})

test('GPU readback rows become upright without modifying the source pixel buffer', () => {
  const pixels = new Uint8Array([0, 0, 255, 255, 255, 0, 0, 255])
  assert.deepEqual([...preview.uprightRgba(pixels, 1, 2)], [255, 0, 0, 255, 0, 0, 255, 255])
  assert.deepEqual([...pixels], [0, 0, 255, 255, 255, 0, 0, 255])
  assert.throws(() => preview.uprightRgba(pixels, 2, 2))
})

test('oversized PNG is retried at a smaller 4:3 size and never returned over the upload limit', () => {
  const dimensions: number[][] = []
  const small = 'data:image/png;base64,' + 'A'.repeat(128)
  const image = preview.compactPreview((width, height) => {
    dimensions.push([width, height])
    return dimensions.length === 1 ? 'data:image/png;base64,' + 'A'.repeat(360_000) : small
  })
  assert.equal(image, small)
  assert.deepEqual(dimensions, [[480, 360], [400, 300]])
  assert.equal(preview.compactPreview(() => 'data:,'), undefined)
  assert.equal(preview.compactPreview(() => 'data:image/png;base64,' + 'A'.repeat(360_000)), undefined)
})

test('incomplete framebuffers, context loss and GPU errors reject readback instead of returning blank PNGs', () => {
  const gl = {
    isContextLost: () => false,
    FRAMEBUFFER: 0x8d40,
    FRAMEBUFFER_COMPLETE: 0x8cd5,
    NO_ERROR: 0,
    checkFramebufferStatus: () => 0x8cd5,
    getError: () => 0,
  }
  assert.equal(preview.canReadPreview(gl), true)
  assert.equal(preview.canReadPreview({ ...gl, isContextLost: () => true }), false)
  assert.equal(preview.canReadPreview({ ...gl, checkFramebufferStatus: () => 0x8cd6 }), false)
  assert.equal(preview.canReadPreview({ ...gl, getError: () => 0x0506 }), false)
})

for (const theme of ['light', 'dark'] as const) for (const fail of [false, true]) test(`${theme} preview ${fail ? 'GPU failure' : 'success'} restores background, clear state and live view`, () => {
  assert.equal(typeof AtelierStage.prototype.exportPreview, 'function')
  const scene = new Scene()
  const originalBackground = new Color(theme === 'light' ? '#eeeae0' : '#141c1a')
  scene.background = originalBackground
  const object = new Group()
  const pedestal = new Group()
  pedestal.scale.set(1.23, 1, 1)
  scene.add(object, pedestal)
  const camera = new PerspectiveCamera(35, 0.6, 0.05, 100)
  camera.position.set(3, 2, 9)
  const cameraBefore = camera.clone()
  const clipPlane = new Plane(new Vector3(0, 0, -1), 4.56)
  const viewport = new Vector4(0, 0, 600, 1000)
  const scissor = new Vector4(2, 3, 100, 200)
  let target: unknown = null
  let currentViewport = viewport.clone()
  let currentScissor = scissor.clone()
  let scissorTest = true
  const clearColor = new Color('#204060')
  const originalClearColor = clearColor.clone()
  let clearAlpha = 0.37
  let captured: { sameScene: boolean; liveVisible: boolean; aspect: number; clip: number; positions: number[];
    background: unknown; clearAlpha: number; clearColor: string } | undefined
  const painting: unknown[] = []
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6WZkAAAAASUVORK5CYII='
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const previousImageData = Object.getOwnPropertyDescriptor(globalThis, 'ImageData')
  const context = {
    fillStyle: '',
    putImageData: () => {},
    fillRect: () => { painting.push(['background', context.fillStyle]) },
    drawImage: () => { painting.push(['scene']) },
  }
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    createElement: () => ({ width: 0, height: 0, getContext: () => context, toDataURL: () => png }),
  } })
  Object.defineProperty(globalThis, 'ImageData', { configurable: true, value: class {} })
  const renderer = {
    outputColorSpace: SRGBColorSpace,
    toneMapping: ACESFilmicToneMapping,
    toneMappingExposure: 0.9,
    getContext: () => ({
      isContextLost: () => false,
      FRAMEBUFFER: 0x8d40,
      FRAMEBUFFER_COMPLETE: 0x8cd5,
      NO_ERROR: 0,
      checkFramebufferStatus: () => 0x8cd5,
      getError: () => 0,
    }),
    getRenderTarget: () => target,
    getActiveCubeFace: () => 0,
    getActiveMipmapLevel: () => 0,
    getViewport: (out: Vector4) => out.copy(currentViewport),
    getScissor: (out: Vector4) => out.copy(currentScissor),
    getScissorTest: () => scissorTest,
    getClearColor: (out: Color) => out.copy(clearColor),
    getClearAlpha: () => clearAlpha,
    setClearColor: (value: Color, alpha?: number) => { clearColor.set(value); if (alpha !== undefined) clearAlpha = alpha },
    setClearAlpha: (value: number) => { clearAlpha = value },
    setRenderTarget: (value: unknown) => { target = value },
    setViewport: (value: Vector4) => { currentViewport = value.clone() },
    setScissor: (value: Vector4) => { currentScissor = value.clone() },
    setScissorTest: (value: boolean) => { scissorTest = value },
    readRenderTargetPixels: () => {},
    render: (value: Scene, previewCamera: PerspectiveCamera) => {
      if (value !== scene) return // OutputPass uses the same mocked GPU boundary.
      const temporary = value.children.find((child) => child !== object && child !== pedestal) as Group
      captured = { sameScene: value === scene, liveVisible: object.visible, aspect: previewCamera.aspect,
        clip: clipPlane.constant, positions: temporary.children.map((child) => child.position.x),
        background: value.background, clearAlpha, clearColor: clearColor.getHexString() }
      if (fail) throw new Error('Unavailable GPU')
    },
  }
  const stage = Object.create(AtelierStage.prototype)
  const pending = setTimeout(() => {}, 60_000)
  const config = { ...defaultConfig, layers: 2, patternScale: 8 }
  Object.assign(stage, {
    scene, object, pedestal, camera, clipPlane, renderer, config, theme, layers: [],
    controls: { target: new Vector3(), update: () => { throw new Error('Snapshot must not advance controls') } },
    rebuildTimer: pending, fitting: true, separation: 0.03,
  })
  try {
    assert.equal(stage.exportPreview({ ...config, separation: 1, cutaway: true }), fail ? undefined : png)
    assert.deepEqual(captured, { sameScene: true, liveVisible: false, aspect: 4 / 3,
      clip: 0.12, positions: [-0.62, 0.62], background: null, clearAlpha: 0, clearColor: '000000' })
    assert.deepEqual(painting, fail ? [] : [['background', theme === 'light' ? '#eeeae0' : '#141c1a'], ['scene']])
    assert.equal(scene.background, originalBackground)
    assert.deepEqual(clearColor, originalClearColor)
    assert.equal(clearAlpha, 0.37)
    assert.equal(object.visible, true)
    assert.equal(pedestal.scale.x, 1.23)
    assert.equal(clipPlane.constant, 4.56)
    assert.deepEqual(scene.children, [object, pedestal])
    assert.deepEqual(camera.position, cameraBefore.position)
    assert.equal(camera.aspect, cameraBefore.aspect)
    assert.equal(stage.rebuildTimer, pending)
    assert.equal(stage.separation, 0.03)
    assert.equal(stage.fitting, true)
    assert.equal(stage.config, config)
    assert.equal(target, null)
    assert.deepEqual(currentViewport, viewport)
    assert.deepEqual(currentScissor, scissor)
    assert.equal(scissorTest, true)
  } finally {
    clearTimeout(pending)
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument)
    else delete (globalThis as Record<string, unknown>).document
    if (previousImageData) Object.defineProperty(globalThis, 'ImageData', previousImageData)
    else delete (globalThis as Record<string, unknown>).ImageData
  }
})
