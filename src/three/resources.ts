import { BufferGeometry, Material, Texture, type Object3D } from 'three'

/** Dispose owned scene resources once even when meshes share materials or maps. */
export function disposeObject(root: Object3D): void {
  const geometries = new Set<BufferGeometry>()
  const materials = new Set<Material>()
  const textures = new Set<Texture>()
  root.traverse((object) => {
    const renderable = object as Object3D & { geometry?: BufferGeometry; material?: Material | Material[] }
    if (renderable.geometry) geometries.add(renderable.geometry)
    if (renderable.material) {
      for (const material of Array.isArray(renderable.material) ? renderable.material : [renderable.material]) {
        materials.add(material)
      }
    }
  })
  for (const material of materials) {
    for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value)
  }
  for (const geometry of geometries) geometry.dispose()
  for (const material of materials) material.dispose()
  for (const texture of textures) texture.dispose()
}
