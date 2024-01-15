import init, { client } from '@snapshot-labs/snapshot-metrics';
import { capture } from '@snapshot-labs/snapshot-sentry';
import { Express, type Request, type Response } from 'express';
import { GraphQLError, parse } from 'graphql';
import { spacesMetadata } from './spaces';
import { strategies } from './strategies';
import db from './mysql';
import operations from '../graphql/operations/';

const whitelistedPath = [
  /^\/$/,
  /^\/api$/,
  /^\/api\/(msg|message)$/,
  /^\/api\/spaces\/.+$/,
  /^\/graphql/
];

const rateLimitedRequestsCount = new client.Counter({
  name: 'http_requests_by_rate_limit_count',
  help: 'Total number of requests, by rate limit status',
  labelNames: ['rate_limited']
});

function instrumentRateLimitedRequests(req, res, next) {
  res.on('finish', () => {
    if (whitelistedPath.some(path => path.test(req.path))) {
      rateLimitedRequestsCount.inc({
        rate_limited: res.statusCode === 429 ? 1 : 0
      });
    }
  });

  next();
}

export default function initMetrics(app: Express) {
  const GRAPHQL_TYPES = Object.keys(operations);

  init(app, {
    normalizedPath: [
      ['^/api/scores/.+', '/api/scores/#id'],
      ['^/api/spaces/([^/]+)(/poke)?$', '/api/spaces/#key$2'],
      ['^/graphql/?$', '/graphql']
    ],
    whitelistedPath,
    errorHandler: (e: any) => capture(e)
  });

  app.use(instrumentRateLimitedRequests);

  app.use((req: Request, res: Response, next) => {
    if (req.originalUrl.startsWith('/graphql')) {
      const end = graphqlRequest.startTimer();

      res.on('finish', () => {
        try {
          const query = (req.body || req.query)?.query;
          const operationName = (req.body || req.query)?.operationName;

          if (query && operationName) {
            const definition = parse(query).definitions.find(
              // @ts-ignore
              def => def.name?.value === operationName
            );

            if (!definition) {
              return;
            }

            // @ts-ignore
            const types = definition.selectionSet.selections.map(
              sel => sel.name.value
            );

            for (const type of types) {
              if (GRAPHQL_TYPES.includes(type)) {
                end({ type });
              }
            }
          }
        } catch (e: any) {
          if (!(e instanceof GraphQLError)) {
            capture(e);
          }
        }
      });
    }

    next();
  });
}

new client.Gauge({
  name: 'spaces_per_status_count',
  help: 'Number of spaces per status',
  labelNames: ['status'],
  async collect() {
    ['verified', 'flagged', 'turbo', 'hibernated'].forEach(async status => {
      this.set(
        { status },
        (
          await db.queryAsync(
            `SELECT COUNT(id) as count FROM spaces WHERE ${status} = 1`
          )
        )[0].count
      );
    });
  }
});

new client.Gauge({
  name: 'spaces_per_network_count',
  help: 'Number of spaces per network',
  labelNames: ['network'],
  async collect() {
    const results = {};
    Object.values(spacesMetadata).forEach((space: any) => {
      space.networks.forEach(network => {
        results[network] ||= 0;
        results[network]++;
      });
    });

    for (const r in results) {
      this.set({ network: r }, results[r]);
    }
  }
});

new client.Gauge({
  name: 'spaces_per_category_count',
  help: 'Number of spaces per category',
  labelNames: ['category'],
  async collect() {
    const results = {};
    Object.values(spacesMetadata).forEach((space: any) => {
      space.categories.forEach(category => {
        results[category] ||= 0;
        results[category]++;
      });
    });

    for (const r in results) {
      this.set({ category: r }, results[r]);
    }
  }
});

new client.Gauge({
  name: 'proposals_per_status_count',
  help: 'Number of proposals per status',
  labelNames: ['status'],
  async collect() {
    let results = 0;
    Object.values(spacesMetadata).forEach((space: any) => {
      results += space.counts.activeProposals || 0;
    });

    this.set({ status: 'active' }, results);
  }
});

new client.Gauge({
  name: 'proposals_total_count',
  help: 'Total number of proposals',
  async collect() {
    this.set(
      (await db.queryAsync('SELECT COUNT(id) as count FROM proposals'))[0].count
    );
  }
});

new client.Gauge({
  name: 'users_total_count',
  help: 'Total number of users',
  async collect() {
    this.set(
      (await db.queryAsync('SELECT COUNT(id) as count FROM users'))[0].count
    );
  }
});

new client.Gauge({
  name: 'spaces_total_count',
  help: 'Total number of spaces',
  async collect() {
    this.set(
      (await db.queryAsync('SELECT COUNT(id) as count FROM spaces'))[0].count
    );
  }
});

new client.Gauge({
  name: 'strategies_per_space_count',
  help: 'Number of strategies per spaces',
  labelNames: ['name'],
  async collect() {
    strategies.forEach((s: any) => {
      this.set({ name: s.id }, s.spacesCount);
    });
  }
});

new client.Gauge({
  name: 'proposals_pending_scores_count',
  help: 'Total number of closed proposals with a pending scores',
  async collect() {
    this.set(
      (
        await db.queryAsync(
          "SELECT COUNT(id) FROM proposals WHERE scores_state = 'pending' AND end < UNIX_TIMESTAMP()"
        )
      )[0].count
    );
  }
});

export const requestDeduplicatorSize = new client.Gauge({
  name: 'request_deduplicator_size',
  help: 'Total number of items in the deduplicator queue'
});

export const graphqlRequest = new client.Histogram({
  name: 'graphql_requests_duration_seconds',
  help: 'Duration in seconds of graphql requests',
  labelNames: ['type'],
  buckets: [0.5, 1, 2, 5, 10, 15]
});
