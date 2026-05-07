# Production Deployment Runbook

This runbook covers the operational steps that need access to the production host, DNS provider, Redis provider, and AWS account.

## API Gateway

Use `infra/nginx/api-gateway.conf` as the Nginx site template.

Production substitutions:

- Replace `api.example.com` with the real API host.
- Replace `backend:3000` with the private backend upstream, container name, or loopback address.
- Terminate TLS at Nginx or at the load balancer in front of Nginx.
- Keep `/bff/`, `/api/`, `/health`, `/uploads/`, and `/socket.io/` proxied to the backend.

Host commands:

```bash
sudo cp infra/nginx/api-gateway.conf /etc/nginx/sites-available/nutrilog-api
sudo ln -s /etc/nginx/sites-available/nutrilog-api /etc/nginx/sites-enabled/nutrilog-api
sudo nginx -t
sudo systemctl reload nginx
```

## Backend Environment

Use `infra/production/backend.env.example` as the production checklist. Do not commit real secrets.

Required for production:

- `NODE_ENV=production`
- `DATABASE_URL` with SSL enabled by the database provider.
- Strong `JWT_SECRET`.
- `CORS_ORIGIN` containing the real frontend origins.
- Redis variables, preferably `REDIS_URL`.
- `STORAGE_PROVIDER=s3` and AWS S3 variables.

## Frontend And Mobile URLs

The web frontend production env must use the web BFF:

```bash
VITE_API_URL=https://<api-host>/bff/web
```

The delivery app must use:

```bash
EXPO_PUBLIC_API_URL=https://<api-host>/bff/app
```

The school portal mobile app normalizes calls to `/bff/portal`.

## Smoke Test

Run after deployment:

```bash
curl -i https://<api-host>/health
curl -i https://<api-host>/bff/web/architecture
curl -i https://<api-host>/bff/web/auth/system-status
```

Then validate an authenticated session:

```bash
TOKEN=$(curl -s https://<api-host>/bff/web/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"<admin-email>","senha":"<admin-password>"}' \
  | jq -r '.data.token')

curl -i https://<api-host>/bff/web/usuarios/me \
  -H "Authorization: Bearer $TOKEN"

curl -i https://<api-host>/bff/web/dashboard/stats \
  -H "Authorization: Bearer $TOKEN"

curl -i -X POST https://<api-host>/bff/web/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

Expected:

- Health returns `200`.
- Login returns a JWT.
- `/usuarios/me` returns the authenticated user.
- Dashboard returns aggregated data.
- Logout returns success.
- Reusing the same token after logout returns `401 TOKEN_REVOKED`.

## Rollback

If the gateway fails:

```bash
sudo rm /etc/nginx/sites-enabled/nutrilog-api
sudo nginx -t
sudo systemctl reload nginx
```

If Redis fails, the backend falls back to memory cache. This keeps the app online, but logout token blacklist and cache become process-local until Redis is restored.
