'use client'

import { useControl } from 'react-map-gl/maplibre'
import { MapboxOverlay } from '@deck.gl/mapbox'
import type { MapboxOverlayProps } from '@deck.gl/mapbox'

// Renders deck.gl layers interleaved with MapLibre GL layers.
// Must be used as a child of a react-map-gl <Map>.
export function DeckGLOverlay(props: MapboxOverlayProps) {
  const overlay = useControl<MapboxOverlay>(
    () => new MapboxOverlay({ interleaved: true, ...props }),
    // No cleanup needed — MapboxOverlay cleans up with the map
  )
  overlay.setProps(props)
  return null
}
