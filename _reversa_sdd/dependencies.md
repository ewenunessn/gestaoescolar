# Dependencias do Projeto - gestaoescolar

Gerado pelo Reversa Scout em 2026-04-29.

## Gerenciadores de Pacotes

- npm com `package-lock.json`.
- Workspaces npm declarados na raiz: `backend` e `shared`.
- Apps mobile possuem `package-lock.json` proprios.
- Android/Gradle presente em `apps/estoque-escolar-mobile/android`.

## Raiz (`package.json`)

Scripts principais:

- `desktop:dev`: sobe frontend, backend e Electron em conjunto.
- `desktop:build`: build backend e frontend desktop.
- `desktop:start`: inicia Electron.
- `desktop:test`: executa testes desktop com `node --test`.
- `desktop:pack` e `desktop:dist`: empacotamento Electron Builder.

Dependencias principais:

| Pacote | Versao | Uso provavel |
| --- | --- | --- |
| `alimentacao-escolar-backend` | `file:backend` | pacote local backend |
| `react-toastify` | `^11.0.5` | notificacoes UI |
| `electron` | `^37.2.1` | desktop |
| `electron-builder` | `^26.8.1` | distribuicao desktop |
| `concurrently` | `^9.2.1` | execucao paralela de scripts |
| `wait-on` | `^8.0.3` | sincronizacao de servicos locais |

## Backend (`backend/package.json`)

Framework e runtime:

| Pacote | Versao |
| --- | --- |
| `express` | `^4.18.2` |
| `tsx` | `^4.7.0` |
| `typescript` | `^5.4.4` |
| `@vercel/node` | `^3.0.0` |

Banco, cache e realtime:

| Pacote | Versao |
| --- | --- |
| `pg` | `^8.18.0` |
| `pg-hstore` | `^2.3.4` |
| `@supabase/supabase-js` | `^2.105.1` |
| `ioredis` | `^5.10.0` |
| `socket.io` | `^4.7.5` |

Autenticacao, validacao e middleware:

| Pacote | Versao |
| --- | --- |
| `bcryptjs` | `^2.4.3` |
| `jsonwebtoken` | `^9.0.2` |
| `cors` | `^2.8.5` |
| `dotenv` | `^16.3.1` |
| `multer` | `^2.0.2` |
| `zod` | `^3.22.4` |

Arquivos, relatorios e automacao:

| Pacote | Versao |
| --- | --- |
| `@aws-sdk/client-s3` | `^3.587.0` |
| `axios` | `^1.13.5` |
| `exceljs` | `^4.4.0` |
| `xlsx` | `^0.18.5` |
| `puppeteer` | `^24.38.0` |
| `puppeteer-core` | `^24.38.0` |
| `@sparticuz/chromium` | `^143.0.4` |
| `cron` | `^3.5.0` |
| `commander` | `^11.1.0` |

Testes e qualidade:

| Pacote | Versao |
| --- | --- |
| `jest` | `^30.0.4` |
| `ts-jest` | `^29.4.0` |
| `supertest` | `^7.1.3` |
| `eslint` | `^8.56.0` |
| `@typescript-eslint/eslint-plugin` | `^7.4.0` |
| `@typescript-eslint/parser` | `^7.4.0` |

Scripts principais:

- `start`: `tsx src/index.ts`
- `dev`: `ts-node-dev --respawn --transpile-only src/index.ts`
- `build`: `tsc`
- `test`: `jest`
- comandos de banco/Neon: `configure-db`, `init-neon`, `check-neon`, `sync-neon`, `sync-neon-full`

## Frontend (`frontend/package.json`)

Framework e build:

| Pacote | Versao |
| --- | --- |
| `react` | `^18.2.0` |
| `react-dom` | `^18.2.0` |
| `react-router-dom` | `^7.14.0` |
| `vite` | `^5.2.8` |
| `@vitejs/plugin-react` | `^4.2.1` |
| `typescript` | `^5.4.4` |

UI e estado:

| Pacote | Versao |
| --- | --- |
| `@mui/material` | `^5.15.14` |
| `@mui/icons-material` | `^5.14.17` |
| `@mui/x-data-grid` | `^8.28.2` |
| `@mui/x-date-pickers` | `^8.28.3` |
| `@tanstack/react-query` | `^5.90.5` |
| `@tanstack/react-table` | `^8.21.3` |
| `material-react-table` | `^2.13.1` |
| `lucide-react` | `^0.543.0` |

Documentos, tabelas e exportacao:

| Pacote | Versao |
| --- | --- |
| `@pdfme/common` | `^5.5.10` |
| `@pdfme/generator` | `^5.5.10` |
| `@pdfme/schemas` | `^5.5.10` |
| `@pdfme/ui` | `^5.5.10` |
| `jspdf` | `^4.2.1` |
| `jspdf-autotable` | `^5.0.7` |
| `pdfmake` | `^0.3.5` |
| `exceljs` | `^4.4.0` |
| `xlsx` | `^0.18.5` |
| `file-saver` | `^2.0.5` |
| `qrcode` | `^1.5.4` |
| `jsbarcode` | `^3.12.3` |

Outras bibliotecas relevantes:

| Pacote | Versao |
| --- | --- |
| `axios` | `^1.6.8` |
| `date-fns` | `^4.1.0` |
| `chart.js` | `^4.5.0` |
| `react-chartjs-2` | `^5.3.0` |
| `react-big-calendar` | `^1.19.4` |
| `react-calendar` | `^6.0.0` |
| `@dnd-kit/core` | `^6.3.1` |
| `zod` | `^3.22.4` |

Testes e qualidade:

| Pacote | Versao |
| --- | --- |
| `vitest` | `^1.0.4` |
| `@testing-library/react` | `^14.1.2` |
| `@testing-library/jest-dom` | `^6.1.4` |
| `@testing-library/user-event` | `^14.5.1` |
| `jsdom` | `^22.1.0` |
| `eslint` | `^8.56.0` |

Scripts principais:

- `dev`: `vite`
- `build`: Vite production com memoria ampliada
- `build:desktop`: Vite em modo desktop
- `test`: `vitest`
- `test:run`: `vitest run`
- `lint`: ESLint em `.ts` e `.tsx`
- `deploy`: `vercel --prod`

## Mobile - Entregador (`apps/entregador-native/package.json`)

| Pacote | Versao |
| --- | --- |
| `expo` | `~51.0.0` |
| `react` | `18.2.0` |
| `react-native` | `0.74.2` |
| `@react-navigation/native` | `^6.1.17` |
| `@react-navigation/stack` | `^6.3.29` |
| `axios` | `^1.7.2` |
| `date-fns` | `^4.1.0` |
| `expo-camera` | `^55.0.9` |
| `expo-file-system` | `~17.0.1` |
| `expo-print` | `~13.0.1` |
| `react-native-paper` | `^5.12.3` |
| `react-native-signature-canvas` | `^5.0.2` |
| `react-native-svg` | `15.2.0` |
| `react-native-webview` | `^13.16.1` |
| `typescript` | `^5.1.3` |

Scripts:

- `start`: `expo start`
- `android`: `expo start --android`
- `ios`: `expo start --ios`
- `web`: `expo start --web`

## Mobile - Estoque Escolar (`apps/estoque-escolar-mobile/package.json`)

| Pacote | Versao |
| --- | --- |
| `expo` | `~54.0.0` |
| `react` | `19.1.0` |
| `react-dom` | `19.1.0` |
| `react-native` | `0.81.5` |
| `react-native-web` | `^0.21.1` |
| `@react-navigation/native` | `^7.1.17` |
| `@react-navigation/bottom-tabs` | `^7.4.7` |
| `@react-navigation/stack` | `^7.4.8` |
| `react-native-calendars` | `^1.1313.0` |
| `react-native-vector-icons` | `^10.3.0` |
| `lodash` | `^4.17.21` |
| `zod` | `^3.25.76` |
| `typescript` | `~5.9.2` |

Scripts:

- `start`: `expo start`
- `android`: `expo run:android`
- `ios`: `expo run:ios`
- `web`: `expo start --web`

## Shared (`shared/package.json`)

| Pacote | Versao |
| --- | --- |
| `typescript` | `^5.4.4` |

Pacote: `@alimentacao-escolar/shared-types`, com `types/index.ts` como entrada principal.

## Dependencias Criticas por Area

- API: Express, pg, JWT, bcryptjs, CORS, Zod.
- Banco/deploy: PostgreSQL, Neon por scripts, Supabase client, Vercel.
- Tempo real/cache: Socket.IO, Redis/ioredis.
- Frontend: React, React Router, TanStack Query, Material UI, Vite.
- Relatorios/documentos: pdfme, jsPDF, pdfmake, ExcelJS, xlsx, Puppeteer.
- Desktop: Electron, Electron Builder.
- Mobile: Expo, React Native, React Navigation.
- Testes: Jest, Vitest, Testing Library, Supertest, Node test runner.
