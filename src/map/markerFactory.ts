/**
 * markerFactory.ts
 * Data-driven SVG marker element factory.
 * Each IchCategory maps to a distinct colour + icon path,
 * keeping the business logic fully decoupled from the map SDK.
 */

import type { IchCategory } from '../data/explore'

// ─── Category metadata ───────────────────────────────────────────────────────

interface CategoryStyle {
  /** Tailwind-compatible hex colour */
  fill: string
  /** Lighter ring colour for the active/hover state */
  ring: string
  /** SVG path for the 16×16 icon rendered inside the pin */
  iconPath: string
}

const CATEGORY_STYLES: Record<IchCategory, CategoryStyle> = {
  museum: {
    fill: '#0f766e',  // teal-700
    ring: '#5eead4',  // teal-300
    // Pillar / building icon
    iconPath:
      'M2 14h12M3 4h10M4 4v10m8-10v10M6 7h1.5M6 9.5h1.5M8.5 7H10M8.5 9.5H10',
  },
  craft: {
    fill: '#92400e',  // amber-800
    ring: '#fcd34d',  // amber-300
    // Needle / thread icon
    iconPath:
      'M9 3L3 9m0 0l6 6M3 9h10a2 2 0 000-4H9m4 10H5a2 2 0 000 4h4',
  },
  performing: {
    fill: '#7e22ce',  // purple-800
    ring: '#d8b4fe',  // purple-300
    // Drama mask simplified
    iconPath:
      'M3 8a5 5 0 0010 0A5 5 0 003 8zM6 7h.01M10 7h.01M5.5 10.5s1 1.5 2.5 1.5 2.5-1.5 2.5-1.5',
  },
  festival: {
    fill: '#be123c',  // rose-700
    ring: '#fda4af',  // rose-300
    // Lantern / flag icon
    iconPath:
      'M8 2v2m0 0a4 4 0 100 8 4 4 0 000-8zM8 12v2m-3-1l1-1m5 0l1 1M5 7H3m10 0h-2',
  },
  culinary: {
    fill: '#15803d',  // green-700
    ring: '#86efac',  // green-300
    // Bowl icon
    iconPath:
      'M3 9h10a5 5 0 01-10 0zM6 5h4M8 5V3m-2 8h4',
  },
}

// ─── Marker element factory ───────────────────────────────────────────────────

export interface MarkerOptions {
  category: IchCategory
  /** Locale label shown in the tooltip */
  label: string
  /** Whether this marker is currently "selected" */
  active?: boolean
  /** Whether the marker should display an activity pulse badge */
  hasActivity?: boolean
  onClick?: () => void
}

/**
 * Creates a fully self-contained HTMLElement for use as a custom AMap marker.
 * No external CSS dependencies — all styles are inline for maximum portability.
 */
export function createMarkerElement(opts: MarkerOptions): HTMLElement {
  const style = CATEGORY_STYLES[opts.category]
  const size = opts.active ? 44 : 36
  const pulseColor = style.ring

  const wrapper = document.createElement('div')
  wrapper.style.cssText = `
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    user-select: none;
  `

  // ── Pin body ─────────────────────────────────────────────────────────────
  const pin = document.createElement('div')
  pin.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    background: ${style.fill};
    border: 2.5px solid rgba(255,255,255,0.9);
    box-shadow: 0 3px 10px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: width 0.15s ease, height 0.15s ease, box-shadow 0.15s ease;
    position: relative;
  `
  if (opts.active) {
    pin.style.boxShadow = `0 0 0 4px ${pulseColor}55, 0 4px 14px rgba(0,0,0,0.4)`
  }

  // ── SVG icon (counter-rotate so it's upright) ────────────────────────────
  const iconWrap = document.createElement('div')
  iconWrap.style.cssText = `
    transform: rotate(45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    width: ${Math.round(size * 0.55)}px;
    height: ${Math.round(size * 0.55)}px;
  `
  const svgSize = Math.round(size * 0.5)
  iconWrap.innerHTML = `
    <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 16 16"
         fill="none" stroke="rgba(255,255,255,0.92)" stroke-width="1.6"
         stroke-linecap="round" stroke-linejoin="round">
      <path d="${style.iconPath}"/>
    </svg>
  `
  pin.appendChild(iconWrap)

  // ── Activity badge (pulsing dot) ──────────────────────────────────────────
  if (opts.hasActivity) {
    const badge = document.createElement('div')
    badge.style.cssText = `
      position: absolute;
      top: -3px;
      right: -3px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #f59e0b;
      border: 2px solid #fff;
      transform: rotate(45deg);
      animation: marker-pulse 1.8s ease-in-out infinite;
    `
    pin.appendChild(badge)
  }

  wrapper.appendChild(pin)

  // ── Tooltip label ────────────────────────────────────────────────────────
  const tooltip = document.createElement('div')
  tooltip.textContent = opts.label
  tooltip.style.cssText = `
    position: absolute;
    top: -32px;
    left: 50%;
    transform: translateX(-50%) rotate(0deg);
    background: ${style.fill};
    color: #fff;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s ease;
    box-shadow: 0 2px 6px rgba(0,0,0,0.25);
  `
  wrapper.appendChild(tooltip)

  // ── Hover interactions ───────────────────────────────────────────────────
  wrapper.addEventListener('mouseenter', () => {
    tooltip.style.opacity = '1'
    pin.style.boxShadow = `0 0 0 4px ${pulseColor}44, 0 5px 16px rgba(0,0,0,0.4)`
  })
  wrapper.addEventListener('mouseleave', () => {
    tooltip.style.opacity = '0'
    if (!opts.active) {
      pin.style.boxShadow = '0 3px 10px rgba(0,0,0,0.3)'
    }
  })

  if (opts.onClick) {
    wrapper.addEventListener('click', opts.onClick)
  }

  return wrapper
}

/**
 * Inject the keyframe animation for the activity badge once per document.
 * Safe to call multiple times — only injects once.
 */
export function ensureMarkerAnimations(): void {
  if (document.getElementById('map-marker-keyframes')) return
  const style = document.createElement('style')
  style.id = 'map-marker-keyframes'
  style.textContent = `
    @keyframes marker-pulse {
      0%, 100% { opacity: 1; transform: rotate(45deg) scale(1); }
      50% { opacity: 0.5; transform: rotate(45deg) scale(1.5); }
    }
  `
  document.head.appendChild(style)
}
