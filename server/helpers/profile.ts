import snapshot from '@snapshot-labs/snapshot.js';
import namehash from 'eth-ens-namehash';

function get3BoxProfiles(addresses) {
  return new Promise((resolove, reject) => {
    snapshot.utils
      .subgraphRequest('https://api.3box.io/graph', {
        profiles: {
          __args: {
            ids: addresses
          },
          name: true,
          eth_address: true,
          image: true
        }
      })
      .then(({ profiles }) => {
        const _3BoxProfiles = {};
        profiles.forEach(profile => {
          _3BoxProfiles[profile.eth_address.toLowerCase()] = profile;
        });
        resolove(_3BoxProfiles);
      })
      .catch(error => {
        reject(error);
      });
  });
}

function ensReverseRecordRequest(addresses) {
  const provider = snapshot.utils.getProvider('1');
  const abi = [
    {
      inputs: [
        { internalType: 'address[]', name: 'addresses', type: 'address[]' }
      ],
      name: 'getNames',
      outputs: [{ internalType: 'string[]', name: 'r', type: 'string[]' }],
      stateMutability: 'view',
      type: 'function'
    }
  ];
  return snapshot.utils.call(
    provider,
    abi,
    ['0x3671aE578E63FdF66ad4F3E12CC0c0d71Ac7510C', 'getNames', [addresses]],
    { blockTag: 'latest' }
  );
}

function ensSubGraphRequest(addresses) {
  return snapshot.utils.subgraphRequest(
    'https://api.thegraph.com/subgraphs/name/ensdomains/ens',
    {
      accounts: {
        __args: {
          first: 1000,
          where: {
            id_in: addresses.map(addresses => addresses.toLowerCase())
          }
        },
        id: true,
        registrations: {
          __args: {
            orderBy: 'registrationDate',
            first: 1
          },
          domain: {
            name: true,
            labelName: true
          }
        }
      }
    }
  );
}

function lookupAddresses(addresses) {
  return new Promise((resolove, reject) => {
    Promise.all([
      ensReverseRecordRequest(addresses),
      ensSubGraphRequest(addresses)
    ])
      .then(([reverseRecords, { accounts }]) => {
        const validNames = reverseRecords.map(n =>
          namehash.normalize(n) === n ? n : ''
        );
        // reverse record will be given preference
        const ensNames = Object.fromEntries(
          addresses.map((address, index) => {
            const account = accounts.find(
              account => account.id.toLowerCase() === address.toLowerCase()
            );
            return [
              address.toLowerCase(),
              validNames[index] ||
                (account &&
                  account.registrations &&
                  account.registrations[0] &&
                  account.registrations[0].domain &&
                  account.registrations[0].domain.labelName &&
                  account.registrations[0].domain.name) ||
                ''
            ];
          })
        );

        resolove(ensNames);
      })
      .catch(error => {
        reject(error);
      });
  });
}

export async function getProfiles(addresses) {
  addresses = addresses.slice(0, 1000);
  let ensNames: any = {};
  let _3BoxProfiles: any = {};
  try {
    [ensNames, _3BoxProfiles] = await Promise.all([
      lookupAddresses(addresses),
      get3BoxProfiles(addresses)
    ]);
  } catch (e) {
    console.log(e);
  }

  const profiles = Object.fromEntries(addresses.map(address => [address, {}]));
  return Object.fromEntries(
    Object.entries(profiles).map(([address, profile]) => {
      profile = _3BoxProfiles[address.toLowerCase()] || {};
      profile.address = address;
      profile.ens = ensNames[address.toLowerCase()] || null;
      delete profile.eth_address;
      return [address, profile];
    })
  );
}
