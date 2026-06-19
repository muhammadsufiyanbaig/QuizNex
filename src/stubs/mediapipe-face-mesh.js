// Stub for @mediapipe/face_mesh — only needed to satisfy build-time static
// import in face-landmarks-detection ESM bundle. Never called at runtime
// because quiz-session uses runtime: "tfjs".
export class FaceMesh {
  constructor() {}
  close() {}
  send() { return Promise.resolve(); }
  onResults() {}
  initialize() { return Promise.resolve(); }
  setOptions() {}
}
export const FACEMESH_TESSELATION = [];
export const FACEMESH_RIGHT_EYE = [];
export const FACEMESH_RIGHT_IRIS = [];
export const FACEMESH_LEFT_EYE = [];
export const FACEMESH_LEFT_IRIS = [];
export const FACEMESH_FACE_OVAL = [];
export const FACEMESH_LIPS = [];
export const VERSION = "0.4";
export function drawConnectors() {}
export function drawLandmarks() {}
