// Bun's perf_hooks.monitorEventLoopDelay is a function but throws
// ERR_NOT_IMPLEMENTED on call. prom-client checks for the property's
// truthiness, so deleting it makes prom-client fall back to its
// setImmediate-based eventLoopLag measurement.
if ((globalThis as any).Bun) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  delete require('perf_hooks').monitorEventLoopDelay;
}
