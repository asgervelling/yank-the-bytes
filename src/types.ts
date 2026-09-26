export type ElementId =
  | "crank"
  | "acceleration"
  | "velocity"
  | "text-sink"
  | "empty-hint"
  | "stream-output"
  | "pulled-rope";

export type File = {
  displayName: string;
  url: string;
};

export type StreamableFile = File & {
  totalBytes: number;
};

export type Stream = StreamableFile & {
  decoder: TextDecoder;
  bytesReceived: number;
  bytesConsumed: number; // by others
  bytes: Uint8Array;
};

export type AppState = {
  /** Files to choose from, by configuration */
  availableFiles: File[];

  /** Files that we can stream (we know their sizes) */
  streamableFiles: StreamableFile[];

  /** Current stream (undefined at start of program) */
  stream: Stream | undefined;

  /** URL of the file a button was last clicked for, so late/stale
   * responses from a since-abandoned file can be recognized and ignored. */
  selectedUrl: string | undefined;

  yankVelocity: number; // How hard you're pulling
  acceleration: number;
  velocity: number;
};

export type AppEvent =
  | { type: "ClockTick" }
  | { type: "FileSelected"; url: string }
  | { type: "ContentLengthReceived";
      url: string;
      totalBytes: number | null }
  | { type: "Scroll", deltaY: number }
  | { type: "BytesReceived", url: string, chunk: Uint8Array };

// Represents a (browser) side effect
export type Command =
  | { type: "SetText"; elementId: ElementId; text: string }
  | { type: "SetClass"; elementId: ElementId; className: string; active: boolean }
  | { type: "FetchContentLength"; url: string }
  | { type: "AppendText", elementId: ElementId, text: string }
  | { type: "StartStream", url: string }
  | { type: "DrawRope", elementId: ElementId; progress: number };

export type UpdateResult = [AppState, Command[]];
