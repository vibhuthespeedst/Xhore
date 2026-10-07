/**
 * Minimal stand-ins for the two host globals the tests use. The engine source
 * itself touches neither, which is what keeps it free of I/O.
 *
 * Installing @types/node would cover these properly, but that is a new
 * dependency and CLAUDE.md says to ask first, so these declarations hold the
 * line until then.
 */
declare const console: {
  log(...args: readonly unknown[]): void
}
