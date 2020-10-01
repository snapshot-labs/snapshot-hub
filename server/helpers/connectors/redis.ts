import redis from '../redis';

export async function storeProposal(token, body, authorIpfsHash, relayerIpfsHash) {
  const msg = JSON.parse(body.msg);
  await redis.hsetAsync(
    `token:${token}:proposals`,
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

export async function storeVote(token, body, authorIpfsHash, relayerIpfsHash) {
  const msg = JSON.parse(body.msg);
  return await redis.hsetAsync(
    `token:${token}:proposal:${msg.payload.proposal}:votes`,
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
