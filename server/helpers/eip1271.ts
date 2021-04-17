// https://github.com/WalletConnect/walletconnect-example-dapp/blob/961727c2fe4e33587bd1543393afa51033f95a4e/src/helpers/eip1271.ts
import { Contract, providers, utils } from 'ethers';

export const spec = {
  magicValue: '0x1626ba7e',
  abi: [
    {
      constant: true,
      inputs: [
        {
          name: '_hash',
          type: 'bytes32'
        },
        {
          name: '_sig',
          type: 'bytes'
        }
      ],
      name: 'isValidSignature',
      outputs: [
        {
          name: 'magicValue',
          type: 'bytes4'
        }
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    }
  ]
};

// support for older eip1271 implementations
const spec_oldVersion = {
  magicValue: '0x20c13b0b',
  abi: [
    {
      constant: true,
      inputs: [
        {
          name: '_hash',
          type: 'bytes'
        },
        {
          name: '_sig',
          type: 'bytes'
        }
      ],
      name: 'isValidSignature',
      outputs: [
        {
          name: 'magicValue',
          type: 'bytes4'
        }
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    }
  ]
};

export async function isValidSignature(
  address: string,
  sig: string,
  data: string,
  provider: providers.Provider,
  abi = spec.abi,
  magicValue = spec.magicValue
): Promise<boolean> {
  let returnValue;
  try {
    returnValue = await new Contract(address, abi, provider).isValidSignature(
      utils.arrayify(data),
      sig
    );
  } catch (e) {
    // if failed is latest then it might be older implementation
    if (magicValue === spec.magicValue) {
      return isValidSignature(
        address,
        sig,
        data,
        provider,
        spec_oldVersion.abi, // old spec version abi
        spec_oldVersion.magicValue // old spec version magicValue
      );
    }

    return false;
  }
  return returnValue.toLowerCase() === magicValue.toLowerCase();
}
