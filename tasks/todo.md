# Phase 0 — Danh sách việc

Tổng quan và quyết định: `tasks/plan.md`.

**Mọi task** chỉ xong khi đạt tiêu chí riêng, đã chạy thử thật, `npm run lint` pass, không còn code thừa và không có thay đổi ngoài phạm vi. Từ T0.1 có thêm `npm run typecheck`; từ T0.4 có thêm `npm test`.

---

## Nhóm A: App và dữ liệu chạy được

### T0.1 Khởi tạo repo và app Next.js

**Mô tả:** Tạo git repo tại `D:\ToDoApp`, đưa bản scaffold Next.js vào gốc, xóa nội dung mẫu và để lại trang tạm mang tên Flowday. Scaffold trong thư mục tạm rồi chép về, không ghi đè file sẵn có:

```text
npx create-next-app@16.4.3 flowday --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --disable-git --no-agent-feedback
```

Việc đi kèm: `git init -b main`; `.gitattributes` với `* text=auto eol=lf`; thêm `!.env.example` vào `.gitignore`; ignore `.venv/`, `.idea/`, `.jbeval/`, `/Flowday*.html`; xóa 5 file SVG mẫu; `@types/node` lên `^24`; script `typecheck` là `next typegen && tsc --noEmit`; thêm `.env.example`; giữ `AGENTS.md`.

**Tiêu chí nghiệm thu:**
- [x] `npm run dev` mở `http://localhost:3000` hiện chữ "Flowday", tab tên "Flowday".
- [x] `npm run lint`, `npm run typecheck`, `npm run build` đều pass.
- [x] `git status` không liệt kê `.venv`, `.idea`, `.jbeval`, `.env`, 2 file HTML; có liệt kê `.env.example`.

**Kiểm chứng:**
- [x] Chạy 3 lệnh trên, kiểm tra `git check-ignore .env` và `git check-ignore .env.example`.
- [x] `PLAN.md`, 2 file HTML và `tasks/` còn nguyên.

**Phụ thuộc:** Không

**File dự kiến:** `package.json`, `package-lock.json`, `.gitignore`, `.gitattributes`, `.env.example`, `src/app/layout.tsx`, `src/app/page.tsx`, cùng các file cấu hình do scaffold sinh

**Quy mô:** M

---

### T0.2 Playwright smoke trên desktop và mobile

**Mô tả:** Cài Playwright, cấu hình project `desktop` (Chromium, 1440×900) và `mobile` (WebKit, 390×844), tự chạy `npm run dev` làm webServer, viết smoke test cho trang chủ. Thêm helper kiểm tra không có cuộn ngang để T9.1 dùng lại.

**Tiêu chí nghiệm thu:**
- [x] `npm run test:e2e` pass trên cả 2 project.
- [x] Test khẳng định có tiêu đề "Flowday" và `scrollWidth <= clientWidth`.
- [x] `test-results/` và `playwright-report/` bị git ignore.

**Kiểm chứng:**
- [x] Tạm thêm phần tử rộng 2000 px, test phải fail, rồi bỏ đi.
- [x] `npx playwright install chromium webkit` chạy thành công.

**Phụ thuộc:** T0.1

**File dự kiến:** `playwright.config.ts`, `e2e/helpers.ts`, `e2e/smoke.spec.ts`, `package.json`, `.gitignore`

**Quy mô:** S

---

### T0.3 Postgres và migration đầu tiên

**Mô tả:** Kết nối project Neon dành riêng cho dev, cấu hình Drizzle Kit và tạo migration custom `CREATE EXTENSION IF NOT EXISTS unaccent;`. Thêm script `db:generate`, `db:migrate`. `drizzle.config.ts` đọc `.env` bằng `process.loadEnvFile`, không thêm `dotenv`. `.env.example` chỉ mô tả dạng `DATABASE_URL`, không chứa giá trị thật.

**Tiền đề:** Đã có project Neon `flowday-dev` (AWS Singapore, Postgres 18) và connection string nằm trong `.env` trên máy.

**Tiêu chí nghiệm thu:**
- [ ] `npm run db:migrate` chạy được trên DB mới tạo của `flowday-dev`.
- [ ] Chạy `npm run db:migrate` lần 2 không lỗi và không áp dụng lại.
- [ ] `.env` không xuất hiện trong `git status`.

**Kiểm chứng:**
- [ ] Truy vấn `select extname from pg_extension` thấy `unaccent`.
- [ ] Thiếu `DATABASE_URL` thì lệnh dừng với thông báo rõ ràng, không in connection string ra log.

**Phụ thuộc:** T0.1

**File dự kiến:** `drizzle.config.ts`, `src/lib/db/schema.ts`, `drizzle/0000_*.sql`, `package.json`, `.env.example`

**Quy mô:** M

---

### T0.4 DB client, Vitest và README

**Mô tả:** Tạo `src/lib/db` dùng `drizzle-orm/node-postgres` với một `Pool` duy nhất qua `globalThis` để không rò kết nối khi hot reload. Cài Vitest (môi trường node, alias `@`, đọc `.env`) và viết test thật đầu tiên. Viết lại `README.md` với các bước chạy dự án.

**Tiêu chí nghiệm thu:**
- [ ] `npm test` pass với test `select unaccent('Việt Đồ án')` trả về `Viet Do an` qua `src/lib/db`.
- [ ] Sai `DATABASE_URL` thì test fail rõ ràng, không treo.
- [ ] `README.md` đủ các bước từ clone đến chạy app, migration và test.

**Kiểm chứng:**
- [ ] Tạm đặt `DATABASE_URL` sai rồi chạy `npm test` để xem lỗi, sau đó trả lại.
- [ ] Sửa giá trị mong đợi của test, test phải fail, rồi trả lại.

**Phụ thuộc:** T0.3

**File dự kiến:** `src/lib/db/index.ts`, `src/lib/db/db.test.ts`, `vitest.config.ts`, `package.json`, `README.md`

**Quy mô:** M

---

## Checkpoint A: Sau T0.1–T0.4

- [ ] `git clone` sang thư mục tạm, làm đúng theo `README.md`, mọi lệnh chạy được.
- [ ] `npm run lint`, `typecheck`, `test`, `test:e2e`, `build` đều pass.
- [ ] Không có secret nào được commit.

---

## Nhóm B: Thiết kế và UI

### T0.5 Tách thiết kế ra `design/screens/`

**Mô tả:** Viết script Node thuần `scripts/extract-design.mjs <bundle.html> <outDir>`, chỉ dùng thư viện chuẩn. Script đọc manifest (base64 + gzip) ở 2 tầng lồng nhau, ghi template từng màn hình, bỏ CSS font nhúng và runtime của bundle, không thực thi nội dung trong file. Commit kết quả trong `design/screens/`, ESLint bỏ qua thư mục này.

Tên file: `01-sign-in`, `02-sign-up`, `03-tasks-board`, `04-create-task`, `05-task-detail`, `06-calendar`, `07-history-streak`, `08-focus-mode`, `09-create-project`, `10-project-overview`, `component-sidebar` (đuôi `.html`).

**Tiêu chí nghiệm thu:**
- [ ] Chạy với `Flowday — ToDo Web App (1).html` tạo đúng 11 file, mỗi file dưới 30 KB và không còn base64.
- [ ] Script tự kiểm tra số màn hình và thoát mã khác 0 nếu sai hoặc file đầu vào không phải bundle.
- [ ] Chạy lại lần 2 không tạo khác biệt trong `git diff`.

**Kiểm chứng:**
- [ ] Chạy với `Flowday — ToDo Web App.html` (bản cũ) phải báo lỗi vì thiếu màn hình.
- [ ] Mở `09-create-project.html` và `10-project-overview.html`, đọc được cấu trúc và script `DCLogic`.

**Phụ thuộc:** T0.1

**File dự kiến:** `scripts/extract-design.mjs`, `design/screens/*.html`, `eslint.config.mjs`

**Quy mô:** S

---

### T0.6 Design token và font

**Mô tả:** Đưa token từ `PLAN.md` mục 4 và `design/screens/` vào `@theme` trong `globals.css`: màu, tint, bóng cứng, bo góc, `--breakpoint-md: 744px`. Nạp Poppins (400–700) và Be Vietnam Pro (subset `vietnamese`) qua `next/font/google`, stack `Poppins, "Be Vietnam Pro", sans-serif`. Tạo trang `/dev/ui` với bảng màu, cỡ chữ và câu tiếng Việt mẫu; trả 404 trong production.

**Trước khi code:** đọc phần font và Tailwind trong `node_modules/next/dist/docs/`.

**Tiêu chí nghiệm thu:**
- [ ] Nền trang là `#F3F3F1`, `font-family` bắt đầu bằng Poppins.
- [ ] Class `md:` có hiệu lực ở 744 px và chưa có hiệu lực ở 743 px.
- [ ] Câu tiếng Việt có `ạ ấ ệ ữ ỹ` hiển thị đủ dấu, không rơi về font hệ thống.
- [ ] Sau `npm run build && npm start`, `/dev/ui` trả 404.

**Kiểm chứng:**
- [ ] Test `e2e/dev-ui.spec.ts` kiểm tra màu, font và breakpoint.
- [ ] Xem bằng mắt câu tiếng Việt dài ở 390 và 1440 px, ghi lại nếu nét chữ lệch.

**Phụ thuộc:** T0.5

**File dự kiến:** `src/app/globals.css`, `src/app/layout.tsx`, `src/app/dev/ui/page.tsx`, `e2e/dev-ui.spec.ts`

**Quy mô:** M

---

### T0.7 Primitive hành động: Button, Card, Chip, Segmented

**Mô tả:** Tạo 4 primitive trong `src/components/ui/`, lấy kiểu từ `design/screens/`. Button có các biến thể coral, ink, trắng, nhiều cỡ, render `<a>` khi có `href`. Chip và Segmented dùng `aria-pressed`. Card có các mức bóng và màu nền. Hiển thị tất cả trạng thái trên `/dev/ui`. Không thêm thư viện.

**Tiêu chí nghiệm thu:**
- [ ] Trên project `mobile`, mọi phần tử bấm được cao tối thiểu 44 px.
- [ ] Dùng Tab thấy viền focus rõ ở mọi primitive; `disabled` không bấm được.
- [ ] Không có cuộn ngang ở `/dev/ui` trên 390 px.

**Kiểm chứng:**
- [ ] Test `e2e/primitives.spec.ts` trên 2 project.
- [ ] Đặt `/dev/ui` cạnh `03-tasks-board` và `04-create-task` để so bằng mắt ở 1440 px.

**Phụ thuộc:** T0.6

**File dự kiến:** `src/components/ui/Button.tsx`, `Card.tsx`, `Chip.tsx`, `Segmented.tsx`, `src/app/dev/ui/page.tsx`, `e2e/primitives.spec.ts`

**Quy mô:** M

---

### T0.8 Primitive form và overlay: Field, Switch, Sheet

**Mô tả:** Field gồm label, input/textarea/select, hint và lỗi. Switch dùng `role="switch"`. Sheet dùng `<dialog>` gốc: trượt từ dưới trên phone, nằm giữa từ `md` trở lên. Thêm vào `/dev/ui`.

**Tiêu chí nghiệm thu:**
- [ ] Bấm label focus vào input; khi lỗi có `aria-invalid` và `aria-describedby` đúng.
- [ ] Trên project `mobile`, input có `font-size` tối thiểu 16 px.
- [ ] Switch đổi được bằng phím Space và cập nhật `aria-checked`.
- [ ] Sheet đóng bằng Esc, focus trở về nút đã mở, nội dung phía sau không cuộn.

**Kiểm chứng:**
- [ ] Test `e2e/primitives.spec.ts` mở rộng, chạy trên cả Chromium và WebKit.
- [ ] So bằng mắt với form trong `01-sign-in` và `04-create-task`.

**Phụ thuộc:** T0.6

**File dự kiến:** `src/components/ui/Field.tsx`, `Switch.tsx`, `Sheet.tsx`, `src/app/dev/ui/page.tsx`, `e2e/primitives.spec.ts`

**Quy mô:** M

---

## Checkpoint B: Sau T0.5–T0.8

- [ ] Toàn bộ lệnh kiểm tra đều pass.
- [ ] `/dev/ui` đạt yêu cầu ở 390 và 1440 px khi so với thiết kế.
- [ ] Bạn đã xem `/dev/ui` và đồng ý phong cách trước khi dựng màn hình thật.

---

## Nhóm C: Tự động hóa

### T0.9 CI trên GitHub Actions

**Mô tả:** Thêm script `check` chạy lint, typecheck, test và build. Workflow chạy trên mỗi push và pull request: service `postgres:18` trên máy của GitHub (DB trống mỗi lần chạy, máy bạn không cần cài gì), `npm ci`, `db:migrate`, `check`, cài trình duyệt Playwright, chạy `test:e2e`, tải báo cáo lên khi e2e fail.

**Tiền đề:** Có repo GitHub trống và bạn đồng ý push.

**Tiêu chí nghiệm thu:**
- [ ] `npm run check` pass trên máy.
- [ ] Workflow xanh trên GitHub ở lần push đầu.
- [ ] Commit cố tình làm lỗi một test khiến workflow đỏ.

**Kiểm chứng:**
- [ ] Xem log GitHub Actions thấy migration và test DB thật sự chạy.
- [ ] Không có giá trị bí mật nào trong workflow, ngoài mật khẩu dev của Postgres trong CI.

**Phụ thuộc:** T0.2, T0.4, T0.7, T0.8

**File dự kiến:** `.github/workflows/ci.yml`, `package.json`

**Quy mô:** S

---

## Checkpoint hoàn thành Phase 0

- [ ] CI xanh trên `main`.
- [ ] Bản clone sạch chạy được theo `README.md`.
- [ ] `PLAN.md` đã đánh dấu xong Phase 0.
- [ ] Sẵn sàng sang T1.1.
