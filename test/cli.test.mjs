import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { parseOptions, selectInventory, renderResult } from '../src/inventory-cli.mjs';

test('CLI preserves code strings and filters without returning the raw ERP object', () => {
  const options = parseOptions(['--classes', '0602,0101', '--keyword', '001', '--limit', '1'], {});
  const result = selectInventory({ data: [
    { id: 1, code: '001A', name: '纸箱', disabled: false, inventory_class_code: '0602', internal: 'not-for-output' },
    { id: 2, code: '001B', name: '纸箱2', disabled: true, inventory_class_code: '0602' },
  ], meta: { class_codes: ['0602', '0101'] }, request_id: 'sample' }, options);
  assert.equal(result.matched_count, 2);
  assert.equal(result.shown_count, 1);
  assert.equal(result.items[0].code, '001A');
  assert.equal(result.items[0].internal, undefined);
  assert.match(renderResult(result), /001A/);
});

test('CLI validates count and arguments before querying', () => {
  for (const args of [['--limit', '0'], ['--limit', '101'], ['--limit', '1.5'], ['--limit', '-1'], ['--limit'], ['--unknown', 'x']]) {
    assert.throws(() => parseOptions(args, {}), /limit|参数/);
  }
  assert.throws(() => parseOptions(['--keyword', 'a\nb'], {}), /关键词/);
});

test('untrusted inventory text cannot inject additional terminal log lines', () => {
  const result = { queried_at: 'sample', classes: ['0602'], source_count: 1, matched_count: 1, shown_count: 1, request_id: 'sample', items: [{ code: '001', name: 'a\n::warning::text\u001b[31m|b', class_code: '0602', status: '正常' }] };
  const rendered = renderResult(result);
  assert.ok(!rendered.includes('\n::warning'));
  assert.ok(!rendered.includes('\u001b'));
});

test('inventory names remain literal text in the GitHub Markdown summary', () => {
  const result = { queried_at: 'sample', classes: ['0602'], source_count: 1, matched_count: 1, shown_count: 1, request_id: 'sample', items: [{ code: '001', name: '[外箱](https://example.invalid/query) <del>正常</del> *停用* ![图](x) `code` \\ | ~~停用~~', class_code: '0602', status: '正常' }] };
  const rendered = renderResult(result);
  assert.ok(rendered.includes('\\[外箱\\]\\(https://example\\.invalid/query\\) &lt;del&gt;正常&lt;/del&gt; \\*停用\\*'));
  assert.ok(rendered.includes('\\!\\[图\\]\\(x\\) \\`code\\` \\\\ &#124;'));
  assert.ok(rendered.includes('\\~\\~停用\\~\\~'));
});

test('CLI help works without credentials; absent credentials fail explicitly', () => {
  const env = { ...process.env, SHINELAB_INVENTORY_API_KEY: '', QUERY_CLASSES: '0602', QUERY_KEYWORD: '', QUERY_LIMIT: '20' };
  const help = spawnSync(process.execPath, ['src/inventory-cli.mjs', '--help'], { encoding: 'utf8', env });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /只读查询/);
  const missing = spawnSync(process.execPath, ['src/inventory-cli.mjs'], { encoding: 'utf8', env });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /SHINELAB_INVENTORY_API_KEY/);
});
