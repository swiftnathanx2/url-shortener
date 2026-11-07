import { describe, it, before, beforeEach, after } from 'node:test';
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
      body: JSON.stringify(body),
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

    it('adds https:// when the protocol is missing', async () => {
      const res = await post('/links', { target_url: 'www.linkedin.com/in/someone' });
      const body = await res.json();

      assert.equal(res.status, 201);
      assert.equal(body.data.target_url, 'https://www.linkedin.com/in/someone');
    });
  });
});
