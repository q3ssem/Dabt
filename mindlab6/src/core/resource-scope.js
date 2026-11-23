// Scoped cleanup for driver-owned event handlers, timers, textures and GPU contexts.
// The runtime never assumes a specific renderer and never touches player storage.
export class ResourceScope {
  #cleanups = [];
  #closed = false;
  #pending = null;

  get closed() { return this.#closed; }

  defer(cleanup) {
    if (typeof cleanup !== 'function') throw new TypeError('Cleanup must be a function');
    if (this.#closed) throw new Error('ResourceScope has been disposed');
    this.#cleanups.push(cleanup);
    return cleanup;
  }

  listen(target, type, listener, options) {
    if (!target || typeof target.addEventListener !== 'function' ||
        typeof target.removeEventListener !== 'function') {
      throw new TypeError('Event target must support add/removeEventListener');
    }
    if (this.#closed) throw new Error('ResourceScope has been disposed');
    target.addEventListener(type, listener, options);
    this.defer(() => target.removeEventListener(type, listener, options));
  }

  dispose() {
    if (this.#pending) return this.#pending;
    this.#closed = true;
    const queue = this.#cleanups.splice(0).reverse();
    this.#pending = (async () => {
      const errors = [];
      for (const cleanup of queue) {
        try { await cleanup(); }
        catch (error) { errors.push(error); }
      }
      if (errors.length === 1) throw errors[0];
      if (errors.length > 1) throw new AggregateError(errors, 'Resource cleanup failures');
    })();
    return this.#pending;
  }
}
