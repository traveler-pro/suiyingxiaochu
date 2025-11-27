export interface Point {
  x: number;
  y: number;
}

export interface DrawPath {
  points: Point[];
  size: number;
}

export enum EditorMode {
  DRAW = 'DRAW',
  PAN = 'PAN',
}

export interface ImageDimensions {
  width: number;
  height: number;
}
