/* Draw the hall and turn frames. The DOM owns target markers, focus, taps and puzzle rules. */
(function () {
  'use strict';

  window.mlScene.renderers['pz_stat.pixi'] = async function ({lib: PIXI, spec, host, asset, state}) {
    const [painting, atlas] = await Promise.all([
      PIXI.Assets.load(asset('painting')),
      PIXI.Assets.load(asset('guardians'))
    ]);
    const frame = spec.frame;
    const frames = Array.from({length: frame.frameCount}, (_, i) =>
      atlas.textures['guardian-' + String(i).padStart(2, '0')]);
    if (frames.some(texture => !texture) || !host.isConnected) throw new Error('statue scene unavailable');

    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const skin = document.documentElement;
    const buttons = [...host.querySelectorAll('.st10-s')];
    const app = new PIXI.Application();
    try {
      await app.init({
        width: Math.max(1, host.clientWidth), height: Math.max(1, host.clientHeight),
        resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true,
        preference: 'webgl', autoStart: false, autoGarbageCollect: false
      });
    } catch (error) {
      if (app.renderer) app.destroy(true, {children: true});
      throw error;
    }
    const canvas = app.canvas;
    canvas.className = 'scene-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    app.stage.eventMode = 'none';

    const background = new PIXI.Sprite(painting);
    app.stage.addChild(background);
    const sprites = buttons.map(button => {
      const marker = button.querySelector('.st10-g');
      const sprite = new PIXI.Sprite(frames[0]);
      sprite.anchor.set(.5, 1);
      app.stage.addChild(sprite);
      return {sprite, marker, from: 0, to: 0, started: 0, duration: 0};
    });
    const frameHeight = Math.max(...frames.map(texture => texture.height));
    const frameWidth = Math.max(...frames.map(texture => texture.width));
    const wrap = (value, mod) => ((value % mod) + mod) % mod;
    let raf = 0, dead = false, latest = state;
    const tint = () => { background.tint = skin.dataset.skin === 'dark' ? frame.darkTint : '#ffffff'; };
    const at = (record, now) => {
      const t = record.duration ? Math.min(1, (now - record.started) / record.duration) : 1;
      return record.from + (record.to - record.from) * t;
    };

    function draw(now) {
      raf = 0;
      let moving = false;
      for (const record of sprites) {
        const quarter = Math.round(at(record, now) * frame.framesPerQuarter);
        const heading = Math.floor(quarter / frame.framesPerQuarter);
        const step = wrap(quarter, frame.framesPerQuarter);
        const index = wrap(frame.atlasHeading[wrap(heading, 4)] - step, frames.length);
        record.sprite.texture = frames[index];
        moving ||= now < record.started + record.duration;
      }
      app.render();
      if (moving) schedule();
    }
    function schedule() {
      if (!raf && !dead) raf = requestAnimationFrame(draw);
    }
    function layout() {
      const width = host.clientWidth, height = host.clientHeight;
      if (!width || !height) return;
      if (app.screen.width !== width || app.screen.height !== height) app.renderer.resize(width, height);
      const scale = Math.max(width / painting.width, height / painting.height);
      background.scale.set(scale);
      background.position.set((width - background.width) / 2, (height - background.height) / 2);
      // DOM rectangles include fit's CSS zoom. Normalize back to the renderer's local coordinates.
      const bounds = host.getBoundingClientRect();
      for (const {sprite, marker} of sprites) {
        const box = marker.getBoundingClientRect();
        const x = width / bounds.width, y = height / bounds.height;
        sprite.position.set((box.left + box.width / 2 - bounds.left) * x, (box.bottom - bounds.top) * y);
        sprite.scale.set(Math.min(box.width * x / frameWidth, box.height * y / frameHeight));
      }
      schedule();
    }
    function update(next) {
      latest = next;
      const now = performance.now();
      sprites.forEach((record, i) => {
        const target = next.angles[i];
        if (record.to === target && !media.matches) return;
        const from = at(record, now);
        const quarters = Math.abs(target - record.to);
        record.from = from;
        record.to = target;
        record.started = now;
        record.duration = media.matches ? 0 : quarters > 1 ? spec.motion.halfMs : spec.motion.quarterMs;
      });
      schedule();
    }
    function motionChange() { if (media.matches) update(latest); }

    const observer = new ResizeObserver(layout);
    const theme = new MutationObserver(() => { tint(); schedule(); });
    function destroy() {
      if (dead) return;
      dead = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      theme.disconnect();
      media.removeEventListener('change', motionChange);
      canvas.removeEventListener('webglcontextlost', destroy);
      host.classList.remove('scene-on');
      delete host.dataset.scene;
      app.destroy(true, {children: true});
    }

    try {
      if (!host.isConnected) throw new Error('statue board closed');
      host.prepend(canvas);
      sprites.forEach((record, i) => { record.from = record.to = state.angles[i]; });
      tint();
      layout();
      cancelAnimationFrame(raf);
      draw(performance.now());
      host.classList.add('scene-on');
      host.dataset.scene = 'pixi';
      observer.observe(host);
      theme.observe(skin, {attributes: true, attributeFilter: ['data-skin']});
      media.addEventListener('change', motionChange);
      canvas.addEventListener('webglcontextlost', destroy);
      return {update, destroy};
    } catch (error) {
      destroy();
      throw error;
    }
  };
})();
