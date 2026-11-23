/** Pure framework contract. Renderers own pixels; the host owns game lifetime.
 * Future score, save, audio, and progression services must be injected explicitly.
 */
export type RendererKind = 'dom' | '2d' | '3d';

export interface GameMountContext {
  readonly element: HTMLElement;
  readonly signal: AbortSignal;
  readonly id: string;
  readonly renderer: RendererKind;
}

export interface GameSession {
  dispose(): void | Promise<void>;
  pause?(): void | Promise<void>;
  resume?(): void | Promise<void>;
}

export interface GameDriver {
  mount(context: GameMountContext): GameSession | Promise<GameSession>;
}
