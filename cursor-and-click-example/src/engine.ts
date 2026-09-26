/**
 * THE PURE CORE ENGINE
 *
 * `update` is the single entry point: (State, AppEvent) -> [State, Command[]].
 * It is deterministic and side-effect free — no DOM access, no timers.
 */

import type { AppEvent, AppState, ButtonLabel, Command, UpdateResult } from "./types.js";

export function update(state: AppState, event: AppEvent): UpdateResult {
  switch (event.type) {
    case "MouseMoved":
      return handleMouseMoved(state, event.x, event.y);
    case "SecondElapsed":
      return handleSecondElapsed(state);
    case "ButtonClicked":
      return handleButtonClicked(state, event.label);
  }
}

function handleMouseMoved(state: AppState, x: number, y: number): UpdateResult {
  // Track the cursor silently; printing only happens once a second.
  return [{ ...state, cursorX: x, cursorY: y }, []];
}

function handleSecondElapsed(state: AppState): UpdateResult {
  const commands: Command[] = [
    { type: "SetText", elementId: "cursor-output", text: `Cursor: (${state.cursorX}, ${state.cursorY})` },
  ];
  return [state, commands];
}

function handleButtonClicked(state: AppState, label: ButtonLabel): UpdateResult {
  const nextState: AppState = { ...state, lastClicked: label };

  const commands: Command[] = [
    { type: "SetText", elementId: "click-output", text: `Clicked: ${label}` },
    { type: "SetClass", elementId: "button-a", className: "active", active: label === "A" },
    { type: "SetClass", elementId: "button-b", className: "active", active: label === "B" },
  ];

  return [nextState, commands];
}
