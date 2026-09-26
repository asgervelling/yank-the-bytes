/**
 * THE RUNTIME EXECUTOR / INTERPRETER
 *
 * The only module allowed to be impure. It owns the single mutable state
 * cell, runs the rAF frame loop, wires up real browser event listeners,
 * translates raw browser events into pure AppEvents, feeds them through
 * the pure `update` function, and executes the returned Command AST
 * against static DOM elements. No physics or decision logic lives here.
 */

import { update } from "./engine.js";
import type { ArrowDirection, Command, ElementId } from "./types.js";
import { initialState } from "./types.js";

const ARROW_KEY_DIRECTIONS: Readonly<Record<string, ArrowDirection>> = {
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
};

function queryRequiredElement(id: ElementId): HTMLElement {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Required element #${id} is missing from the document`);
  }
  return element;
}

function executeCommand(elements: Readonly<Record<ElementId, HTMLElement>>, ballRadius: number, command: Command): void {
  switch (command.type) {
    case "SetPosition": {
      const element = elements[command.elementId];
      element.style.transform = `translate(${command.x - ballRadius}px, ${command.y - ballRadius}px)`;
      break;
    }
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
    ball: queryRequiredElement("ball"),
    score: queryRequiredElement("score"),
    "toggle-btn": queryRequiredElement("toggle-btn"),
    status: queryRequiredElement("status"),
  };
  const container = document.getElementById("container");
  const resetButton = document.getElementById("reset-btn");
  if (container === null || resetButton === null) {
    throw new Error("Required #container or #reset-btn element is missing from the document");
  }

  let state = initialState;

  const dispatch = (event: Parameters<typeof update>[1]): void => {
    const [nextState, commands] = update(state, event);
    state = nextState;
    for (const command of commands) {
      executeCommand(elements, state.ballRadius, command);
    }
  };

  elements["toggle-btn"].addEventListener("click", () => dispatch({ type: "ToggleClicked" }));
  resetButton.addEventListener("click", () => dispatch({ type: "ResetClicked" }));

  window.addEventListener("keydown", (domEvent: KeyboardEvent) => {
    const direction = ARROW_KEY_DIRECTIONS[domEvent.key];
    if (direction !== undefined) {
      domEvent.preventDefault();
      dispatch({ type: "ArrowKeyPressed", direction });
    }
  });

  window.addEventListener("resize", () => {
    dispatch({ type: "ContainerResized", width: container.clientWidth, height: container.clientHeight });
  });

  dispatch({ type: "ContainerResized", width: container.clientWidth, height: container.clientHeight });

  const frame = (timestamp: number): void => {
    dispatch({ type: "Tick", timestamp });
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
