import { useReducer } from 'react'

export type BasemapStyle = 'streets' | 'satellite'
export type ClusterMode = 'clustered' | 'individual'
export type ClumpSizeMetric = 'diameter' | 'height'

export interface LayerState {
  basemap: BasemapStyle
  hillshade: boolean
  boundaries: {
    regions: boolean
    provinces: boolean
    municipalities: boolean
  }
  provincesOpacity: number
  data: {
    quadratPoints: boolean
    clusterMode: ClusterMode
    heatmap: boolean
    clumpSizeMetric: ClumpSizeMetric
  }
}

type LayerAction =
  | { type: 'SET_BASEMAP'; payload: BasemapStyle }
  | { type: 'TOGGLE_HILLSHADE' }
  | { type: 'TOGGLE_BOUNDARY'; payload: keyof LayerState['boundaries'] }
  | { type: 'SET_PROVINCES_OPACITY'; payload: number }
  | { type: 'TOGGLE_QUADRAT_POINTS' }
  | { type: 'SET_CLUSTER_MODE'; payload: ClusterMode }
  | { type: 'TOGGLE_HEATMAP' }
  | { type: 'SET_CLUMP_SIZE_METRIC'; payload: ClumpSizeMetric }

const initialState: LayerState = {
  basemap: 'streets',
  hillshade: false,
  boundaries: {
    regions: true,
    provinces: true,
    municipalities: false,
  },
  provincesOpacity: 0.25,
  data: {
    quadratPoints: true,
    clusterMode: 'clustered',
    heatmap: false,
    clumpSizeMetric: 'diameter',
  },
}

function reducer(state: LayerState, action: LayerAction): LayerState {
  switch (action.type) {
    case 'SET_BASEMAP':
      return { ...state, basemap: action.payload }
    case 'TOGGLE_HILLSHADE':
      return { ...state, hillshade: !state.hillshade }
    case 'TOGGLE_BOUNDARY':
      return { ...state, boundaries: { ...state.boundaries, [action.payload]: !state.boundaries[action.payload] } }
    case 'SET_PROVINCES_OPACITY':
      return { ...state, provincesOpacity: action.payload }
    case 'TOGGLE_QUADRAT_POINTS':
      return { ...state, data: { ...state.data, quadratPoints: !state.data.quadratPoints } }
    case 'SET_CLUSTER_MODE':
      return { ...state, data: { ...state.data, clusterMode: action.payload } }
    case 'TOGGLE_HEATMAP':
      return { ...state, data: { ...state.data, heatmap: !state.data.heatmap } }
    case 'SET_CLUMP_SIZE_METRIC':
      return { ...state, data: { ...state.data, clumpSizeMetric: action.payload } }
    default:
      return state
  }
}

export function useMapLayers() {
  const [state, dispatch] = useReducer(reducer, initialState)

  return {
    layers: state,
    setBasemap: (v: BasemapStyle) => dispatch({ type: 'SET_BASEMAP', payload: v }),
    toggleHillshade: () => dispatch({ type: 'TOGGLE_HILLSHADE' }),
    toggleBoundary: (k: keyof LayerState['boundaries']) => dispatch({ type: 'TOGGLE_BOUNDARY', payload: k }),
    setProvincesOpacity: (v: number) => dispatch({ type: 'SET_PROVINCES_OPACITY', payload: v }),
    toggleQuadratPoints: () => dispatch({ type: 'TOGGLE_QUADRAT_POINTS' }),
    setClusterMode: (v: ClusterMode) => dispatch({ type: 'SET_CLUSTER_MODE', payload: v }),
    toggleHeatmap: () => dispatch({ type: 'TOGGLE_HEATMAP' }),
    setClumpSizeMetric: (v: ClumpSizeMetric) => dispatch({ type: 'SET_CLUMP_SIZE_METRIC', payload: v }),
  }
}
