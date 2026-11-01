# Flowday

Ứng dụng quản lý công việc cá nhân, có MCP server để Claude đọc và tạo task. Kế hoạch: [PLAN.md](PLAN.md).

## Yêu cầu

- Node.js 24
- Một project [Neon](https://neon.com) có branch `dev` (Postgres 18, AWS Singapore)

## Cài đặt

```bash
git clone https://github.com/DoNotChoke/Flowday.git
cd Flowday
npm install
npx playwright install chromium webkit
cp .env.example .env
```

Mở `.env`, đặt `DATABASE_URL` là connection string của branch `dev`, dùng kết nối trực tiếp (không pooled) và `sslmode=verify-full`. Không dùng URL của branch `production` trên máy.

```bash
npm run db:migrate
npm run dev
```

App chạy tại <http://localhost:3000>.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy app ở chế độ phát triển |
| `npm run build` | Build production |
| `npm run lint` | Chạy ESLint |
| `npm run typecheck` | Kiểm tra kiểu TypeScript |
| `npm run check` | Chạy lint, typecheck, Vitest và build như CI |
| `npm test` | Chạy Vitest, cần `DATABASE_URL` |
| `npm run test:e2e` | Chạy Playwright trên desktop và mobile, tự bật app |
| `npm run db:generate` | Tạo migration từ `src/lib/db/schema.ts` |
| `npm run db:migrate` | Áp dụng migration |
