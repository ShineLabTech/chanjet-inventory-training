import { pathToFileURL } from 'node:url';
import { queryInventory } from './company-chanjet.mjs';

export function parseOptions(args, env = process.env) {
  const result = { classes: env.QUERY_CLASSES || '0602', keyword: env.QUERY_KEYWORD || '', limit: env.QUERY_LIMIT || '20', json: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help') return { help: true };
    if (arg === '--json') { result.json = true; continue; }
    if (!['--classes', '--keyword', '--limit'].includes(arg) || args[i + 1] === undefined || args[i + 1].startsWith('--')) {
      throw new Error('参数无效，请运行 npm run query -- --help。');
    }
    result[arg.slice(2)] = args[++i];
  }
  result.classes = result.classes.split(',').map(code => code.trim());
  if (!/^\d+$/.test(result.limit) || Number(result.limit) < 1 || Number(result.limit) > 100) {
    throw new Error('limit 必须是 1 到 100 的整数。');
  }
  result.limit = Number(result.limit);
  if (result.keyword.length > 80 || /[\p{C}]/u.test(result.keyword)) throw new Error('关键词最多 80 字，且不能包含控制字符。');
  return result;
}

export function selectInventory(payload, options) {
  const keyword = options.keyword.toLocaleLowerCase();
  const matched = payload.data.filter(row => `${row.code}\n${row.name}`.toLocaleLowerCase().includes(keyword));
  return {
    source: 'live',
    queried_at: new Date().toISOString(),
    request_id: payload.request_id,
    classes: payload.meta.class_codes,
    source_count: payload.data.length,
    matched_count: matched.length,
    shown_count: Math.min(matched.length, options.limit),
    items: matched.slice(0, options.limit).map(row => ({
      code: row.code,
      name: row.name,
      class_code: row.inventory_class_code,
      status: row.disabled ? '停用' : '正常',
    })),
  };
}

function cell(value) {
  return String(value)
    .replace(/[\p{C}]/gu, ' ')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/[\\`*_{}\[\]()#+.!-]/g, '\\$&')
    .replace(/\|/g, '&#124;');
}

export function renderResult(result) {
  const header = `实时查询 ${result.queried_at}\n分类 ${result.classes.join(',')}；源端 ${result.source_count} 条；匹配 ${result.matched_count} 条；展示 ${result.shown_count} 条\n请求编号：${result.request_id || '未提供'}`;
  if (!result.items.length) return `${header}\n没有匹配的存货。`;
  const rows = result.items.map(row => `| ${cell(row.code)} | ${cell(row.name)} | ${cell(row.class_code)} | ${cell(row.status)} |`);
  return `${header}\n\n| 存货编码 | 名称 | 分类 | 状态 |\n|---|---|---|---|\n${rows.join('\n')}`;
}

export async function main(args = process.argv.slice(2)) {
  try {
    const options = parseOptions(args);
    if (options.help) {
      console.log('只读查询畅捷通存货编码\n\nnpm run query -- --classes 0602 --keyword 外箱 --limit 20\n\n--classes  逗号分隔的分类，默认 0602；客户端会转换成重复 class_code 参数\n--keyword  按编码或名称筛选，默认不筛选\n--limit    展示 1 到 100 条，默认 20；不限制上游完整查询范围\n--json     输出 JSON，保留编码前导零\n\n需本地 .env 或环境变量中的培训 Key。没有 Key 时使用 GitHub Actions。');
      return 0;
    }
    const payload = await queryInventory(options.classes);
    const result = selectInventory(payload, options);
    console.log(options.json ? JSON.stringify(result, null, 2) : renderResult(result));
    return 0;
  } catch (error) {
    // Only messages created by this client; network/raw API errors are never printed.
    console.error(error.message);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
