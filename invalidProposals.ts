import snapshot from '@snapshot-labs/snapshot.js';
import dotenv from 'dotenv';
dotenv.config();
global['fetch'] = require('node-fetch');

import db from './server/helpers/mysql';
import { jsonParse } from './server/helpers/utils';

const spacesURL = 'https://hub.snapshot.page/api/spaces';

let spaces = {};

const init = async () => {
  spaces = await loadSpaces();

  const spacesWithProposals = await getSpacesWithProposals();
  for (const { spaceName } of spacesWithProposals) {
    console.log(`\n\n\nRuning script for space: ${spaceName}`);
    if (!spaces[spaceName]) {
      console.log('Space not found - Ignoring all proposals in this space');
    } else {
      await removeInvalidProposals(spaceName);
    }
  }

  console.log('\n\n\nProcess Completed!!\n\n\n');
  process.exit();
};

const removeInvalidProposals = async spaceName => {
  try {
    const invalidProposalsInSpace: any =
      spaces[spaceName].filters && spaces[spaceName].filters.invalids
        ? spaces[spaceName].filters.invalids
        : [];

    const proposalsInSpace = (await getProposalsInSpace(spaceName)).filter(
      proposal => !invalidProposalsInSpace.includes(proposal.id)
    );
    console.log(`Total ${proposalsInSpace.length} non-invalid proposals found`);
    invalidProposalsInSpace.forEach(proposalID => {
      console.log(
        `${proposalID} - invalid from space settings - marked as invalid`
      );
    });

    const allScoresInSpace = await getScoresForSpace(
      spaceName,
      proposalsInSpace
    );

    if (allScoresInSpace) {
      proposalsInSpace.forEach(async proposal => {
        proposal.payload = jsonParse(proposal.payload);
        proposal.score = allScoresInSpace[proposal.id];
        const result: any = verifyProposal(proposal);
        if (result.invalid) {
          invalidProposalsInSpace.push(proposal.id);
          console.log(
            `${proposal.id} - reason: ${result.reason} - marked it as Invalid`
          );
        } else {
          console.log(proposal.id + ' - is valid proposal');
        }
      });
      await markProposalsInvalid(invalidProposalsInSpace);
    }
  } catch (error) {
    console.log(error);
  }
};

const verifyProposal = proposal => {
  const space = spaces[proposal.space];
  const result = { invalid: false, reason: '' };
  const members = space.members
    ? space.members.map(address => address.toLowerCase())
    : [];

  const isMember = members.includes(proposal.address.toLowerCase());
  if (space.filters && space.filters.onlyMembers && !isMember) {
    result.invalid = true;
    result.reason = 'not by member';
    return result;
  } else if (!isMember && space.filters && space.filters.minScore) {
    if (proposal.score < space.filters.minScore) {
      result.invalid = true;
      result.reason = 'min score';
      return result;
    }
  }

  return result;
};

const loadSpaces = async () => {
  try {
    const data = await fetch(spacesURL);
    return data.json();
  } catch (error) {
    console.log(error);
  }
};

const getScoresForSpace = async (spaceName, proposalsInSpace) => {
  try {
    const space = spaces[spaceName];
    let scores: any = await snapshot.utils.getScores(
      spaceName,
      space.strategies,
      space.network,
      snapshot.utils.getProvider(space.network),
      proposalsInSpace.map(proposal => proposal.address)
    );

    scores = scores.reduce(function(previousValue, currentValue) {
      for (const address in currentValue) {
        previousValue[address] = previousValue[address]
          ? previousValue[address] + currentValue[address]
          : currentValue[address];
      }
      return previousValue;
    }, {});

    return proposalsInSpace.reduce((scoresObject, proposal) => {
      scoresObject[proposal.id] = scores[proposal.address] || 0;
      return scoresObject;
    }, {});
  } catch (error) {
    console.log('Error calculating scores for proposals in this space');
    console.log(error);
  }
};

const getSpacesWithProposals = async () => {
  try {
    const query = `SELECT distinct space as spaceName FROM messages WHERE type = 'proposal'`;
    const spacesWithProposals = await db.queryAsync(query, []);
    return spacesWithProposals;
  } catch (error) {
    console.log(error);
  }
};

const getProposalsInSpace = async spaceName => {
  try {
    const query = `SELECT * FROM messages WHERE type = 'proposal' AND space = ? `;
    const proposalsInSpace = await db.queryAsync(query, [spaceName]);
    return proposalsInSpace;
  } catch (error) {
    console.log(error);
  }
};

const markProposalsInvalid = async invalidProposalsInSpace => {
  try {
    if (invalidProposalsInSpace.length > 0) {
      const query = `UPDATE messages SET type = ? WHERE type = 'proposal' AND id IN (?)`;
      await db.queryAsync(query, ['invalid-proposal', invalidProposalsInSpace]);
      console.log(
        invalidProposalsInSpace.length + ' proposals marked as invalid'
      );
    } else {
      console.log('No proposals replaced in this space');
    }
  } catch (error) {
    console.log(error);
  }
};

init();
