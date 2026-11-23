// Engine-neutral game lifetime. Drivers are loaded only when a game is opened.
// Driver contract: { mount({ element, signal, id, renderer }): Promise<session> | session }
// Session contract: { dispose(): Promise<void>|void, pause?(), resume?() }.
// No save schema or rendering engine is assumed here.
async function disposeSession(session) {
  if (!session) return;
  if (typeof session === 'function') return session();
  if (typeof session.dispose === 'function') return session.dispose();
  throw new TypeError('A mounted game must return a disposable session');
}

export class GameHost {
  #registry;
  #element;
  #document;
  #onError;
  #epoch = 0;
  #abort = null;
  #current = null;
  #destroyed = false;
  #onVisibility;

  constructor({ registry, element, onError = () => {} }) {
    if (!registry || typeof registry.get !== 'function') throw new TypeError('Registry required');
    if (!element || !element.ownerDocument || typeof element.replaceChildren !== 'function') {
      throw new TypeError('Host element must be attached to a DOM Document');
    }
    this.#registry = registry;
    this.#element = element;
    this.#document = element.ownerDocument;
    this.#onError = onError;
    this.#onVisibility = () => {
      const action = this.#document.hidden ? this.pause() : this.resume();
      Promise.resolve(action).catch(this.#onError);
    };
    this.#document.addEventListener?.('visibilitychange', this.#onVisibility);
  }

  get activeId() { return this.#current?.id ?? null; }
  get destroyed() { return this.#destroyed; }

  async open(id) {
    if (this.#destroyed) throw new Error('GameHost has been destroyed');
    const entry = this.#registry.get(id);
    if (!entry) throw new RangeError('Unknown game: ' + id);

    // Invalidate all earlier mounts and close their GPU/canvas resources.
    const epoch = ++this.#epoch;
    this.#abort?.abort();
    const previous = this.#current;
    this.#current = null;
    if (previous) {
      try { await disposeSession(previous.session); }
      catch (error) { this.#onError(error); }
      if (epoch !== this.#epoch) return false;
    }

    const controller = new AbortController();
    this.#abort = controller;
    const slot = this.#document.createElement('section');
    slot.setAttribute('data-game-id', id);
    slot.setAttribute('data-renderer', entry.renderer);
    this.#element.replaceChildren(slot);

    try {
      const driver = await entry.load();
      if (controller.signal.aborted || epoch !== this.#epoch) return false;
      if (!driver || typeof driver.mount !== 'function') {
        throw new TypeError('Game driver requires mount(context)');
      }
      const session = await driver.mount(Object.freeze({
        element: slot,
        signal: controller.signal,
        id,
        renderer: entry.renderer,
      }));
      if (controller.signal.aborted || epoch !== this.#epoch) {
        try { await disposeSession(session); }
        catch (error) { this.#onError(error); }
        return false;
      }
      if (!session || (typeof session !== 'function' && typeof session.dispose !== 'function')) {
        throw new TypeError('Game driver must return a disposable session');
      }
      this.#current = { id, session, paused: false };
      if (this.#document.hidden) await this.pause();
      return true;
    } catch (error) {
      if (controller.signal.aborted || epoch !== this.#epoch) return false;
      const message = this.#document.createElement('p');
      message.textContent = 'تعذر تشغيل اللعبة. يمكن إعادة المحاولة.';
      slot.replaceChildren(message);
      this.#onError(error);
      return false;
    }
  }

  async pause() {
    const current = this.#current;
    if (!current || current.paused) return;
    current.paused = true;
    await current.session.pause?.();
  }
  async resume() {
    const current = this.#current;
    if (!current || !current.paused) return;
    current.paused = false;
    await current.session.resume?.();
  }

  async close() {
    ++this.#epoch;
    this.#abort?.abort();
    this.#abort = null;
    const previous = this.#current;
    this.#current = null;
    this.#element.replaceChildren();
    if (previous) {
      try { await disposeSession(previous.session); }
      catch (error) { this.#onError(error); }
    }
  }

  async destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#document.removeEventListener?.('visibilitychange', this.#onVisibility);
    await this.close();
  }
}
