/**
 * Minimal stand-in for the one Node function the tests use, in the same spirit
 * as the engine's own stub. Installing @types/node would cover it properly, but
 * that is a new dependency and the project ground rules say to ask first.
 */
declare module 'node:fs' {
  export function readFileSync(path: URL): Uint8Array
}
