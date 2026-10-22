import { BufferGeometry, Float32BufferAttribute, Mesh, MeshPhysicalMaterial, Vector3 } from 'three'
import type { DesignConfig } from '../../shared/design'
import { getLayerPattern } from '../../shared/layerDesign'
import { layerMaterialParameters, layerRadius, setLayerRotation } from './layerSpec'
export { materialPresets } from './layerSpec'

export interface ShellOptions {
  templateId: DesignConfig['templateId']
  patternScale: number
  aperture: number
}

/** Original parametric openwork. The apertures are absent triangles, with solid inner walls. */
export function createShellGeometry(options: ShellOptions, radius: number): BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  const rows = Math.round(options.patternScale / 2)
  const step = Math.PI / rows
  const thickness = radius * 0.022
  const segments = 32

  function point(theta: number, phi: number, distance: number) {
    const sin = Math.sin(theta)
    positions.push(sin * Math.cos(phi) * distance, Math.cos(theta) * distance, sin * Math.sin(phi) * distance)
  }

  function motif(angle: number): [number, number] {
    if (options.templateId === 'lianhua') {
      const petal = 0.86 + 0.14 * Math.cos(angle * 6)
      return [Math.cos(angle) * petal, Math.sin(angle) * petal]
    }
    if (options.templateId === 'ruyi') {
      // A three-lobed cloud study, not a reconstruction of a historical carving.
      const cloud = 0.86 + 0.14 * Math.cos(angle * 3 - Math.PI / 2)
      return [Math.cos(angle) * cloud, Math.sin(angle) * cloud]
    }
    return [Math.cos(angle), Math.sin(angle)]
  }

  function connectTip(fromTheta: number, toTheta: number, phi: number) {
    const start = positions.length / 3
    for (const theta of [fromTheta, toTheta]) {
      const radial = new Vector3(Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi))
      const azimuth = new Vector3(-Math.sin(phi), 0, Math.cos(phi))
      for (let side = 0; side < 4; side++) {
        const angle = side * Math.PI / 2
        const position = radial.clone().multiplyScalar(radius + Math.cos(angle) * radius * 0.007)
          .addScaledVector(azimuth, Math.sin(angle) * radius * 0.007)
        positions.push(position.x, position.y, position.z)
      }
    }
    for (let side = 0; side < 4; side++) {
      const a = start + side
      const b = start + (side + 1) % 4
      indices.push(a, b + 4, a + 4, a, b, b + 4)
    }
  }

  for (let row = 0; row < rows; row++) {
    const theta = (row + 0.5) * step
    const columns = Math.max(5, Math.round(options.patternScale * Math.sin(theta)))
    const cellWidth = Math.PI * 2 / columns
    for (let column = 0; column < columns; column++) {
      const phi = (column + (row % 2) * 0.5) * cellWidth
      const start = positions.length / 3
      for (let segment = 0; segment < segments; segment++) {
        const [x, y] = motif(segment / segments * Math.PI * 2)
        const deltaPhi = x * cellWidth * 0.535
        const deltaTheta = y * step * 0.535
        point(theta + deltaTheta, phi + deltaPhi, radius + thickness / 2)
        point(theta + deltaTheta * options.aperture, phi + deltaPhi * options.aperture, radius + thickness / 2)
        point(theta + deltaTheta, phi + deltaPhi, radius - thickness / 2)
        point(theta + deltaTheta * options.aperture, phi + deltaPhi * options.aperture, radius - thickness / 2)
      }
      for (let segment = 0; segment < segments; segment++) {
        const a = start + segment * 4
        const b = start + ((segment + 1) % segments) * 4
        indices.push(
          a, b, b + 1, a, b + 1, a + 1,
          a + 2, b + 3, b + 2, a + 2, a + 3, b + 3,
          a, a + 2, b + 2, a, b + 2, b,
          a + 1, b + 1, b + 3, a + 1, b + 3, a + 3,
        )
      }
      for (const direction of [-1, 1]) {
        const [, y] = motif(direction * Math.PI / 2)
        const tip = y * step * 0.535
        if (Math.abs(tip) < step * 0.5) connectTip(theta + tip, theta + direction * step * 0.5, phi)
      }
    }
  }

  // Slim latitude stitches connect neighbouring motif rows into a visible lattice.
  // These are solid round filaments, not a texture or an opaque backing sphere.
  const tubeSegments = Math.max(48, options.patternScale * 4)
  const sides = 6
  for (let row = 1; row < rows; row++) {
    const theta = row * step
    const start = positions.length / 3
    for (let segment = 0; segment < tubeSegments; segment++) {
      const phi = segment / tubeSegments * Math.PI * 2
      const radial = new Vector3(Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi))
      const meridian = new Vector3(Math.cos(theta) * Math.cos(phi), -Math.sin(theta), Math.cos(theta) * Math.sin(phi))
      const centre = radial.clone().multiplyScalar(radius)
      for (let side = 0; side < sides; side++) {
        const angle = side / sides * Math.PI * 2
        const position = centre.clone()
          .addScaledVector(radial, Math.cos(angle) * radius * 0.007)
          .addScaledVector(meridian, Math.sin(angle) * radius * 0.007)
        positions.push(position.x, position.y, position.z)
      }
    }
    for (let segment = 0; segment < tubeSegments; segment++) {
      for (let side = 0; side < sides; side++) {
        const a = start + segment * sides + side
        const b = start + ((segment + 1) % tubeSegments) * sides + side
        const c = start + ((segment + 1) % tubeSegments) * sides + ((side + 1) % sides)
        const d = start + segment * sides + ((side + 1) % sides)
        indices.push(a, c, b, a, d, c)
      }
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

export function createOrnamentLayers(config: DesignConfig): Mesh[] {
  return Array.from({ length: config.layers }, (_, index) => {
    const radius = layerRadius(index, config.layers)
    const material = new MeshPhysicalMaterial(layerMaterialParameters(config.material, index))
    const mesh = new Mesh(createShellGeometry(getLayerPattern(config, index), radius), material)
    mesh.name = `openwork-layer-${index + 1}`
    mesh.userData.layer = index + 1
    mesh.userData.radius = radius
    setLayerRotation(mesh.rotation, index)
    return mesh
  })
}
