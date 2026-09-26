/**
 * THE SYSTEM ALGEBRA
 *
 * Plain data only: State, the inbound AppEvent union, and the Command AST
 * the pure engine emits to describe intended browser side-effects.
 */

export type ButtonLabel = "A" | "B";

export type ElementId = "cursor-output" | "click-output" | "button-a" | "button-b";

export interface AppState {
  readonly cursorX: number;
  readonly cursorY: number;
  readonly lastClicked: ButtonLabel | null;
}

export const initialState: AppState = {
  cursorX: 0,
  cursorY: 0,
  lastClicked: null,
};

export type AppEvent =
  | { readonly type: "MouseMoved"; readonly x: number; readonly y: number }
  | { readonly type: "SecondElapsed" }
  | { readonly type: "ButtonClicked"; readonly label: ButtonLabel };

// Represents a (browser) side effect
export type Command =
  | { readonly type: "SetText"; readonly elementId: ElementId; readonly text: string }
  | { readonly type: "SetClass"; readonly elementId: ElementId; readonly className: string; readonly active: boolean };

export type UpdateResult = readonly [AppState, readonly Command[]];
