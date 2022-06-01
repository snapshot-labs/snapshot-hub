import graphqlFields from 'graphql-fields';
import { querySubgraph } from '@snapshot-labs/boost';

export default async function (_parent, { ref }, _context, info) {
  const requestedFields = info ? graphqlFields(info) : {};

  try {
    const query = `
      query {
        boosts (where: { ref: "${ref}" }) {
          ${Object.keys(requestedFields).join('\n')}
        }
      }
    `;
    const response = await querySubgraph(query, 4, process.env.BOOST_SUBGRAPH_API_KEY as string);
    return response?.data?.boosts || [];
  } catch (e) {
    console.log('[graphql]', e);
    return Promise.reject('request failed');
  }
}
