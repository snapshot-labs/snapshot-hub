import init from '@snapshot-labs/snapshot-metrics';
import { Express } from 'express';

export default function initMetrics(app: Express) {
  init(app, {
    normalizedPath: [
      ['^/api/scores/.+', '/api/scores/#id'],
      ['^/api/spaces/([^/]+)(/poke)?$', '/api/spaces/#key$2']
    ],
    whitelistedPath: [
      /^\/$/,
      /^\/api$/,
      /^\/api\/(msg|message)$/,
      /^\/api\/spaces\/.+$/,
      /^\/graphql/
    ]
  });
}
