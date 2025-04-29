import users from './users';
import { formatAddresses, PublicError } from '../helpers';

export default async function (parent, args) {
  const addresses = formatAddresses([args.id]);
  if (!addresses.length) throw new PublicError('Invalid address');
  const usersObject = await users(parent, {
    first: 1,
    skip: 0,
    where: { id: addresses[0] }
  });

  return usersObject[0] || null;
}
