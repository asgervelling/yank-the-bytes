import { createInitialState, update } from "./engine.js";
import type { AppEvent, Command, ElementId } from "./types.js";

function queryRequiredElement(id: ElementId): HTMLElement {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Required element #${id} is missing from the document`);
  }
  return element;
}

let activeStreamController: AbortController | undefined;

function executeCommand(
  elements: Readonly<Record<ElementId, HTMLElement>>,
  dispatch: (event: AppEvent) => void,
  command: Command
): void {
  switch (command.type) {
    case "SetText": {
      elements[command.elementId].textContent = command.text;
      break;
    }
    case "FetchContentLength": {
      fetch(command.url, { method: "HEAD" }).then((res) => {
        const header = res.headers.get("Content-Length");
        const totalBytes = header ? parseInt(header, 10) : null;
        dispatch({ type: "ContentLengthReceived", url: command.url, totalBytes });
      })
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
      element.textContent += command.text;
      element.scrollTop = element.scrollHeight; // keep to newest text in view
      break;
    }
    case "SetClass":
      elements[command.elementId].classList.toggle(command.className, command.active);
      break;
  }
}

export function bootstrap(): void {
  const elements: Readonly<Record<ElementId, HTMLElement>> = {
    "crank": queryRequiredElement("crank"),
    "acceleration": queryRequiredElement("acceleration"),
    "velocity": queryRequiredElement("velocity"),
    "text-sink": queryRequiredElement("text-sink"),
    "empty-hint": queryRequiredElement("empty-hint"),
    "stream-output": queryRequiredElement("stream-output"),
  };

  let state = createInitialState([
    { displayName: "War and Peace", url: "war-and-peace.txt" },
    { displayName: "War and Peace (short excerpt)", url: "short.txt" },
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
