/**
 * THE PURE CORE ENGINE
 *
 * `update` is the single entry point: (State, AppEvent) -> [State, Command[]].
 * It is completely deterministic and free of side effects — no DOM access,
 * no Date.now(), no randomness. Every timestamp and dimension it needs
 * arrives as part of the event.
 */

import type { AppEvent, AppState, ArrowDirection, Command, UpdateResult } from "./types.js";

const KEY_NUDGE = 60; // px/s added per arrow-key press
const MAX_SPEED = 600; // px/s, per axis
const MAX_DELTA_SECONDS = 0.1; // clamp dt so a tab coming back from sleep can't teleport the ball

export function update(state: AppState, event: AppEvent): UpdateResult {
  switch (event.type) {
    case "Tick":
      return handleTick(state, event.timestamp);
    case "ToggleClicked":
      return handleToggleClicked(state);
    case "ResetClicked":
      return handleResetClicked(state);
    case "ArrowKeyPressed":
      return handleArrowKeyPressed(state, event.direction);
    case "ContainerResized":
      return handleContainerResized(state, event.width, event.height);
  }
}

function handleTick(state: AppState, timestamp: number): UpdateResult {
  if (state.isPaused) {
    return [{ ...state, lastTimestamp: timestamp }, []];
  }

  const previousTimestamp = state.lastTimestamp ?? timestamp;
  const deltaSeconds = Math.min((timestamp - previousTimestamp) / 1000, MAX_DELTA_SECONDS);

  const minX = state.ballRadius;
  const maxX = state.containerWidth - state.ballRadius;
  const minY = state.ballRadius;
  const maxY = state.containerHeight - state.ballRadius;

  let nextX = state.position.x + state.velocity.x * deltaSeconds;
  let nextY = state.position.y + state.velocity.y * deltaSeconds;
  let nextVelocityX = state.velocity.x;
  let nextVelocityY = state.velocity.y;
  let bounced = false;

  if (nextX < minX) {
    nextX = minX;
    nextVelocityX = Math.abs(nextVelocityX);
    bounced = true;
  } else if (nextX > maxX) {
    nextX = maxX;
    nextVelocityX = -Math.abs(nextVelocityX);
    bounced = true;
  }

  if (nextY < minY) {
    nextY = minY;
    nextVelocityY = Math.abs(nextVelocityY);
    bounced = true;
  } else if (nextY > maxY) {
    nextY = maxY;
    nextVelocityY = -Math.abs(nextVelocityY);
    bounced = true;
  }

  const nextState: AppState = {
    ...state,
    position: { x: nextX, y: nextY },
    velocity: { x: nextVelocityX, y: nextVelocityY },
    bounceCount: bounced ? state.bounceCount + 1 : state.bounceCount,
    lastTimestamp: timestamp,
  };

  const commands: Command[] = [
    { type: "SetPosition", elementId: "ball", x: nextX, y: nextY },
    { type: "SetClass", elementId: "ball", className: "flash", active: bounced },
  ];

  if (bounced) {
    commands.push({ type: "SetText", elementId: "score", text: `Bounces: ${nextState.bounceCount}` });
  }

  return [nextState, commands];
}

function handleToggleClicked(state: AppState): UpdateResult {
  const isPaused = !state.isPaused;
  const nextState: AppState = { ...state, isPaused };

  const commands: Command[] = [
    { type: "SetText", elementId: "toggle-btn", text: isPaused ? "Resume" : "Pause" },
    { type: "SetText", elementId: "status", text: isPaused ? "Paused" : "Running" },
    { type: "SetClass", elementId: "status", className: "paused", active: isPaused },
  ];

  return [nextState, commands];
}

function handleResetClicked(state: AppState): UpdateResult {
  const nextState: AppState = {
    ...state,
    position: { x: state.containerWidth / 2, y: state.containerHeight / 2 },
    velocity: { x: 220, y: 160 },
    isPaused: false,
    bounceCount: 0,
    lastTimestamp: null,
  };

  const commands: Command[] = [
    { type: "SetPosition", elementId: "ball", x: nextState.position.x, y: nextState.position.y },
    { type: "SetText", elementId: "score", text: "Bounces: 0" },
    { type: "SetText", elementId: "toggle-btn", text: "Pause" },
    { type: "SetText", elementId: "status", text: "Running" },
    { type: "SetClass", elementId: "status", className: "paused", active: false },
    { type: "SetClass", elementId: "ball", className: "flash", active: false },
  ];

  return [nextState, commands];
}

function handleArrowKeyPressed(state: AppState, direction: ArrowDirection): UpdateResult {
  const clamp = (value: number): number => Math.max(-MAX_SPEED, Math.min(MAX_SPEED, value));

  let { x, y } = state.velocity;
  switch (direction) {
    case "Up":
      y = clamp(y - KEY_NUDGE);
      break;
    case "Down":
      y = clamp(y + KEY_NUDGE);
      break;
    case "Left":
      x = clamp(x - KEY_NUDGE);
      break;
    case "Right":
      x = clamp(x + KEY_NUDGE);
      break;
  }

  const nextState: AppState = { ...state, velocity: { x, y } };
  return [nextState, []];
}

function handleContainerResized(state: AppState, width: number, height: number): UpdateResult {
  const clampedX = Math.min(Math.max(state.position.x, state.ballRadius), width - state.ballRadius);
  const clampedY = Math.min(Math.max(state.position.y, state.ballRadius), height - state.ballRadius);

  const nextState: AppState = {
    ...state,
    containerWidth: width,
    containerHeight: height,
    position: { x: clampedX, y: clampedY },
  };

  const commands: Command[] = [{ type: "SetPosition", elementId: "ball", x: clampedX, y: clampedY }];
  return [nextState, commands];
}
