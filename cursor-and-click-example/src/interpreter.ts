/**
 * THE RUNTIME EXECUTOR / INTERPRETER
 *
 * The only impure module. Owns the mutable state cell, wires real browser
 * events (mousemove, click, a 1s timer) into pure AppEvents, feeds them
 * through `update`, and executes the returned Command AST against static
 * DOM elements. No decision logic lives here.
 */

import { update } from "./engine.js";
import type { Command, ElementId } from "./types.js";
import { initialState } from "./types.js";

function queryRequiredElement(id: ElementId): HTMLElement {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Required element #${id} is missing from the document`);
  }
  return element;
}

function executeCommand(elements: Readonly<Record<ElementId, HTMLElement>>, command: Command): void {
  switch (command.type) {
    case "SetText": {
      elements[command.elementId].textContent = command.text;
      break;
    }
    case "SetClass": {
      elements[command.elementId].classList.toggle(command.className, command.active);
      break;
    }
  }
}

export function bootstrap(): void {
  const elements: Readonly<Record<ElementId, HTMLElement>> = {
    "cursor-output": queryRequiredElement("cursor-output"),
    "click-output": queryRequiredElement("click-output"),
    "button-a": queryRequiredElement("button-a"),
    "button-b": queryRequiredElement("button-b"),
  };

  let state = initialState;

  const dispatch = (event: Parameters<typeof update>[1]): void => {
    const [nextState, commands] = update(state, event);
    state = nextState;
    for (const command of commands) {
      executeCommand(elements, command);
    }
  };

  window.addEventListener("mousemove", (domEvent: MouseEvent) => {
    dispatch({ type: "MouseMoved", x: domEvent.clientX, y: domEvent.clientY });
  });

  elements["button-a"].addEventListener("click", () => dispatch({ type: "ButtonClicked", label: "A" }));
  elements["button-b"].addEventListener("click", () => dispatch({ type: "ButtonClicked", label: "B" }));

  setInterval(() => dispatch({ type: "SecondElapsed" }), 1000);
}
