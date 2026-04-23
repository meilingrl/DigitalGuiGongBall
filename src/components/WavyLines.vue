<script setup lang="ts">
/**
 * 可随鼠标交互的波浪线条背景，参考 PanelLab WavyLines / JIEJOE-WEB-Tutorial/016-wavy-lines
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '../stores/app'
import { storeToRefs } from 'pinia'

const store = useAppStore()
const { theme } = storeToRefs(store)

const containerRef = ref<HTMLElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)

const wavyStrokeStyle = computed(() => ({
  '--wavy-stroke':
    theme.value === 'dark' ? 'rgb(100 116 139)' : 'rgb(148 163 184)',
}))

interface CursorState {
  x: number
  y: number
  vx: number
  vy: number
}

interface Point {
  x: number
  y: number
  cursor: CursorState
}

let bounding = { width: 0, height: 0 }
const mouse = {
  x: 0,
  y: 0,
  lx: 0,
  ly: 0,
  sx: 0,
  sy: 0,
  v: 0,
  vs: 0,
  a: 0,
}
let lines: Point[][] = []
let paths: SVGPathElement[] = []
let rafId: number | null = null

function setSize() {
  if (!containerRef.value) return
  bounding = containerRef.value.getBoundingClientRect()
  if (svgRef.value) {
    svgRef.value.setAttribute('width', String(bounding.width))
    svgRef.value.setAttribute('height', String(bounding.height))
  }
}

function setLines() {
  if (!containerRef.value || !svgRef.value) return
  const { width, height } = bounding
  if (width <= 0 || height <= 0) return

  const xGap = 10
  const yGap = 32
  const oWidth = width + 200
  const oHeight = height + 30
  const totalLines = Math.ceil(oWidth / xGap)
  const totalPoints = Math.ceil(oHeight / yGap)
  const xStart = (width - xGap * totalLines) / 2
  const yStart = (height - yGap * totalPoints) / 2

  lines = []
  paths.forEach((p) => p.remove())
  paths = []

  const ns = 'http://www.w3.org/2000/svg'
  for (let i = 0; i <= totalLines; i++) {
    const points: Point[] = []
    for (let j = 0; j <= totalPoints; j++) {
      points.push({
        x: xStart + xGap * i,
        y: yStart + yGap * j,
        cursor: { x: 0, y: 0, vx: 0, vy: 0 },
      })
    }
    lines.push(points)
    const path = document.createElementNS(ns, 'path')
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke-width', '1')
    path.setAttribute('class', 'wavy-line-path')
    svgRef.value.appendChild(path)
    paths.push(path)
  }
}

function updateMousePosition(clientX: number, clientY: number) {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  mouse.x = clientX - rect.left
  mouse.y = clientY - rect.top
}

function movePoints() {
  lines.forEach((points) => {
    points.forEach((p) => {
      const dx = p.x - mouse.sx
      const dy = p.y - mouse.sy
      const d = Math.hypot(dx, dy)
      const l = Math.max(175, mouse.vs)

      if (d < l) {
        const f = 1 - d / l
        p.cursor.vx += Math.cos(mouse.a) * f * mouse.vs * 0.08
        p.cursor.vy += Math.sin(mouse.a) * f * mouse.vs * 0.08
      }

      p.cursor.vx += (0 - p.cursor.x) * 0.005
      p.cursor.vy += (0 - p.cursor.y) * 0.005
      p.cursor.vx *= 0.925
      p.cursor.vy *= 0.925
      p.cursor.x += p.cursor.vx * 2
      p.cursor.y += p.cursor.vy * 2
      p.cursor.x = Math.min(100, Math.max(-100, p.cursor.x))
      p.cursor.y = Math.min(100, Math.max(-100, p.cursor.y))
    })
  })
}

function moved(point: Point, withCursorForce = true) {
  const coords = {
    x: point.x + (withCursorForce ? point.cursor.x : 0),
    y: point.y + (withCursorForce ? point.cursor.y : 0),
  }
  coords.x = Math.round(coords.x * 10) / 10
  coords.y = Math.round(coords.y * 10) / 10
  return coords
}

function drawLines() {
  lines.forEach((points, lIndex) => {
    const p0 = moved(points[0], false)
    let d = `M ${p0.x} ${p0.y}`
    points.forEach((p, pIndex) => {
      const isLast = pIndex === points.length - 1
      const pt = moved(p, !isLast)
      d += ` L ${pt.x} ${pt.y}`
    })
    if (paths[lIndex]) paths[lIndex].setAttribute('d', d)
  })
}

function tick() {
  mouse.sx += (mouse.x - mouse.sx) * 0.1
  mouse.sy += (mouse.y - mouse.sy) * 0.1
  const dx = mouse.x - mouse.lx
  const dy = mouse.y - mouse.ly
  const d = Math.hypot(dx, dy)
  mouse.v = d
  mouse.vs += (d - mouse.vs) * 0.1
  mouse.vs = Math.min(100, mouse.vs)
  mouse.lx = mouse.x
  mouse.ly = mouse.y
  mouse.a = Math.atan2(dy, dx)
  movePoints()
  drawLines()
  rafId = requestAnimationFrame(tick)
}

function onResize() {
  setSize()
  setLines()
}

function onMouseMove(e: MouseEvent) {
  updateMousePosition(e.clientX, e.clientY)
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length) {
    e.preventDefault()
    const t = e.touches[0]
    updateMousePosition(t.clientX, t.clientY)
  }
}

onMounted(() => {
  setSize()
  setLines()
  window.addEventListener('resize', onResize)
  window.addEventListener('mousemove', onMouseMove)
  containerRef.value?.addEventListener('touchmove', onTouchMove, { passive: false })
  rafId = requestAnimationFrame(tick)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('mousemove', onMouseMove)
  containerRef.value?.removeEventListener('touchmove', onTouchMove)
  if (rafId != null) cancelAnimationFrame(rafId)
})
</script>

<template>
  <div
    ref="containerRef"
    class="wavy-lines"
    :style="wavyStrokeStyle"
    aria-hidden="true"
  >
    <svg ref="svgRef" class="wavy-lines-svg" />
  </div>
</template>

<style scoped>
.wavy-lines {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.wavy-lines-svg {
  display: block;
  width: 100%;
  height: 100%;
}

:deep(.wavy-line-path) {
  stroke: var(--wavy-stroke);
  opacity: 0.5;
  transition: stroke 0.2s ease, opacity 0.15s ease;
}
</style>
