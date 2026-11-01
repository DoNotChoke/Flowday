# Phase 1 — Danh sách việc

Tổng quan và quyết định: `tasks/plan.md`.

**Mọi task** chỉ xong khi đạt tiêu chí riêng, đã chạy thử thật, `npm run check` và `npm run test:e2e` pass, CI xanh sau khi push, không còn code thừa và không có thay đổi ngoài phạm vi. Trước khi viết code Next, đọc guide liên quan trong `node_modules/next/dist/docs/`.

---

## Nhóm A: Tài khoản tối thiểu

### T1.1 Auth server và `ALLOWED_EMAILS`

**Mô tả:** Cài `better-auth`. Tạo `src/lib/auth` với `drizzleAdapter`, email/mật khẩu (tối thiểu 8 ký tự), trường `user.timezone` mặc định `Asia/Ho_Chi_Minh`, và `databaseHooks.user.create.before` từ chối email ngoài `ALLOWED_EMAILS`. Danh sách rỗng thì từ chối tất cả. Sinh schema bằng `npx auth generate` vào `src/lib/db/schema.ts`, rồi `drizzle-kit generate`. Mount tại `src/app/api/auth/[...all]/route.ts`. Thêm `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ALLOWED_EMAILS` vào `.env.example`, `README.md` và `ci.yml` (giá trị test cho CI). Tạo secret thật trong `.env` mà không in ra.

**Tiêu chí nghiệm thu:**
- [x] `auth.api.signUpEmail` với email trong danh sách tạo được user có `timezone` đúng, không phân biệt hoa thường.
- [x] Email ngoài danh sách bị từ chối và không để lại dòng nào trong DB.
- [x] `ALLOWED_EMAILS` rỗng thì mọi đăng ký bị từ chối.

**Kiểm chứng:**
- [x] Viết test trước, thấy fail, rồi mới cài đặt.
- [x] `npm run db:migrate` chạy trên branch `dev` và trên DB trống của CI.
- [x] Test tự xóa user đã tạo.

**Phụ thuộc:** Không

**File dự kiến:** `src/lib/auth/index.ts`, `src/lib/auth/auth.test.ts`, `src/lib/db/schema.ts`, `src/app/api/auth/[...all]/route.ts`, `drizzle/0001_*.sql`, `.env.example`, `README.md`, `.github/workflows/ci.yml`

**Quy mô:** M

---

### T1.2 Trang đăng ký

**Mô tả:** Layout `(auth)` và trang 02 tại `/sign-up`: họ tên, email, mật khẩu, thanh đo độ mạnh, panel "Three steps to a calmer day". Tạo `src/lib/auth/client.ts`. Lỗi hiện ngay tại trường tương ứng. Tạm chưa có nút Google và checkbox Terms. Dưới `lg`, panel minh họa xếp dưới form hoặc ẩn đi, đối chiếu `design/screens/02-sign-up.html`.

**Tiêu chí nghiệm thu:**
- [x] Đăng ký thành công thì tới `/tasks` (tạm là trang rỗng).
- [x] Email ngoài danh sách và email đã tồn tại hiện lỗi tại form, không chuyển trang.
- [x] Không có cuộn ngang ở 360 và 390 px; ô nhập 16 px trên cảm ứng.

**Kiểm chứng:**
- [x] `e2e/auth.spec.ts` pass trên cả 2 project, mỗi project dùng email riêng và tự dọn dữ liệu.
- [x] Mở trang bằng tay, so ảnh với thiết kế ở 390 và 1440 px.
- [x] Toàn bộ form dùng được bằng bàn phím.

**Phụ thuộc:** T1.1

**File dự kiến:** `src/app/(auth)/layout.tsx`, `src/app/(auth)/sign-up/page.tsx`, `src/app/(auth)/sign-up/SignUpForm.tsx`, `src/lib/auth/client.ts`, `e2e/auth.spec.ts`

**Quy mô:** M

---

### T1.3 Đăng nhập, đăng xuất, chặn route

**Mô tả:** Trang 01 tại `/sign-in`, bỏ link "Skip to app". Thêm link "Already have an account? Sign in" còn thiếu ở `/sign-up`, form đăng nhập dùng `method="post"` và đọc mật khẩu từ `FormData` như form đăng ký. Tùy chọn "Keep me signed in for 30 days": bật thì phiên 30 ngày, tắt thì hết khi đóng trình duyệt. Thêm `getCurrentUser()` trong `src/lib/auth/session.ts` theo guide `authentication-with-cache-components`, `src/proxy.ts` kiểm tra cookie, trang tạm `/tasks` có nút Sign out. `/` chuyển về `/tasks`. Cập nhật `smoke.spec.ts` vì trang chủ không còn tiêu đề cũ.

**Tiêu chí nghiệm thu:**
- [ ] Chưa đăng nhập vào `/tasks` bị chuyển về `/sign-in`; đăng nhập xong quay lại đúng trang đã định.
- [ ] Sai mật khẩu hiện lỗi chung, không tiết lộ email có tồn tại hay không.
- [ ] Sau đăng xuất, nút Back không xem lại được trang trong app.
- [ ] Tham số quay lại chỉ nhận đường dẫn nội bộ; URL ngoài bị bỏ qua.

**Kiểm chứng:**
- [ ] E2E đăng ký → đăng xuất → đăng nhập pass trên cả 2 project.
- [ ] Test cookie giả mạo: proxy cho qua nhưng `getCurrentUser()` vẫn chuyển về `/sign-in`.
- [ ] `curl -I` tới `/api/mcp` và `/.well-known/x` không bị proxy chuyển hướng.
- [ ] `npm run build` không có lỗi đọc phiên ngoài `<Suspense>`.

**Phụ thuộc:** T1.2

**File dự kiến:** `src/app/(auth)/sign-in/page.tsx`, `src/app/(auth)/sign-in/SignInForm.tsx`, `src/lib/auth/session.ts`, `src/proxy.ts`, `src/app/(app)/tasks/page.tsx`, `e2e/auth.spec.ts`, `e2e/smoke.spec.ts`, `next.config.ts`

**Quy mô:** M

---

## Checkpoint A

- [ ] E2E đăng ký → đăng xuất → đăng nhập pass trên desktop và mobile.
- [ ] CI xanh, migration chạy trên DB trống.

---

## Nhóm B: Cổng rủi ro MCP

### T1.4 Authorization server: JWT, `mcp()`, CIMD

**Mô tả:** Cài `@better-auth/mcp` và `@better-auth/cimd`. Thêm `jwt()`, `mcp({ loginPage: "/sign-in", consentPage: "/oauth/consent", resource: <BETTER_AUTH_URL>/api/mcp, scopes })` và `cimd({ fetchClientMetadataResource, metadataProfile: "mcp-2026-07-28" })`. Scope gồm `openid`, `profile`, `offline_access`, `tasks:read`, `tasks:write`. Sinh lại schema và migration. Phục vụ metadata ở gốc domain: `/.well-known/oauth-protected-resource/api/mcp` và `/.well-known/oauth-authorization-server/api/auth`. DCR để tắt. Đối chiếu tên API với type trong `node_modules`.

**Tiêu chí nghiệm thu:**
- [ ] Protected Resource Metadata có `resource` bằng đúng URL `/api/mcp`, issuer đứng đầu `authorization_servers`.
- [ ] AS metadata có `code_challenge_methods_supported: ["S256"]`, `client_id_metadata_document_supported: true` và `"none"` trong `token_endpoint_auth_methods_supported`.
- [ ] Không có `registration_endpoint`.

**Kiểm chứng:**
- [ ] Vitest gọi handler và khẳng định từng trường ở trên.
- [ ] `curl` cả hai URL trên server đang chạy đều trả 200 kèm JSON.
- [ ] Migration chạy trên DB trống của CI; các bảng `oauth*` và `jwks` tồn tại.

**Phụ thuộc:** T1.3

**File dự kiến:** `src/lib/auth/index.ts`, `src/lib/auth/mcp.test.ts`, `src/lib/db/schema.ts`, `src/app/.well-known/oauth-protected-resource/api/mcp/route.ts`, `src/app/.well-known/oauth-authorization-server/api/auth/route.ts`, `drizzle/0002_*.sql`

**Quy mô:** M

---

### T1.5 `/api/mcp`, `whoami` và trang consent

**Mô tả:** Cài `@modelcontextprotocol/server` và `zod`. `src/mcp/server.ts` tạo `McpServer` với tool `whoami` (scope `tasks:read`), trả tên, email và múi giờ từ `sub` của token. `src/app/api/mcp/route.ts` dùng `createMcpHandler` với `legacy` mặc định, bọc trong `requireMcpAuth`, có `challengeScopes`. Trang `/oauth/consent` dựng từ primitive: hiện tên client, hostname của redirect URI, danh sách scope, cảnh báo thêm khi redirect là loopback, nút Allow và Deny.

**Tiêu chí nghiệm thu:**
- [ ] Không có token hoặc token sai trả `401` kèm `WWW-Authenticate: Bearer resource_metadata="...", scope="..."`.
- [ ] Handler trả lời được cả `initialize` đời `2025-11-25` lẫn yêu cầu đời `2026-07-28`.
- [ ] Trang consent hiện hostname của redirect URI và có cảnh báo loopback; bấm Deny trả lỗi về client.
- [ ] Chưa đăng nhập mà vào luồng OAuth thì qua `/sign-in`, xong quay lại consent.

**Kiểm chứng:**
- [ ] Vitest gọi `mcpHandler.fetch` với request của hai đời giao thức.
- [ ] `npx @modelcontextprotocol/inspector --cli http://localhost:3000/api/mcp --transport http --method tools/list` trả `401`.
- [ ] Trên máy: thêm connector vào Claude Code bằng URL `localhost`, đăng nhập, gọi `whoami` được.

**Phụ thuộc:** T1.4

**File dự kiến:** `src/mcp/server.ts`, `src/mcp/server.test.ts`, `src/app/api/mcp/route.ts`, `src/app/(auth)/oauth/consent/page.tsx`, `src/app/(auth)/oauth/consent/ConsentForm.tsx`

**Quy mô:** M

---

### T1.6 Nghiệm thu với Claude thật — CỔNG RỦI RO

**Mô tả:** Chạy `next build` + `next start`, mở `cloudflared tunnel --url http://localhost:3000`, đặt `BETTER_AUTH_URL` theo URL tunnel. Bạn thêm connector trên claude.ai, mình thử Claude Code qua cùng URL. Ghi kết quả vào `PLAN.md` mục 5. Nếu Claude không chọn CIMD, bật DCR rồi thử lại trước khi coi là thất bại. Đóng tunnel khi xong.

**Tiêu chí nghiệm thu:**
- [ ] claude.ai: connector hiện **Connected**, tool `whoami` xuất hiện, một lần gọi thật trả đúng người dùng.
- [ ] Claude Code: đi hết luồng OAuth qua URL tunnel, `whoami` trả đúng người dùng.
- [ ] Hết hạn access token thì Claude tự refresh mà không phải đăng nhập lại (đặt thời hạn ngắn khi thử).
- [ ] Mọi mục checklist ở `PLAN.md` mục 5 được đánh dấu đạt, hoặc ghi rõ lý do hoãn.

**Kiểm chứng:**
- [ ] Log server ghi `client_id` và phiên bản giao thức của từng bề mặt.
- [ ] Để Neon ngủ trên 5 phút, đo `/oauth2/token`: phải dưới 10 giây.
- [ ] Đo hành vi thu hồi: xóa refresh token, ghi lại thời gian Claude còn gọi được. Cập nhật tiêu chí T3.4 theo số đo.
- [ ] Sau khi đóng tunnel, `BETTER_AUTH_URL` trong `.env` trở lại `http://localhost:3000`.

**Phụ thuộc:** T1.5

**File dự kiến:** `PLAN.md`, `tasks/plan.md`

**Quy mô:** S

---

## Checkpoint B — dừng lại để quyết định

- [ ] claude.ai và Claude Code cùng gọi được `whoami`.
- [ ] Checklist xác thực ở `PLAN.md` mục 5 đạt.
- [ ] Nếu không đạt: dừng, không làm T1.7 trở đi, đánh giá lại thư viện OAuth cùng bạn.

---

## Nhóm C: Khung app

### T1.7 Sidebar và layout `(app)` trên desktop

**Mô tả:** Layout `(app)` với Sidebar 260 px từ `lg`: logo, nút New task, 5 mục điều hướng có trạng thái active, tên và email người dùng, nút Sign out. Phần đọc phiên nằm trong `<Suspense>`, không `await` ở cấp layout. Thêm trang tạm `/tasks/new`, `/calendar`, `/history`, `/focus`, `/settings`, và thêm các đường dẫn này vào matcher của proxy. Chưa có badge, danh sách project hay thẻ streak.

**Tiêu chí nghiệm thu:**
- [ ] Giống `design/screens/component-sidebar.html` ở 1440 px, phần đã lùi được ẩn hẳn.
- [ ] Mục đang mở có `aria-current="page"`.
- [ ] Khung Sidebar và nội dung tĩnh hiện ngay; chỉ khối người dùng chờ phiên.
- [ ] Mọi trang trong app đều chặn người chưa đăng nhập.

**Kiểm chứng:**
- [ ] E2E bấm qua 5 mục ở 1440 px.
- [ ] Không có cuộn ngang ở 1024 và 1440 px.
- [ ] Tab qua toàn bộ Sidebar, focus nhìn rõ.

**Phụ thuộc:** T1.6, T1.3

**File dự kiến:** `src/app/(app)/layout.tsx`, `src/components/app/Sidebar.tsx`, `src/components/app/NavLinks.tsx`, `src/components/app/UserMenu.tsx`, `src/proxy.ts`, `e2e/shell.spec.ts`, cùng 5 trang tạm

**Quy mô:** M

---

### T1.8 Khung phone và tablet

**Mô tả:** Dưới `lg`: top bar và bottom nav 5 mục (Tasks, Calendar, nút New, History, Focus), tôn trọng `safe-area-inset-bottom`. Settings và tài khoản nằm trong drawer dùng lại `Sheet`. Layout chọn theo chiều rộng, không theo loại thiết bị.

**Tiêu chí nghiệm thu:**
- [ ] Không có cuộn ngang ở 360, 390, 744 và 820 px.
- [ ] Đúng breakpoint: 1023 px có bottom nav, 1024 px có Sidebar.
- [ ] Drawer đóng bằng Esc và trả focus về nút đã mở nó.
- [ ] Mọi vùng chạm đạt 44 px trên cảm ứng; bottom nav không che nội dung cuối trang.

**Kiểm chứng:**
- [ ] `e2e/shell.spec.ts` chạy thêm các viewport trên.
- [ ] Bạn xem ở 390, 820 và 1440 px.

**Phụ thuộc:** T1.7

**File dự kiến:** `src/components/app/TopBar.tsx`, `src/components/app/BottomNav.tsx`, `src/components/app/AccountSheet.tsx`, `src/app/(app)/layout.tsx`, `e2e/shell.spec.ts`

**Quy mô:** M

---

## Nhóm D: Hoàn thiện đăng nhập

### T1.9 Mail và xác minh email

**Mô tả:** `src/lib/mail.ts` gọi API Resend bằng `fetch`, không thêm dependency. Không có `RESEND_API_KEY` thì in link ra console ở dev, và báo lỗi ở production. Bật `requireEmailVerification` và `sendOnSignUp`. Đăng ký xong hiện màn hình "Check your email", có nút gửi lại. Sửa E2E của T1.2 và T1.3: helper đánh dấu `email_verified` trực tiếp trong DB.

**Tiêu chí nghiệm thu:**
- [ ] Chưa xác minh thì không đăng nhập được, form báo rõ cách xử lý.
- [ ] Bấm link xác minh thì đăng nhập được; link đã dùng hoặc hết hạn bị từ chối.
- [ ] Không có API key ở production thì báo lỗi, không âm thầm bỏ qua.

**Kiểm chứng:**
- [ ] Vitest thay `lib/mail` bằng spy, chạy đủ luồng qua `auth.api`.
- [ ] Bạn đặt key, đăng ký thử và nhận email thật từ `onboarding@resend.dev`.
- [ ] Không có token nào bị in vào log ở production.

**Phụ thuộc:** T1.6

**File dự kiến:** `src/lib/mail.ts`, `src/lib/auth/index.ts`, `src/lib/auth/auth.test.ts`, `src/app/(auth)/sign-up/SignUpForm.tsx`, `src/app/(auth)/sign-in/SignInForm.tsx`, `e2e/helpers.ts`

**Quy mô:** M

---

### T1.10 Quên mật khẩu

**Mô tả:** `/forgot-password` và `/reset-password` dựng từ primitive cùng phong cách trang đăng nhập. Nối link "Forgot password?" ở trang 01. Đổi mật khẩu xong thì thu hồi các phiên khác.

**Tiêu chí nghiệm thu:**
- [ ] Đổi mật khẩu qua link trong email thành công, đăng nhập được bằng mật khẩu mới.
- [ ] Link dùng lại hoặc hết hạn bị từ chối, trang báo lỗi rõ.
- [ ] Form trả cùng thông báo dù email có tồn tại hay không.
- [ ] Phiên cũ trên thiết bị khác hết hiệu lực.

**Kiểm chứng:**
- [ ] Vitest với spy mail phủ cả 4 tiêu chí.
- [ ] E2E mở cả hai trang ở 390 và 1440 px, không có cuộn ngang.

**Phụ thuộc:** T1.9

**File dự kiến:** `src/app/(auth)/forgot-password/page.tsx`, `src/app/(auth)/reset-password/page.tsx`, `src/lib/auth/index.ts`, `src/lib/auth/auth.test.ts`, `e2e/auth.spec.ts`

**Quy mô:** M

---

### T1.11 Đăng nhập Google

**Mô tả:** Bật `socialProviders.google` khi có đủ biến môi trường; thiếu thì ẩn nút. Thêm nút "Continue with Google" và "Sign up with Google" ở trang 01 và 02. Chỉ liên kết tài khoản khi email phía Google đã xác minh. `ALLOWED_EMAILS` vẫn áp dụng vì hook nằm ở bước tạo user.

**Tiêu chí nghiệm thu:**
- [ ] Bạn đăng nhập được bằng Google và vào `/tasks`.
- [ ] Tài khoản Google ngoài danh sách bị từ chối, trang hiện lỗi dễ hiểu.
- [ ] Thiếu biến môi trường thì không có nút, app vẫn chạy.

**Kiểm chứng:**
- [ ] E2E bấm nút và kiểm tra chuyển tới `accounts.google.com`.
- [ ] Vitest khẳng định hook từ chối user tạo từ Google.
- [ ] Đăng nhập Google bằng tay trên máy.

**Phụ thuộc:** T1.9

**File dự kiến:** `src/lib/auth/index.ts`, `src/app/(auth)/sign-in/SignInForm.tsx`, `src/app/(auth)/sign-up/SignUpForm.tsx`, `.env.example`, `README.md`

**Quy mô:** S

---

## Checkpoint hoàn thành Phase 1

- [ ] E2E đăng ký → xác minh → đăng nhập → thấy khung app pass trên desktop và mobile.
- [ ] Bạn đã xem khung app ở 390, 820 và 1440 px.
- [ ] `PLAN.md` đã đánh dấu xong Phase 1.
- [ ] Sẵn sàng sang T2.1.
