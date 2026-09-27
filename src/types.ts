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
  totalBytes: number;
};

export type Stream = File & {
  decoder: TextDecoder;
  bytesReceived: number;
  bytesConsumed: number;
  bytes: Uint8Array;
};

export type AppState = {
  /** Files to choose from, by configuration */
  availableFiles: File[];

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
  | { type: "Scroll", deltaY: number }
  | { type: "BytesReceived", url: string, chunk: Uint8Array };

// Represents a (browser) side effect
export type Command =
  | { type: "SetText"; elementId: ElementId; text: string }
  | { type: "SetClass"; elementId: ElementId; className: string; active: boolean }
  | { type: "AppendText", elementId: ElementId, text: string }
  | { type: "StartStream", url: string }
  | { type: "DrawRope", elementId: ElementId; progress: number };

export type UpdateResult = [AppState, Command[]];
