import * as Sentry from '@sentry/node';
import type { Express } from 'express';
import { sendError } from './utils';

export function initLogger(app: Express) {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
      ...Sentry.autoDiscoverNodePerformanceMonitoringIntegrations()
    ],

    tracesSampleRate: parseFloat(process.env.SENTRY_TRACE_SAMPLE_RATE as string)
  });

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

export function fallbackLogger(app: Express) {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  app.use(Sentry.Handlers.errorHandler());

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, req: any, res: any, _: any) => {
    return sendError(res, 'Not found', 404);
  });
}

export function capture(e: any, captureContext?: any) {
  if (process.env.NODE_ENV !== 'production') {
    return console.error(e);
  }

  Sentry.captureException(e, captureContext);
}
