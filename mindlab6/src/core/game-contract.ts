/** Pure framework contract. Renderers own pixels; the host owns game lifetime.
 * Future score, save, audio, and progression services must be injected explicitly.
 */
export type RendererKind = 'dom' | '2d' | '3d';

/** A game can register DOM, timer and GPU cleanup without coupling to a renderer. */
export interface GameResourceScope {
  readonly closed: boolean;
  defer(cleanup: () => void | Promise<void>): () => void | Promise<void>;
  listen(target: EventTarget, type: string, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean): void;
  dispose(): Promise<void>;
}

/** Typed presence only until EXP-0001 proves existing save/progression schemas.
 * Renderers must not write legacy storage or redefine unlock rules.
 */
export interface GameServicePorts {
  readonly save?: unknown;
  readonly audio?: unknown;
  readonly progression?: unknown;
  readonly router?: unknown;
}

export interface GameMountContext {
  readonly element: HTMLElement;
  readonly signal: AbortSignal;
  readonly id: string;
  readonly renderer: RendererKind;
  readonly resources: GameResourceScope;
  readonly services: Readonly<GameServicePorts>;
}

export interface GameSession {
  dispose(): void | Promise<void>;
  pause?(): void | Promise<void>;
  resume?(): void | Promise<void>;
}

export interface GameDriver {
  mount(context: GameMountContext): GameSession | Promise<GameSession>;
}
