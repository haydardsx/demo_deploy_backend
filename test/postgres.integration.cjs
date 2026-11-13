const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../dist/app');
const { Pool } = require('pg');

test('真实 PostgreSQL 就绪、查询、事务写读及回滚', async () => {
  assert.ok(process.env.PGPASSWORD || process.env.DATABASE_URL, '必须显式提供数据库凭据');
  const app = await createApp();
  await app.listen(0, '127.0.0.1');
  const url = await app.getUrl();
  try {
    assert.equal((await fetch(`${url}/ready`)).status, 200);
    const read = await fetch(`${url}/pgtest`).then(r=>r.json());
    assert.equal(read.connected, true);
    assert.equal(read.result.probe, 1);
    const writes = await Promise.all(Array.from({length: 6}, () => fetch(`${url}/pgtest`, { method: 'POST' })));
    for (const res of writes) {
      assert.equal(res.status, 200);
      assert.equal((await res.json()).rolledBack, true);
    }
    const pool = new Pool(process.env.DATABASE_URL ? {connectionString: process.env.DATABASE_URL} : {});
    try { assert.equal((await pool.query("SELECT count(*)::int AS count FROM pg_tables WHERE tablename='ops_demo_probe'")).rows[0].count, 0); }
    finally { await pool.end(); }
  } finally { await app.close(); }
});
