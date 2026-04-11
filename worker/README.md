# Cloudflare Workers 部署说明

这个目录提供一个尽量 0 成本的验码服务版本，适合配合 GitHub Pages 上的 `index.html` 使用。

## 1. 准备 Cloudflare KV

先创建一个 KV namespace，然后把生成的 namespace ID 填进：

- `/Users/songxuan/Desktop/jichuban/worker/wrangler.toml`
  - `id`
  - `preview_id`

## 2. 设置管理密钥

用 Wrangler 给 Worker 设置一个仅你自己知道的管理密钥：

```bash
npx wrangler secret put ADMIN_TOKEN
```

这个密钥只用于你本地“发码”时调用 `/api/licenses/create`，不要发给客户。

## 3. 本地调试或部署

```bash
npm run worker:dev
```

```bash
npm run worker:deploy
```

部署成功后，记下你的 Worker 地址，例如：

```text
https://forma-license-gate.YOUR_SUBDOMAIN.workers.dev
```

## 4. 配置前端激活地址

把前端里的激活地址改成：

```text
https://你的-worker-域名/api/licenses/activate
```

当前项目已经支持通过 `window.__FORMA_LICENSE_ACTIVATE_URL__` 覆盖默认值。

## 5. 生成新的限时码

如果你已经部署好了 Worker，并设置了管理密钥，可以直接这样生成：

```bash
FORMA_LICENSE_ADMIN_URL="https://你的-worker-域名" \
FORMA_LICENSE_ADMIN_TOKEN="你的管理密钥" \
npm run license:create -- --plan month --note 客户微信备注
```

支持的套餐：

- `month`
- `quarter`
- `year`

## 6. 接口说明

- `POST /api/licenses/create`
  - 需要请求头：`X-Admin-Token`
  - 只给你自己本地发码脚本使用
- `POST /api/licenses/activate`
  - 给客户网页激活使用
- `GET /api/health`
  - 健康检查
