# Render drivers (lazy loaded, behind GameHost)

This directory reserves **adapters**, not engine binaries. No third-party renderer is installed or shipped in the core yet.

## Provisional engine allocation
- HTML/CSS/DOM: controls, RTL reading, tables, the home page and many logic puzzles.
- PixiJS 8: optional 2D canvas renderer for texture-heavy hand-drawn games, **only for games that need it**.
- PlayCanvas 2.24: **first candidate** for proper 3D/glTF statue rotation. Must pass EXP-0002 (actual iPhone Safari + Android Chrome) before final adoption.
- Babylon.js 9: independently benchmarked alternative if PlayCanvas compatibility or interaction requirements fail.
- Phaser 4: optional future 2D game framework; never loaded globally and not a 3D engine.

## Contract
```js
registry.register({
  id: 'demo-statue',
  renderer: '3d',
  load: () => import('./playcanvas/statue-driver.js')
});
const host = new GameHost({ registry, element: gameContainer });
await host.open('demo-statue'); // only now load 3D engine chunk
await host.close(); // free the scene, canvas, texture/geometry and controls
```

Driver `mount({element, signal, id, renderer})` returns `{dispose(), pause?(), resume?()}`.
Renderers do **not** own save schema, player identity, scoring, audio policy, progression or global routing.
Host handles cancellation and tab visibility. Drivers must resize their own canvas, track GPU context/device loss, and release resources upon disposal. WebGPU availability is not proof of a working adapter.
