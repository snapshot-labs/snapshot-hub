// https://github.com/Uniswap/uniswap-interface/blob/master/src/utils/resolveENSContentHash.ts
import snapshot from '@snapshot-labs/snapshot.js';
import { Provider } from '@ethersproject/abstract-provider';
import { namehash } from '@ethersproject/hash';

const REGISTRAR_ABI = [
  {
    constant: true,
    inputs: [
      {
        name: 'node',
        type: 'bytes32'
      }
    ],
    name: 'resolver',
    outputs: [
      {
        name: 'resolverAddress',
        type: 'address'
      }
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  }
];
const REGISTRAR_ADDRESS = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
const RESOLVER_ABI = [
  {
    constant: true,
    inputs: [
      {
        internalType: 'bytes32',
        name: 'node',
        type: 'bytes32'
      }
    ],
    name: 'contenthash',
    outputs: [
      {
        internalType: 'bytes',
        name: '',
        type: 'bytes'
      }
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Fetches and decodes the result of an ENS contenthash lookup on mainnet to a URI
 * @param ensName to resolve
 * @param provider provider to use to fetch the data
 */
export default async function resolveENSContentHash(
  ensName: string,
  provider: Provider
): Promise<string> {
  const hash = namehash(ensName);
  const resolverAddress = await snapshot.utils.call(
    provider,
    REGISTRAR_ABI,
    [REGISTRAR_ADDRESS, 'resolver', [hash]]
  );
  return await snapshot.utils.call(
    provider,
    RESOLVER_ABI,
    [resolverAddress, 'contenthash', [hash]]
  );
}
