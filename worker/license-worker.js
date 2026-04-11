const PLAN_CONFIG = {
  month: { days: 30, label: '月卡' },
  quarter: { days: 90, label: '季卡' },
  year: { days: 365, label: '年卡' }
};

function jsonResponse(data, status = 200, env = {}) {
  const origin = env.ALLOW_ORIGIN || '*';
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token'
    }
  });
}

function toIsoString(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function addDaysToIso(isoString, days) {
  const activatedAt = new Date(isoString);
  return new Date(activatedAt.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function buildCodeId() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `LIC-${stamp}-${randomHex(2)}`;
}

function randomHex(byteLength) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes, item => item.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function buildLicenseCode() {
  return `FORMA-${randomHex(2)}-${randomHex(2)}-${randomHex(2)}`;
}

function normalizeRecord(record) {
  return {
    codeId: record?.codeId || '',
    code: String(record?.code || '').trim().toUpperCase(),
    plan: record?.plan || '',
    status: record?.status || 'unused',
    createdAt: toIsoString(record?.createdAt) || '',
    activatedAt: toIsoString(record?.activatedAt) || '',
    expiresAt: toIsoString(record?.expiresAt) || '',
    customerNote: record?.customerNote || ''
  };
}

function createLicenseResponse(record) {
  return {
    codeId: record.codeId,
    plan: record.plan,
    activatedAt: record.activatedAt,
    expiresAt: record.expiresAt
  };
}

function getKeyFromCode(code) {
  return `license:${String(code || '').trim().toUpperCase()}`;
}

async function readLicense(env, code) {
  const raw = await env.LICENSES.get(getKeyFromCode(code), 'json');
  return raw ? normalizeRecord(raw) : null;
}

async function writeLicense(env, record) {
  const normalized = normalizeRecord(record);
  await env.LICENSES.put(getKeyFromCode(normalized.code), JSON.stringify(normalized));
  return normalized;
}

async function activateLicense(env, code) {
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode) {
    return jsonResponse({ ok: false, reason: 'invalid' }, 400, env);
  }

  const record = await readLicense(env, normalizedCode);
  if (!record) {
    return jsonResponse({ ok: false, reason: 'not_found' }, 404, env);
  }

  const planMeta = PLAN_CONFIG[record.plan];
  if (!planMeta) {
    return jsonResponse({ ok: false, reason: 'invalid' }, 400, env);
  }

  if (record.expiresAt && new Date(record.expiresAt).getTime() <= Date.now()) {
    const expiredRecord = { ...record, status: 'expired' };
    await writeLicense(env, expiredRecord);
    return jsonResponse({ ok: false, reason: 'expired' }, 410, env);
  }

  if (record.status === 'active' || record.status === 'used') {
    return jsonResponse({ ok: false, reason: 'used' }, 409, env);
  }

  if (record.status === 'expired') {
    return jsonResponse({ ok: false, reason: 'expired' }, 410, env);
  }

  const activatedAt = new Date().toISOString();
  const nextRecord = {
    ...record,
    status: 'active',
    activatedAt,
    expiresAt: addDaysToIso(activatedAt, planMeta.days)
  };
  await writeLicense(env, nextRecord);

  return jsonResponse({ ok: true, license: createLicenseResponse(nextRecord) }, 200, env);
}

async function createLicense(env, request) {
  const adminToken = request.headers.get('X-Admin-Token');
  if (!env.ADMIN_TOKEN || adminToken !== env.ADMIN_TOKEN) {
    return jsonResponse({ ok: false, reason: 'forbidden' }, 403, env);
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return jsonResponse({ ok: false, reason: 'invalid' }, 400, env);
  }

  const plan = String(body?.plan || '').trim();
  if (!PLAN_CONFIG[plan]) {
    return jsonResponse({ ok: false, reason: 'invalid_plan' }, 400, env);
  }

  const code = String(body?.code || buildLicenseCode()).trim().toUpperCase();
  const existing = await readLicense(env, code);
  if (existing) {
    return jsonResponse({ ok: false, reason: 'code_exists' }, 409, env);
  }

  const record = normalizeRecord({
    codeId: buildCodeId(),
    code,
    plan,
    status: 'unused',
    createdAt: new Date().toISOString(),
    activatedAt: '',
    expiresAt: '',
    customerNote: String(body?.customerNote || '').trim()
  });
  await writeLicense(env, record);

  return jsonResponse({
    ok: true,
    record: {
      codeId: record.codeId,
      code: record.code,
      plan: record.plan,
      customerNote: record.customerNote,
      createdAt: record.createdAt
    }
  }, 200, env);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return jsonResponse({}, 204, env);
    }

    if (request.method === 'GET' && url.pathname === '/api/health') {
      return jsonResponse({ ok: true, service: 'forma-license-worker' }, 200, env);
    }

    if (request.method === 'POST' && url.pathname === '/api/licenses/activate') {
      let body;
      try {
        body = await request.json();
      } catch (error) {
        return jsonResponse({ ok: false, reason: 'invalid' }, 400, env);
      }
      return activateLicense(env, body?.code);
    }

    if (request.method === 'POST' && url.pathname === '/api/licenses/create') {
      return createLicense(env, request);
    }

    return jsonResponse({ ok: false, reason: 'not_found' }, 404, env);
  }
};
