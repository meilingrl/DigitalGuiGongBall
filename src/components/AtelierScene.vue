<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import flagshipModelUrl from '../assets/materials/models/museum-model-guigong-original-optimized-preview-v1.0.glb?url'
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
let resizeObserver: ResizeObserver | null = null
let shellRoot: THREE.Group | null = null
let shellMeshes: THREE.Mesh[] = []
let coreMesh: THREE.Mesh | null = null
let zoomStageCurrent = 0
let zoomStageTarget = 0
let cameraDistanceCurrent = 5.5
let cameraDistanceTarget = 5.5
let wheelBuffer = 0
let syncingFromSlider = false
const STAGE_SNAP_EPSILON = 0.001
const DISTANCE_SNAP_EPSILON = 0.001
const HIDE_THRESHOLD = 0.985
const EXPLODED_DIRECTIONS = [
  new THREE.Vector3(-1.0, 0.18, 0.3).normalize(),
  new THREE.Vector3(0.82, 0.46, 0.12).normalize(),
  new THREE.Vector3(-0.28, -0.56, 0.7).normalize(),
  new THREE.Vector3(0.42, 0.62, -0.5).normalize(),
  new THREE.Vector3(-0.14, -0.34, -0.62).normalize(),
  new THREE.Vector3(0.24, -0.72, 0.46).normalize(),
]
const EXPLODED_DISTANCES = [1.95, 1.5, 1.1, 0.8, 0.58, 0.42]

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function stageToDistance(stage: number) {
  const maxStage = Math.max(props.maxLayers - 1, 1)
  return THREE.MathUtils.lerp(5.35, 3.85, clamp(stage / maxStage, 0, 1))
}

function syncZoomFromLayerDepth(depth: number) {
  syncingFromSlider = true
  zoomStageTarget = clamp(depth - 1, 0, Math.max(props.maxLayers - 1, 0))
  cameraDistanceTarget = stageToDistance(zoomStageTarget)
}

function resize() {
  if (!stageRef.value || !mainRenderer || !mainCamera || !pipRenderer || !pipCamera) return
  const w = stageRef.value.clientWidth
  const h = stageRef.value.clientHeight
  mainRenderer.setSize(w, h)
  mainCamera.aspect = w / h
  mainCamera.updateProjectionMatrix()

  const pw = pipRef.value?.clientWidth ?? 240
  const ph = pipRef.value?.clientHeight ?? 160
  pipRenderer.setSize(pw, ph)
  pipCamera.aspect = pw / ph
  pipCamera.updateProjectionMatrix()
}

function applySceneTheme(mode: 'light' | 'dark') {
  if (!scene) return
  scene.background = new THREE.Color(mode === 'light' ? '#ddd6ce' : '#0b1119')
  if (gridHelper) {
    scene.remove(gridHelper)
    gridHelper.geometry.dispose()
    const material = gridHelper.material
    if (Array.isArray(material)) material.forEach((item) => item.dispose())
    else material.dispose()
  }
  const colors =
    mode === 'light'
      ? { c1: '#b59e86', c2: '#ddd2c4' }
      : { c1: '#243342', c2: '#141b26' }
  gridHelper = new THREE.GridHelper(16, 28, colors.c1, colors.c2)
  gridHelper.position.y = -2.55
  scene.add(gridHelper)
}

function configureMaterial(mesh: THREE.Mesh) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  for (const material of materials) {
    if (
      material instanceof THREE.MeshStandardMaterial ||
      material instanceof THREE.MeshPhysicalMaterial
    ) {
      material.roughness = Math.max(material.roughness ?? 0.34, 0.26)
      material.metalness = 0
      material.envMapIntensity = 0.8
      material.transparent = true
      material.opacity = 1
      material.depthWrite = true
      material.needsUpdate = true
    }
  }
}

function collectModelParts(root: THREE.Group) {
  shellMeshes = []
  coreMesh = null
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = false
      child.receiveShadow = false
      configureMaterial(child)
    }
    if (child instanceof THREE.Mesh && child.name.startsWith('shell_')) shellMeshes.push(child)
    if (child instanceof THREE.Mesh && child.name === 'core') coreMesh = child
  })
  shellMeshes.sort((a, b) => a.name.localeCompare(b.name))
}

function setMeshOpacity(mesh: THREE.Mesh, opacity: number) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  for (const material of materials) {
    if (
      material instanceof THREE.MeshStandardMaterial ||
      material instanceof THREE.MeshPhysicalMaterial
    ) {
      material.opacity = opacity
      material.depthWrite = opacity > 0.92
      material.needsUpdate = true
    }
  }
}

function applyLayerMotion(stageFloat: number) {
  if (shellMeshes.length === 0) return

  shellMeshes.forEach((shell, index) => {
    const t = stageFloat - index
    const dir = EXPLODED_DIRECTIONS[index] ?? new THREE.Vector3(1, 0, 0)
    const distance = EXPLODED_DISTANCES[index] ?? 0.6

    if (t >= HIDE_THRESHOLD) {
      shell.visible = false
      shell.position.set(0, 0, 0)
      shell.scale.setScalar(1)
      setMeshOpacity(shell, 0)
      return
    }

    shell.visible = true

    if (t <= 0) {
      shell.position.set(0, 0, 0)
      shell.scale.setScalar(1)
      setMeshOpacity(shell, 1)
      return
    }

    const ease = smoothstep(0, 1, t)
    const positionEase = ease * ease * (3 - 2 * ease)
    const opacityEase = smoothstep(0.12, 0.9, t)
    const explodedDist = positionEase * distance

    shell.position.copy(dir).multiplyScalar(explodedDist)
    shell.scale.setScalar(1 + positionEase * 0.055)
    setMeshOpacity(shell, 1 - opacityEase)
  })

  if (coreMesh) {
    coreMesh.visible = true
  }
}

function stepWheelToStage(event: WheelEvent) {
  event.preventDefault()
  wheelBuffer += event.deltaY
  const threshold = 65

  while (Math.abs(wheelBuffer) >= threshold) {
    if (wheelBuffer > 0) {
      zoomStageTarget++
      wheelBuffer -= threshold
    } else {
      zoomStageTarget--
      wheelBuffer += threshold
    }
  }

  zoomStageTarget = clamp(zoomStageTarget, 0, Math.max(props.maxLayers - 1, 0))
  cameraDistanceTarget = stageToDistance(zoomStageTarget)
}

async function loadFlagshipModel() {
  if (!scene) return
  const loader = new GLTFLoader()
  const gltf = await loader.loadAsync(flagshipModelUrl)
  const root = gltf.scene
  root.name = 'guigong_flagship_instance'
  root.rotation.y = 0.28
  scene.add(root)

  const shells = new THREE.Group()
  shells.name = 'guigong_shell_root'
  root.add(shells)

  collectModelParts(root)
  for (const shell of shellMeshes) shells.add(shell)
  if (coreMesh) root.add(coreMesh)

  shellRoot = shells
  applyLayerMotion(zoomStageCurrent)
}

onMounted(async () => {
  if (!stageRef.value || !pipRef.value) return

  scene = new THREE.Scene()
  applySceneTheme(props.theme)

  mainCamera = new THREE.PerspectiveCamera(48, 1, 0.1, 100)
  mainCamera.position.set(0, 1.0, 5.35)

  pipCamera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
  pipCamera.position.set(0.65, 0.72, 2.55)

  mainRenderer = new THREE.WebGLRenderer({ antialias: true })
  mainRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  mainRenderer.outputColorSpace = THREE.SRGBColorSpace
  mainRenderer.toneMapping = THREE.ACESFilmicToneMapping
  mainRenderer.toneMappingExposure = 0.95
  stageRef.value.appendChild(mainRenderer.domElement)

  pipRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  pipRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  pipRenderer.outputColorSpace = THREE.SRGBColorSpace
  pipRef.value.appendChild(pipRenderer.domElement)

  controls = new OrbitControls(mainCamera, mainRenderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.enableZoom = false
  controls.minDistance = 3.4
  controls.maxDistance = 8.0
  controls.target.set(0, 0, 0)

  const ambient = new THREE.AmbientLight('#fff8f2', 1.05)
  scene.add(ambient)

  const keyLight = new THREE.DirectionalLight('#ffffff', 1.6)
  keyLight.position.set(4.5, 5.8, 4.1)
  scene.add(keyLight)

  const fillLight = new THREE.DirectionalLight('#eef4ff', 0.65)
  fillLight.position.set(-4.0, 2.0, 3.2)
  scene.add(fillLight)

  const rimLight = new THREE.DirectionalLight('#ffe9dc', 0.34)
  rimLight.position.set(0.0, -2.2, -4.5)
  scene.add(rimLight)

  syncZoomFromLayerDepth(props.layerDepth)
  zoomStageCurrent = zoomStageTarget
  cameraDistanceCurrent = stageToDistance(zoomStageCurrent)
  cameraDistanceTarget = cameraDistanceCurrent

  await loadFlagshipModel()

  resize()
  resizeObserver = new ResizeObserver(() => resize())
  resizeObserver.observe(stageRef.value)
  mainRenderer.domElement.addEventListener('wheel', stepWheelToStage, { passive: false })

  const animate = () => {
    frame = requestAnimationFrame(animate)
    if (!scene || !mainRenderer || !pipRenderer || !mainCamera || !pipCamera || !controls) return

    zoomStageCurrent += (zoomStageTarget - zoomStageCurrent) * 0.055
    cameraDistanceCurrent += (cameraDistanceTarget - cameraDistanceCurrent) * 0.055

    if (Math.abs(zoomStageTarget - zoomStageCurrent) < STAGE_SNAP_EPSILON) {
      zoomStageCurrent = zoomStageTarget
    }
    if (Math.abs(cameraDistanceTarget - cameraDistanceCurrent) < DISTANCE_SNAP_EPSILON) {
      cameraDistanceCurrent = cameraDistanceTarget
    }

    controls.update()
    mainCamera.position.normalize().multiplyScalar(cameraDistanceCurrent)

    if (shellRoot && props.autoRotate) {
      shellRoot.rotation.y += 0.0023
    }
    if (coreMesh && props.autoRotate) {
      coreMesh.rotation.y -= 0.003
    }

    applyLayerMotion(zoomStageCurrent)

    pipCamera.position.copy(mainCamera.position).multiplyScalar(0.5)
    pipCamera.lookAt(0, 0, 0)

    store.setRiskLevel(mainCamera.position.length() < 3.95 ? 'warning' : 'safe')

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

watch(() => props.layerDepth, (depth) => {
  syncZoomFromLayerDepth(depth)
})

watch(() => props.theme, (mode) => {
  applySceneTheme(mode)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  cancelAnimationFrame(frame)
  mainRenderer?.domElement.removeEventListener('wheel', stepWheelToStage)
  controls?.dispose()

  if (scene) {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        for (const material of materials) material.dispose()
      }
    })
  }

  if (gridHelper && scene) {
    scene.remove(gridHelper)
    gridHelper.geometry.dispose()
    const material = gridHelper.material
    if (Array.isArray(material)) material.forEach((item) => item.dispose())
    else material.dispose()
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
