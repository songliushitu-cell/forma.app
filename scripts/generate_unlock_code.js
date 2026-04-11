const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.resolve(process.env.LICENSE_DATA_FILE || path.join(__dirname, '..', 'data', 'licenses.json'));
const ADMIN_URL = String(process.env.FORMA_LICENSE_ADMIN_URL || '').trim().replace(/\/$/, '');
const ADMIN_TOKEN = String(process.env.FORMA_LICENSE_ADMIN_TOKEN || '').trim();

const PLAN_CONFIG = {
  month: { days: 30, label: '月卡' },
  quarter: { days: 90, label: '季卡' },
  year: { days: 365, label: '年卡' }
};

function usage() {
  console.log('用法: npm run license:create -- --plan <month|quarter|year> [--note 客户备注]');
}

function readArgs(argv) {
  const args = { plan: '', note: '' };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--plan') args.plan = String(argv[index + 1] || '').trim();
    if (token === '--note') args.note = String(argv[index + 1] || '').trim();
  }
  return args;
}

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

function buildCodeId() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `LIC-${stamp}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

function buildLicenseCode() {
  const part = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `FORMA-${part()}-${part()}-${part()}`;
}

async function createRemoteLicense(plan, note) {
  if (typeof fetch !== 'function') {
    throw new Error('当前 Node 环境不支持 fetch，无法直接调用 Cloudflare Worker。');
  }

  if (!ADMIN_URL || !ADMIN_TOKEN) {
    return null;
  }

  const response = await fetch(`${ADMIN_URL}/api/licenses/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': ADMIN_TOKEN
    },
    body: JSON.stringify({
      plan,
      customerNote: note
    })
  });
  const payload = await response.json().catch(() => ({ ok: false, reason: 'invalid' }));
  if (!payload.ok) {
    throw new Error(`远程发码失败：${payload.reason || response.status}`);
  }

  return payload.record;
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  if (!PLAN_CONFIG[args.plan]) {
    usage();
    process.exit(1);
  }

  const remoteRecord = await createRemoteLicense(args.plan, args.note);
  if (remoteRecord) {
    console.log('已通过 Cloudflare Worker 生成新的授权码');
    console.log(`套餐: ${PLAN_CONFIG[args.plan].label} (${PLAN_CONFIG[args.plan].days} 天)`);
    console.log(`授权ID: ${remoteRecord.codeId}`);
    console.log(`解锁码: ${remoteRecord.code}`);
    console.log(`备注: ${remoteRecord.customerNote || '--'}`);
    console.log(`Worker: ${ADMIN_URL}`);
    return;
  }

  const store = readStore();
  const record = {
    codeId: buildCodeId(),
    code: buildLicenseCode(),
    plan: args.plan,
    status: 'unused',
    createdAt: new Date().toISOString(),
    activatedAt: '',
    expiresAt: '',
    customerNote: args.note
  };

  store.licenses.unshift(record);
  writeStore(store);

  console.log('已生成新的授权码');
  console.log(`套餐: ${PLAN_CONFIG[args.plan].label} (${PLAN_CONFIG[args.plan].days} 天)`);
  console.log(`授权ID: ${record.codeId}`);
  console.log(`解锁码: ${record.code}`);
  console.log(`备注: ${record.customerNote || '--'}`);
  console.log(`数据文件: ${DATA_FILE}`);
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
