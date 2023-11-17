import db, { sequencerDB } from '../../../../src/helpers/mysql';
import fixtures from '../../../fixtures/votes';
import query from '../../../../src/graphql/operations/votes';
import { loadSpaces } from '../../../../src/helpers/spaces';

const JSON_FIELDS = ['choice', 'metadata', 'vp_by_strategy'];

// Mocking requestDeduplicator, else Jest with hang out with
// openHandles error
const mockServe = jest.fn((id: string, action: any, args: any): any => {
  return action(...args);
});
jest.mock('../../../../src/helpers/requestDeduplicator', () => {
  return {
    __esModule: true,
    default: (id: string, action: any, args: any) => mockServe(id, action, args)
  };
});

// Dynamically assign choices to each vote fixtures
async function createFixturesWithChoices(choices) {
  await db.queryAsync('DELETE FROM votes');
  return Promise.all(
    fixtures.map(async (vote, index) => {
      const _vote = { ...vote };
      _vote.choice = choices[index];
      JSON_FIELDS.forEach(key => (_vote[key] = JSON.stringify(_vote[key])));
      return db.queryAsync('INSERT INTO votes SET ?', _vote);
    })
  );
}

describe('operations/votes', () => {
  beforeAll(async () => {
    await loadSpaces();
  });

  afterAll(async () => {
    await db.queryAsync('DELETE FROM votes');
    await db.endAsync();
    await sequencerDB.endAsync();
  });

  describe('when filtering by choice', () => {
    describe('on single choice votes', () => {
      beforeAll(async () => {
        await createFixturesWithChoices([1, 1, 2, 3]);
      });

      it('returns all votes', async () => {
        const results = await query(null, {});
        return expect(results.map(({ id }) => id)).toEqual(['1', '2', '3', '4']);
      });

      it.each([
        ['a single choice', [1], ['1', '2']],
        ['multiple choices', [2, 3], ['3', '4']],
        ['a non-existing choice', [999], []]
      ])('returns votes filtered by choice when passing %s', async (title, filter, expectation) => {
        const results = await query(null, { where: { choice_in: filter } });
        await expect(results.map(({ id }) => id)).toEqual(expectation);
      });
    });

    const tests = [
      ['a single choice', [1], ['1', '2']],
      ['multiple choices', [1, 2], ['1', '2', '3']],
      ['a mix of existing and non-existing choice ', [4, 999], ['4']],
      ['a non-existing choice only', [999], []]
    ];

    describe('on multiples choices', () => {
      beforeAll(async () => {
        await createFixturesWithChoices([[1, 2], [1, 3], [2], [4]]);
      });

      it.each(tests)(
        'returns votes filtered by choice when passing %s',
        async (title, filter, expectation) => {
          const results = await query(null, { where: { choice_in: filter } });
          await expect(results.map(({ id }) => id)).toEqual(expectation);
        }
      );
    });

    describe('on weighted choices', () => {
      beforeAll(async () => {
        await createFixturesWithChoices([{ 1: 0, 2: 1 }, { 1: 0, 3: 0 }, { 2: 0 }, { 4: 0 }]);
      });

      it.each(tests)(
        'returns votes filtered by choice when passing %s',
        async (title, filter, expectation) => {
          const results = await query(null, { where: { choice_in: filter } });
          await expect(results.map(({ id }) => id)).toEqual(expectation);
        }
      );
    });

    describe('on mixed type of choices', () => {
      const choices = [{ 1: 0, 2: 1 }, [1, 3], 2, { 4: 0 }];

      beforeAll(async () => {
        await createFixturesWithChoices(choices);
      });

      it.each(tests)(
        'returns votes filtered by choice when passing %s',
        async (title, filter, expectation) => {
          const results = await query(null, { where: { choice_in: filter } });
          await expect(results.map(({ id }) => id)).toEqual(expectation);
        }
      );
    });
  });
});
