import skins from './skins';

export default async function (parent, args) {
  const results = await skins(parent, {
    first: 1,
    skip: 0,
    where: { id: args.id }
  });

  return results[0] || null;
}
