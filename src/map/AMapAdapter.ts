/**
 * AMapAdapter.ts
 * Concrete MapAdapter implementation backed by AMap JS API 2.0.
 * All AMap SDK calls are contained here — no AMap API leaks outside.
 */

import AMapLoader from '@amap/amap-jsapi-loader'
import type { MapAdapter, MapEvent, LatLng, BoundsRect, MapInitOptions } from './types'

const STYLE_MAP: Record<string, string> = {
  light: 'amap://styles/whitesmoke',
  dark: 'amap://styles/dark',
}

export class AMapAdapter implements MapAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private AMap: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private map: any = null
  /** id → AMap.Marker instance */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private markers = new Map<string, any>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildingsLayer: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private clusterer: any = null

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  async init(containerId: string, options: MapInitOptions = {}): Promise<void> {
    const key = import.meta.env.VITE_AMAP_KEY as string
    if (!key) throw new Error('VITE_AMAP_KEY is not set')

    this.AMap = await AMapLoader.load({
      key,
      version: '2.0',
      plugins: ['AMap.Driving', 'AMap.Walking', 'AMap.Buildings', 'AMap.MarkerClusterer'],
    })

    const styleUrl = options.style
      ? STYLE_MAP[options.style] ?? options.style
      : STYLE_MAP['light']

    this.map = new this.AMap.Map(containerId, {
      zoom: options.zoom ?? 5,
      center: options.center
        ? [options.center.lng, options.center.lat]
        : [108.0, 35.5],
      mapStyle: styleUrl,
      // Remove default logo for a cleaner cultural aesthetic
      showIndoorMap: false,
    })

    return new Promise<void>((resolve) => {
      this.map.on('complete', () => resolve())
    })
  }

  destroy(): void {
    if (this.map) {
      this.buildingsLayer = null
      this.clusterer = null
      this.map.destroy()
      this.map = null
      this.AMap = null
      this.markers.clear()
    }
  }

  // ── View control ────────────────────────────────────────────────────────────

  setCenter(lngLat: LatLng): void {
    this.map?.setCenter([lngLat.lng, lngLat.lat])
  }

  setZoom(zoom: number): void {
    this.map?.setZoom(zoom)
  }

  panTo(lngLat: LatLng): void {
    this.map?.panTo([lngLat.lng, lngLat.lat])
  }

  getBounds(): BoundsRect | null {
    if (!this.map) return null
    const b = this.map.getBounds()
    if (!b) return null
    const sw = b.getSouthWest()
    const ne = b.getNorthEast()
    return {
      southWest: { lng: sw.getLng(), lat: sw.getLat() },
      northEast: { lng: ne.getLng(), lat: ne.getLat() },
    }
  }

  getZoom(): number {
    return this.map?.getZoom() ?? 0
  }

  // ── Style ───────────────────────────────────────────────────────────────────

  setStyle(style: string): void {
    const url = STYLE_MAP[style] ?? style
    this.map?.setMapStyle(url)
  }

  setFeatures(features: string[]): void {
    this.map?.setFeatures(features)
  }

  // ── Marker management ────────────────────────────────────────────────────────

  addMarker(id: string, lngLat: LatLng, element: HTMLElement): void {
    if (!this.map || !this.AMap) return
    if (this.markers.has(id)) this.removeMarker(id)

    const marker = new this.AMap.Marker({
      position: [lngLat.lng, lngLat.lat],
      content: element,
      anchor: 'bottom-center',
      offset: [0, 0],
    })
    this.map.add(marker)
    this.markers.set(id, marker)
  }

  removeMarker(id: string): void {
    const marker = this.markers.get(id)
    if (marker && this.map) {
      this.map.remove(marker)
      this.markers.delete(id)
    }
  }

  updateMarkerElement(id: string, element: HTMLElement): void {
    const marker = this.markers.get(id)
    if (marker) {
      marker.setContent(element)
    }
  }

  clearMarkers(): void {
    if (!this.map) return
    this.markers.forEach((m) => this.map.remove(m))
    this.markers.clear()
  }

  // ── Coordinate conversion ────────────────────────────────────────────────────

  lngLatToPixel(lngLat: LatLng): { x: number; y: number } | null {
    if (!this.map || !this.AMap) return null
    try {
      const lngLatObj = new this.AMap.LngLat(lngLat.lng, lngLat.lat)
      const pixel = this.map.lngLatToContainer(lngLatObj)
      if (!pixel) return null
      return { x: pixel.x, y: pixel.y }
    } catch {
      return null
    }
  }

  // ── Events ───────────────────────────────────────────────────────────────────

  on(event: MapEvent, handler: (...args: unknown[]) => void): void {
    this.map?.on(event, handler)
  }

  off(event: MapEvent, handler: (...args: unknown[]) => void): void {
    this.map?.off(event, handler)
  }

  // ── AMap-specific helpers (not part of MapAdapter interface) ─────────────────

  /**
   * Enable the 3D buildings layer (AMap.Buildings).
   * Visible at zoom ≥ 14. The layer is created once and toggled with show/hide.
   */
  enable3DBuildings(enable: boolean): void {
    if (!this.map || !this.AMap) return
    if (enable) {
      if (!this.buildingsLayer) {
        this.buildingsLayer = new this.AMap.Buildings({
          merge: false,  // keep individual building outlines
          sort: false,
        })
        this.map.add(this.buildingsLayer)
      } else {
        this.buildingsLayer.show()
      }
    } else {
      this.buildingsLayer?.hide()
    }
  }

  /**
   * Create a MarkerClusterer for the given raw LngLat + data points.
   * The cluster renderer uses the same amber colour as activity badges.
   * Replaces any existing clusterer.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setActivityCluster(points: Array<{ lng: number; lat: number; data: any }>): void {
    if (!this.map || !this.AMap) return
    // Destroy previous clusterer
    this.clusterer?.setMap(null)
    this.clusterer = null

    if (points.length === 0) return

    const markers = points.map((p) => {
      return new this.AMap.Marker({
        position: [p.lng, p.lat],
      })
    })

    this.clusterer = new this.AMap.MarkerClusterer(this.map, markers, {
      gridSize: 60,
      renderClusterMarker: (ctx: { count: number; marker: any }) => {
        const size = Math.min(40 + ctx.count * 5, 70)
        const div = document.createElement('div')
        div.style.cssText = `
          width: ${size}px; height: ${size}px; border-radius: 50%;
          background: #f59e0b; border: 3px solid #fff;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 13px; font-weight: 700;
          box-shadow: 0 3px 10px rgba(0,0,0,0.25);
          cursor: pointer;
        `
        div.textContent = String(ctx.count)
        ctx.marker.setContent(div)
        ctx.marker.setAnchor('center')
      },
    })
  }

  /** Remove the activity clusterer from the map */
  clearActivityCluster(): void {
    if (this.clusterer) {
      this.clusterer.setMap(null)
      this.clusterer = null
    }
  }

  /** Draw a walking route between two coordinates on the map */
  drawWalkingRoute(origin: LatLng, destination: LatLng): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.AMap || !this.map) { reject(new Error('Map not ready')); return }
      const walking = new this.AMap.Walking({ map: this.map })
      walking.search(
        [origin.lng, origin.lat],
        [destination.lng, destination.lat],
        (status: string) => {
          if (status === 'complete') resolve()
          else reject(new Error('Route search failed: ' + status))
        },
      )
    })
  }

  /** Clears all route overlays drawn on the map */
  clearRoutes(): void {
    if (!this.map) return
    // AMap.Walking/Driving renders directly into the map; clear via map overlays
    this.map.clearMap()
    // Re-add markers since clearMap removes them too
    // (callers are responsible for re-rendering markers after clearing routes)
  }

  /** Return the raw AMap instance for advanced operations (use sparingly) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getRawMap(): any {
    return this.map
  }
}
