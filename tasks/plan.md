# Implementation Plan: Flowday — Phase 0 (Nền móng)

> Nguồn: `PLAN.md` (mục 2, 4, 6). Danh sách việc chi tiết: `tasks/todo.md`. Khảo sát ngày 2026-11-01.

## Overview

Phase 0 dựng nền để Phase 1 bắt đầu viết tính năng ngay: app Next.js chạy được, Postgres có migration thật, kiểm thử chạy trên desktop và mobile, thiết kế được tách thành file đọc được, và bộ primitive UI đúng phong cách Flowday. Phase này chưa có tính năng cho người dùng cuối.

**Hoàn thành khi:** từ một bản clone sạch, làm theo `README.md` là chạy được app, migration và toàn bộ test; trang `/dev/ui` hiển thị đủ primitive ở 390 và 1440 px.

## Hiện trạng đã kiểm tra

| Hạng mục | Kết quả | Ảnh hưởng |
|---|---|---|
| Repo | Chưa có git, chưa có code; có `.venv`, `.idea`, `.jbeval`, 2 file HTML, `PLAN.md` | Scaffold không chạy thẳng tại gốc được |
| Node / npm | 24.22 / 11.19 | Đạt yêu cầu của Next 16 (≥ 20.9) |
| Git | Có tên và email; chưa đặt nhánh mặc định | Dùng `git init -b main` |
| Neon | Chưa có project | Phải tạo `flowday-dev` trước T0.3 |
| Playwright | Chỉ có Chromium | Cần cài thêm WebKit |
| GitHub CLI | Chưa cài | Repo GitHub phải tạo thủ công (T0.9) |
| Cổng 3000 | Đang trống | Không xung đột |

Chạy thử `create-next-app@16.4.3` trong thư mục tạm cho thấy:

- `.gitignore` có dòng `.env*`, nên chặn cả `.env.example` nếu không thêm ngoại lệ.
- `next-env.d.ts` bị ignore, nên `tsc` trên bản clone sạch cần `next typegen` chạy trước.
- Scaffold ghim TypeScript 5 và ESLint 9, thấp hơn bản mới nhất trên npm (7 và 10).
- Tailwind nối qua `@tailwindcss/turbopack`, không phải PostCSS.
- `AGENTS.md` được sinh sẵn và `next dev` tự thêm lại. Nó yêu cầu đọc tài liệu trong `node_modules/next/dist/docs/` trước khi viết code Next.

## Architecture Decisions

- **Scaffold trong thư mục tạm tên `flowday` rồi chép về gốc.** Thư mục gốc có file không liên quan và tên `ToDoApp` có chữ hoa, không hợp với tên package npm.
- **Giữ nguyên phiên bản scaffold sinh ra.** TypeScript 5 và ESLint 9 là tổ hợp Next 16.4 đã chọn; không tự nâng lên 7 và 10. Chỉ nâng `@types/node` lên 24 cho khớp runtime.
- **Bản Next ghim `16.4.3`**, các gói khác khóa bằng lockfile.
- **Không dùng Docker.** Dev và test chạy trên project Neon riêng `flowday-dev` (Postgres 18, Singapore), production là project `flowday`. Neon Free cho 100 project, mỗi project có 100 CU-giờ riêng, nên việc dev không ăn quota production. CI dùng Postgres có sẵn trên máy của GitHub. Code dùng một driver `pg` cho mọi môi trường.
- **Migration đầu tiên là `CREATE EXTENSION unaccent`**, thay cho migration trống. T2.9 cần extension này, và test `unaccent()` chứng minh toàn bộ đường đi app → DB hoạt động.
- **Test đầu tiên là test thật.** Vitest vào cùng task với DB client để khỏi phải viết test giả; Playwright có smoke test ngay từ T0.2.
- **Playwright 2 project:** `desktop` (Chromium, 1440×900) và `mobile` (WebKit, 390×844). Các khổ iPad để lại cho T9.1.
- **Không thêm thư viện component, icon hay `clsx`.** Biểu tượng là SVG inline như bản thiết kế; Sheet dùng `<dialog>` gốc của trình duyệt, nên có sẵn đóng bằng Esc và trả focus.
- **Không dùng `jsdom` hay Testing Library.** Primitive được kiểm tra bằng Playwright trên trình duyệt thật.
- **`/dev/ui` chỉ tồn tại ngoài production**, trả 404 khi `NODE_ENV=production`.
- **Vùng chạm 44 px dùng `@media (pointer: coarse)`.** Thiết kế có nút 38 px; giữ nguyên trên desktop, tăng lên 44 px trên màn hình cảm ứng.
- **Ngôn ngữ giao diện là tiếng Anh như thiết kế.** Không dựng i18n.
- **Mỗi task một commit trên `main`.** Không push khi chưa được yêu cầu.

## Dependency Graph

```text
T0.1 Repo + app
  ├── T0.2 Playwright smoke
  ├── T0.3 Postgres + migration ── T0.4 DB client + Vitest
  └── T0.5 Tách thiết kế ── T0.6 Token + font ─┬─ T0.7 Primitive hành động
                                               └─ T0.8 Primitive form + Sheet

T0.2 + T0.4 + T0.7 + T0.8 ── T0.9 CI
```

Thứ tự nền móng trước, nhưng mỗi task để lại một đường chạy kiểm chứng được: trình duyệt → app, test → DB, script → file thiết kế, trang `/dev/ui` → token và primitive. Rủi ro môi trường (kết nối Neon, WebKit) được xử lý trước phần UI để lộ lỗi sớm.

## Task List

Chi tiết tiêu chí nằm trong `tasks/todo.md`.

### Nhóm A: App và dữ liệu chạy được

- [x] T0.1 Khởi tạo repo và app Next.js (M)
- [x] T0.2 Playwright smoke trên desktop và mobile (S)
- [ ] T0.3 Postgres và migration đầu tiên (M)
- [ ] T0.4 DB client, Vitest và README (M)

### Checkpoint A

- [ ] Bản clone sạch chạy được theo README
- [ ] Lint, typecheck, test, e2e, build đều pass

### Nhóm B: Thiết kế và UI

- [ ] T0.5 Tách thiết kế ra `design/screens/` (S)
- [ ] T0.6 Design token và font (M)
- [ ] T0.7 Primitive hành động: Button, Card, Chip, Segmented (M)
- [ ] T0.8 Primitive form và overlay: Field, Switch, Sheet (M)

### Checkpoint B

- [ ] `/dev/ui` đối chiếu đạt với thiết kế ở 390 và 1440 px, người duyệt đã xem

### Nhóm C: Tự động hóa

- [ ] T0.9 CI trên GitHub Actions (S)

### Checkpoint hoàn thành Phase 0

- [ ] CI xanh trên GitHub
- [ ] Sẵn sàng sang Phase 1

## Parallelization

- **Song song được sau T0.1:** T0.2, T0.3 và T0.5.
- **Song song được sau T0.6:** T0.7 và T0.8, nhưng cả hai cùng sửa `/dev/ui` nên phải gộp cẩn thận.
- **Tuần tự:** T0.3 → T0.4 và T0.5 → T0.6.

## Risks and Mitigations

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Chạy nhầm lệnh dev hoặc test vào DB production | Cao | `.env` trên máy chỉ chứa URL của `flowday-dev`; URL production chỉ nằm trong biến môi trường của Vercel |
| Dev và test cần mạng, test chậm hơn DB trên máy | Thấp | Chấp nhận được với một người dùng. Test có ghi dữ liệu phải tự dọn sau khi chạy |
| Chữ tiếng Việt lệch nét vì trong cùng một từ có ký tự từ Poppins và Be Vietnam Pro | TB | Xem bằng mắt ở T0.6 với câu tiếng Việt dài. Nếu xấu, dùng riêng Be Vietnam Pro cho nội dung do người dùng nhập |
| Next 16 khác kiến thức có sẵn | TB | Đọc `node_modules/next/dist/docs/` theo `AGENTS.md` trước khi viết `layout.tsx` và `globals.css` |
| WebKit trên Windows khác Safari thật | Thấp | CI chạy lại trên Linux; thiết bị thật kiểm tra ở T9.1 |
| Test e2e không ổn định khi chạy `next dev` | Thấp | CI chạy e2e trên bản `next build` + `next start` nếu `next dev` gây lỗi chập chờn; khi đó `/dev/ui` cần cờ bật riêng |

## Open Questions

- **Repo GitHub:** `gh` chưa được cài, nên T0.9 cần một repo trống do bạn tạo (mặc định: private, tên `flowday`) và lời đồng ý push. Các task khác không phụ thuộc vào câu này.
- **Neon:** trước T0.3, bạn tạo project `flowday-dev` (AWS Singapore, Postgres 18) và dán connection string vào file `.env` trên máy. Không gửi chuỗi này vào chat vì nó chứa mật khẩu.
