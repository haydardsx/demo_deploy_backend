const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../dist/app');

test('数据库缺失仍能启动，秘密只暴露是否配置，失败使用正确状态', async () => {
  delete process.env.DATABASE_URL;
  delete process.env.PGPASSWORD;
  process.env.DEMO_SECRET = 'private-value-must-never-escape';
  process.env.UNRELATED_SECRET = 'unrelated-must-never-escape';
  process.env.INSTANCE_ID = 'test-node-1';
  process.env.SERVICE_SLOT = 'test-slot';
  process.env.BUILD_REVISION = 'test-revision';
  process.env.DEMO_MESSAGE = '覆盖测试';
  const app = await createApp();
  await app.listen(0, '127.0.0.1');
  const url = await app.getUrl();
  try {
    const health = await fetch(`${url}/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).instanceId, 'test-node-1');
    const vars = await fetch(`${url}/vartest`).then(r => r.json());
    assert.equal(vars.secrets.DEMO_SECRET, true);
    assert.equal(vars.secrets.PGPASSWORD, false);
    assert.equal(vars.variables.DEMO_MESSAGE, '覆盖测试');
    assert.equal(vars.variables.SERVICE_SLOT, 'test-slot');
    assert.equal(vars.variables.BUILD_REVISION, 'test-revision');
    assert.equal(JSON.stringify(vars).includes('must-never-escape'), false);
    assert.equal(JSON.stringify(vars).includes('UNRELATED_SECRET'), false);
    for (const [path, method] of [['/ready','GET'], ['/pgtest','GET'], ['/pgtest','POST']]) {
      const res = await fetch(`${url}${path}`, { method });
      assert.equal(res.status, 503);
      assert.equal((await res.json()).errorCode, 'DATABASE_NOT_CONFIGURED');
    }
    const cors = await fetch(`${url}/server`, { headers: { Origin: 'http://localhost:8080' } });
    assert.equal(cors.headers.get('access-control-allow-origin'), 'http://localhost:8080');
    assert.equal(cors.headers.get('cache-control'), 'no-store');
    const denied = await fetch(`${url}/server`, { headers: { Origin: 'https://untrusted.example' } });
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
    assert.equal((await fetch(`${url}/missing`)).status, 404);
  } finally { await app.close(); }
});

test('数据库连接错误不泄漏连接信息，存活仍然正常', async () => {
  delete process.env.DATABASE_URL;
  process.env.PGPASSWORD = 'never-expose-password';
  process.env.PGHOST = '127.0.0.1';
  process.env.PGPORT = '1';
  const app = await createApp();
  await app.listen(0, '127.0.0.1');
  try {
    const res = await fetch(`${await app.getUrl()}/ready`);
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { errorCode: 'DATABASE_UNAVAILABLE', statusCode: 503 });
    assert.equal((await fetch(`${await app.getUrl()}/health`)).status, 200);
  } finally { await app.close(); }
});
