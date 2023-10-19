import fetch from 'node-fetch';
import db from '../../src/helpers/mysql';
import fixtures from '../fixtures/spaces';

const HOST = `http://localhost:${process.env.PORT || 3030}`;

describe('GET /api/space/:key', () => {
  beforeAll(async () => {
    await db.queryAsync('DELETE from spaces');
    await Promise.all(
      fixtures.map(f => {
        return db.queryAsync('INSERT INTO spaces SET ?', {
          ...f,
          settings: JSON.stringify(f.settings)
        });
      })
    );
  });

  afterAll(async () => {
    await db.queryAsync('DELETE from spaces');
    await db.endAsync();
  });

  describe('when the space exists', () => {
    let response;
    beforeAll(async () => {
      response = await fetch(`${HOST}/api/spaces/fabien.eth`);
    });

    it('returns the correct HTTP response', () => {
      expect(response.status);
      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('returns the space data', async () => {
      const space = fixtures[0];
      const expectedSpace = {
        flagged: space.flagged,
        verified: space.verified,
        ...space.settings
      };

      expect(response.json()).resolves.toEqual(expectedSpace);
    });
  });

  describe('when the space does not exist', () => {
    it('returns a 404 error', async () => {
      const response = await fetch(`${HOST}/api/spaces/null.eth`);

      expect(response.status).toBe(404);
      expect(response.headers.get('content-type')).toContain('application/json');
      expect(response.json()).resolves.toEqual({
        error: 'unauthorized',
        error_description: 'not_found'
      });
    });
  });
});
