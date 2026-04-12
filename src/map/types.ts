/**
 * types.ts
 * MapAdapter interface and supporting types.
 * The map provider (AMap, Mapbox, etc.) is abstracted behind this interface,
 * keeping all business logic independent of any specific map SDK.
 */

export interface LatLng {
  lng: number
  lat: number
}

export interface BoundsRect {
  southWest: LatLng
  northEast: LatLng
}

export interface MapInitOptions {
  zoom?: number
  center?: LatLng
  /** e.g. 'amap://styles/whitesmoke' or 'dark' shorthand resolved by adapter */
  style?: string
}

/** Event names supported by all adapters */
export type MapEvent = 'moveend' | 'zoomend' | 'click'

/**
 * Pluggable map provider interface.
 * Implement this to swap AMap for any other tile provider without touching views or stores.
 */
export interface MapAdapter {
  // ── Lifecycle ──────────────────────────────────────────────────────────────
  /** Initialise the map, mount it into containerId, resolve when ready */
  init(containerId: string, options: MapInitOptions): Promise<void>
  /** Tear down the map instance and release all resources */
  destroy(): void

  // ── View control ───────────────────────────────────────────────────────────
  setCenter(lngLat: LatLng): void
  setZoom(zoom: number): void
  panTo(lngLat: LatLng): void
  getBounds(): BoundsRect | null
  getZoom(): number

  // ── Style ──────────────────────────────────────────────────────────────────
  /** Switch between named styles ('light' | 'dark') or full style URLs */
  setStyle(style: 'light' | 'dark' | string): void
  /** Toggle visible map feature layers, e.g. ['bg', 'road', 'building'] */
  setFeatures(features: string[]): void

  // ── Marker management ──────────────────────────────────────────────────────
  /** Add a custom HTML marker; id is used for later updates / removal */
  addMarker(id: string, lngLat: LatLng, element: HTMLElement): void
  removeMarker(id: string): void
  /** Replace the DOM element of an existing marker without re-adding */
  updateMarkerElement(id: string, element: HTMLElement): void
  /** Remove all markers at once */
  clearMarkers(): void

  // ── Coordinate conversion ──────────────────────────────────────────────────
  /**
   * Convert a geographic coordinate to pixel offset relative to the map container.
   * Returns null when the map is not ready or the point is off-screen.
   */
  lngLatToPixel(lngLat: LatLng): { x: number; y: number } | null

  // ── Events ─────────────────────────────────────────────────────────────────
  on(event: MapEvent, handler: (...args: unknown[]) => void): void
  off(event: MapEvent, handler: (...args: unknown[]) => void): void
}
