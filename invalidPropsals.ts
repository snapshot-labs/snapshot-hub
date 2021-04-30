import snapshot from '@snapshot-labs/snapshot.js';
const dotenv = require('dotenv');
dotenv.config();
global['fetch'] = require('node-fetch');

import db from './server/helpers/mysql';
import { jsonParse } from './server/helpers/utils';
import { spaces } from './server/helpers/spaces';
import { archiveProposal, loadSpaces } from './server/helpers/adapters/mysql';

const tableName = 'messages';
const backuptableName = 'messages_backup';


const init = async () => {
    loadSpaces().then(async ensSpaces => {
        console.log('ENS spaces', Object.keys(ensSpaces).length);

        await backup();
        await removeInvalidProposals();

        console.log("\n\n\nProcess Completed!!\n\n\n")
        process.exit();
    });
}

const removeInvalidProposals = async () => {
    try {
        console.log(`\n\n\nStarted Removing Invalid Proposals from table ${tableName} \n\n\n`);
        const query = `SELECT * FROM ${tableName} WHERE type = 'proposal'`
        const data = await db.queryAsync(query, [])
        console.log(`Total ${data.length} Proposals found`);

        for(const proposal of data) {
            proposal.payload = jsonParse(proposal.payload)
            proposal.metadata = jsonParse(proposal.metadata)
            let result: any = null;
            try {
                result = await verifyProposal(proposal)
                if(result.invalid) {
                    await markProposalInvalid(proposal.id);
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
        }

    } catch(error) {
        console.log(error)
    }
}

const markProposalInvalid = async (id: string) => {
    const query = `UPDATE ${tableName} SET type = ? WHERE id = ? LIMIT 1`;
    await db.queryAsync(query, ['invalid-proposal', id]);
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
            result.invalid = true
            result.reason = "not_by_member"
            return resolve(result)
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
                    result.invalid = true
                    result.reason = "min_score"
                    return resolve(result)
                };
            } catch (e) {
                return reject(proposal.id + " - failed to check voting power - ignored");
            }
        }

        return resolve(result)
    });
}

const backup = async () => {
    try {
        const query = `CREATE TABLE ${backuptableName} LIKE ${tableName};INSERT ${backuptableName} SELECT * FROM ${tableName};`
        const data = await db.queryAsync(query, [])
        console.log(`\n\nCreated backup table for ${tableName} at ${backuptableName}`)
        return data
    } catch(error) {
        console.log(error)
    }
}

init();

