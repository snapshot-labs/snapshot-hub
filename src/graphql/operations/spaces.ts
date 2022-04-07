import graphqlFields from 'graphql-fields';
import { fetchSpaces } from '../helpers';

export default async function(_parent, args, _context, info) {
  try {
    // maximum sum of parents and children to fetch
    // only used if parent or children fields other than id are requested
    const maxSubRequests = 100;
    const requestedFields = info ? graphqlFields(info) : {};

    const spaces = await fetchSpaces(args);

    if (
      (requestedFields.parent &&
        Object.keys(requestedFields.parent).some(key => key !== 'id')) ||
      (requestedFields.children &&
        Object.keys(requestedFields.children).some(key => key !== 'id'))
    ) {
      // count all parents and children in the returned spaces list, to make sure we don't exceed the max
      // otherwise throw explanatory error
      const subRequestsToMake = spaces.reduce((a, space) => {
        if (space.children) a += space.children.length;
        if (space.parent) a++;
        return a;
      }, 0);

      if (subRequestsToMake > maxSubRequests) {
        throw new Error(
          `Too many subrequests to make. (Max: ${maxSubRequests}) Query only 'id' for parent and children nodes or reduce result limit.`
        );
      }

      // fetch parents and children
      for (const space of spaces) {
        if (space.parent?.id) {
          const parentResult = await fetchSpaces({
            where: { id: space.parent.id }
          });
          if (parentResult.length === 1) {
            space.parent = parentResult[0];
          }
        }

        if (space.children?.length) {
          space.children = await fetchSpaces({
            where: { id_in: space.children.map(c => c.id) }
          });
        }
      }
    }

    return spaces;
  } catch (e) {
    console.log('[graphql]', e);
    return Promise.reject('request failed');
  }
}
