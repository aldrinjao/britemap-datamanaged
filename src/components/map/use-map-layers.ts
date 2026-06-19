import { useReducer } from 'react'

export type BasemapStyle = 'streets' | 'satellite'
export type ClumpSizeMetric = 'diameter' | 'height'

export interface LayerState {
  basemap: BasemapStyle
  hillshade: boolean
  roads: boolean
  boundaries: {
    regions: boolean
    provinces: boolean
    municipalities: boolean
  }
  provincesOpacity: number
  data: {
    quadratPoints: boolean
    heatmap: boolean
    clumpSizeMetric: ClumpSizeMetric
  }
  overlays: {
    bambooDist: boolean
    bamboDistOpacity: number
    droneId: string | null
    droneOpacity: number
  }
}

type LayerAction =
  | { type: 'SET_BASEMAP'; payload: BasemapStyle }
  | { type: 'TOGGLE_HILLSHADE' }
  | { type: 'TOGGLE_ROADS' }
  | { type: 'TOGGLE_BOUNDARY'; payload: keyof LayerState['boundaries'] }
  | { type: 'SET_PROVINCES_OPACITY'; payload: number }
  | { type: 'TOGGLE_QUADRAT_POINTS' }
  | { type: 'TOGGLE_HEATMAP' }
  | { type: 'SET_CLUMP_SIZE_METRIC'; payload: ClumpSizeMetric }
  | { type: 'TOGGLE_BAMBOO_DIST' }
  | { type: 'SET_BAMBOO_DIST_OPACITY'; payload: number }
  | { type: 'SET_DRONE_ID'; payload: string | null }
  | { type: 'SET_DRONE_OPACITY'; payload: number }

const initialState: LayerState = {
  basemap: 'streets',
  hillshade: false,
  roads: false,
  boundaries: {
    regions: true,
    provinces: true,
    municipalities: false,
  },
  provincesOpacity: 0.25,
  data: {
    quadratPoints: true,
    heatmap: false,
    clumpSizeMetric: 'diameter',
  },
  overlays: {
    bambooDist: false,
    bamboDistOpacity: 0.65,
    droneId: null,
    droneOpacity: 0.9,
  },
}

function reducer(state: LayerState, action: LayerAction): LayerState {
  switch (action.type) {
    case 'SET_BASEMAP':
      return { ...state, basemap: action.payload }
    case 'TOGGLE_HILLSHADE':
      return { ...state, hillshade: !state.hillshade }
    case 'TOGGLE_ROADS':
      return { ...state, roads: !state.roads }
    case 'TOGGLE_BOUNDARY':
      return { ...state, boundaries: { ...state.boundaries, [action.payload]: !state.boundaries[action.payload] } }
    case 'SET_PROVINCES_OPACITY':
      return { ...state, provincesOpacity: action.payload }
    case 'TOGGLE_QUADRAT_POINTS':
      return { ...state, data: { ...state.data, quadratPoints: !state.data.quadratPoints } }
    case 'TOGGLE_HEATMAP':
      return { ...state, data: { ...state.data, heatmap: !state.data.heatmap } }
    case 'SET_CLUMP_SIZE_METRIC':
      return { ...state, data: { ...state.data, clumpSizeMetric: action.payload } }
    case 'TOGGLE_BAMBOO_DIST':
      return { ...state, overlays: { ...state.overlays, bambooDist: !state.overlays.bambooDist } }
    case 'SET_BAMBOO_DIST_OPACITY':
      return { ...state, overlays: { ...state.overlays, bamboDistOpacity: action.payload } }
    case 'SET_DRONE_ID':
      return { ...state, overlays: { ...state.overlays, droneId: action.payload } }
    case 'SET_DRONE_OPACITY':
      return { ...state, overlays: { ...state.overlays, droneOpacity: action.payload } }
    default:
      return state
  }
}

export function useMapLayers() {
  const [state, dispatch] = useReducer(reducer, initialState)

  return {
    layers: state,
    setBasemap:          (v: BasemapStyle)      => dispatch({ type: 'SET_BASEMAP', payload: v }),
    toggleHillshade:     ()                      => dispatch({ type: 'TOGGLE_HILLSHADE' }),
    toggleRoads:         ()                      => dispatch({ type: 'TOGGLE_ROADS' }),
    toggleBoundary:      (k: keyof LayerState['boundaries']) => dispatch({ type: 'TOGGLE_BOUNDARY', payload: k }),
    setProvincesOpacity: (v: number)             => dispatch({ type: 'SET_PROVINCES_OPACITY', payload: v }),
    toggleQuadratPoints: ()                      => dispatch({ type: 'TOGGLE_QUADRAT_POINTS' }),
    toggleHeatmap:       ()                      => dispatch({ type: 'TOGGLE_HEATMAP' }),
    setClumpSizeMetric:  (v: ClumpSizeMetric)    => dispatch({ type: 'SET_CLUMP_SIZE_METRIC', payload: v }),
    toggleBambooDist:    ()                      => dispatch({ type: 'TOGGLE_BAMBOO_DIST' }),
    setBamboDistOpacity: (v: number)             => dispatch({ type: 'SET_BAMBOO_DIST_OPACITY', payload: v }),
    setDroneId:          (v: string | null)      => dispatch({ type: 'SET_DRONE_ID', payload: v }),
    setDroneOpacity:     (v: number)             => dispatch({ type: 'SET_DRONE_OPACITY', payload: v }),
  }
}
