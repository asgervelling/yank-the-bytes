import type { AppEvent, AppState, Command, File, Stream, StreamableFile, UpdateResult } from "./types.js";
import { toProgress } from "./visualize.js";

const PULL_FACTOR_SMALL = 0.3;
const PULL_FACTOR_LARGE = 50;

export function createInitialState(availableFiles: File[]): AppState {
  return {
    availableFiles,
    streamableFiles: [],
    stream: undefined,
    selectedUrl: undefined,
    yankVelocity: 0,
    acceleration: 0,
    velocity: 0,
  };
}

export function update(s: AppState, event: AppEvent): UpdateResult {
  switch (event.type) {
    case "Scroll":
      return handleScroll(s, event.deltaY)
    case "ClockTick":
      return handleTick(s);
    case "FileSelected":
      return handleFileSelected(s, event.url);
    case "ContentLengthReceived":
      return handleContentLengthReceived(s, event.url, event.totalBytes);
    case "BytesReceived":
      return handleBytesReceived(s, event.url, event.chunk);
  }
}

function handleScroll(s: AppState, deltaY: number): UpdateResult {
  const commands: Command[] = [
    { type: "SetText", elementId: "crank", text: `Crank value: ${deltaY}` },
  ];
  return [{ ...s, yankVelocity: s.yankVelocity + deltaY }, commands];
}

function handleBytesReceived(s: AppState, url: string, chunk: Uint8Array): UpdateResult {
  if (s.stream === undefined || url !== s.selectedUrl) return [s, []]; // stale chunk from an abandoned stream
  const merged = new Uint8Array(s.stream.bytes.length + chunk.length);
  merged.set(s.stream.bytes, 0);
  merged.set(chunk, s.stream.bytes.length);
  return [{ ...s, stream: { ...s.stream, bytes: merged, bytesReceived: s.stream.bytesReceived + chunk.length } }, []];
}

function handleTick(s: AppState): UpdateResult {
  const yankVelocity = s.yankVelocity * 0.85;
  const velocity = s.velocity + (yankVelocity - s.velocity) * 0.1;
  const acceleration = velocity - s.velocity;

  let nextState: AppState = { ...s, yankVelocity, velocity, acceleration };
  const commands: Command[] = [
    { type: "SetText", elementId: "velocity", text: `Velocity: ${velocity.toFixed(2)}` },
    { type: "SetText", elementId: "acceleration", text: `Acceleration: ${acceleration.toFixed(4)}` },
  ];

  if (velocity > 0 && 
      s.stream !== undefined &&
      s.stream.bytes.length > 0) {
    const pullFactor = s.stream.totalBytes > 1000000
      ? PULL_FACTOR_LARGE
      : PULL_FACTOR_SMALL;
    const bytesToPull = Math.min(
      Math.floor(velocity * pullFactor), s.stream.bytes.length);

    if (bytesToPull > 0) {
      const text = s.stream.decoder.decode(
        s.stream.bytes.slice(0, bytesToPull),
        { stream: true });

      if (s.stream.bytesConsumed === 0) {
        commands.push({ type: "SetClass", elementId: "empty-hint", className: "hidden", active: true });
        commands.push({ type: "SetClass", elementId: "stream-output", className: "hidden", active: false });
      }

      const bytesConsumed = s.stream.bytesConsumed + bytesToPull;
      nextState = {
        ...nextState,
        stream: {
          ...s.stream,
          bytes: s.stream.bytes.slice(bytesToPull),
          bytesConsumed,
        },
      };
      commands.push({ type: "AppendText", elementId: "stream-output", text });

      // Draw rope being pulled
      const progress = toProgress(bytesConsumed, s.stream.totalBytes);
      commands.push({ type: "DrawRope", elementId: "pulled-rope", progress });
    }
  }

  return [nextState, commands];
}

function handleFileSelected(s: AppState, url: string): UpdateResult {
  const nextState: AppState = { ...createInitialState(s.availableFiles), selectedUrl: url };
  const file = s.availableFiles.find((f) => f.url === url);
  const hintText = file ? `${file.displayName} selected. Try scrolling` : "Selected file not found";

  const commands: Command[] = [
    { type: "SetText", elementId: "crank", text: "Crank value: 0" },
    { type: "SetText", elementId: "velocity", text: "Velocity: 0.00" },
    { type: "SetText", elementId: "acceleration", text: "Acceleration: 0.0000" },
    { type: "SetText", elementId: "stream-output", text: "" },
    { type: "SetText", elementId: "empty-hint", text: hintText },
    { type: "SetClass", elementId: "stream-output", className: "hidden", active: true },
    { type: "SetClass", elementId: "empty-hint", className: "hidden", active: false },
    { type: "FetchContentLength", url },
    { type: "DrawRope", elementId: "pulled-rope", progress: 0 },
  ];
  return [nextState, commands];
}

function handleContentLengthReceived(
  s: AppState,
  url: string,
  totalBytes: number | null
): UpdateResult {
  if (url !== s.selectedUrl) {
    return [s, []]; // a different file was picked before this response arrived
  }

  if (totalBytes === null) {
    console.warn(`Could not determine content length for ${url}`);
    return [s, []];
  }

  const file = s.availableFiles.find((f) => f.url === url);
  if (!file) {
    console.warn(`Received content length for unknown file ${url}`);
    return [s, []];
  }

  const streamableFile: StreamableFile = { ...file, totalBytes };
  const stream: Stream = {
    ...streamableFile,
    decoder: new TextDecoder("utf-8"),
    bytesReceived: 0,
    bytesConsumed: 0,
    bytes: new Uint8Array(0)
  };
  return [
    { ...s,
      streamableFiles: [...s.streamableFiles, streamableFile],
      stream },
    [{ type: "StartStream", url }]];
}