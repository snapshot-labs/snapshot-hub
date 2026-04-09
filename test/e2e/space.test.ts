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
    it('returns the correct HTTP response', async () => {
      const response = await fetch(`${HOST}/api/spaces/${fixtures[0].id}`);

      expect(response.status);
      expect(response.headers.get('content-type')).toContain(
        'application/json'
      );
    });

    it('returns the space data', async () => {
      const space = fixtures[0];
      const response = await fetch(`${HOST}/api/spaces/${space.id}`);

      const expectedSpace = {
        flagged: space.flagged,
        verified: space.verified,
        turbo: false,
        turboExpiration: space.turbo_expiration,
        hibernated: space.hibernated,
        deleted: false,
        domain: space.domain,
        ...space.settings
      };

      expect(await response.json()).toEqual(expectedSpace);
    });
  });

  describe('when the space does not exist', () => {
    it('returns a 404 error', async () => {
      const response = await fetch(`${HOST}/api/spaces/null.eth`);

      expect(response.status).toBe(404);
      expect(response.headers.get('content-type')).toContain(
        'application/json'
      );
      expect(await response.json()).toEqual({
        error: 'unauthorized',
        error_description: 'not_found'
      });
    });
  });

  describe('when the space is marked as deleted', () => {
    it('returns the space data with a deleted:true', async () => {
      const response = await fetch(`${HOST}/api/spaces/${fixtures[1].id}`);

      expect(await response.json()).toEqual(
        expect.objectContaining({ deleted: true })
      );
    });
  });

  describe('when the space is turbo', () => {
    it('returns the space as turbo', async () => {
      const turboExpiration = Math.floor(Date.now() / 1e3) + 86400; // 1 day from now
      const turboSpace = {
        ...fixtures[0],
        id: 'turbo-space.eth',
        turbo_expiration: turboExpiration,
        settings: JSON.stringify(fixtures[0].settings),
        domain: 'turbo.com'
      };
      await db.queryAsync('INSERT INTO spaces SET ?', turboSpace);

      const response = await fetch(`${HOST}/api/spaces/${turboSpace.id}`);

      expect(await response.json()).toEqual(
        expect.objectContaining({ turbo: true, turboExpiration })
      );
    });
  });
});
