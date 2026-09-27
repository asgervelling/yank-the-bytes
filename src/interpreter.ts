import { createInitialState, update } from "./engine.js";
import type { AppEvent, Command, ElementId } from "./types.js";
import { drawPulledRope } from "./visualize.js";

function queryRequiredElement(id: ElementId): HTMLElement {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Required element #${id} is missing from the document`);
  }
  return element;
}

let activeStreamController: AbortController | undefined;

// How much streamed text we keep sitting in the DOM at once. Anything older
// than this has already scrolled out of view, so there's no reason to keep
// rewriting it every frame
const MAX_STREAMED_CHARS = 20_000;
const streamedCharCounts = new WeakMap<HTMLElement, number>();

// Appends text as its own small node (cheap: O(new text), unlike
// `textContent +=`, which has to rebuild the *entire* existing content every
// call), then trims the oldest text once we're holding more than we need.
function appendBoundedText(element: HTMLElement, text: string): void {
  element.appendChild(document.createTextNode(text));

  let total = (streamedCharCounts.get(element) ?? 0) + text.length;
  while (total > MAX_STREAMED_CHARS && element.firstChild) {
    total -= (element.firstChild.textContent ?? "").length;
    element.removeChild(element.firstChild);
  }
  streamedCharCounts.set(element, total);
}

function executeCommand(
  elements: Readonly<Record<ElementId, HTMLElement>>,
  dispatch: (event: AppEvent) => void,
  command: Command
): void {
  switch (command.type) {
    case "SetText": {
      const element = elements[command.elementId];
      element.textContent = command.text;
      streamedCharCounts.set(element, command.text.length); // keep in sync with what's actually in the DOM
      break;
    }
    case "StartStream": {
      activeStreamController?.abort(); // stop reading whatever file was previously selected
      const controller = new AbortController();
      activeStreamController = controller;

      (async () => {
        try {
          const res = await fetch(command.url, { signal: controller.signal });
          const reader = res.body!.getReader();
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            dispatch({ type: "BytesReceived", url: command.url, chunk: value });
          }
        } catch (error) {
          if (!(error instanceof DOMException && error.name === "AbortError")) {
            console.error(`Stream for ${command.url} failed:`, error);
          }
        }
      })();
      break;
    }
    case "AppendText": {
      const element = elements[command.elementId];
      appendBoundedText(element, command.text);
      element.scrollTop = element.scrollHeight; // keep to newest text in view
      break;
    }
    case "SetClass":
      elements[command.elementId].classList.toggle(command.className, command.active);
      break;
    case "DrawRope":
      elements[command.elementId].innerHTML = drawPulledRope(command.progress);
  }
}

export function initAndRun(): void {
  const elements: Readonly<Record<ElementId, HTMLElement>> = {
    "crank": queryRequiredElement("crank"),
    "acceleration": queryRequiredElement("acceleration"),
    "velocity": queryRequiredElement("velocity"),
    "text-sink": queryRequiredElement("text-sink"),
    "empty-hint": queryRequiredElement("empty-hint"),
    "stream-output": queryRequiredElement("stream-output"),
    "pulled-rope": queryRequiredElement("pulled-rope"),
  };

  let state = createInitialState([
    { displayName: "War and Peace", url: "war-and-peace.txt", totalBytes: 3_332_332 },
    { displayName: "War and Peace (short excerpt)", url: "short.txt", totalBytes: 1_113 },
  ]);

  const dispatch = (event: Parameters<typeof update>[1]): void => {
    const [nextState, commands] = update(state, event);
    state = nextState;
    for (const command of commands) {
      executeCommand(elements, dispatch, command);
    }
  };

  window.addEventListener("wheel", (e: WheelEvent) => {
    e.preventDefault();
    dispatch({ type: "Scroll", deltaY: e.deltaY})
  }, { passive: false });

  const warAndPeaceButton = document.getElementById("select-war-and-peace");
  const shortButton = document.getElementById("select-short");
  if (!warAndPeaceButton || !shortButton) {
    throw new Error("Missing file-select buttons");
  }

  warAndPeaceButton.addEventListener(
    "click",
    () => dispatch({ type: "FileSelected", url: "war-and-peace.txt" }));
  shortButton.addEventListener(
    "click",
    () => dispatch({ type: "FileSelected", url: "short.txt" }));

  const startClock = () => {
    // Call yourself recursively once per frame
    dispatch({ type: "ClockTick" });
    requestAnimationFrame(startClock);
  }

  requestAnimationFrame(startClock);
}
