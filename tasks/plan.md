# Implementation Plan: Flowday — Phase 1 (Đăng nhập, khung app, kiểm chứng MCP)

> Nguồn: `PLAN.md` (mục 2, 4, 5, 6). Danh sách việc chi tiết: `tasks/todo.md`. Khảo sát ngày 2026-11-01. Kế hoạch Phase 0 đã xong, xem lại bằng `git show 5c468a5:tasks/plan.md`.

## Overview

Phase 1 trả lời câu hỏi rủi ro nhất của dự án: Claude thật có đăng nhập được vào Flowday qua OAuth và gọi được tool MCP không. Sau đó mới dựng phần còn lại của đăng nhập và khung app. Cuối phase có thể đăng ký, đăng nhập, khôi phục mật khẩu, thấy khung app trên mọi khổ màn hình, và Claude gọi được `whoami`.

**Hoàn thành khi:**

1. Chỉ email trong `ALLOWED_EMAILS` đăng ký được, bằng cả mật khẩu lẫn Google. Route trong app chặn người chưa đăng nhập.
2. claude.ai và Claude Code đi hết luồng OAuth, `whoami` trả đúng người dùng.
3. Khung app đúng thiết kế ở 1440 px, không có cuộn ngang ở 360, 390, 744, 820, 1024 và 1440 px.

## Hiện trạng đã kiểm tra

| Hạng mục | Kết quả | Ảnh hưởng |
|---|---|---|
| Repo | `main` sạch, CI xanh ở `5c468a5` | Bắt đầu từ nền đã kiểm chứng |
| Next | `cacheComponents` và `partialPrefetching` đang bật | Đọc phiên phải nằm trong `<Suspense>`, nếu không sẽ lỗi build |
| `better-auth`, `@better-auth/mcp`, `@better-auth/cimd` | Đều là 1.7.14 ổn định, hỗ trợ `drizzle-orm` 0.45 và Next 16 | Không cần dùng beta 1.8 |
| `@modelcontextprotocol/server` | 2.4.0, có sẵn `createMcpHandler` trả handler kiểu Web Fetch | Chạy trực tiếp trong route handler, không cần `mcp-handler` hay adapter Express |
| Gói Claude | Mọi gói thêm được custom connector, gói Free tối đa 1 connector | Một connector là đủ; câu hỏi mở cũ đã có đáp án |
| Tunnel | `cloudflared` và `ngrok` đã có trên máy | Không phải cài thêm cho T1.6 |
| Primitive | Có Button, Card, Chip, Segmented, Field, Switch, Sheet | Chưa có checkbox; dùng `<input type="checkbox">` gốc như thiết kế |

Đã đọc mã nguồn gói 1.7.14 và xác nhận:

- Khớp redirect loopback bỏ qua port cho cả `127.0.0.1` lẫn `localhost`, đúng yêu cầu của Claude Code.
- `client_id_metadata_document_supported` chỉ xuất hiện khi cài `cimd()`.
- Metadata thật của Claude Code (`https://claude.ai/oauth/claude-code-client-metadata`) trả thẳng 200 và đủ trường mà profile `mcp-2026-07-28` yêu cầu.

## Architecture Decisions

- **Đưa cổng rủi ro lên trước.** Phần MCP nằm ngay sau đăng ký và đăng nhập, vì nó cần phiên đăng nhập thật. Sidebar, mail và Google làm sau cổng, để nếu phải đổi thư viện OAuth thì không làm lại những phần đó.
- **Dùng `mcp()` của `@better-auth/mcp`, không dùng `oauthProvider()`.** `mcp()` đã là OAuth provider, và tài liệu cấm đăng ký cả hai. Plugin này gắn token với resource, phục vụ RFC 9728 và có `requireMcpAuth` trả đúng challenge `401`.
- **Chỉ bật CIMD, tắt DCR.** Claude chọn CIMD khi metadata có `client_id_metadata_document_supported` và `"none"`. DCR cho bất kỳ ai trên internet ghi vào bảng client. Chỉ bật khi T1.6 chứng minh Claude cần nó.
- **Giữ `legacy` mặc định (`stateless`) của `createMcpHandler`.** Ví dụ trong tài liệu Better Auth dùng `legacy: "reject"`, sẽ từ chối giao thức đời 2025 mà tài liệu connector của Claude vẫn tham chiếu. Không chép dòng đó.
- **Schema của Better Auth đi qua Drizzle.** Dùng `npx auth generate` để sinh schema, rồi `drizzle-kit generate` và `db:migrate`. Không dùng `auth migrate`, để mọi môi trường và CI chỉ có một đường migration.
- **Đọc phiên theo guide Cache Components.** Hàm `getCurrentUser()` là lớp truy cập dữ liệu, dùng `use cache: private`, và chỉ được gọi trong `<Suspense>`. Layout không `await` phiên ở cấp cao nhất.
- **Hai lớp chặn route.** `src/proxy.ts` kiểm tra nhanh cookie bằng `getSessionCookie` để chuyển hướng mà không chạm DB. Kiểm tra thật nằm ở `getCurrentUser()` và trong từng Server Action. Proxy không bao giờ chạm `/api` và `/.well-known`.
- **Form đăng nhập dùng client SDK của Better Auth.** SDK tự giữ tham số đã ký của luồng OAuth khi quay lại `/oauth/consent`. Đây là chỗ duy nhất dùng client SDK.
- **`BETTER_AUTH_URL` là một giá trị cố định, nguồn của cả `baseURL` lẫn `resource`.** `requireMcpAuth` không hỗ trợ `baseURL` động. Đổi URL tunnel thì đổi biến này rồi khởi động lại.
- **Tunnel cho T1.6, chưa deploy.** Tài liệu Claude khuyên dùng tunnel cho server trên máy. Deploy Vercel vẫn ở T9.4.
- **`/api/mcp` export cả `GET` và `POST`, đều đi qua `requireMcpAuth`.** Handler tự trả `405` cho GET và DELETE ở đời 2025 theo mặc định.
- **Xác minh email là bắt buộc.** Email chủ tài khoản đã công khai trong commit, nên nếu không xác minh, người lạ có thể đăng ký trước bằng đúng email đó trên site công khai. Resend từ `onboarding@resend.dev` gửi được tới email tài khoản Resend, vừa đúng trường hợp này.
- **Gửi mail bằng `fetch` tới API Resend.** Không thêm dependency. Không có `RESEND_API_KEY` thì in link ra console ở dev, và báo lỗi ở production.
- **Không hiện số giả.** Bỏ badge đếm task, danh sách project, thẻ streak và nút `+` project ở Sidebar cho tới khi có dữ liệu (T2.2, T2.4, T7.2).
- **Bỏ checkbox Terms ở trang đăng ký.** `/terms` và `/privacy` chưa có tới T9.3, và checkbox bắt buộc với link chết còn tệ hơn là không có. T9.3 thêm lại.
- **Route chưa làm có trang tạm.** `/tasks`, `/tasks/new`, `/calendar`, `/history`, `/focus`, `/settings` là trang rỗng để điều hướng và kiểm tra trạng thái active được.

Giữ nguyên từ Phase 0: không thêm `clsx` hay thư viện component, không dùng `jsdom`, giao diện tiếng Anh, mỗi task một commit trên `main`, nội dung người dùng nhập dùng `font-content`.

## Dependency Graph

```text
T1.1 Auth server + ALLOWED_EMAILS
  ├── T1.2 Đăng ký
  │     └── T1.3 Đăng nhập, đăng xuất, chặn route ─┬─ T1.4 Authorization server
  │                                                │     └── T1.5 /api/mcp + consent
  │                                                │           └── T1.6 Nghiệm thu với Claude (CỔNG)
  │                                                │                 │
  │                                                └── T1.7 Sidebar ◄┘ (làm sau cổng)
  │                                                      └── T1.8 Khung phone/tablet
  └── T1.9 Mail + xác minh email (cần T1.6)
        ├── T1.10 Quên mật khẩu
        └── T1.11 Google
```

Mỗi task để lại một đường chạy kiểm chứng được: test → auth server, trình duyệt → đăng ký, Claude → tool MCP.

## Task List

Chi tiết tiêu chí nằm trong `tasks/todo.md`.

### Nhóm A: Tài khoản tối thiểu

- [x] T1.1 Auth server và `ALLOWED_EMAILS` (M)
- [x] T1.2 Trang đăng ký (M)
- [x] T1.3 Đăng nhập, đăng xuất, chặn route (M)

### Checkpoint A

- [x] E2E đăng ký → đăng xuất → đăng nhập pass trên desktop và mobile
- [x] CI xanh, migration chạy trên DB trống

### Nhóm B: Cổng rủi ro MCP

- [x] T1.4 Authorization server: JWT, `mcp()`, CIMD (M)
- [x] T1.5 `/api/mcp`, `whoami` và trang consent (M)
- [x] T1.6 Nghiệm thu với Claude thật — CỔNG RỦI RO (S)

### Checkpoint B — dừng lại để quyết định

- [x] claude.ai và Claude Code cùng gọi được `whoami`
- [x] Checklist xác thực ở `PLAN.md` mục 5 đạt, trừ `Origin` (T3.3) và WAF (T9.4)
- [x] Đạt, không cần đổi thư viện OAuth

### Nhóm C: Khung app

- [ ] T1.7 Sidebar và layout `(app)` trên desktop (M)
- [ ] T1.8 Khung phone và tablet (M)

### Nhóm D: Hoàn thiện đăng nhập

- [ ] T1.9 Mail và xác minh email (M)
- [ ] T1.10 Quên mật khẩu (M)
- [ ] T1.11 Đăng nhập Google (S)

### Checkpoint hoàn thành Phase 1

- [ ] E2E đăng ký → xác minh → đăng nhập → thấy khung app pass trên desktop và mobile
- [ ] Bạn đã xem khung app ở 390, 820 và 1440 px
- [ ] `PLAN.md` đã đánh dấu xong Phase 1
- [ ] Sẵn sàng sang T2.1

## Parallelization

- **Tuần tự:** T1.1 → T1.6, vì cùng sửa `src/lib/auth` và thứ tự migration.
- **Song song được sau cổng:** nhóm C và nhóm D.
- **Cần phối hợp:** T1.9 đổi luồng đăng ký nên phải sửa lại E2E của T1.2 và T1.3.

## Risks and Mitigations

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Claude vẫn không kết nối được dù metadata đúng | Cao | T1.6 làm sớm. Bước 1: bật DCR. Bước 2: `oauthProvider()` tự cấu hình. Bước 3: các phương án ở `PLAN.md` mục 7 |
| Luồng CIMD của claude.ai khác Claude Code; chỉ kiểm được metadata của Claude Code | TB | T1.6 thử cả hai bề mặt, ghi lại `client_id` thực tế |
| `requireMcpAuth` chỉ kiểm chữ ký JWT, không đọc DB, nên thu hồi không có hiệu lực ngay | TB | T1.6 đo hành vi thật. T3.4 thêm kiểm tra client đã bị thu hồi chưa, vì tool nào cũng đọc DB |
| Token endpoint chạm giới hạn 10 giây khi Neon đang ngủ | TB | T1.6 đo khi DB vừa thức. `connectionTimeoutMillis` đang là 10 giây nên cần giảm nếu thấy chậm |
| `requireMcpAuth` tự gọi `/jwks` qua HTTP, thêm độ trễ trên serverless | Thấp | Khóa được cache trong tiến trình. T9.4 đo lại |
| URL quick tunnel đổi mỗi lần chạy, phải xóa và thêm lại connector | Thấp | Làm liền một buổi. Nếu cần lặp nhiều lần thì dùng named tunnel |
| `next dev` chặn origin lạ qua tunnel | Thấp | T1.6 chạy `next build` + `next start` |
| E2E và Vitest ghi dữ liệu vào branch `dev` | Thấp | Email riêng cho từng project Playwright, tự xóa user sau khi chạy |
| `npm test` trên Neon từng fail 1 lần rồi tự pass, chưa rõ nguyên nhân | Thấp | Test Phase 1 chạm DB nhiều hơn. Nếu fail lại, giữ nguyên lỗi rồi mới xử lý |
| Tài liệu Better Auth lẫn giữa bản 1.6, 1.7 và beta | Thấp | Khi build, ưu tiên type trong `node_modules` hơn tài liệu web |

## Việc bạn cần làm

Những việc này cần tài khoản của bạn. Secret chỉ đặt vào `.env` trên máy, không gửi vào chat.

| Task | Việc |
|---|---|
| T1.6 | Thêm connector trên claude.ai bằng URL tunnel, đăng nhập, bấm đồng ý, thử `whoami` |
| T1.9 | Tạo tài khoản Resend bằng email của bạn, đặt `RESEND_API_KEY` vào `.env` |
| T1.11 | Tạo OAuth client trên Google Cloud, đặt `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET` vào `.env` |

## Open Questions

Plan chạy theo mặc định bên dưới. Trả lời khác thì mình sửa lại.

- **Google có còn cần không?** Mặc định giữ theo thiết kế, làm ở cuối. App một người dùng nên bỏ T1.11 cũng được, khi đó ẩn nút Google.
