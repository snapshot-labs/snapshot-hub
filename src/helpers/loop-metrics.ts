import { client } from '@snapshot-labs/snapshot-metrics';

/**
 * Loop-specific metrics are separated into this file to avoid circular dependencies.
 *
 * The circular dependency chain was:
 * loop.ts → metrics.ts → spaces.ts/strategies.ts → loop.ts
 *
 * By isolating loop metrics here, loop.ts can import metrics without creating
 * a circular dependency, since this file doesn't import any business data.
 */

// Loop Performance & Health Metrics
export const loopIterationsTotal = new client.Counter({
  name: 'loop_iterations_total',
  help: 'Total number of loop iterations',
  labelNames: ['loop_name']
});

export const loopDurationSeconds = new client.Histogram({
  name: 'loop_duration_seconds',
  help: 'Duration in seconds of loop execution',
  labelNames: ['loop_name'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
});

export const loopErrorsTotal = new client.Counter({
  name: 'loop_errors_total',
  help: 'Total number of errors encountered in the loop',
  labelNames: ['loop_name', 'error_type']
});

export const loopActiveTasksCount = new client.Gauge({
  name: 'loop_active_tasks_count',
  help: 'Number of currently active tasks in the loop',
  labelNames: ['loop_name']
});
