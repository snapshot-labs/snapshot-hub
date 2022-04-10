import graphqlFields from 'graphql-fields';
import { fetchSpaces } from '../helpers';

export default async function(_parent, args, _context, info) {
  try {
    const requestedFields = info ? graphqlFields(info) : {};
    let spaces = await fetchSpaces(args);

    // fetch parent and child spaces if more than their id is requested
    if (
      (requestedFields.parent &&
        Object.keys(requestedFields.parent).some(key => key !== 'id')) ||
      (requestedFields.children &&
        Object.keys(requestedFields.children).some(key => key !== 'id'))
    ) {
      // throw error if anything other than id is requested on second level
      // (e.g. children.parent.name or parent.children.name)
      if (
        (requestedFields.parent?.children &&
          Object.keys(requestedFields.parent.children).some(key => key !== 'id')) ||
        (requestedFields.children?.parent &&
          Object.keys(requestedFields.children.parent).some(key => key !== 'id'))
      ) {
        return new Error(
          'Unsupported nested fields for related spaces. Only id is supported for children\'s parent or parent\'s children.'
        );
      }

      // collect all parent and child ids of all returned spaces
      const relatedSpaceIDs = spaces.reduce((ids, space) => {
        if (space.children) ids.push(...space.children.map(c => c.id));
        if (space.parent) ids.push(space.parent.id);
        return ids;
      }, []);

      // fetch all related spaces
      const relatedSpaces = await fetchSpaces({
        where: { id_in: relatedSpaceIDs }
      });

      // map related spaces to main list of spaces (where parent and child match)
      spaces = spaces.map(space => {
        if (space.children) {
          space.children = space.children
            .map(c => relatedSpaces.find(s => s.id === c.id))
            .filter(s => s);
        }
        if (space.parent) {
          space.parent = relatedSpaces.find(s => s.id === space.parent.id);
        }
        return space;
      });
    }

    return spaces;
  } catch (e) {
    console.log('[graphql]', e);
    return Promise.reject('request failed');
  }
}
