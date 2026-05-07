# BFF Homologation Checklist

## Web BFF

- `GET /bff/web/auth/system-status`
- `POST /bff/web/auth/login`
- `GET /bff/web/usuarios/me`
- `GET /bff/web/dashboard/stats`
- `GET /bff/web/cardapios`
- `POST /bff/web/auth/logout`

## Delivery App BFF

- `POST /bff/app/auth/login`
- `GET /bff/app/escolas`
- `GET /bff/app/entregas`
- `GET /bff/app/realtime/events`
- Delivery photo upload flow, if enabled in the environment.

## School Portal BFF

- `POST /bff/portal/auth/login`
- `GET /bff/portal/escolas`
- `GET /bff/portal/estoque-escola/escola/:escolaId`
- `POST /bff/portal/estoque-escola/escola/:escolaId/movimentacao`
- `GET /bff/portal/realtime/events`

## Chatbot BFF

- `POST /bff/chatbot/auth/login`
- `POST /bff/chatbot/message`

## Infra Checks

- Redis connected in backend logs.
- S3 upload returns a public URL or CDN URL.
- CORS accepts only expected frontend origins.
- Logout revokes token and repeated use returns `401 TOKEN_REVOKED`.
- Rate limit returns `429` under deliberate burst traffic.
