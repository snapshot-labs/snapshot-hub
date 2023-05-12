import { checkLimits, formatSpace, handleRelatedSpaces, PublicError } from '../helpers';
import log from '../../helpers/log';
import db from '../../helpers/mysql';
import { rankedSpaces } from '../../helpers/spaces';

export default async function (_parent, args, _context, info) {
  checkLimits(args, 'ranking');
  try {
    const { first = 20, skip = 0, where = {} } = args;

    const metrics: { total: number; categories: any } = {
      total: 0,
      categories: {}
    };

    const { search = '', category = '', network = '' } = where;
    const searchStr = search.toLowerCase();
    let searchCategory = category.toLowerCase();
    if (searchCategory === 'all') searchCategory = '';

    let filteredSpaces = rankedSpaces.filter((space: any) => {
      const filteredBySearch =
        space.id.includes(searchStr) || space.name?.toLowerCase().includes(searchStr);
      const filteredByNetwork = network ? space.networks.includes(network) : true;
      if (filteredBySearch && filteredByNetwork) {
        // count categories, should not consider searchCategory for counting
        space.categories.forEach(category => {
          metrics.categories[category] = (metrics.categories[category] || 0) + 1;
        });
      }

      // filter by category if where.category is defined
      const filteredByCategory = searchCategory ? space.categories.includes(searchCategory) : true;
      return filteredBySearch && filteredByCategory && filteredByNetwork;
    });

    metrics.total = filteredSpaces.length;
    filteredSpaces = Array.from(filteredSpaces.slice(skip, skip + first), (space: any) => space.id);
    if (!filteredSpaces.length) return { spaces: [], metrics };

    const query = `
      SELECT s.* FROM spaces s WHERE s.deleted = 0
      AND s.id IN (?)
      GROUP BY s.id
      ORDER BY FIELD(s.id, ?) ASC
    `;
    let spaces = await db.queryAsync(query, [filteredSpaces, filteredSpaces]);
    spaces = spaces.map(space => Object.assign(space, formatSpace(space.id, space.settings)));

    const items = await handleRelatedSpaces(info, spaces);

    return { items, metrics };
  } catch (e) {
    console.log(e);
    log.error(`[graphql] spaces, ${JSON.stringify(e)}`);
    if (e instanceof PublicError) return e;
    return new Error('Unexpected error');
  }
}
