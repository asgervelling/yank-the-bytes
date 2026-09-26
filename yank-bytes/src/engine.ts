import type { AppEvent, AppState, Command, File, Stream, StreamableFile, UpdateResult } from "./types.js";

const PULL_FACTOR = 0.3;

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
    case "BytesReceived":
      return handleBytesReceived(s, event.chunk);
  }
}

function handleScroll(s: AppState, deltaY: number): UpdateResult {
  const commands: Command[] = [
    { type: "SetText", elementId: "crank", text: `Crank value: ${deltaY}` },
  ];
  return [{ ...s, yankVelocity: s.yankVelocity + deltaY }, commands];
}

function handleBytesReceived(s: AppState, chunk: Uint8Array): UpdateResult {
  if (s.stream === undefined) return [s, []];
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
    const bytesToPull = Math.min(
      Math.floor(velocity * PULL_FACTOR), s.stream.bytes.length);

    if (bytesToPull > 0) {
      const text = s.stream.decoder.decode(
        s.stream.bytes.slice(0, bytesToPull),
        { stream: true });

      if (s.stream.bytesConsumed === 0) {
        commands.push({ type: "SetClass", elementId: "empty-hint", className: "hidden", active: true });
        commands.push({ type: "SetClass", elementId: "stream-output", className: "hidden", active: false });
      }

      nextState = {
        ...nextState,
        stream: {
          ...s.stream,
          bytes: s.stream.bytes.slice(bytesToPull),
          bytesConsumed: s.stream.bytesConsumed + bytesToPull,
        },
      };
      commands.push({ type: "AppendText", elementId: "stream-output", text });
    }
  }

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