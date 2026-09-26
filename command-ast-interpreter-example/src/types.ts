/**
 * THE SYSTEM ALGEBRA
 *
 * All data shapes for the application: the immutable State, the inbound
 * AppEvent union, and the Command AST that the pure engine emits to
 * describe intended browser side-effects. Nothing in this file touches
 * the DOM or performs any effect — it is pure data.
 */

export interface Vector2 {
  readonly x: number;
  readonly y: number;
}

/** Static element IDs the interpreter is allowed to target. Kept as a
 * closed union so a Command can never reference a nonexistent element. */
export type ElementId = "ball" | "score" | "toggle-btn" | "status";

export interface AppState {
  readonly position: Vector2;
  readonly velocity: Vector2;
  readonly ballRadius: number;
  readonly containerWidth: number;
  readonly containerHeight: number;
  readonly isPaused: boolean;
  readonly bounceCount: number;
  /** null until the first Tick establishes a reference frame for dt. */
  readonly lastTimestamp: number | null;
}

export const BALL_RADIUS = 20;

export const initialState: AppState = {
  position: { x: 120, y: 120 },
  velocity: { x: 220, y: 160 },
  ballRadius: BALL_RADIUS,
  containerWidth: 600,
  containerHeight: 400,
  isPaused: false,
  bounceCount: 0,
  lastTimestamp: null,
};

export type ArrowDirection = "Up" | "Down" | "Left" | "Right";

export type AppEvent =
  | { readonly type: "Tick"; readonly timestamp: number }
  | { readonly type: "ToggleClicked" }
  | { readonly type: "ResetClicked" }
  | { readonly type: "ArrowKeyPressed"; readonly direction: ArrowDirection }
  | { readonly type: "ContainerResized"; readonly width: number; readonly height: number };

/**
 * The Command AST. Each variant is a plain data description of one
 * intended browser side-effect — nothing here executes anything.
 */
export type Command =
  | { readonly type: "SetPosition"; readonly elementId: ElementId; readonly x: number; readonly y: number }
  | { readonly type: "SetText"; readonly elementId: ElementId; readonly text: string }
  | { readonly type: "SetClass"; readonly elementId: ElementId; readonly className: string; readonly active: boolean };

/** What the pure engine returns: the next state paired with the flat
 * list of commands describing effects the interpreter should perform. */
export type UpdateResult = readonly [AppState, readonly Command[]];
