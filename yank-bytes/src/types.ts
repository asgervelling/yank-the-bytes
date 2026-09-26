export type ElementId =
  | "crank"
  | "acceleration"
  | "velocity"
  | "text-sink"
  | "empty-hint"
  | "stream-output";

export type File = {
  readonly displayName: string;
  readonly url: string;
};

export type StreamableFile = File & {
  readonly totalBytes: number;
};

export type Stream = StreamableFile & {
  readonly decoder: TextDecoder;
  readonly bytesReceived: number;
  readonly bytesConsumed: number; // by others
  readonly bytes: Uint8Array;
};

export type AppState = {
  /** Files to choose from, by configuration */
  readonly availableFiles: File[];

  /** Files that we can stream (we know their sizes) */
  readonly streamableFiles: StreamableFile[];

  /** Current stream (undefined at start of program) */
  readonly stream: Stream | undefined;

  readonly yankVelocity: number; // How hard you're pulling
  readonly acceleration: number;
  readonly velocity: number;
};

export type AppEvent =
  | { readonly type: "ClockTick" }
  | { readonly type: "InitStreamableFiles" }
  | { readonly type: "ContentLengthReceived";
      readonly url: string;
      readonly totalBytes: number | null }
  | { readonly type: "Scroll", readonly deltaY: number }
  | { readonly type: "BytesReceived", readonly chunk: Uint8Array };

// Represents a (browser) side effect
export type Command =
  | { readonly type: "SetText"; readonly elementId: ElementId; readonly text: string }
  | { readonly type: "SetClass"; readonly elementId: ElementId; readonly className: string; readonly active: boolean }
  | { readonly type: "FetchContentLength"; readonly url: string }
  | { readonly type: "AppendText", readonly elementId: ElementId, readonly text: string }
  | { readonly type: "StartStream", readonly url: string };

export type UpdateResult = readonly [AppState, readonly Command[]];
