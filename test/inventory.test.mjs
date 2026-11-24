import test from 'node:test';
import assert from 'node:assert/strict';
import { queryInventory } from '../src/company-chanjet.mjs';

const key = 'unit-test-only-credential';
const row = { id: 123, code: '00123', name: '测试外箱', inventory_class_code: '0602', disabled: false };
const payload = () => ({ success: true, data: [{ ...row }], meta: { count: 1, class_codes: ['0602'] }, request_id: 'test-request' });
const config = (body = payload()) => ({ apiKey: key, fetchImpl: async () => new Response(JSON.stringify(body), { status: 200 }) });

test('uses only GET on the inventory endpoint, repeats class parameters and refuses redirects', async () => {
  let calls = 0;
  const body = payload();
  body.meta.class_codes.push('0101');
  const result = await queryInventory(['0602', '0101'], {
    apiKey: key,
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url.origin, 'https://open.shinelabtech.cn');
      assert.equal(url.pathname, '/api/v1/erp/chanjet/inventory');
      assert.deepEqual(url.searchParams.getAll('class_code'), ['0602', '0101']);
      assert.equal(options.method, 'GET');
      assert.equal(options.redirect, 'error');
      assert.equal(options.headers.Authorization, `Bearer ${key}`);
      assert.ok(options.signal instanceof AbortSignal);
      return new Response(JSON.stringify(body));
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.data[0].code, '00123');
});

for (const classes of [[], ['0602', '0602'], ['all'], [''], ['0602,0101']]) {
  test(`rejects invalid classification input ${JSON.stringify(classes)} before calling the API`, async () => {
    let called = false;
    await assert.rejects(queryInventory(classes, { apiKey: key, fetchImpl: () => { called = true; } }), /分类/);
    assert.equal(called, false);
  });
}

test('never sends a credential to a different origin or insecure URL', async () => {
  for (const baseUrl of ['http://open.shinelabtech.cn', 'https://example.com', 'https://open.shinelabtech.cn.evil.example', 'https://user:pass@open.shinelabtech.cn']) {
    let called = false;
    await assert.rejects(queryInventory(['0602'], { apiKey: key, baseUrl, fetchImpl: () => { called = true; } }), /地址/);
    assert.equal(called, false);
  }
});

test('missing credentials fail before a request', async () => {
  await assert.rejects(queryInventory(['0602'], { ...config(), apiKey: '' }), /SHINELAB_INVENTORY_API_KEY/);
});

test('incomplete count, duplicate IDs, invalid field types and wrong scope are refused', async () => {
  const cases = [];
  let body = payload(); body.meta.count = 2; cases.push(body);
  body = payload(); body.data.push({ ...row }); body.meta.count = 2; cases.push(body);
  body = payload(); body.data[0].code = 123; cases.push(body);
  body = payload(); body.data[0].disabled = 'False'; cases.push(body);
  body = payload(); body.data[0].inventory_class_code = '0101'; cases.push(body);
  body = payload(); body.meta.class_codes = ['0101']; cases.push(body);
  for (const candidate of cases) await assert.rejects(queryInventory(['0602'], config(candidate)), /数据|范围/);
});

test('valid empty query is reported as empty, not replaced by demo records', async () => {
  const result = await queryInventory(['0602'], config({ ...payload(), data: [], meta: { count: 0, class_codes: ['0602'] } }));
  assert.equal(result.data.length, 0);
});

test('network errors do not leak credentials and are not retried automatically', async () => {
  let calls = 0;
  await assert.rejects(queryInventory(['0602'], { apiKey: key, fetchImpl: async () => { calls++; throw new Error(key); } }), (error) => {
    assert.equal(error.code, 'NETWORK_OR_TIMEOUT');
    assert.ok(!error.message.includes(key));
    return true;
  });
  assert.equal(calls, 1);
});

test('HTTP errors preserve a safe error code without logging the raw body', async () => {
  await assert.rejects(queryInventory(['0602'], { apiKey: key, fetchImpl: async () => new Response(JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: key }, request_id: 'request-403' }), { status: 403 }) }), (error) => {
    assert.equal(error.status, 403);
    assert.equal(error.code, 'FORBIDDEN');
    assert.equal(error.requestId, 'request-403');
    assert.ok(!error.message.includes(key));
    return true;
  });
});
