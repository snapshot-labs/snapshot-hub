import { Provider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { arrayify } from '@ethersproject/bytes';

export const spec = {
  magicValue: '0x1626ba7e',
  abi: [
    'function isValidSignature(bytes32 _hash, bytes _sig) view returns (bytes4 magicValue)'
  ]
};

// support for older eip1271 implementations
const specOldVersion = {
  magicValue: '0x20c13b0b',
  abi: [
    'function isValidSignature(bytes _hash, bytes _sig) view returns (bytes4 magicValue)'
  ]
};

export async function isValidSignature(
  address: string,
  sig: string,
  data: string,
  provider: Provider,
  abi = spec.abi,
  magicValue = spec.magicValue
): Promise<boolean> {
  let returnValue;

  try {
    returnValue = await new Contract(address, abi, provider).isValidSignature(
      arrayify(data),
      sig
    );
  } catch (e) {
    // If failed is latest then it might be older implementation
    if (magicValue === spec.magicValue) {
      return isValidSignature(
        address,
        sig,
        data,
        provider,
        specOldVersion.abi, // old spec version abi
        specOldVersion.magicValue // old spec version magicValue
      );
    }

    return false;
  }
  return returnValue.toLowerCase() === magicValue.toLowerCase();
}
