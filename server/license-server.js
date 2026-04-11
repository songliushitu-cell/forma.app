const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = Number(process.env.PORT || 8787);
const DATA_FILE = path.resolve(process.env.LICENSE_DATA_FILE || path.join(__dirname, '..', 'data', 'licenses.json'));

const PLAN_CONFIG = {
  month: { days: 30, label: '月卡' },
  quarter: { days: 90, label: '季卡' },
  year: { days: 365, label: '年卡' }
};

function ensureStore() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ licenses: [] }, null, 2));
  }
}

function readStore() {
  ensureStore();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      licenses: Array.isArray(parsed.licenses) ? parsed.licenses : []
    };
  } catch (error) {
    return { licenses: [] };
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  response.end(JSON.stringify(payload));
}

function addDaysToIso(isoString, days) {
  const activatedAt = new Date(isoString);
  const expiresAt = new Date(activatedAt.getTime() + days * 24 * 60 * 60 * 1000);
  return expiresAt.toISOString();
}

function normalizeLicenseRecord(record) {
  const status = record.status || 'unused';
  return {
    codeId: record.codeId || '',
    code: record.code || '',
    plan: record.plan || '',
    status,
    createdAt: record.createdAt || '',
    activatedAt: record.activatedAt || '',
    expiresAt: record.expiresAt || '',
    customerNote: record.customerNote || ''
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

function activateLicense(rawCode) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) {
    return { statusCode: 400, payload: { ok: false, reason: 'invalid' } };
  }

  const store = readStore();
  const targetIndex = store.licenses.findIndex(item => String(item.code || '').trim().toUpperCase() === code);
  if (targetIndex < 0) {
    return { statusCode: 404, payload: { ok: false, reason: 'not_found' } };
  }

  const target = normalizeLicenseRecord(store.licenses[targetIndex]);
  const planMeta = PLAN_CONFIG[target.plan];
  if (!planMeta) {
    return { statusCode: 400, payload: { ok: false, reason: 'invalid' } };
  }

  if (target.status === 'active' || target.status === 'used') {
    return { statusCode: 409, payload: { ok: false, reason: 'used' } };
  }

  if (target.status === 'expired') {
    return { statusCode: 410, payload: { ok: false, reason: 'expired' } };
  }

  const activatedAt = new Date().toISOString();
  const expiresAt = addDaysToIso(activatedAt, planMeta.days);
  const nextRecord = {
    ...target,
    status: 'active',
    activatedAt,
    expiresAt
  };
  store.licenses[targetIndex] = nextRecord;
  writeStore(store);

  return {
    statusCode: 200,
    payload: {
      ok: true,
      license: createLicenseResponse(nextRecord)
    }
  };
}

const server = http.createServer((request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  if (request.method === 'GET' && request.url === '/api/health') {
    sendJson(response, 200, { ok: true, service: 'forma-license-server' });
    return;
  }

  if (request.method === 'POST' && request.url === '/api/licenses/activate') {
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 32) {
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        const result = activateLicense(parsed.code);
        sendJson(response, result.statusCode, result.payload);
      } catch (error) {
        sendJson(response, 400, { ok: false, reason: 'invalid' });
      }
    });
    return;
  }

  sendJson(response, 404, { ok: false, reason: 'not_found' });
});

server.listen(PORT, () => {
  ensureStore();
  console.log(`FORMA license server listening on http://127.0.0.1:${PORT}`);
  console.log(`Using license data file: ${DATA_FILE}`);
});
