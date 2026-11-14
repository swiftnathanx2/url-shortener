import { describe, it, before, beforeEach, after, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '#src/app.js';
import { pool } from '#src/db/index.js';

describe('LINKLY API ', () => {
  let server;
  let baseUrl;

  before(async () => {
    assert.ok(process.env.DATABASE_URL?.includes('test'), 'Refusing to run: DATABASE_URL must point at a test database');
    const { rows } = await pool.query('SELECT current_database() AS name');
    assert.ok(rows[0].name.includes('test'), `Refusing to run: connected to "${rows[0].name}", which is not a test database`);

    const app = createApp();

    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });

    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE links, clicks RESTART IDENTITY CASCADE');
  });

  after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  });

  const post = (path, body) =>
    fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });

  const get = (path) => fetch(`${baseUrl}${path}`, { redirect: 'manual' });

  const del = (path) => fetch(`${baseUrl}${path}`, { method: 'DELETE' });

  const makeLink = (code, extra = {}) => post('/links', { target_url: 'https://example.com', code, ...extra });

  describe('POST /links', () => {
    it('creates a link and returns 201', async () => {
      const res = await makeLink('abc123');
      const body = await res.json();

      assert.equal(res.status, 201);
      assert.equal(body.data.code, 'abc123');
      assert.equal(body.data.target_url, 'https://example.com');
      assert.equal(body.data.click_count, 0);
    });

    it('returns 409 when the vanity code is already taken', async () => {
      await makeLink('abc123');
      const res = await makeLink('abc123');

      assert.equal(res.status, 409);
    });

    it('returns 400 for an invalid URL', async () => {
      const res = await post('/links', { target_url: 'hello' });

      assert.equal(res.status, 400);
    });

    it('returns 400 for a non-http URL', async () => {
      const res = await post('/links', { target_url: 'ftp://example.com' });

      assert.equal(res.status, 400);
    });

    it('returns 400 for a vanity code that is too short', async () => {
      const res = await makeLink('ab');

      assert.equal(res.status, 400);
    });

    it('returns 400 for a javascript URL', async () => {
      const res = await post('/links', { target_url: 'javascript:alert(1)' });
      assert.equal(res.status, 400);
    });

    it('returns 400 for a url with a space in the host', async () => {
      const res = await post('/links', { target_url: 'https://exa mple.com' });

      assert.equal(res.status, 400);
    });

    it('returns 400 for a malformed JSON body', async () => {
      const res = await post('/links', '{bad');
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.message, 'Request body is not valid JSON');
    });

    it('returns validation issues as an array', async () => {
      const res = await post('/links', { target_url: 'hello' });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.message, 'Validation Error');
      assert.ok(Array.isArray(body.issues));
      assert.ok(body.issues[0].path.includes('target_url'));
    });

    it('adds https:// when the protocol is missing', async () => {
      const res = await post('/links', { target_url: 'www.linkedin.com/in/someone' });
      const body = await res.json();

      assert.equal(res.status, 201);
      assert.equal(body.data.target_url, 'https://www.linkedin.com/in/someone');
    });
  });

  //   redirect test

  describe('GET /:code', () => {
    it('redirects with 302 to the target', async () => {
      await makeLink('abc123');

      const res = await get('/abc123');

      assert.equal(res.status, 302);
      assert.equal(res.headers.get('location'), 'https://example.com');
    });

    it('returns 404 for an unknown code', async () => {
      const res = await get('/nope123');

      assert.equal(res.status, 404);
    });

    it('returns 410 once the link has expired', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await makeLink('old123', { expires_at: tomorrow });
      await pool.query(`UPDATE links SET expires_at = now() - interval '1 minute' WHERE code = $1`, ['old123']);

      const res = await get('/old123');

      assert.equal(res.status, 410);
    });

    it('records the click', async () => {
      await makeLink('abc123');
      await get('/abc123');

      const res = await get('/links/abc123');
      const body = await res.json();

      assert.equal(body.data.click_count, 1);
    });
  });

  // link details

  describe('GET /links/:code', () => {
    it('returns the details without the internal id', async () => {
      await makeLink('abc123');

      const res = await get('/links/abc123');
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.data.code, 'abc123');
      assert.equal(body.data.id, undefined);
    });

    it('returns 400 for a badly formed code', async () => {
      const res = await get('/links/a!');

      assert.equal(res.status, 400);
    });

    it('returns 404 for an unknown code', async () => {
      const res = await get('/links/nope123');

      assert.equal(res.status, 404);
    });
  });

  //pagination test

  describe('GET /links/:code/clicks', () => {
    it('pages through every click once and ends with a null cursor', async () => {
      await makeLink('abc123');
      for (let i = 0; i < 25; i++) {
        await get('/abc123');
      }

      const ids = [];
      const pageSizes = [];
      let bookmark = 0;

      for (let page = 0; page < 10 && bookmark !== null; page++) {
        const res = await get(`/links/abc123/clicks?after=${bookmark}&limit=10`);
        const body = await res.json();

        assert.equal(res.status, 200);
        pageSizes.push(body.data.length);
        ids.push(...body.data.map((click) => click.id));
        bookmark = body.cursor;
      }

      assert.deepEqual(pageSizes, [10, 10, 5]);
      assert.equal(new Set(ids).size, 25);
      assert.equal(bookmark, null);
    });

    it('returns 400 when limit is above the maximum', async () => {
      await makeLink('abc123');

      const res = await get('/links/abc123/clicks?limit=500');

      assert.equal(res.status, 400);
    });

    it('returns 404 for an unknown code', async () => {
      const res = await get('/links/nope123/clicks');

      assert.equal(res.status, 404);
    });
  });

  //   delete tests
  describe('DELETE /links/:code', () => {
    it('deletes the link and its clicks and returns 204', async () => {
      await makeLink('abc123');
      await get('/abc123');
      await get('/abc123');

      const res = await del('/links/abc123');

      assert.equal(res.status, 204);
      const links = await pool.query('SELECT count(*)::int AS n FROM links');
      const clicks = await pool.query('SELECT count(*)::int AS n FROM clicks');
      assert.equal(links.rows[0].n, 0);
      assert.equal(clicks.rows[0].n, 0);
    });

    it('returns 404 when deleting the same link twice', async () => {
      await makeLink('abc123');
      await del('/links/abc123');

      const res = await del('/links/abc123');

      assert.equal(res.status, 404);
    });

    it('returns 400 for a badly formed code', async () => {
      const res = await del('/links/a!');

      assert.equal(res.status, 400);
    });
  });

  //   csv export tests
  describe('GET /links/:code/clicks.csv', () => {
    it('exports a header line plus one row per click', async () => {
      await makeLink('abc123');
      for (let i = 0; i < 3; i++) {
        await get('/abc123');
      }

      const res = await get('/links/abc123/clicks.csv');
      const text = await res.text();
      const lines = text.trim().split('\n');

      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type'), /text\/csv/);
      assert.equal(lines[0], 'id,clicked_at,referrer,user_agent');
      assert.equal(lines.length, 4);
    });

    it('returns 404 for an unknown code', async () => {
      const res = await get('/links/nope123/clicks.csv');

      assert.equal(res.status, 404);
    });
  });

  //   promises test

  describe('promises from the brief', () => {
    it('counts every click under 20 simultaneous visits', async () => {
      await makeLink('race01');

      await Promise.all(Array.from({ length: 20 }, () => get('/race01')));

      const res = await get('/links/race01');
      const body = await res.json();
      assert.equal(body.data.click_count, 20);
    });

    it('treats an injection attempt as harmless', async () => {
      await makeLink('safe123');
      const attack = "x'; DROP TABLE links;--";

      const urlRes = await get(`/links/${encodeURIComponent(attack)}`);
      const bodyRes = await post('/links', { target_url: 'https://example.com', code: attack });

      assert.equal(urlRes.status, 400);
      assert.equal(bodyRes.status, 400);
      const check = await pool.query('SELECT count(*)::int AS n FROM links');
      assert.equal(check.rows[0].n, 1);
    });
  });

  // health test
  describe('GET /health', () => {
    afterEach(() => {
      mock.restoreAll();
    });

    it('reports that the service is up', async () => {
      const res = await get('/health');
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.status, 'success');
      assert.equal(typeof body.uptime, 'number');
    });

    it('returns 503 when the database is unreachable', async () => {
      mock.method(pool, 'query', async () => {
        throw new Error('db down');
      });

      const res = await get('/health');
      const body = await res.json();

      assert.equal(res.status, 503);
      assert.equal(body.status, 'error');
    });
  });
});
