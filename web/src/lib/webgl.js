let supported;

// Probe once per page load and release the probe context so repeated games
// don't pile up WebGL contexts.
export function hasWebGL() {
  if (supported !== undefined) return supported;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    supported = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    supported = false;
  }
  return supported;
}
