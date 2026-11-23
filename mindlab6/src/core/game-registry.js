// Registry for future independent game modules. No engine, asset, or save side effects.
// Preserve V5 IDs such as pz_river, dx_k_letters, sea7_0 and ml10_01.
const ID = /^[a-z][a-z0-9_-]{1,79}$/;
const RENDERERS = new Set(['dom', '2d', '3d']);
export class GameRegistry {
  #entries = new Map();

  register(descriptor) {
    if (!descriptor || !ID.test(descriptor.id ?? '')) {
      throw new TypeError('Game ID must be 2–80 lowercase alphanumeric, underscore or hyphen characters');
    }
    if (!RENDERERS.has(descriptor.renderer)) {
      throw new TypeError('Unsupported renderer: ' + descriptor.renderer);
    }
    if (typeof descriptor.load !== 'function') {
      throw new TypeError('A game must provide a lazy load() function');
    }
    if (this.#entries.has(descriptor.id)) {
      throw new Error('Duplicate game ID: ' + descriptor.id);
    }
    const entry = Object.freeze({
      id: descriptor.id,
      renderer: descriptor.renderer,
      load: descriptor.load,
    });
    this.#entries.set(entry.id, entry);
    return entry;
  }

  get(id) { return this.#entries.get(id); }
  has(id) { return this.#entries.has(id); }
  list() { return [...this.#entries.values()]; }
}
