import redis from '../redis';

export async function storeProposal(space, body, authorIpfsHash, relayerIpfsHash) {
  const msg = JSON.parse(body.msg);
  await redis.hmsetAsync(
    `token:${space}:proposals`,
    authorIpfsHash,
    JSON.stringify({
      address: body.address,
      msg,
      sig: body.sig,
      authorIpfsHash,
      relayerIpfsHash
    })
  );
}

export async function storeVote(space, body, authorIpfsHash, relayerIpfsHash) {
  const msg = JSON.parse(body.msg);
  return await redis.hmsetAsync(
    `token:${space}:proposal:${msg.payload.proposal}:votes`,
    body.address,
    JSON.stringify({
      address: body.address,
      msg,
      sig: body.sig,
      authorIpfsHash,
      relayerIpfsHash
    })
  );
}
