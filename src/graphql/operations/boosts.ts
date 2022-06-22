import fetch from 'cross-fetch';
import graphqlFields from 'graphql-fields';

async function querySubgraph(
  query: string,
  chainId: number,
  apiKey: string
) {
  const apiUrls: string[] = [];
  apiUrls[4] = `https://api.studio.thegraph.com/query/12054/boost/0.1.1`;

  return await fetch(apiUrls[chainId], {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': apiKey
    },
    body: JSON.stringify({ query })
  }).then(res => res.json());
}

export default async function (_parent, { ref }, _context, info) {
  const requestedFields = info ? graphqlFields(info) : {};

  try {
    const query = `{
      boosts (where: { ref: "${ref}" }) {
        ${Object.keys(requestedFields).join('\n')}
      }
    }`;

    const response = await querySubgraph(query, 4, process.env.BOOST_SUBGRAPH_API_KEY as string);
    return response?.data?.boosts || [];
  } catch (e) {
    console.log('[graphql]', e);
    return Promise.reject('request failed');
  }
}
