// Adapted from the Chanjet project company-chanjet.mjs client (2026-09-15).
// The training client deliberately exposes one read-only capability.
export const API_ORIGIN = 'https://open.shinelabtech.cn';
export const CLASS_CODES = Object.freeze(['0101', '0102', '03', '0403', '060101', '060102', '0602', '0603']);

export class CompanyApiError extends Error {
  constructor(status, code, requestId = null) {
    super(`查询失败：${code}（HTTP ${status || '未收到响应'}）${requestId ? `，请求编号 ${requestId}` : ''}`);
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

function safeLabel(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value) ? value : null;
}

export async function queryInventory(classes = ['0602'], {
  apiKey = process.env.SHINELAB_INVENTORY_API_KEY,
  baseUrl = process.env.SHINELAB_API_BASE_URL || API_ORIGIN,
  fetchImpl = fetch,
} = {}) {
  if (!Array.isArray(classes) || !classes.length || new Set(classes).size !== classes.length ||
      classes.some(code => !CLASS_CODES.includes(code))) {
    throw new Error('分类参数无效，请从培训说明的八个分类中选择；多个分类分别传入。');
  }
  let base;
  try { base = new URL(baseUrl); } catch { throw new Error('公司 API 地址无效。'); }
  if (base.origin !== API_ORIGIN || base.username || base.password || base.search || base.hash || base.pathname !== '/') {
    throw new Error('培训客户端只允许使用公司 HTTPS API 地址。');
  }
  const key = apiKey?.trim();
  if (!key) throw new Error('尚未配置 SHINELAB_INVENTORY_API_KEY；可使用 README 中的 GitHub Actions 查询入口。');
  const url = new URL('/api/v1/erp/chanjet/inventory', base);
  for (const code of classes) url.searchParams.append('class_code', code);

  let response;
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}` },
      redirect: 'error',
      signal: AbortSignal.timeout(60000),
    });
  } catch {
    throw new CompanyApiError(0, 'NETWORK_OR_TIMEOUT');
  }
  const payload = await response.json().catch(() => null);
  const requestId = safeLabel(payload?.request_id);
  if (!response.ok || payload?.success !== true) {
    throw new CompanyApiError(response.status, safeLabel(payload?.error?.code) || 'INVALID_RESPONSE', requestId);
  }
  if (!Array.isArray(payload.data) || payload.meta?.count !== payload.data.length) {
    throw new Error('物料数据不完整：返回条数与计数不一致。');
  }
  const returnedClasses = payload.meta?.class_codes;
  if (!Array.isArray(returnedClasses) || returnedClasses.length !== classes.length ||
      new Set(returnedClasses).size !== classes.length || returnedClasses.some(code => !classes.includes(code))) {
    throw new Error('返回分类范围与请求范围不一致。');
  }
  const ids = new Set();
  for (const row of payload.data) {
    if (!row || !Number.isSafeInteger(row.id) || row.id <= 0 || ids.has(row.id) ||
        typeof row.code !== 'string' || !row.code || typeof row.name !== 'string' ||
        typeof row.disabled !== 'boolean' || !classes.includes(row.inventory_class_code)) {
      throw new Error('物料数据或分类范围异常：请核对主键、编码、停用状态和返回分类。');
    }
    ids.add(row.id);
  }
  return { ...payload, request_id: requestId };
}
