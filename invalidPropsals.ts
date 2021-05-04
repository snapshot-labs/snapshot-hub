import snapshot from '@snapshot-labs/snapshot.js';
const dotenv = require('dotenv');
dotenv.config();
global['fetch'] = require('node-fetch');

import db from './server/helpers/mysql';
import { jsonParse } from './server/helpers/utils';

const tableName = 'messages';
const backuptableName = 'messages_backup';
const spacesURL = 'https://hub.snapshot.page/api/spaces'

let spaces = {}

const init = async () => {
    spaces = await loadSpaces();

    await backup();
    await removeInvalidProposals();

    console.log("\n\n\nProcess Completed!!\n\n\n");
    process.exit();
}

const removeInvalidProposals = async () => {
    try {
        console.log(`Started Removing Invalid Proposals from table ${tableName}`);
        const query = `SELECT distinct space as spaceName FROM ${tableName} WHERE type = 'proposal'`
        const spacesWithProposals = await db.queryAsync(query, [])
        console.log(`\n\n\nTotal ${spacesWithProposals.length} unique spaces with proposals found`);

        for(const spaceWithProposals of spacesWithProposals) {
            console.log('\n\n\nRuning script for space: ' + spaceWithProposals.spaceName)
            const query = `SELECT * FROM ${tableName} WHERE type = 'proposal' AND space = ? `
            const proposalsInSpace = await db.queryAsync(query, [spaceWithProposals.spaceName])
        
            console.log(`Total ${proposalsInSpace.length} Proposals found`);
            let invalidProposalsInSpace: any = []
            await Promise.all(proposalsInSpace.map(async proposal => {
                proposal.payload = jsonParse(proposal.payload)
                let result: any = null;
                try {
                    result = await verifyProposal(proposal)
                    if(result.invalid) {
                        invalidProposalsInSpace.push(proposal.id)
                        if(result.reason === 'not_by_member') {
                            console.log(proposal.id + " - proposal not created by a member - marked it as Invalid");
                        } else if(result.reason === 'min_score') {
                            console.log(proposal.id + " - less than min score - marked it as Invalid");
                        }
                    } else {
                        console.log(proposal.id + " - is valid proposal")
                    }
                } catch(error) {
                    console.log(error)
                }
            }));
            await markProposalsInvalid(invalidProposalsInSpace);
        }
    } catch(error) {
        console.log(error)
    }
}

const verifyProposal = (proposal) => {
    return new Promise(async (resolve, reject) => {
        const space = spaces[proposal.space];
        const result = {invalid: false, reason: ""}
        if(!space) {
            return reject(proposal.id + " - No Space found - " + proposal.space + " - Ignoring");
        }
        const members = space.members
          ? space.members.map(address => address.toLowerCase())
          : [];
        const isMember = members.includes(proposal.address.toLowerCase());
        
        if (space.filters && space.filters.onlyMembers && !isMember) {
            result.invalid = true;
            result.reason = "not_by_member";
            return resolve(result);
        } else if (!isMember && space.filters && space.filters.minScore) {
            try {
                const scores = await snapshot.utils.getScores(
                    proposal.space,
                    space.strategies,
                    space.network,
                    snapshot.utils.getProvider(space.network),
                    [proposal.address]
                );
                const totalScore: any = scores
                    .map((score: any) =>
                    Object.values(score).reduce((a, b: any) => a + b, 0)
                    )
                    .reduce((a, b: any) => a + b, 0);

                if (totalScore < space.filters.minScore) {
                    result.invalid = true;
                    result.reason = "min_score";
                    return resolve(result);
                };
            } catch (e) {
                return reject(proposal.id + " - failed to check voting power - ignored");
            }
        }

        return resolve(result);
    });
}

const loadSpaces = async () => {
    try {
        const data = await fetch(spacesURL);
        return data.json();
    } catch(error) {
        console.log(error);
    }
}

const markProposalsInvalid = async (invalidProposalsInSpace) => {
    try {
        if(invalidProposalsInSpace.length > 0) {
            const query = `UPDATE ${tableName} SET type = ? WHERE id IN (?)`;
            await db.queryAsync(query, ['invalid-proposal', invalidProposalsInSpace ]);
            console.log(invalidProposalsInSpace.length + ' proposals marked as invalid');
        } else {
            console.log("No proposals replaced in this space");
        }
    } catch(error) {
        console.log(error);
    }
}

const backup = async () => {
    try {
        const query = `CREATE TABLE ${backuptableName} LIKE ${tableName};INSERT ${backuptableName} SELECT * FROM ${tableName};`;
        const data = await db.queryAsync(query, []);
        console.log(`\n\nCreated backup table for ${tableName} at ${backuptableName}`);
        return data;
    } catch(error) {
        console.log(error);
    }
}

init();

