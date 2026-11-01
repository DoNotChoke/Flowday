# Flowday — Kế hoạch triển khai

> Cập nhật: 2026-11-01 · Nguồn UI: `Flowday — ToDo Web App (1).html` (10 màn hình + component Sidebar). Bản `Flowday — ToDo Web App.html` đã được thay thế.

## 1. Mục tiêu

Xây **Flowday**: web app quản lý công việc, dùng đúng UI đã thiết kế, chạy tốt trên máy tính và điện thoại. Người dùng kết nối Flowday với Claude qua **MCP** để Claude đọc và tạo task thay họ.

**V1 hoàn thành khi:**

1. Người dùng đăng ký, tạo và quản lý task và project, xem Calendar, chạy Focus, xem History và streak.
2. Mọi màn hình không có thanh cuộn ngang và thao tác được ở 360, 390, 744, 820, 1024, 1180 và 1440 px, bằng cả chuột lẫn cảm ứng.
3. Từ Claude, sau khi đăng nhập OAuth, câu lệnh *"Tạo 3 task từ ghi chú họp này, deadline thứ Sáu"* tạo đúng task và deadline trên Board, không trùng khi Claude gọi lại.

## 2. Quyết định kiến trúc

| Hạng mục | Quyết định | Lý do |
|---|---|---|
| Kiến trúc | Một app Next.js duy nhất; web và MCP cùng gọi `src/services/` | Một lần deploy, một nơi chứa logic. Không cần REST API riêng |
| Ngôn ngữ | TypeScript strict, Node 24 | UI mẫu là React; `.venv` trong repo đang rỗng nên không dùng Python |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, `@dnd-kit` | Server Components + Server Actions, không cần thêm thư viện state |
| Database | PostgreSQL 18 + Drizzle ORM | Truy vấn thống kê theo ngày và múi giờ; cùng driver `pg` cho local và Neon |
| Đăng nhập | Better Auth: email/mật khẩu + Google, bắt buộc xác minh email | Plugin `mcp()` của `@better-auth/mcp` làm authorization server cho MCP. Email chủ tài khoản đã công khai trong commit nên phải xác minh để người lạ không đăng ký trước |
| MCP | Remote MCP (Streamable HTTP), không giữ session, tại `/api/mcp`, dùng `createMcpHandler` của `@modelcontextprotocol/server` 2.x | Một URL dùng được cho claude.ai, Desktop, mobile và Claude Code. Handler kiểu Web Fetch chạy thẳng trong route handler và phục vụ cả hai đời giao thức |
| Xác thực MCP | OAuth 2.1 (PKCE S256) với CIMD; DCR tắt, chỉ bật nếu T1.6 cho thấy cần | Claude dùng CIMD khi server quảng bá. DCR cho bất kỳ ai ghi vào bảng client và đã bị MCP deprecate |
| Cập nhật dữ liệu | Refetch khi quay lại tab, không poll | Để Neon được ngủ. `shortcut: chưa có realtime, thêm poll hoặc SSE nếu cần thấy task ngay khi đang nhìn Board` |
| Kiểm thử | Vitest (Postgres thật) + Playwright (project desktop và mobile) | Service, MCP và luồng UI đều chạy được trong CI |
| Người dùng | Một người; `ALLOWED_EMAILS` chặn đăng ký từ email khác | App công khai trên internet nhưng chỉ phục vụ chủ sở hữu; tránh người lạ dùng hết quota |
| Hạ tầng | Vercel (`sin1`), Neon Postgres (`aws-ap-southeast-1`), Upstash QStash, Resend | Không phải quản lý server, $0/tháng khi còn là dự án cá nhân. App và DB cùng ở Singapore nên nhanh cho người dùng Việt Nam. Không dùng Docker: dev và test chạy trên branch `dev` của project Neon `flowday`, dùng chung quota với branch `production` |

Phiên bản tham chiếu ngày 2026-11-01: `next` 16.4, `react` 19.3, `tailwindcss` 4.3, `drizzle-orm` 0.45, `better-auth`, `@better-auth/mcp`, `@better-auth/cimd` 1.7.14, `@modelcontextprotocol/server` 2.4, `zod` 4.6, `vitest` 5, `@playwright/test` 1.64. Khóa bằng lockfile.

```text
 Trình duyệt (desktop/mobile)            Claude (web, Desktop, mobile, Code)
          │ Server Actions                        │ HTTPS + Bearer token
          ▼                                       ▼
   src/app/(app)/*                    /api/mcp ◄── OAuth: Better Auth
          └──────────────► src/services/ ◄────────┘
                  (zod, luôn nhận userId, ghi activity)
                                 ▼
                             PostgreSQL
```

### Cấu trúc thư mục

```text
design/screens/          HTML từng màn hình, tách từ bundle
scripts/                 extract-design.mjs
drizzle/                 migrations
src/app/(auth)/          sign-in, sign-up, forgot/reset password, oauth/consent
src/app/(app)/           tasks, tasks/new, tasks/[id], projects/new, projects/[id], calendar, history, focus, settings
src/app/api/             auth, mcp, cron/reminders, reminders/send
src/components/ui/       Button, Card, Chip, Field, Segmented, Switch, Sheet...
src/services/            tasks, projects, stats, focus, activity (+ *.test.ts)
src/mcp/                 tools.ts, server.ts
src/lib/                 db, auth, mail, datetime
e2e/                     Playwright
```

## 3. Mô hình dữ liệu

| Bảng | Cột chính |
|---|---|
| `user` + bảng của Better Auth | thêm `timezone` (mặc định `Asia/Ho_Chi_Minh`) |
| `project` | `user_id` (chủ sở hữu), `name`, `key`, `description`, `color`, `icon`, `template`, `start_date?`, `target_date?`, `budget_hours?`, `task_seq`, `archived_at?` |
| `milestone` | `project_id`, `name`, `due_date`, `position` |
| `category` | `user_id`, `name`, `color` — tạo sẵn bộ mặc định khi đăng ký |
| `task` | `user_id`, `project_id?`, `number?`, `milestone_id?`, `title`, `description`, `status`, `priority`, `due_at?`, `due_has_time`, `planned_at?`, `duration_min?`, `estimate_min?`, `alert_enabled`, `alert_sent_at?`, `position`, `completed_at?`, `canceled_at?`, `source` (`web`/`mcp`), `client_request_id?`, timestamps |
| `task_category` | quan hệ nhiều-nhiều task ↔ category |
| `subtask` | `task_id`, `title`, `done`, `position` |
| `activity` | `task_id`, `actor` (`user`/`mcp`), `type`, `payload`, `created_at` — comment cũng là một `type`, không cần bảng riêng |
| `focus_session` | `user_id`, `task_id?`, `mode`, `started_at`, `ended_at`, `seconds`, `completed` |

Quy tắc nghiệp vụ:

- `status`: `ongoing`, `in_process`, `completed`, `canceled`. `priority`: `low`, `medium`, `high`, `urgent`.
- Vòng % trên card là `subtask done / total`. Không có subtask thì 100% khi completed, ngược lại 0%.
- Calendar hiển thị task theo `planned_at`, nếu không có thì theo `due_at`. Thiếu cả hai là **Unscheduled**.
- Một ngày tính streak khi có ít nhất 1 task completed **hoặc** 1 focus session hoàn thành, theo múi giờ người dùng. UI mẫu nói cả hai nên lấy hợp của hai điều kiện.
- Streak tính khi truy vấn, không lưu. `shortcut: tính lại mỗi lần đọc, thêm bảng tổng hợp theo ngày nếu truy vấn History > 200 ms`.
- `(user_id, client_request_id)` là unique, để Claude gọi lại không tạo trùng.
- Mã task như `FLW-12` là `project.key` + `task.number`. `number` lấy bằng cách tăng nguyên tử `task_seq`; task không thuộc project thì không có mã; chuyển project thì cấp số mới.
- `key` tự sinh từ tên và bỏ dấu tiếng Việt (`Đồ án tốt nghiệp` → `DAT`), trùng thì thêm số. Unique theo `(user_id, key)`. Bản mẫu lấy thẳng ký tự đầu nên sẽ ra chữ có dấu.
- Progress của project = completed / (tổng − canceled). Bản mẫu ghi 62% cạnh 11/18 task; con số đó khớp 46/74 giờ chứ không khớp số task.
- Milestone tính % theo task gắn với nó: 100% là Done, trên 0% là In progress, còn lại là Planned.
- Burndown là số giờ estimate còn lại theo ngày, suy ra từ `created_at`, `completed_at`, `canceled_at`. Đường Ideal chạy từ `start_date` đến `target_date`. `shortcut: không lưu lịch sử đổi estimate, thêm bảng snapshot nếu cần burndown chính xác tuyệt đối`.

## 4. Đối chiếu UI

| Thiết kế | Route | Ghi chú |
|---|---|---|
| 01 Sign in | `/sign-in` | Bỏ link "Skip to app (prototype)" |
| 02 Sign up | `/sign-up` | Giữ thanh đo độ mạnh mật khẩu |
| Sidebar | layout `(app)` | Số liệu lấy từ DB, mobile đổi sang bottom nav. **Thêm** highlight project đang mở (bản mẫu chưa có) |
| 03 Tasks board | `/tasks` | Trang chính sau đăng nhập |
| 04 Create task | `/tasks/new` | Đã có Project và Time estimate. Nhận `?project=` khi đi từ trang project |
| 05 Task detail | `/tasks/[id]` | Thiết kế chưa đổi: **thêm** mã task, Project, Milestone và ô sửa Estimate |
| 06 Calendar | `/calendar` | Chỉ có bản Month, phải tự thiết kế Week và Day |
| 07 History & streak | `/history` | Chỉ có bản Year, Week và Month dùng lại các card |
| 08 Focus mode | `/focus` | |
| 09 Create project | `/projects/new` | Dùng lại làm form sửa tại `/projects/[id]/settings` |
| 10 Project overview | `/projects/[id]` | Chỉ tab Overview có thiết kế; Board và List dùng lại component của `/tasks` |
| *Chưa có thiết kế* | `/settings`, `/forgot-password`, `/reset-password`, `/oauth/consent`, `/terms`, `/privacy` | Dựng từ primitives cùng phong cách |

### Thành phần UI lùi sau V1 (ẩn khỏi giao diện)

| Thành phần | Lý do |
|---|---|
| Assignee, Team, người phụ trách checklist; ở màn Project: Members, Visibility, Share, cột Assignee, Team workload | V1 là app cá nhân. UI mời thành viên đã có, nhưng còn cần phân quyền, lời mời và đổi mô hình truy cập nên tách riêng (mục 9) |
| Workflow statuses tùy chỉnh và dòng "Task inherits the project's members & statuses" | Board chung, thẻ thống kê và MCP đều dựa trên 4 status cố định. V1 giữ nguyên 4 status |
| Tab Timeline của project | Chưa có thiết kế |
| Attachment (tab, nút đính kèm, tab Files của project) | Cần storage riêng |
| Nút "Synced with Google Calendar" | Cần tích hợp OAuth và sync hai chiều |
| Nút "Break into subtasks" | Cần API key Claude, phát sinh chi phí. Trong V1 Claude làm việc này qua tool `add_subtasks` |
| Ambient sound | File thiết kế không có âm thanh, cần nguồn có bản quyền |
| Browser notification | V1 gửi email và thông báo trong app. Web Push trên iOS đòi hỏi cài PWA. Sửa dòng mô tả ở form cho khớp |

### Design tokens

- **Màu:** ink `#151515`, nền `#F3F3F1`, panel cột `#E9E9E5`, chữ phụ `#5F5F5F`, xanh `#5B8DEF`, vàng `#FFC94A`, teal `#4FC1BE`, cam `#F47258`, lilac `#B9A5F2`.
- **Tint:** `#E3ECFD`, `#FFF3D1`, `#DDF4F3`, `#FDE3DD`, `#EEEEEA`. **Heatmap:** `#E7E7E2`, `#BFE9E6`, `#7FD3CE`, `#3FB3AD`, `#1F7F7A`.
- **Hình khối:** viền `1.5px solid #151515`, bóng cứng `0 3/4/5/6px 0 #151515`, bo góc 14–28 px, pill 999 px.
- **Font:** Giao diện dùng Poppins 400–700. Poppins thiếu U+1EA0–U+1EF1 (ạ, ấ, ệ, ữ...), nên **mọi nội dung người dùng nhập** (tên task, mô tả, tên project, comment, category) dùng class `font-content` (Be Vietnam Pro) để tiếng Việt đều nét. `font-sans` vẫn giữ Be Vietnam Pro làm dự phòng cho chữ Poppins không có.

### Chuẩn responsive

Thiết kế chỉ có khổ 1440 px và tự wrap bằng flexbox. Nếu copy nguyên sẽ lỗi trên điện thoại:

| Vấn đề trong thiết kế | Cách xử lý |
|---|---|
| Dưới 872 px, Sidebar cao khoảng 860 px nằm đè lên đầu mọi trang | `< 1024px`: top bar + bottom nav 5 mục (Tasks, Calendar, nút New, History, Focus). Projects và tài khoản nằm trong drawer |
| Kanban 4 cột xếp dọc, rất dài | `< 744px`: tab theo status; đổi status bằng menu "Move to" thay cho kéo thả |
| Lịch `min-width: 640px` phải cuộn ngang | `< 744px`: lưới tháng gọn với chấm màu, agenda nằm dưới |
| Vòng Focus: vòng trong cố định 252 px, tràn ở 360 px | Dùng `min(300px, 80vw)` và tỉ lệ theo % |
| Thẻ streak và ô Project name `grid-column: span 2`, dễ vỡ khi còn 1 cột | Chỉ span từ `md` trở lên |
| 6 ô màu và 6 icon ở Create project không wrap, tràn trên điện thoại | Thêm `flex-wrap` |
| Bảng Project tasks `min-width: 640px` | `< 744px`: đổi thành danh sách thẻ |
| Heatmap dựa vào hover | Chạm để xem popover, tự cuộn đến tuần mới nhất |
| Input 14–15 px làm iOS tự zoom | `font-size: 16px` trên mobile |

Layout chọn theo **chiều rộng**, không theo loại thiết bị:

| Chiều rộng | Layout | Thiết bị điển hình |
|---|---|---|
| `< 744px` | Phone: bottom nav, Board theo tab, lịch gọn | Điện thoại, iPad Split View hẹp |
| `744–1023px` (`md`) | Tablet: bottom nav, Board 2×2, lịch tháng đầy đủ, nội dung 2 cột | iPad dọc |
| `≥ 1024px` (`lg`) | Desktop: Sidebar | Máy tính, iPad ngang, iPad 13" dọc |

Đổi `--breakpoint-md` của Tailwind thành 744 px để iPad mini vào layout tablet. Board dùng 2 cột dưới `xl` và 4 cột từ `xl`, không để `auto-fit` tạo hàng 3+1 lẻ trên iPad ngang.

Hành vi cảm ứng dựa vào `@media (hover: none)` / `(pointer: coarse)`, không dựa vào chiều rộng, vì iPad ngang dùng layout desktop nhưng vẫn là màn hình cảm ứng. Không nhận diện qua User-Agent vì Safari trên iPadOS báo là máy Mac.

Vùng chạm tối thiểu 44 px, bottom nav tôn trọng `safe-area-inset-bottom`, ẩn gợi ý `⌘K` trên thiết bị cảm ứng.

## 5. Thiết kế MCP

**Endpoint:** `POST https://<domain>/api/mcp`. Theo revision `2026-07-28`, MCP không còn session và không còn GET stream; tài liệu connector của Claude vẫn tham chiếu `2025-11-25`. Server phải không giữ trạng thái và tương thích cả hai đời giao thức, nên giữ `legacy` mặc định của `createMcpHandler`, không dùng `legacy: "reject"` như ví dụ trong tài liệu Better Auth. T1.6 kiểm chứng điều này với Claude thật.

| Tool | Scope | Việc |
|---|---|---|
| `get_context` | `tasks:read` | Trả ngày giờ hiện tại, múi giờ, projects, categories để Claude hiểu "thứ Sáu tuần này" |
| `list_tasks` | `tasks:read` | Lọc theo status, project, category, khoảng ngày, từ khóa; có phân trang |
| `get_task` | `tasks:read` | Chi tiết task, subtask, activity |
| `create_task` | `tasks:write` | Tạo task, kèm project, estimate, subtasks tùy chọn và `client_request_id` |
| `update_task` | `tasks:write` | Sửa trường; hủy task bằng `status: canceled` |
| `complete_task` | `tasks:write` | Đánh dấu hoàn thành, trả về streak hiện tại |
| `add_subtasks` | `tasks:write` | Thêm checklist vào task có sẵn |
| `create_project` | `tasks:write` | Tạo project từ tên, mục tiêu, ngày và template; sau T4.4 nhận thêm danh sách milestone |

Quy ước:

- **Không có tool xóa cứng**: Claude chỉ được hủy task, thao tác này khôi phục được.
- Ngày truyền dạng `due_date: YYYY-MM-DD` và `due_time: HH:mm` tùy chọn, server diễn giải theo múi giờ người dùng. Claude không phải tự đổi UTC.
- Tool nhận task bằng mã `FLW-12` hoặc id, nhận project bằng `key` hoặc tên.
- Mỗi tool có zod schema, annotation `readOnlyHint`/`destructiveHint`, và trả về `url` của task.
- Project hoặc category không tồn tại thì báo lỗi kèm danh sách hợp lệ, không tự tạo.

**Checklist xác thực để Claude kết nối được:**

- [ ] Thiếu hoặc sai token trả `401` kèm `WWW-Authenticate: Bearer resource_metadata="...", scope="..."`.
- [ ] Protected Resource Metadata: `resource` khớp **chính xác** URL người dùng nhập; issuer chính đứng đầu `authorization_servers`.
- [ ] AS metadata có `code_challenge_methods_supported: ["S256"]`, `client_id_metadata_document_supported: true` và `"none"` trong `token_endpoint_auth_methods_supported`. Chỉ thêm `registration_endpoint` nếu T1.6 cho thấy Claude cần DCR.
- [ ] Chấp nhận redirect `https://claude.ai/api/mcp/auth_callback` và loopback `http://localhost/callback`, `http://127.0.0.1/callback` với **port bất kỳ** (Claude Code).
- [ ] `/token` nhận `application/x-www-form-urlencoded`, xoay vòng refresh token, trả `invalid_grant` khi refresh token hết hạn, phản hồi dưới 10 giây.
- [ ] Token phải đúng audience là MCP server (RFC 8707); không nhận token trong query string.
- [ ] Trang consent hiển thị rõ hostname của redirect URI, cảnh báo thêm khi chỉ có loopback.
- [ ] Kiểm tra header `Origin`, sai thì trả `403`. WAF không chặn dải `160.79.104.0/21` của Anthropic.

## 6. Công việc theo phase

Kích cỡ: **S** 1–2 file · **M** 3–5 file · **L** 5–8 file.

```text
Phase 0 → Phase 1 → Phase 2 → Phase 3 ─┬─ Phase 4 (Project) ───────────┐
                     ▲ cổng rủi ro T1.6 ├─ Phase 5 (Calendar) ──────────┤
                                        ├─ Phase 6 (Focus) → Phase 7 ───┼→ Phase 9
                                        └─ Phase 8 (Nhắc hạn) ──────────┘
```

Phase 4, 5, 6 và 8 làm song song được sau Phase 3. Phase 7 cần dữ liệu của Phase 4 và Phase 6.

### Phase 0 — Nền móng

Đã xong. Tiêu chí và quyết định: `git show 5c468a5:tasks/todo.md` và `git show 5c468a5:tasks/plan.md`.

- [x] **T0.1 Khởi tạo repo và app Next.js (M).** *Xong khi:* lint, typecheck, build pass; các thư mục không liên quan được ignore.
- [x] **T0.2 Playwright smoke (S).** *Xong khi:* test chạy trên Chromium desktop và WebKit mobile.
- [x] **T0.3 Postgres và migration đầu tiên (M).** *Xong khi:* `unaccent` được cài qua migration trên DB mới của Neon.
- [x] **T0.4 DB client, Vitest và README (M).** *Xong khi:* test `unaccent()` đi qua `src/lib/db`; README đủ để chạy dự án.
- [x] **T0.5 Tách thiết kế (S).** *Xong khi:* đủ 10 màn hình và Sidebar trong `design/screens/`, đọc được bằng mắt thường.
- [x] **T0.6 Design token và font (M).** *Xong khi:* token, breakpoint 744 px và font tiếng Việt đúng trên `/dev/ui`; trang này trả 404 trong production.
- [x] **T0.7 Primitive hành động (M).** *Xong khi:* Button, Card, Chip, Segmented đạt vùng chạm 44 px và có focus rõ.
- [x] **T0.8 Primitive form và overlay (M).** *Xong khi:* Field, Switch, Sheet dùng được bằng bàn phím trên Chromium và WebKit.
- [x] **T0.9 CI (S).** *Xong khi:* GitHub Actions xanh trên `main` và đỏ khi có test lỗi.

**Checkpoint:** bản clone sạch chạy được theo README; CI chạy trên mỗi push; bạn đã duyệt `/dev/ui`.

### Phase 1 — Đăng nhập, khung app, kiểm chứng MCP

Tiêu chí chi tiết nằm trong `tasks/todo.md`, quyết định nằm trong `tasks/plan.md`. Cổng rủi ro đứng trước khung app và mail, để nếu phải đổi thư viện OAuth thì không làm lại các phần đó.

- [x] **T1.1 Auth server và `ALLOWED_EMAILS` (M).** Better Auth, Drizzle, migration, hook chặn đăng ký. *Xong khi:* email ngoài danh sách bị từ chối và không để lại dữ liệu; danh sách rỗng thì từ chối tất cả.
- [x] **T1.2 Trang đăng ký (M).** Trang 02, thanh đo độ mạnh mật khẩu. *Xong khi:* đăng ký xong tới `/tasks`; lỗi hiện tại form; không có cuộn ngang ở 360 px.
- [ ] **T1.3 Đăng nhập, đăng xuất, chặn route (M).** Trang 01, giữ đăng nhập 30 ngày, `getCurrentUser()`, `src/proxy.ts`. *Xong khi:* đăng ký → đăng xuất → đăng nhập chạy trong E2E; chưa đăng nhập bị chuyển về `/sign-in`.
- [ ] **T1.4 Authorization server (M).** `jwt()`, `mcp()`, `cimd()`, metadata ở gốc domain. *Xong khi:* metadata đạt checklist mục 5.
- [ ] **T1.5 `/api/mcp`, `whoami` và consent (M).** `createMcpHandler` bọc trong `requireMcpAuth`, trang `/oauth/consent`. *Xong khi:* `401` đúng chuẩn; trả lời được cả hai đời giao thức; Claude Code trên máy gọi được `whoami`.
- [ ] **T1.6 Nghiệm thu với Claude thật — CỔNG RỦI RO (S).** Mở HTTPS bằng tunnel. *Xong khi:* cả claude.ai và Claude Code qua hết luồng OAuth và `whoami` trả đúng người dùng; refresh token hoạt động; đạt checklist mục 5.
- [ ] **T1.7 Sidebar và layout `(app)` (M).** Trang tạm cho các route chưa làm, không hiện số giả. *Xong khi:* giống thiết kế ở 1440 px; mọi trang trong app chặn người chưa đăng nhập.
- [ ] **T1.8 Khung phone và tablet (M).** Top bar, bottom nav, drawer. *Xong khi:* không có cuộn ngang ở 360, 390, 744, 820 px; 1023 px có bottom nav, 1024 px có Sidebar; drawer đóng bằng Esc và trả focus đúng chỗ.
- [ ] **T1.9 Mail và xác minh email (M).** `lib/mail` gọi API Resend bằng `fetch`, dev in ra console. *Xong khi:* chưa xác minh thì không đăng nhập được; nhận email thật từ `onboarding@resend.dev`.
- [ ] **T1.10 Quên mật khẩu (M).** `/forgot-password`, `/reset-password`. *Xong khi:* đổi mật khẩu qua link email thành công; link dùng lại bị từ chối; form không tiết lộ email có tồn tại hay không.
- [ ] **T1.11 Đăng nhập Google (S).** *Xong khi:* đăng nhập được bằng Google; tài khoản ngoài danh sách bị từ chối; thiếu biến môi trường thì ẩn nút.

**Checkpoint:** nếu T1.6 không đạt, **dừng lại** và đánh giá lại thư viện OAuth trước khi làm T1.7.

### Phase 2 — Quản lý task

- [ ] **T2.1 Schema và service (M).** Bảng ở mục 3 (trừ `milestone`, làm ở T4.4), seed category mặc định, `src/services` với zod. Mọi hàm nhận `userId`. *Xong khi:* test CRUD pass; test user A không đọc/sửa được task của user B.
- [ ] **T2.2 Create project (M).** Trang 09: template và starter tasks, tên, prefix, mục tiêu, màu, icon, ngày, time budget, Live preview; danh sách project thật ở Sidebar kèm số task và nút `+`. *Xong khi:* tạo từ template sinh đúng starter tasks có mã `FLW-1` trở đi; tên tiếng Việt cho prefix không dấu; tạo đồng thời 2 task không trùng số.
- [ ] **T2.3 Create task (M).** Trang 04: Project, Time estimate (giờ/phút, chip nhanh, số phiên focus), category nhiều lựa chọn, tạo category mới, status, priority, ngày giờ, nhắc hạn, Live preview. Bấm "+ New project" không mất nội dung đang nhập. *Xong khi:* tạo task xong xuất hiện trên Board; lỗi validation hiển thị tại trường tương ứng.
- [ ] **T2.4 Board đọc dữ liệu (M).** Trang 03: 4 thẻ thống kê, cột, lọc category/project, sort, trạng thái rỗng, lời chào. *Xong khi:* số liệu khớp DB; delta tính theo 7 ngày gần nhất.
- [ ] **T2.5 Kéo thả (M).** Đổi status và thứ tự bằng `@dnd-kit`, cập nhật lạc quan, hỗ trợ bàn phím và cảm ứng (`TouchSensor` có độ trễ để vuốt cuộn không kích hoạt kéo). *Xong khi:* kéo qua cột được lưu sau khi tải lại; lỗi mạng thì card quay về chỗ cũ; trên iPad vừa cuộn được vừa kéo được.
- [ ] **T2.6 Board phone/tablet và List view (M).** Tab theo status trên phone, 2×2 trên tablet, menu "Move to" trên mọi thiết bị cảm ứng, chế độ List. *Xong khi:* đổi status được ở 390 px và 820 px chỉ bằng cảm ứng.
- [ ] **T2.7 Task detail (M).** Trang 05: mã task, Project, sửa trường, đổi status, checklist + thanh tiến độ, estimate, hủy/xóa có xác nhận. *Xong khi:* % trên Board đổi theo checklist; xóa cần xác nhận.
- [ ] **T2.8 Comment và activity (S).** Ghi activity tại service, comment là `activity`. *Xong khi:* mọi thay đổi có dòng activity đúng thứ tự thời gian.
- [ ] **T2.9 Tìm kiếm (S).** Ô search và phím `⌘K`/`Ctrl+K`. *Xong khi:* tìm được tên có dấu tiếng Việt, kể cả khi gõ không dấu.
- [ ] **T2.10 Quick-add (M).** Phím `N`, parser `#category`, `!priority`, ngày tự nhiên bằng `chrono-node`. *Xong khi:* test bảng phủ câu mẫu "Review PR tomorrow 9am #Development !high"; `N` không kích hoạt khi đang gõ trong input.

**Checkpoint:** E2E đăng nhập → tạo → kéo → hoàn thành chạy trên cả project desktop và mobile.

### Phase 3 — MCP cho Claude

- [ ] **T3.1 Tool đọc (M).** `get_context`, `list_tasks`, `get_task`. *Xong khi:* test bằng MCP client: thiếu scope bị từ chối; không thấy dữ liệu người khác.
- [ ] **T3.2 Tool ghi (M).** `create_task`, `update_task`, `complete_task`, `add_subtasks`, `create_project`, idempotency. *Xong khi:* gọi hai lần cùng `client_request_id` chỉ tạo một task; gọi lại `create_project` cùng tên trả về project có sẵn; hạn `17:00` theo giờ Việt Nam lưu đúng UTC.
- [ ] **T3.3 Gia cố (S).** Rate limit theo token, giới hạn độ dài, kiểm tra `Origin`, `source: mcp`, nhãn "via Claude" trên card và activity. *Xong khi:* vượt giới hạn trả lỗi rõ ràng; Origin lạ trả `403`.
- [ ] **T3.4 Settings (M).** Hồ sơ, múi giờ, category/project, **Connected apps** (xem và thu hồi), hướng dẫn kết nối kèm URL để copy. `requireMcpAuth` chỉ kiểm chữ ký JWT, nên `/api/mcp` phải đọc thêm trạng thái thu hồi trong DB. *Xong khi:* thu hồi xong, Claude nhận `401` ở lần gọi kế tiếp.
- [ ] **T3.5 Task mới tự hiện (S).** Refetch khi quay lại tab. *Xong khi:* quay lại tab Flowday là thấy ngay task do Claude vừa tạo.
- [ ] **T3.6 Nghiệm thu với Claude (S).** Chạy kịch bản ở mục 1 trên claude.ai và Claude Code; ghi hướng dẫn vào `README.md`. *Xong khi:* kịch bản đạt trên cả hai, có ảnh chụp kết quả.

**Checkpoint:** đây là mốc có thể dùng thật: task + MCP. Review với bạn trước khi làm tiếp.

### Phase 4 — Project

- [ ] **T4.1 Project overview (M).** Trang 10: header theo màu project, Add task, KPI Progress, Tasks, Target date, trang sửa project, archive. *Xong khi:* số liệu khớp DB; số quá hạn và số ngày còn lại tính theo múi giờ người dùng; project archive biến khỏi Sidebar nhưng task không mất.
- [ ] **T4.2 Bảng Project tasks (M).** Lọc status kèm số đếm, mã, priority, estimate, due, status; dưới 744 px đổi thành danh sách thẻ. *Xong khi:* không có cuộn ngang ở 360 px; task quá hạn tô đỏ.
- [ ] **T4.3 Tab Board và List (S).** Dùng lại component của `/tasks`, lọc theo project. *Xong khi:* kéo thả trong tab Board cũng cập nhật `/tasks`.
- [ ] **T4.4 Milestones (M).** Bảng `milestone`, `task.milestone_id`, sheet "+ Milestone", chọn milestone ở Task detail, thêm `milestones` cho `create_project` và `milestone` cho `create_task`. *Xong khi:* hoàn thành task làm đổi % và state của milestone; xóa milestone không xóa task.

**Checkpoint:** tạo project từ template → Claude thêm task vào project → Overview cập nhật đúng, trên cả desktop và mobile.

### Phase 5 — Calendar

- [ ] **T5.1 Lịch tháng (M).** Trang 06 từ dữ liệu thật: chip, "+n more", cờ streak, agenda, Today, chuyển tháng. *Xong khi:* task gần nửa đêm rơi đúng ngày theo múi giờ người dùng; tuần bắt đầu từ thứ Hai.
- [ ] **T5.2 Lịch mobile (S).** Lưới gọn với chấm màu, chạm ngày để xem agenda. *Xong khi:* không có cuộn ngang ở 360 px.
- [ ] **T5.3 Lên lịch task (M).** Danh sách Unscheduled, kéo vào ngày, mobile dùng sheet chọn ngày. *Xong khi:* `planned_at` lưu đúng, đếm Unscheduled giảm tương ứng.
- [ ] **T5.4 Week và Day (M).** Hai view mới cùng phong cách. *Xong khi:* chuyển 3 view giữ nguyên ngày đang chọn.

**Checkpoint:** E2E tạo task không ngày → lên lịch → hiện trong agenda, trên cả desktop và mobile.

### Phase 6 — Focus

- [ ] **T6.1 Bộ đếm (M).** Trang 08: Focus 25, Short break 5, Long break 15; Start/Pause/Reset/Skip. Tính theo mốc thời gian, không trừ dần bằng `setInterval` như bản mẫu vì tab nền bị trì hoãn. *Xong khi:* để tab nền 5 phút vẫn đúng giờ; tải lại trang không mất phiên.
- [ ] **T6.2 Lưu phiên và hàng đợi (M).** `focus_session`, Today's queue, "Start focus session" từ Detail, Time tracked. *Xong khi:* xong một phiên, thời gian cộng vào task và phiên được tính streak.

**Checkpoint:** chạy hết một phiên, số liệu xuất hiện đúng trong Task detail.

### Phase 7 — History và streak

- [ ] **T7.1 Service thống kê (M).** Streak hiện tại/dài nhất, completion rate, focus hours, heatmap. *Xong khi:* test bảng gồm chuỗi đứt, hôm nay chưa làm, đổi múi giờ, ngày cuối tháng.
- [ ] **T7.2 Streak và KPI (M).** Thẻ streak (cháy/tắt), KPI, thay số giả ở Sidebar và Board. *Xong khi:* mọi nơi hiện cùng một con số; tôn trọng `prefers-reduced-motion`.
- [ ] **T7.3 Heatmap (S).** 53 tuần, xem chi tiết bằng hover hoặc chạm. *Xong khi:* hoạt động ở 390 px, có nhãn cho trình đọc màn hình.
- [ ] **T7.4 Biểu đồ và danh sách (M).** Daily overview (SVG tự vẽ như bản mẫu), Time by category, Recently completed. *Xong khi:* số liệu khớp service, không thêm thư viện chart.
- [ ] **T7.5 Khoảng thời gian và CSV (S).** Week/Month/Year, Export CSV. *Xong khi:* file mở đúng tiếng Việt trong Excel (UTF-8 BOM); ô bắt đầu bằng `= + - @` được vô hiệu hóa để chống CSV injection.
- [ ] **T7.6 Achievements (S).** 6 huy hiệu, điều kiện tính từ dữ liệu. *Xong khi:* huy hiệu mở khóa đúng ngưỡng trong test.
- [ ] **T7.7 Thời gian và Burndown của project (M).** KPI Time logged vs estimate, Budget, biểu đồ Burndown (SVG tự vẽ). *Xong khi:* test bảng phủ task không có estimate, task thêm giữa chừng, project chưa có ngày; số task không có estimate được ghi rõ dưới biểu đồ.

**Checkpoint:** tạo dữ liệu mẫu 1 năm, trang `/history` tải dưới 1 giây.

### Phase 8 — Nhắc hạn

- [ ] **T8.1 Email nhắc (M).** Không quét DB theo phút, vì việc đó giữ Neon thức liên tục và vượt quota miễn phí. Khi lưu task có hạn trong 26 giờ tới, đặt một tin QStash hẹn giờ 30 phút trước hạn. Vercel Cron mỗi ngày gọi `/api/cron/reminders` (có secret) để đặt lịch cho các task còn lại. `/api/reminders/send` kiểm tra chữ ký QStash, đọc lại task rồi mới gửi. *Xong khi:* chạy lặp không gửi trùng nhờ `alert_sent_at`; đổi deadline thì nhắc lại đúng giờ mới; task đã xong không nhắc.
- [ ] **T8.2 Chuông trong app (S).** Danh sách thông báo từ dropdown chuông, chấm đỏ. *Xong khi:* đọc xong chấm đỏ biến mất; tắt thông báo trong lúc đang chạy focus.

**Checkpoint:** đặt task hạn 31 phút sau, nhận email đúng một lần.

### Phase 9 — Hoàn thiện và phát hành

- [ ] **T9.1 Kiểm tra responsive (M).** Playwright quét mọi route ở 360/390/744/820/1024/1180/1440 px. *Xong khi:* `scrollWidth <= clientWidth` trên tất cả route, kèm kiểm tra tay trên iPhone, Android và iPad thật (dọc, ngang, Split View).
- [ ] **T9.2 Accessibility (S).** Bàn phím, focus, nhãn form, tương phản với axe. *Xong khi:* không còn lỗi axe mức serious trở lên.
- [ ] **T9.3 Bảo mật (M).** Security headers, rate limit trang đăng nhập, rà quyền trên mọi service, trang Terms và Privacy, thêm lại checkbox Terms ở trang đăng ký. *Xong khi:* `npm audit` sạch mức high; test IDOR pass.
- [ ] **T9.4 Triển khai (M).** Vercel Hobby region `sin1`, Neon branch `production` qua connection string pooled, Resend gửi từ `onboarding@resend.dev` tới email của chính tài khoản Resend, QStash, Google OAuth production, migrate trong CI, `pg_dump` hằng đêm bằng GitHub Actions vì gói Free của Neon chỉ giữ 6 giờ lịch sử. *Xong khi:* đã thử restore từ backup; deploy lại không mất dữ liệu; `/tasks` tải dưới 2 giây từ Việt Nam kể cả khi DB vừa thức.
- [ ] **T9.5 Nghiệm thu production (S).** Kết nối Claude bằng URL thật, chạy lại T3.6 và E2E. *Xong khi:* 3 tiêu chí ở mục 1 đều đạt.

## 7. Rủi ro

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Phần CIMD/MCP của Better Auth còn thay đổi nhanh; tài liệu web lẫn giữa bản 1.6, 1.7 và beta 1.8 | Cao | Làm sớm ở T1.6; dùng `@better-auth/mcp` + CIMD bản 1.7.14, đối chiếu type trong `node_modules`, bật DCR làm phương án dự phòng. Nếu vẫn không đạt, thử [OAuth Provider của Neon Managed Better Auth](https://neon.com/docs/auth/guides/plugins/oauth-provider) (có CIMD, nhưng scope cố định nên phải bỏ `tasks:read`/`tasks:write`), rồi đến [Appwrite OAuth2 server](https://appwrite.io/blog/post/announcing-oauth2-server) |
| Claude và MCP spec dùng hai revision khác nhau | Cao | SDK v2 phục vụ cả hai từ một handler; test cả hai đời ở T1.5, kiểm chứng với Claude thật ở T1.6 |
| claude.ai không gọi được localhost | TB | Dev bằng tunnel HTTPS; Claude Code thử trực tiếp trên máy |
| Prompt injection khiến Claude tạo hoặc sửa task ngoài ý muốn | TB | Không có xóa cứng, activity ghi rõ "via Claude", rate limit, thu hồi được trong Settings |
| Sai ngày do múi giờ | TB | Server tự quy đổi; test bảng cho Calendar, streak, nhắc hạn |
| Vượt quota gói miễn phí: Vercel Hobby có thể dừng tính năng đến 30 ngày, Neon Free có 100 CU-giờ/tháng chung cho mọi branch | TB | Không polling DB, theo dõi Usage và nâng gói trước khi chạm ngưỡng |
| Phạm vi lớn | TB | Sau Phase 3 đã dùng được; Phase 4–8 có thể cắt độc lập |

## 8. Câu hỏi cần chốt

Kế hoạch đang chạy theo mặc định bên dưới. Trả lời khác thì mình sửa lại plan.

| Câu hỏi | Mặc định | Cần trả lời trước |
|---|---|---|
| Bạn có dùng gói Claude Team hoặc Enterprise không? Mọi gói đều thêm được custom connector (Free tối đa 1), nhưng hai gói này chỉ Owner mới thêm được | Không | T1.6 |
| Có giữ đăng nhập Google không? | Có, làm ở cuối Phase 1 | T1.11 |
| Ngôn ngữ giao diện? | Tiếng Anh như thiết kế; nội dung task tiếng Việt vẫn hiển thị đúng | T0.7 |

## 9. Sau V1

Theo thứ tự đề xuất:

1. AI "Break into subtasks" qua Claude API (`@anthropic-ai/sdk`, model `claude-opus-5-5`).
2. Browser notification + PWA.
3. Attachment và tab Files.
4. Google Calendar sync.
5. Tab Timeline của project.
6. Workflow statuses tùy chỉnh theo project, mỗi status quy về 1 trong 4 status gốc.
7. Ambient sound.
8. Đa ngôn ngữ.

Chỉ làm nếu app mở cho người khác dùng:

- Làm việc nhóm: `project_member` với vai trò Owner/Editor/Viewer, lời mời qua email, Share, Visibility, Assignee, Team workload.
- Bỏ `ALLOWED_EMAILS`, dùng domain riêng để gửi email, đăng lên Claude Connectors Directory.

## 10. Tài liệu tham khảo

- [Claude — Authentication for connectors](https://claude.com/docs/connectors/building/authentication)
- [MCP — Authorization (2026-07-28)](https://modelcontextprotocol.io/specification/latest/basic/authorization)
- [MCP — Streamable HTTP (2026-07-28)](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [Vercel — Hobby plan](https://vercel.com/docs/plans/hobby) · [Cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing) · [Commercial usage](https://vercel.com/docs/limits/fair-use-guidelines)
- [Neon — Pricing](https://neon.com/pricing) · [Regions](https://neon.com/docs/introduction/regions)
- [Upstash QStash — Pricing](https://upstash.com/pricing/qstash.md)
- [Claude — Test your connector](https://claude.com/docs/connectors/building/testing.md) · [Custom connectors](https://support.claude.com/en/articles/11175166)
- [Better Auth — MCP](https://better-auth.com/docs/plugins/mcp) · [OAuth Provider](https://better-auth.com/docs/plugins/oauth-provider) · [CIMD](https://better-auth.com/docs/plugins/cimd)
