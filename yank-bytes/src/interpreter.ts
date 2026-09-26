import { update } from "./engine.js";
import type { AppEvent, AppState, Command, ElementId } from "./types.js";

function queryRequiredElement(id: ElementId): HTMLElement {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Required element #${id} is missing from the document`);
  }
  return element;
}

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
      (async () => {
        const res = await fetch(command.url);
        const reader = res.body!.getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          console.log(value);
          dispatch({ type: "BytesReceived", chunk: value })
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

  const initialState: AppState = {
    availableFiles: [
      { displayName: "War and Peace", url: "war-and-peace.txt" },
      { displayName: "War and Peace (short excerpt)", url: "short.txt" },
    ],
    streamableFiles: [],
    stream: undefined,
    yankVelocity: 0,
    acceleration: 0,
    velocity: 0,
  };
  let state = initialState;

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

  dispatch({ type: "InitStreamableFiles" });

  const startClock = () => {
    // Call yourself recursively once per frame
    dispatch({ type: "ClockTick" });
    requestAnimationFrame(startClock);
  }

  requestAnimationFrame(startClock);
}
