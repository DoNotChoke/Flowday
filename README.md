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

Đặt tiếp `BETTER_AUTH_SECRET` (tạo bằng `openssl rand -base64 32`) và `ALLOWED_EMAILS` là email của bạn, kèm hai địa chỉ e2e như trong `.env.example` để `npm run test:e2e` chạy được. Email ngoài danh sách không đăng ký được.

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
| `npx auth@1.7.14 generate --config src/lib/auth/index.ts --output src/lib/db/schema.ts --yes` | Sinh lại bảng của Better Auth sau khi đổi cấu hình; ghi đè toàn bộ `schema.ts` |
| `npm run db:generate` | Tạo migration từ `src/lib/db/schema.ts` |
| `npm run db:migrate` | Áp dụng migration |
