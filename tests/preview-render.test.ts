import assert from 'node:assert/strict'
import test from 'node:test'
import { Color, Group, Mesh, MeshPhysicalMaterial, PerspectiveCamera, Plane, Scene, HalfFloatType, Vector3, Vector4, WebGLRenderTarget } from 'three'
import { defaultConfig, type DesignConfig } from '../shared/design'
import { withLayerPattern } from '../shared/layerDesign'
import { createOrnamentLayers } from '../src/three/ornament'
import { disposeObject } from '../src/three/resources'
import * as preview from '../src/three/preview'
import { captureWorkPreview, type PreviewGpu, type PreviewRenderer } from '../src/three/previewCapture'

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
    const shell = snapshot.group.children[0]
    assert.ok(shell instanceof Mesh)
    assert.notEqual(shell.geometry, live[0]!.geometry)
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
  const material = live[0]!.material
  assert.ok(material instanceof MeshPhysicalMaterial)
  const originalColor = material.color.getHex()
  let geometryDisposals = 0
  let materialDisposals = 0
  live[0]!.geometry.addEventListener('dispose', () => geometryDisposals++)
  material.addEventListener('dispose', () => materialDisposals++)
  const snapshot = preview.createPreviewObject({ ...rendered, material: 'bronze', separation: 0.5 }, rendered, live, new Plane())
  const shell = snapshot.group.children[0]
  assert.ok(shell instanceof Mesh)
  assert.ok(shell.material instanceof MeshPhysicalMaterial)
  assert.equal(shell.geometry, live[0]!.geometry)
  assert.notEqual(shell.material, material)
  assert.notEqual(shell.material.color.getHex(), originalColor)
  assert.equal(shell.position.x, -0.31)
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
  const shell = snapshot.group.children[0]
  assert.ok(shell instanceof Mesh)
  shell.geometry.addEventListener('dispose', () => disposed++)
  snapshot.dispose()
  snapshot.dispose()
  assert.equal(disposed, 1)
})

for (const role of ['outer', 'inner'] as const) {
  for (const patch of [{ templateId: 'lianhua' as const }, { patternScale: 16 }, { aperture: 0.75 }]) {
    test(`preview rebuilds same-count ${role} ${Object.keys(patch)[0]} changes instead of borrowing stale geometry`, () => {
      const rendered = withLayerPattern({ ...defaultConfig, layers: 3, patternScale: 8 }, 'inner', { templateId: 'ruyi' })
      const live = createOrnamentLayers(rendered)
      const requested = withLayerPattern(rendered, role, patch)
      const snapshot = preview.createPreviewObject(requested, rendered, live, new Plane())
      let temporaryDisposals = 0
      let liveDisposals = 0
      try {
        assert.equal(preview.sameTopology(rendered, requested), false)
        snapshot.group.children.forEach((shell, index) => {
          assert.ok(shell instanceof Mesh)
          assert.notEqual(shell.geometry, live[index]!.geometry)
          const a = shell.geometry.getAttribute('position').array
          const b = live[index]!.geometry.getAttribute('position').array
          const equal = a.length === b.length && a.every((value: number, offset: number) => value === b[offset])
          assert.equal(equal, index !== (role === 'outer' ? 0 : 2))
          shell.geometry.addEventListener('dispose', () => temporaryDisposals++)
          live[index]!.geometry.addEventListener('dispose', () => liveDisposals++)
        })
        snapshot.dispose()
        snapshot.dispose()
        assert.equal(temporaryDisposals, 3)
        assert.equal(liveDisposals, 0)
      } finally {
        snapshot.dispose()
        live.forEach(disposeObject)
      }
    })
  }
}

test('topology compares effective middle layers while two-layer shells ignore the unused root pattern', () => {
  const two = withLayerPattern({ ...defaultConfig, layers: 2 }, 'outer', {})
  const changedRoot = { ...two, templateId: 'lianhua' as const, patternScale: 20, aperture: 0.7 }
  assert.equal(preview.sameTopology(two, changedRoot), true)
  assert.equal(preview.sameTopology({ ...two, layers: 4 }, { ...changedRoot, layers: 4 }), false)
  assert.equal(preview.sameTopology(two, { ...two, layers: 3 }), false)
  assert.equal(preview.sameTopology(undefined, two), false)
})

test('v1 and equivalent v2 reuse geometry across material and observation changes', () => {
  const rendered = { ...defaultConfig, layers: 2, patternScale: 8 }
  const requested = { ...withLayerPattern(rendered, 'inner', {}), material: 'bronze' as const,
    activeLayer: 2, separation: 1, cutaway: true, autoRotate: true }
  const live = createOrnamentLayers(rendered)
  const snapshot = preview.createPreviewObject(requested, rendered, live, new Plane())
  try {
    assert.equal(preview.sameTopology(rendered, requested), true)
    assert.equal(preview.sameTopology(requested, rendered), true)
    snapshot.group.children.forEach((shell, index) => {
      assert.ok(shell instanceof Mesh)
      assert.equal(shell.geometry, live[index]!.geometry)
    })
  } finally {
    snapshot.dispose()
    live.forEach(disposeObject)
  }
})

test('an older layer-pattern retry rebuilds its own motif without disposing newer live shells', () => {
  const old = withLayerPattern({ ...defaultConfig, layers: 2, patternScale: 8 }, 'outer', { templateId: 'lianhua' })
  const current = withLayerPattern(old, 'outer', { templateId: 'ruyi' })
  const live = createOrnamentLayers(current)
  const snapshot = preview.createPreviewObject(old, current, live, new Plane())
  let liveDisposals = 0
  live.forEach(shell => shell.geometry.addEventListener('dispose', () => liveDisposals++))
  try {
    const outer = snapshot.group.children[0]
    assert.ok(outer instanceof Mesh)
    assert.notEqual(outer.geometry, live[0]!.geometry)
    const vertex = outer.geometry.getAttribute('position')
    const actual = [vertex.getX(4), vertex.getY(4), vertex.getZ(4)]
    const expected = [0.60077207, 1.44396287, 0.41312698]
    actual.forEach((value, axis) => assert.ok(Math.abs(value - expected[axis]!) < 1e-6))
  } finally {
    snapshot.dispose()
    assert.equal(liveDisposals, 0)
    live.forEach(disposeObject)
  }
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
  } satisfies Parameters<typeof preview.canReadPreview>[0]
  assert.equal(preview.canReadPreview(gl), true)
  assert.equal(preview.canReadPreview({ ...gl, isContextLost: () => true }), false)
  assert.equal(preview.canReadPreview({ ...gl, checkFramebufferStatus: () => 0x8cd6 }), false)
  assert.equal(preview.canReadPreview({ ...gl, getError: () => 0x0506 }), false)
})

const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6WZkAAAAASUVORK5CYII='
const outcomes = ['success', 'render', 'output', 'readback', 'framebuffer', 'lost', 'encode', 'restore'] as const

// Only native GPU operations are replaced. Scene, camera, geometry, materials and
// render targets are real Three objects, observed where capture sends them to the GPU.
for (const topology of ['borrowed', 'pending', 'older retry'] as const) {
  for (const outcome of outcomes) test(`${topology} capture: ${outcome} preserves live state and releases only temporary resources`, () => {
    const rendered = { ...defaultConfig, layers: 2, patternScale: 8 }
    const live = createOrnamentLayers(rendered)
    const requested: DesignConfig = { ...rendered, separation: 1, cutaway: true, material: 'bronze',
      ...(topology === 'borrowed' ? {} : { layers: 3, templateId: topology === 'pending' ? 'ruyi' : 'lianhua', activeLayer: 3 }),
    }
    const scene = new Scene()
    const background = new Color('#141c1a')
    scene.background = background
    const object = new Group()
    object.add(...live)
    object.visible = topology !== 'older retry'
    object.rotation.set(0.05, 0.32, -0.025)
    const pedestal = new Group()
    pedestal.scale.set(1.23, 0.9, 1.1)
    scene.add(object, pedestal)
    const camera = new PerspectiveCamera(35, 0.6, 0.05, 100)
    camera.position.set(3, 2, 9)
    camera.zoom = 1.3
    camera.setViewOffset(600, 1000, 10, 20, 300, 500)
    const cameraBefore = camera.clone()
    const viewTarget = new Vector3(0.2, 0.3, 0.4)
    const clipPlane = new Plane(new Vector3(0, 0, -1), 4.56)
    const priorTarget = new WebGLRenderTarget(7, 11)
    let target: WebGLRenderTarget | null = priorTarget
    let face = 2
    let mip = 3
    let viewport = new Vector4(5, 7, 600, 1000)
    let scissor = new Vector4(2, 3, 100, 200)
    let scissorTest = true
    const clearColor = new Color('#204060')
    const originalClearColor = clearColor.clone()
    let clearAlpha = 0.37
    let renderCount = 0
    let encoded = false
    let outputDisposals = 0
    let liveDisposals = 0
    let temporaryGeometryDisposals = 0
    let temporaryMaterialDisposals = 0
    const targetDisposals: WebGLRenderTarget[] = []
    const allocatedTargets = new Set<WebGLRenderTarget>()
    live.forEach(layer => {
      layer.geometry.addEventListener('dispose', () => liveDisposals++)
      assert.ok(layer.material instanceof MeshPhysicalMaterial)
      layer.material.addEventListener('dispose', () => liveDisposals++)
    })
    const renderer: PreviewRenderer = {
      getContext: () => ({
        isContextLost: () => outcome === 'lost' && renderCount > 0,
        FRAMEBUFFER: 0x8d40, FRAMEBUFFER_COMPLETE: 0x8cd5, NO_ERROR: 0,
        checkFramebufferStatus: () => outcome === 'framebuffer' ? 0x8cd6 : 0x8cd5,
        getError: () => 0,
      }),
      getRenderTarget: () => target,
      getActiveCubeFace: () => face,
      getActiveMipmapLevel: () => mip,
      getViewport: out => out.copy(viewport),
      getScissor: out => out.copy(scissor),
      getScissorTest: () => scissorTest,
      getClearColor: out => out.copy(clearColor),
      getClearAlpha: () => clearAlpha,
      setClearColor: (value, alpha) => { clearColor.set(value); clearAlpha = alpha },
      setRenderTarget: (value, nextFace = 0, nextMip = 0) => {
        target = value; face = nextFace; mip = nextMip
        if (outcome === 'restore' && value === priorTarget) throw new Error('Context failed during restore')
        if (value !== priorTarget && value && !allocatedTargets.has(value)) {
          allocatedTargets.add(value)
          value.addEventListener('dispose', () => targetDisposals.push(value))
          // Native setRenderTarget replaces the target-specific viewport/scissor.
          viewport.copy(value.viewport); scissor.copy(value.scissor)
        }
      },
      setViewport: value => { viewport.copy(value) },
      setScissor: value => { scissor.copy(value) },
      setScissorTest: value => { scissorTest = value },
      render: (renderedScene, previewCamera) => {
        renderCount++
        assert.equal(renderedScene, scene)
        assert.equal(object.visible, false)
        assert.equal(scene.background, null)
        assert.equal(clearAlpha, 0)
        assert.equal(clearColor.getHexString(), '000000')
        assert.equal(scissorTest, false)
        assert.equal(clipPlane.constant, 0.12)
        assert.equal(previewCamera.aspect, 4 / 3)
        assert.equal(previewCamera.zoom, 1)
        assert.equal(previewCamera.view?.enabled, false)
        assert.notEqual(previewCamera, camera)
        assert.ok(target)
        assert.equal(target.width, 960)
        assert.equal(target.height, 720)
        assert.equal(target.texture.type, HalfFloatType)
        const snapshot = scene.children.find(child => child !== object && child !== pedestal)
        assert.ok(snapshot instanceof Group)
        assert.deepEqual(snapshot.rotation.toArray(), object.rotation.toArray())
        assert.equal(snapshot.children.length, requested.layers)
        assert.deepEqual(snapshot.children.map(child => child.position.x), topology === 'borrowed' ? [-0.62, 0.62] : [-1.24, 0, 1.24])
        assert.deepEqual(snapshot.children.map(child => child.visible), topology === 'borrowed' ? [true, true] : [false, false, true])
        snapshot.children.forEach((child, index) => {
          assert.ok(child instanceof Mesh)
          assert.ok(child.material instanceof MeshPhysicalMaterial)
          assert.equal(child.material.metalness, 0.82)
          if (index === 0) {
            // Outer vertex at motif angle pi/16: independent numeric fixtures
            // distinguish the requested motif even when layer counts agree.
            const vertex = child.geometry.getAttribute('position')
            const expected = topology === 'borrowed' ? [0.58433772, 1.43876123, 0.45292972]
              : topology === 'pending' ? [0.59643575, 1.44251338, 0.42432216] : [0.60077207, 1.44396287, 0.41312698]
            const actual = [vertex.getX(4), vertex.getY(4), vertex.getZ(4)]
            actual.forEach((value, axis) => assert.ok(Math.abs(value - expected[axis]!) < 1e-6, 'capture must use the requested motif'))
          }
          assert.deepEqual(child.material.clippingPlanes, [clipPlane])
          child.material.addEventListener('dispose', () => temporaryMaterialDisposals++)
          if (topology === 'borrowed') assert.equal(child.geometry, live[index]!.geometry)
          else {
            assert.notEqual(child.geometry, live[index]?.geometry)
            child.geometry.addEventListener('dispose', () => temporaryGeometryDisposals++)
          }
        })
        if (outcome === 'render') throw new Error('Unavailable GPU')
      },
      readRenderTargetPixels: (output, x, y, width, height, pixels) => {
        assert.equal(output, target)
        assert.deepEqual([x, y, width, height], [0, 0, 960, 720])
        if (outcome === 'readback') throw new Error('Readback failed')
        pixels[0] = 123
      },
    }
    const gpu: PreviewGpu = {
      renderer,
      createOutputPass: () => ({
        render: (output, input) => {
          assert.equal(input, target)
          assert.equal(input.texture.type, HalfFloatType)
          renderer.setRenderTarget(output)
          if (outcome === 'output') throw new Error('Output pass failed')
        },
        dispose: () => { outputDisposals++ },
      }),
    }
    const needsOutput = !['render', 'framebuffer', 'lost'].includes(outcome)
    try {
      const result = captureWorkPreview(requested, {
        scene, camera, viewTarget, object, pedestal, clipPlane, liveLayers: live,
        renderedConfig: rendered, backgroundColor: '#141c1a',
      }, gpu, (pixels, width, height, backgroundColor) => {
        assert.equal(pixels[0], 123)
        assert.deepEqual([width, height, backgroundColor], [960, 720, '#141c1a'])
        encoded = true
        if (outcome === 'encode') throw new Error('Canvas failed')
        return png
      })
      assert.equal(result, outcome === 'success' ? png : undefined)
      assert.equal(renderCount, 1)
      assert.equal(encoded, ['success', 'encode', 'restore'].includes(outcome))
      assert.equal(outputDisposals, needsOutput ? 1 : 0)
      assert.equal(targetDisposals.length, needsOutput ? 2 : 1)
      assert.equal(new Set(targetDisposals).size, targetDisposals.length)
      assert.equal(temporaryGeometryDisposals, topology === 'borrowed' ? 0 : 3)
      assert.equal(temporaryMaterialDisposals, requested.layers)
      assert.equal(liveDisposals, 0)
      assert.equal(scene.background, background)
      assert.deepEqual(clearColor, originalClearColor)
      assert.equal(clearAlpha, 0.37)
      assert.equal(object.visible, topology !== 'older retry')
      assert.deepEqual(pedestal.scale.toArray(), [1.23, 0.9, 1.1])
      assert.equal(clipPlane.constant, 4.56)
      assert.deepEqual(scene.children, [object, pedestal])
      assert.deepEqual(camera.position, cameraBefore.position)
      assert.deepEqual(camera.quaternion.toArray(), cameraBefore.quaternion.toArray())
      assert.deepEqual(camera.projectionMatrix, cameraBefore.projectionMatrix)
      assert.deepEqual(camera.view, cameraBefore.view)
      assert.equal(camera.aspect, 0.6)
      assert.equal(camera.zoom, 1.3)
      assert.deepEqual(viewTarget.toArray(), [0.2, 0.3, 0.4])
      assert.equal(target, priorTarget)
      assert.equal(face, 2)
      assert.equal(mip, 3)
      assert.deepEqual(viewport.toArray(), [5, 7, 600, 1000])
      assert.deepEqual(scissor.toArray(), [2, 3, 100, 200])
      assert.equal(scissorTest, true)
      assert.deepEqual(live.map(layer => layer.position.toArray()), [[0, 0, 0], [0, 0, 0]])
    } finally {
      live.forEach(disposeObject)
      priorTarget.dispose()
    }
  })
}

for (const background of ['#eeeae0', '#141c1a']) test(`PNG encoder composites upright straight-alpha pixels over ${background}`, () => {
  assert.equal(typeof preview.encodePreviewPixels, 'function')
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const previousImageData = Object.getOwnPropertyDescriptor(globalThis, 'ImageData')
  const painting: unknown[] = []
  const context = {
    fillStyle: '',
    putImageData: (value: { pixels: Uint8ClampedArray; width: number; height: number }) => {
      painting.push(['pixels', [...value.pixels], value.width, value.height])
    },
    fillRect: (...bounds: number[]) => { painting.push(['background', context.fillStyle, bounds]) },
    drawImage: (_source: unknown, ...bounds: number[]) => { painting.push(['scene', bounds]) },
  }
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    createElement: () => ({ width: 0, height: 0, getContext: () => context, toDataURL: () => png }),
  } })
  Object.defineProperty(globalThis, 'ImageData', { configurable: true, value: class {
    constructor(public pixels: Uint8ClampedArray, public width: number, public height: number) {}
  } })
  try {
    assert.equal(preview.encodePreviewPixels(new Uint8Array([0, 0, 255, 64, 255, 0, 0, 128]), 1, 2, background), png)
    assert.deepEqual(painting, [
      ['pixels', [255, 0, 0, 128, 0, 0, 255, 64], 1, 2],
      ['background', background, [0, 0, 480, 360]], ['scene', [0, 0, 480, 360]],
    ])
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument)
    else Reflect.deleteProperty(globalThis, 'document')
    if (previousImageData) Object.defineProperty(globalThis, 'ImageData', previousImageData)
    else Reflect.deleteProperty(globalThis, 'ImageData')
  }
})
