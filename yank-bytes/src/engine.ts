import type { AppEvent, AppState, Command, File, StreamableFile, UpdateResult } from "./types.js";

export function update(s: AppState, event: AppEvent): UpdateResult {
  switch (event.type) {
    case "Scroll":
      return handleScroll(s, event.deltaY)
    case "ClockTick":
      return handleTick(s);
    case "InitStreamableFiles":
      return handleInitStreamableFiles(s);
    case "ContentLengthReceived":
      return handleContentLengthReceived(s, event.url, event.totalBytes);
  }
}

function handleScroll(s: AppState, deltaY: number): UpdateResult {  
  const commands: Command[] = [
    { type: "SetText", elementId: "crank", text: `Crank value: ${deltaY}`}
  ];
  return [{ ...s, yankVelocity: s.yankVelocity + deltaY }, commands];
}

function handleTick(s: AppState): UpdateResult {
  const yankVelocity = s.yankVelocity * 0.85;
  const velocity = s.velocity + (yankVelocity - s.velocity) * 0.1;
  const acceleration = velocity - s.velocity;

  const nextState: AppState = { ...s, yankVelocity, velocity, acceleration };
  const commands: Command[] = [
    { type: "SetText", elementId: "velocity", text: `Kinetic Velocity: ${velocity.toFixed(2)}` },
    { type: "SetText", elementId: "acceleration", text: `Kinetic Acceleration: ${acceleration.toFixed(4)}` },
  ];
  return [nextState, commands];
}

/**
 * Make HEAD requests to the available files,
 * to get their content lengths.
 */
function handleInitStreamableFiles(s: AppState): UpdateResult {
  const commands: Command[] = s.availableFiles.map((file) => ({
    type: "FetchContentLength",
    url: file.url,
  }));
  return [s, commands];
}

function handleContentLengthReceived(
  s: AppState,
  url: string,
  totalBytes: number | null
): UpdateResult {
  if (totalBytes === null) {
    alert("Debug: Path A");
    return [s, []];
  }

  const file = s.availableFiles.find((f) => f.url === url);
  if (!file) {
    alert("Debug: Path B");
    return [s, []];
  }

  const streamableFile: StreamableFile = { ...file, totalBytes };
  return [
    { ...s, streamableFiles: [...s.streamableFiles, streamableFile] },
    []];
}