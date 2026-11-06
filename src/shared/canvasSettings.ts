export interface CanvasSettings {
  minimap: boolean;
  grid: boolean;
  snap: boolean;
  animateEdges: boolean;
}

export const defaultCanvasSettings: CanvasSettings = {
  minimap: true,
  grid: true,
  snap: false,
  animateEdges: true,
};

/** Ask a canvas to glide to nodes; `n` makes repeated requests distinct. */
export interface FocusRequest {
  ids: string[];
  n: number;
}
