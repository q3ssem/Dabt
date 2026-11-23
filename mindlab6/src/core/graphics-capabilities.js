// Feature detection, never browser user-agent sniffing. Only a capability hint:
// actual WebGPU adapters may still fail and require a fallback in the 3D driver.
export function getGraphicsCapabilities({
  document: doc = globalThis.document,
  navigator: nav = globalThis.navigator,
  secureContext = globalThis.isSecureContext,
} = {}) {
  let webgl2 = false;
  try {
    const canvas = doc?.createElement('canvas');
    const gl = canvas?.getContext?.('webgl2', { powerPreference: 'low-power' });
    webgl2 = Boolean(gl);
    gl?.getExtension?.('WEBGL_lose_context')?.loseContext?.();
  } catch { /* GPU blocked or context limit reached */ }

  return Object.freeze({
    webgpuAdvertised: Boolean(nav?.gpu && secureContext !== false),
    webgl2,
    pixelRatio: Math.max(1, Math.min(2, Number(globalThis.devicePixelRatio) || 1)),
  });
}

export function chooseRenderScale({
  ratio = 1,
  maxMobile = 1.5,
  maxDesktop = 2,
  isPhone = false,
} = {}) {
  const limit = isPhone ? maxMobile : maxDesktop;
  if (!Number.isFinite(ratio) || !Number.isFinite(limit) || limit <= 0) return 1;
  return Math.max(0.75, Math.min(limit, ratio));
}
