<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useAppStore } from '../stores/app'

const props = defineProps<{
  layerDepth: number
  maxLayers: number
  theme: 'light' | 'dark'
  autoRotate: boolean
}>()

const store = useAppStore()
const stageRef = ref<HTMLElement | null>(null)
const pipRef = ref<HTMLElement | null>(null)

let mainRenderer: THREE.WebGLRenderer | null = null
let pipRenderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let mainCamera: THREE.PerspectiveCamera | null = null
let pipCamera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let frame = 0
let gridHelper: THREE.GridHelper | null = null

const layerUnits: Array<{
  outerShell: THREE.Mesh
  innerShell: THREE.Mesh
  baseOpacity: number
  albedoMap: THREE.CanvasTexture
  alphaMap: THREE.CanvasTexture
  roughnessMap: THREE.CanvasTexture
  normalMap: THREE.CanvasTexture
}> = []

let zoomStageCurrent = 0
let zoomStageTarget = 0
let cameraDistanceCurrent = 5.5
let cameraDistanceTarget = 5.5
let wheelBuffer = 0
let syncingFromSlider = false

// ─── helpers ────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

// Seeded pseudo-random: ensures each layer has its own deterministic hole pattern
function makeRng(seed: number) {
  let s = ((seed + 1) * 2654435761) | 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0
    return (s >>> 0) / 4294967296
  }
}

// Camera stays outside the ball — layers peel away rather than camera diving in
function stageToDistance(stage: number) {
  const maxStage = Math.max(props.maxLayers - 1, 1)
  return THREE.MathUtils.lerp(5.5, 3.8, clamp(stage / maxStage, 0, 1))
}

// ─── texture generation ──────────────────────────────────────────────────────
/**
 * Creates canvas textures per layer:
 *   albedoMap    – pale ivory with ultra-subtle grain (no amber/brown shift)
 *   alphaMap     – geometric lattice (hex / diamond / oval) for clean 镂空 look
 *   roughnessMap – polished ivory surface variation
 *   normalMap    – beveled hole rims from alphaMap gradient
 */
function createIvoryMaps(seed: number, layerIndex: number, maxLayers: number) {
  const rng = makeRng(seed)
  const size = 512
  const t = clamp(layerIndex / Math.max(maxLayers - 1, 1), 0, 1)

  // ── Albedo: pale ivory, no amber shift ───────────────────────────────
  const aCanvas = document.createElement('canvas')
  aCanvas.width = aCanvas.height = size
  const aC = aCanvas.getContext('2d')!

  // Outer: #f5edd8 (bright ivory). Inner: #ede0c4 (slightly warmer, still ivory)
  const cr = Math.round(THREE.MathUtils.lerp(245, 237, t))
  const cg = Math.round(THREE.MathUtils.lerp(237, 224, t))
  const cb = Math.round(THREE.MathUtils.lerp(216, 196, t))
  aC.fillStyle = `rgb(${cr},${cg},${cb})`
  aC.fillRect(0, 0, size, size)

  // Micro pore dots — barely visible
  for (let i = 0; i < 600; i++) {
    const x = rng() * size, y = rng() * size, r = rng() * 0.9 + 0.2
    aC.fillStyle = `rgba(170,145,105,${0.006 + rng() * 0.018})`
    aC.beginPath(); aC.arc(x, y, r, 0, Math.PI * 2); aC.fill()
  }

  // Very fine grain lines — structural veins of ivory, extremely subtle
  for (let i = 0; i < 10; i++) {
    const y0 = rng() * size
    const amp = 3 + rng() * 7, freq = 0.003 + rng() * 0.006, phase = rng() * Math.PI * 2
    aC.beginPath()
    aC.lineWidth = 0.3 + rng() * 0.5
    aC.strokeStyle = `rgba(175,150,108,${0.022 + rng() * 0.032})`
    for (let x = 0; x <= size; x += 2) {
      const y = y0 + Math.sin(x * freq + phase) * amp
      x === 0 ? aC.moveTo(x, y) : aC.lineTo(x, y)
    }
    aC.stroke()
  }

  // ── Alpha map: fixed symmetric 4×6 hole arrangement ─────────────────
  //
  // Design: 4 latitude bands × 6 holes each = 24 holes total.
  // Adjacent bands are staggered 30° in longitude, giving a classic
  // hexagonal brick pattern with clear 6-fold rotational symmetry.
  //
  // Bands at ±50° and ±15° were chosen so that:
  //   - Vertical gap between rows ≈ 30px (no overlap)
  //   - Horizontal gap at each band ≈ 30px (no overlap)
  //   - Polar caps are visibly clear (no holes near the poles)
  //
  // Drawing formula (equirectangular scale correction):
  //   rv = angRad/π × size          (latitude half-radius, constant)
  //   ru = rv / (2·cos(lat))        (longitude half-radius; ÷2 because
  //                                   x-axis scale = size/(2π), y = size/π)
  // Three canvas copies per hole (lon, lon±2π) make the seam seamless.
  //
  const alCanvas = document.createElement('canvas')
  alCanvas.width = alCanvas.height = size
  const alC = alCanvas.getContext('2d')!
  alC.fillStyle = 'white'
  alC.fillRect(0, 0, size, size)
  alC.fillStyle = 'black'

  // Outer layers: slightly larger holes; inner layers: finer carving
  const angRad = (Math.PI / 180) * Math.max(9, 12 - layerIndex * 0.5)
  const rv = (angRad / Math.PI) * size   // latitude half-radius (pixels)

  const drawHole = (lat: number, lon: number) => {
    const cosLat = Math.max(0.12, Math.cos(lat))
    const ru = rv / (2 * cosLat)        // corrected longitude half-radius
    const cx = (lon / (Math.PI * 2)) * size
    const cy = ((Math.PI / 2 - lat) / Math.PI) * size
    for (const dx of [0, -size, size]) {
      alC.beginPath()
      alC.ellipse(cx + dx, cy, ru, rv, 0, 0, Math.PI * 2)
      alC.fill()
    }
  }

  // 4 bands × 6 holes — stagger odd bands by 30° for hex regularity
  const BANDS = [
    { latDeg:  50, lonOffsetDeg:  0 },
    { latDeg:  15, lonOffsetDeg: 30 },
    { latDeg: -15, lonOffsetDeg:  0 },
    { latDeg: -50, lonOffsetDeg: 30 },
  ] as const

  for (const { latDeg, lonOffsetDeg } of BANDS) {
    const lat = (latDeg * Math.PI) / 180
    const lonOff = (lonOffsetDeg * Math.PI) / 180
    for (let i = 0; i < 6; i++) {
      drawHole(lat, lonOff + (2 * Math.PI * i) / 6)
    }
  }

  // ── Normal map: bevel the rim of each carved hole ────────────────────
  const alImg = alC.getImageData(0, 0, size, size)
  const alPx = alImg.data
  const nCanvas = document.createElement('canvas')
  nCanvas.width = nCanvas.height = size
  const nImg = nCanvas.getContext('2d')!.createImageData(size, size)
  const nPx = nImg.data
  const strength = 4.0

  function heightAt(px: number, py: number) {
    const xi = Math.min(size - 1, Math.max(0, Math.round(px)))
    const yi = Math.min(size - 1, Math.max(0, Math.round(py)))
    return alPx[(yi * size + xi) * 4] / 255
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (heightAt(x + 1, y) - heightAt(x - 1, y)) * 0.5 * strength
      const dy = (heightAt(x, y + 1) - heightAt(x, y - 1)) * 0.5 * strength
      let nx = -dx, ny = -dy, nz = 1.0
      const len = Math.hypot(nx, ny, nz)
      nx /= len; ny /= len; nz /= len
      const o = (y * size + x) * 4
      nPx[o] = Math.round((nx * 0.5 + 0.5) * 255)
      nPx[o + 1] = Math.round((ny * 0.5 + 0.5) * 255)
      nPx[o + 2] = Math.round((nz * 0.5 + 0.5) * 255)
      nPx[o + 3] = 255
    }
  }
  nCanvas.getContext('2d')!.putImageData(nImg, 0, 0)

  // ── Roughness map: polished ivory surface ─────────────────────────────
  const rCanvas = document.createElement('canvas')
  rCanvas.width = rCanvas.height = 256
  const rC = rCanvas.getContext('2d')!
  rC.fillStyle = 'rgb(96,96,96)'  // ~0.38 roughness base (polished ivory)
  rC.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 1200; i++) {
    const x = Math.floor(rng() * 256), y = Math.floor(rng() * 256)
    const g = 82 + Math.floor(rng() * 36)
    rC.fillStyle = `rgb(${g},${g},${g})`; rC.fillRect(x, y, 1, 1)
  }

  // ── Build THREE textures — no tiling (repeat 1×1) ────────────────────
  const albedoMap = new THREE.CanvasTexture(aCanvas)
  albedoMap.colorSpace = THREE.SRGBColorSpace
  albedoMap.wrapS = albedoMap.wrapT = THREE.RepeatWrapping
  albedoMap.repeat.set(1, 1)

  const alphaMap = new THREE.CanvasTexture(alCanvas)
  alphaMap.wrapS = alphaMap.wrapT = THREE.RepeatWrapping
  alphaMap.repeat.set(1, 1)

  const roughnessMap = new THREE.CanvasTexture(rCanvas)
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping
  roughnessMap.repeat.set(2, 2)

  const normalMap = new THREE.CanvasTexture(nCanvas)
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping
  normalMap.repeat.set(1, 1)
  normalMap.colorSpace = THREE.NoColorSpace

  return { albedoMap, alphaMap, roughnessMap, normalMap }
}

function makeShellMaterial(
  shellColor: THREE.Color,
  maps: {
    albedoMap: THREE.CanvasTexture
    alphaMap: THREE.CanvasTexture
    roughnessMap: THREE.CanvasTexture
    normalMap: THREE.CanvasTexture
  },
  side: THREE.Side,
) {
  return new THREE.MeshPhysicalMaterial({
    color: shellColor,
    map: maps.albedoMap,
    alphaMap: maps.alphaMap,
    roughnessMap: maps.roughnessMap,
    normalMap: maps.normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.32,      // polished ivory surface
    metalness: 0.0,
    alphaTest: 0.48,      // sharp hole edges (was 0.08 → blurry)
    clearcoat: 0.14,      // subtle lacquered sheen
    clearcoatRoughness: 0.45,
    // No transmission / attenuationColor — that was causing the chocolate effect
    side,
    transparent: true,
    opacity: 1.0,
  })
}

// ─── geometry build ──────────────────────────────────────────────────────────
const shellThickness = 0.018

function buildShells(maxLayers: number) {
  const group = new THREE.Group()
  layerUnits.length = 0

  for (let i = 0; i < maxLayers; i++) {
    const radius = 2.35 - i * 0.26
    if (radius < 0.55) break

    // All layers stay in the ivory family — no dark amber shift
    const t = clamp(i / Math.max(maxLayers - 1, 1), 0, 1)
    const shellColor = new THREE.Color().lerpColors(
      new THREE.Color('#f5edd8'), // outer — bright pale ivory
      new THREE.Color('#ede0c4'), // inner — slightly warmer ivory (still light!)
      t,
    )

    const maps = createIvoryMaps(i, i, maxLayers)

    const outerMat = makeShellMaterial(shellColor, maps, THREE.FrontSide)
    const innerMat = makeShellMaterial(shellColor.clone().multiplyScalar(0.94), maps, THREE.BackSide)

    const outerShell = new THREE.Mesh(new THREE.SphereGeometry(radius, 72, 56), outerMat)
    const innerShell = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(radius - shellThickness, 0.52), 72, 56),
      innerMat,
    )

    // Very small offset per layer so holes are roughly radially aligned
    // (large offsets made each layer look randomly mismatched)
    outerShell.rotation.y = innerShell.rotation.y = i * 0.04
    outerShell.rotation.x = innerShell.rotation.x = i * 0.02
    group.add(outerShell)
    group.add(innerShell)

    layerUnits.push({
      outerShell,
      innerShell,
      baseOpacity: 1.0,
      albedoMap: maps.albedoMap,
      alphaMap: maps.alphaMap,
      roughnessMap: maps.roughnessMap,
      normalMap: maps.normalMap,
    })
  }

  return group
}

// ─── core layer animation ────────────────────────────────────────────────────
/**
 * t = stageFloat − layerIndex
 *
 *   t >= 1   → passed: hide completely
 *   0 < t<1  → transitioning: fly out toward camera + fade
 *   t <= 0   → at rest: full opacity, holes visible, steady
 */
function applyLayerMotion(stageFloat: number) {
  if (!mainCamera) return
  const camDir = mainCamera.position.clone().normalize()

  layerUnits.forEach((layer, index) => {
    const t = stageFloat - index

    if (t >= 1.0) {
      layer.outerShell.visible = false
      layer.innerShell.visible = false
      return
    }

    layer.outerShell.visible = true
    layer.innerShell.visible = true

    const outerMat = layer.outerShell.material as THREE.MeshPhysicalMaterial
    const innerMat = layer.innerShell.material as THREE.MeshPhysicalMaterial

    if (t <= 0) {
      layer.outerShell.position.set(0, 0, 0)
      layer.innerShell.position.set(0, 0, 0)
      layer.outerShell.scale.setScalar(1)
      layer.innerShell.scale.setScalar(1)
      outerMat.opacity = layer.baseOpacity
      innerMat.opacity = layer.baseOpacity
      return
    }

    const ease = smoothstep(0, 1, t)
    const fast = ease * ease

    const flyDist = fast * 3.4
    layer.outerShell.position.copy(camDir).multiplyScalar(flyDist)
    layer.innerShell.position.copy(camDir).multiplyScalar(flyDist)

    layer.outerShell.scale.setScalar(1 + fast * 0.09)
    layer.innerShell.scale.setScalar(1 + fast * 0.09)

    outerMat.opacity = 1.0 - ease
    innerMat.opacity = 1.0 - ease
  })
}

// ─── scene theme ─────────────────────────────────────────────────────────────
function applySceneTheme(mode: 'light' | 'dark') {
  if (!scene) return
  scene.background = new THREE.Color(mode === 'light' ? '#d8d2ca' : '#0c1016')
  if (gridHelper) {
    scene.remove(gridHelper)
    gridHelper.geometry.dispose()
    const mats = gridHelper.material
    if (Array.isArray(mats)) mats.forEach((m) => m.dispose())
    else mats.dispose()
  }
  const gc = mode === 'light'
    ? { c1: '#a09080', c2: '#ccc4b8' }
    : { c1: '#28303a', c2: '#161c24' }
  gridHelper = new THREE.GridHelper(16, 28, gc.c1, gc.c2)
  gridHelper.position.y = -2.8
  scene.add(gridHelper)
}

// ─── zoom helpers ─────────────────────────────────────────────────────────────
function syncZoomFromLayerDepth(depth: number) {
  syncingFromSlider = true
  zoomStageTarget = clamp(depth - 1, 0, Math.max(props.maxLayers - 1, 0))
  cameraDistanceTarget = stageToDistance(zoomStageTarget)
}

function resize() {
  if (!stageRef.value || !mainRenderer || !mainCamera || !pipRenderer || !pipCamera) return
  const w = stageRef.value.clientWidth, h = stageRef.value.clientHeight
  mainRenderer.setSize(w, h)
  mainCamera.aspect = w / h
  mainCamera.updateProjectionMatrix()
  const pw = pipRef.value?.clientWidth ?? 240, ph = pipRef.value?.clientHeight ?? 160
  pipRenderer.setSize(pw, ph)
  pipCamera.aspect = pw / ph
  pipCamera.updateProjectionMatrix()
}

function stepWheelToStage(event: WheelEvent) {
  event.preventDefault()
  wheelBuffer += event.deltaY
  const threshold = 65
  while (Math.abs(wheelBuffer) >= threshold) {
    if (wheelBuffer > 0) { zoomStageTarget++; wheelBuffer -= threshold }
    else { zoomStageTarget--; wheelBuffer += threshold }
  }
  zoomStageTarget = clamp(zoomStageTarget, 0, Math.max(props.maxLayers - 1, 0))
  cameraDistanceTarget = stageToDistance(zoomStageTarget)
}

// ─── lifecycle ────────────────────────────────────────────────────────────────
onMounted(() => {
  if (!stageRef.value || !pipRef.value) return

  scene = new THREE.Scene()
  applySceneTheme(props.theme)

  mainCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
  mainCamera.position.set(0, 1.0, 5.5)

  pipCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
  pipCamera.position.set(0.7, 0.7, 2.8)

  mainRenderer = new THREE.WebGLRenderer({ antialias: true })
  mainRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  mainRenderer.toneMapping = THREE.ACESFilmicToneMapping
  mainRenderer.toneMappingExposure = 0.92  // slightly lower to keep ivory bright, not blown out
  stageRef.value.appendChild(mainRenderer.domElement)

  pipRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  pipRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  pipRef.value.appendChild(pipRenderer.domElement)

  controls = new OrbitControls(mainCamera, mainRenderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.enableZoom = false
  controls.minDistance = 3.2
  controls.maxDistance = 8.0
  controls.target.set(0, 0, 0)

  // ── Studio lighting for pale ivory ───────────────────────────────────
  // Ambient: ensures all faces receive enough base light (no pitch-black shadow sides)
  const ambient = new THREE.AmbientLight('#fff8f4', 0.75)
  scene.add(ambient)

  // Key light: white, upper right — museum-style spotlight
  const keyLight = new THREE.DirectionalLight('#ffffff', 1.0)
  keyLight.position.set(4, 6, 4)
  scene.add(keyLight)

  // Fill light: soft cool-white from the left, balances shadows
  const fillLight = new THREE.DirectionalLight('#f4f4ff', 0.45)
  fillLight.position.set(-4, 1, 3)
  scene.add(fillLight)

  // Rim light: very gentle warm from behind-below to separate ball from background
  const rimLight = new THREE.DirectionalLight('#fff0e8', 0.22)
  rimLight.position.set(0, -3, -4)
  scene.add(rimLight)

  // ── Inner core: light ivory sphere at the center ─────────────────────
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.52, 4),
    new THREE.MeshPhysicalMaterial({
      color: '#f0e8d4',   // pale ivory, matches outer shells
      roughness: 0.42,
      metalness: 0.0,
      clearcoat: 0.10,
      clearcoatRoughness: 0.50,
    }),
  )
  scene.add(core)

  const shellsGroup = buildShells(props.maxLayers)
  scene.add(shellsGroup)

  syncZoomFromLayerDepth(props.layerDepth)
  zoomStageCurrent = zoomStageTarget
  cameraDistanceCurrent = stageToDistance(zoomStageCurrent)
  cameraDistanceTarget = cameraDistanceCurrent
  applyLayerMotion(zoomStageCurrent)

  resize()
  // ResizeObserver 监听容器尺寸变化，优于 window.resize：
  // 能感知侧边栏展开/收起等引起的容器宽度变化
  const ro = new ResizeObserver(() => resize())
  ro.observe(stageRef.value!)
  ;(stageRef.value as HTMLElement & { __ro?: ResizeObserver }).__ro = ro
  mainRenderer.domElement.addEventListener('wheel', stepWheelToStage, { passive: false })

  const animate = () => {
    frame = requestAnimationFrame(animate)
    if (!scene || !mainRenderer || !pipRenderer || !mainCamera || !pipCamera || !controls) return

    zoomStageCurrent += (zoomStageTarget - zoomStageCurrent) * 0.055
    cameraDistanceCurrent += (cameraDistanceTarget - cameraDistanceCurrent) * 0.055

    controls.update()
    mainCamera.position.normalize().multiplyScalar(cameraDistanceCurrent)

    if (props.autoRotate) {
      shellsGroup.rotation.y += 0.0018
      core.rotation.y -= 0.0025
    }

    applyLayerMotion(zoomStageCurrent)

    pipCamera.position.copy(mainCamera.position).multiplyScalar(0.50)
    pipCamera.lookAt(0, 0, 0)

    store.setRiskLevel(mainCamera.position.length() < 3.8 ? 'warning' : 'safe')

    if (!syncingFromSlider) {
      const nextDepth = Math.round(zoomStageTarget) + 1
      if (store.layerDepth !== nextDepth) store.setLayerDepth(nextDepth)
    }
    syncingFromSlider = false

    mainRenderer.render(scene, mainCamera)
    pipRenderer.render(scene, pipCamera)
  }

  animate()
})

watch(() => props.layerDepth, (d) => { syncZoomFromLayerDepth(d) })
watch(() => props.theme, (mode) => { applySceneTheme(mode) })

onBeforeUnmount(() => {
  if (stageRef.value) {
    const ro = (stageRef.value as HTMLElement & { __ro?: ResizeObserver }).__ro
    ro?.disconnect()
  }
  cancelAnimationFrame(frame)
  mainRenderer?.domElement.removeEventListener('wheel', stepWheelToStage)
  if (gridHelper && scene) {
    scene.remove(gridHelper)
    gridHelper.geometry.dispose()
    const mats = gridHelper.material
    if (Array.isArray(mats)) mats.forEach((m) => m.dispose())
    else mats.dispose()
    gridHelper = null
  }
  controls?.dispose()
  for (const layer of layerUnits) {
    layer.albedoMap.dispose()
    layer.alphaMap.dispose()
    layer.roughnessMap.dispose()
    layer.normalMap.dispose()
    const outerM = layer.outerShell.material as THREE.MeshPhysicalMaterial
    const innerM = layer.innerShell.material as THREE.MeshPhysicalMaterial
    outerM.dispose()
    innerM.dispose()
    layer.outerShell.geometry.dispose()
    layer.innerShell.geometry.dispose()
  }
  mainRenderer?.dispose()
  pipRenderer?.dispose()
  if (stageRef.value && mainRenderer?.domElement) stageRef.value.removeChild(mainRenderer.domElement)
  if (pipRef.value && pipRenderer?.domElement) pipRef.value.removeChild(pipRenderer.domElement)
})
</script>

<template>
  <div class="relative h-full w-full">
    <div ref="stageRef" class="h-full w-full" />
    <div
      ref="pipRef"
      class="absolute right-4 top-4 h-36 w-56 overflow-hidden rounded-xl shadow-soft"
      :class="
        theme === 'light'
          ? 'border border-stone-400/40 bg-white/60'
          : 'border border-slate-600/40'
      "
    />
  </div>
</template>
