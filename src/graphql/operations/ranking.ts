import {
  checkLimits,
  formatSpace,
  handleRelatedSpaces,
  PublicError
} from '../helpers';
import log from '../../helpers/log';
import db from '../../helpers/mysql';
import { rankedSpaces } from '../../helpers/spaces';
import { capture } from '@snapshot-labs/snapshot-sentry';

export default async function (_parent, args, context, info) {
  checkLimits(args, 'ranking');
  try {
    const { first, skip, where = {} } = args;

    const metrics: { total: number; categories: any } = {
      total: 0,
      categories: {}
    };

    const {
      search = '',
      category = '',
      network = '',
      strategy = '',
      plugin = ''
    } = where;
    const searchStr = search?.toLowerCase() || '';
    let searchCategory = category?.toLowerCase() || '';
    if (searchCategory === 'all') searchCategory = '';

    let filteredSpaces = rankedSpaces.filter(space => {
      const filteredBySearch =
        space.id.includes(searchStr) ||
        space.name?.toLowerCase().includes(searchStr);
      const filteredByNetwork = network
        ? space.networks.includes(network)
        : true;
      const filteredByStrategy = strategy
        ? space.strategyNames.includes(strategy)
        : true;
      const filteredByPlugin = plugin
        ? space.pluginNames.includes(plugin)
        : true;
      if (
        filteredBySearch &&
        filteredByNetwork &&
        filteredByStrategy &&
        filteredByPlugin
      ) {
        // count categories, should not consider searchCategory for counting
        space.categories.forEach(category => {
          metrics.categories[category] =
            (metrics.categories[category] || 0) + 1;
        });
      }

      // filter by category if where.category is defined
      const filteredByCategory = searchCategory
        ? space.categories.includes(searchCategory)
        : true;
      return (
        filteredBySearch &&
        filteredByCategory &&
        filteredByNetwork &&
        filteredByStrategy &&
        filteredByPlugin
      );
    });

    metrics.total = filteredSpaces.length;
    filteredSpaces = Array.from(
      filteredSpaces.slice(skip, skip + first),
      (space: any) => space.id
    );
    if (!filteredSpaces.length) return { items: [], metrics };

    const query = `
      SELECT s.* FROM spaces s WHERE s.deleted = 0
      AND s.id IN (?)
      GROUP BY s.id
      ORDER BY FIELD(s.id, ?) ASC
    `;
    let spaces = await db.queryAsync(query, [filteredSpaces, filteredSpaces]);
    spaces = spaces.map(space => Object.assign(space, formatSpace(space)));

    const items = await handleRelatedSpaces(info, spaces);

    return { items, metrics };
  } catch (e: any) {
    log.error(`[graphql] spaces, ${JSON.stringify(e)}`);
    if (e instanceof PublicError) return e;
    capture(e, { args, context, info });
    return new Error('Unexpected error');
  }
}
