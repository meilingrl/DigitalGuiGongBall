import assert from 'node:assert/strict'
import test from 'node:test'
import { Group, Mesh, MeshBasicMaterial, Raycaster, Texture, Vector3 } from 'three'
import { defaultConfig } from '../shared/design'
import { createOrnamentLayers, createShellGeometry } from '../src/three/ornament'
import { disposeObject } from '../src/three/resources'
import { getStageLayout } from '../src/three/layout'

const options = { templateId: 'linglong' as const, patternScale: 12, aperture: 0.55 }

test('shell has finite, usable normals and bounded triangle count at maximum density', () => {
  for (const templateId of ['linglong', 'ruyi', 'lianhua'] as const) {
    const geometry = createShellGeometry({ ...options, templateId, patternScale: 24 }, 1.6)
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    assert.ok(positions && positions.count > 1000, 'the shell must contain actual surface geometry')
    assert.equal(normals.count, positions.count)
    assert.ok([...positions.array, ...normals.array].every(Number.isFinite))
    for (let i = 0; i < normals.count; i += 37) {
      assert.ok(Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i)) > 0.9)
    }
    assert.ok(geometry.index && geometry.index.count / 3 < 65_000, 'mobile geometry budget per shell')
    geometry.dispose()
  }
})

test('aperture is a real through-hole in the outer surface, not a transparent texture', () => {
  const geometry = createShellGeometry({ ...options, patternScale: 8 }, 1.6)
  const mesh = new Mesh(geometry, new MeshBasicMaterial())
  // Row 1 of a four-row sphere, with seven cells and a half-cell stagger.
  const theta = Math.PI * 3 / 8
  const phi = Math.PI / 7
  const radial = (latitude: number, longitude: number) => new Vector3(
    Math.sin(latitude) * Math.cos(longitude), Math.cos(latitude), Math.sin(latitude) * Math.sin(longitude),
  )
  const holeDirection = radial(theta, phi)
  const holeRay = new Raycaster(holeDirection.clone().multiplyScalar(3), holeDirection.clone().negate(), 0, 2)
  assert.equal(holeRay.intersectObject(mesh).length, 0, 'a ray through a cell centre must pass through the shell')
  const frameDirection = radial(theta, phi + Math.PI / 7 * 0.8)
  const frameRay = new Raycaster(frameDirection.clone().multiplyScalar(3), frameDirection.clone().negate(), 0, 2)
  assert.ok(frameRay.intersectObject(mesh).length > 0, 'the aperture border must have opaque solid geometry')
  disposeObject(mesh)
})

test('template, opening and density each alter the physical geometry', () => {
  const base = createShellGeometry(options, 1.6)
  const floral = createShellGeometry({ ...options, templateId: 'lianhua' }, 1.6)
  const open = createShellGeometry({ ...options, aperture: 0.8 }, 1.6)
  const dense = createShellGeometry({ ...options, patternScale: 24 }, 1.6)
  assert.notDeepEqual(base.getAttribute('position').array, floral.getAttribute('position').array)
  assert.notDeepEqual(base.getAttribute('position').array, open.getAttribute('position').array)
  assert.ok(dense.getAttribute('position').count > base.getAttribute('position').count * 2)
  for (const geometry of [base, floral, open, dense]) geometry.dispose()
})

test('floral frames have solid connecting filaments to neighbouring latitude stitches', () => {
  const geometry = createShellGeometry({ ...options, templateId: 'lianhua', patternScale: 8 }, 1.6)
  const mesh = new Mesh(geometry, new MeshBasicMaterial())
  const theta = Math.PI * 3 / 8 + Math.PI / 4 * 0.44
  const phi = Math.PI / 7
  const radial = new Vector3(Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi))
  const ray = new Raycaster(radial.clone().multiplyScalar(3), radial.clone().negate(), 0, 2)
  assert.ok(ray.intersectObject(mesh).length > 0, 'flower tips must connect to the structural stitch rather than float')
  disposeObject(mesh)
})

test('all configured layers are separate, concentric shells with decreasing radii', () => {
  const layers = createOrnamentLayers({ ...defaultConfig, layers: 6 })
  assert.equal(layers.length, 6)
  assert.equal(new Set(layers.map((layer) => layer.geometry)).size, 6)
  const extents = layers.map((layer) => {
    layer.geometry.computeBoundingSphere()
    return layer.geometry.boundingSphere!.radius
  })
  assert.ok(extents.every((radius, index) => index === 0 || radius < extents[index - 1]!))
  assert.ok(extents[5]! > 0.3, 'the innermost shell remains visible at a useful size')
  for (const layer of layers) disposeObject(layer)
})

test('owned GPU geometry and shared materials are disposed once', () => {
  const layers = createOrnamentLayers({ ...defaultConfig, layers: 2 })
  const mesh = layers[0]!
  let geometryDisposals = 0
  let materialDisposals = 0
  mesh.geometry.addEventListener('dispose', () => geometryDisposals++)
  const material = Array.isArray(mesh.material) ? mesh.material[0]! : mesh.material
  material.addEventListener('dispose', () => materialDisposals++)
  const texture = new Texture()
  let textureDisposals = 0
  texture.addEventListener('dispose', () => textureDisposals++)
  ;(material as MeshBasicMaterial).map = texture
  const duplicate = new Mesh(mesh.geometry, material)
  const group = new Group()
  group.add(mesh, duplicate)
  disposeObject(group)
  assert.equal(geometryDisposals, 1)
  assert.equal(materialDisposals, 1)
  assert.equal(textureDisposals, 1)
  disposeObject(layers[1]!)
})

test('camera fits every separated shell in a portrait viewport and follows a focused inner layer', () => {
  const separated = { ...defaultConfig, layers: 6, separation: 1 }
  const layout = getStageLayout(separated, 0.6)
  const halfHeight = Math.tan(Math.PI * 17.5 / 180) * layout.distance
  assert.ok(layout.positions[0]!.x < -2 && layout.positions[5]!.x > 2)
  assert.ok(halfHeight * 0.6 > 4.1, 'all six separated shells must fit horizontally')
  const focused = getStageLayout({ ...separated, activeLayer: 6 }, 0.6)
  assert.ok(focused.distance < layout.distance / 3, 'the small inner shell should fill the focus view')
  assert.equal(focused.target.x, focused.positions[5]!.x)
  assert.ok(getStageLayout({ ...separated, separation: 0 }, 1).positions.every((position) => position.length() === 0))
})
