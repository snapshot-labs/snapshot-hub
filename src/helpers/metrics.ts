import init, { client } from '@snapshot-labs/snapshot-metrics';
import { Express } from 'express';
import { spacesMetadata } from './spaces';
import { strategies } from './strategies';
import db from './mysql';

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
      rateLimitedRequestsCount.inc({ rate_limited: res.statusCode === 429 ? 1 : 0 });
    }
  });

  next();
}

export default function initMetrics(app: Express) {
  init(app, {
    normalizedPath: [
      ['^/api/scores/.+', '/api/scores/#id'],
      ['^/api/spaces/([^/]+)(/poke)?$', '/api/spaces/#key$2']
    ],
    whitelistedPath
  });

  app.use(instrumentRateLimitedRequests);
}

new client.Gauge({
  name: 'spaces_per_status_count',
  help: 'Number of spaces per status',
  labelNames: ['status'],
  async collect() {
    const verifiedCount = Object.values(spacesMetadata).filter((s: any) => s.verified).length;
    this.set({ status: 'verified' }, verifiedCount);
    this.set({ status: 'unverified' }, Object.keys(spacesMetadata).length - verifiedCount);
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
    this.set((await db.queryAsync('SELECT COUNT(id) as count FROM proposals'))[0].count);
  }
});

new client.Gauge({
  name: 'users_total_count',
  help: 'Total number of users',
  async collect() {
    this.set((await db.queryAsync('SELECT COUNT(id) as count FROM users'))[0].count);
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

export const requestDeduplicatorSize = new client.Gauge({
  name: 'request_deduplicator_size',
  help: 'Total number of items in the deduplicator queue'
});
