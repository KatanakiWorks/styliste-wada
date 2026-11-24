// three's CommonJS build (loaded by React Three Fiber) calls process.emitWarning at import time,
// a Node.js function React Native doesn't provide. Import this module before anything that loads three.
const proc = (globalThis as { process?: { emitWarning?: unknown } }).process;
if (proc && typeof proc.emitWarning !== 'function') proc.emitWarning = () => {};

export {};
