# Implementation Plan: Flowday — Phase 2 (Quản lý task)

> Nguồn: `PLAN.md` (mục 3, 4, 6). Danh sách việc chi tiết: `tasks/todo.md`. Khảo sát ngày 2026-11-01. Kế hoạch Phase 1 đã xong, xem lại bằng `git show 62abfc5:tasks/plan.md`.

## Overview

Phase 2 biến khung app thành công cụ dùng được mỗi ngày: tạo project, tạo task, xem và kéo task trên Board, mở chi tiết, checklist, comment, tìm kiếm, thêm nhanh bằng phím `N`. Cuối phase có dữ liệu thật thay cho các trang tạm ở `/tasks`, `/tasks/new`, `/projects/new`, và `src/services/` sẵn sàng để Phase 3 gọi từ MCP.

**Hoàn thành khi:**

1. E2E đăng nhập → tạo task → kéo sang cột khác → hoàn thành chạy trên cả desktop và mobile.
2. Mọi hàm service nhận `userId` và có test chứng minh user A không đọc hoặc sửa được dữ liệu của user B.
3. Dữ liệu sống qua tải lại trang và không có cuộn ngang ở 360, 390, 820 và 1440 px.

## Hiện trạng đã kiểm tra

| Hạng mục | Kết quả | Ảnh hưởng |
|---|---|---|
| Repo | `main` sạch, CI xanh | Bắt đầu từ nền đã kiểm chứng |
| `schema.ts` | 13 bảng, đều của Better Auth, do `auth generate` ghi đè toàn bộ | Phải tách file trước khi thêm bảng của app |
| `zod` | 4.6 đã có | Không thêm dependency để validate |
| `@dnd-kit` | `core` 6.3 và `sortable` 10 ổn định; `@dnd-kit/react` mới 0.5 | Dùng `core` + `sortable` |
| `chrono-node` | 2.10 | Chỉ thêm ở T2.10 |
| `getCurrentUser()` | Dùng `use cache: private`, cache ở trình duyệt | Server Action cần hàm đọc phiên riêng, không cache |
| `Card` | Không đổi được bo góc qua `className` | T2.4 cần prop, vì card task bo 18 px |
| Sidebar, drawer | Có sẵn `PROJECTS` rỗng, đầy đủ tiêu đề và nút `+` | T2.2b chỉ thay dòng rỗng bằng danh sách |
| Thiết kế | 4 cột On going, In process, Completed, Canceled. Bộ category: Design, Development, Coding, Meeting, Research, Office Time, User Experience. 4 template project có starter tasks | Dùng nguyên văn |

## Architecture Decisions

- **Tách `src/lib/db/auth-schema.ts` cho Better Auth.** `auth generate` ghi vào đó, còn `schema.ts` chứa bảng của app và `export * from "./auth-schema"`. Mọi import hiện có giữ nguyên, và lần sinh lại sau không xóa bảng của app.
- **Mỗi task chỉ thêm đúng bảng nó cần.** Phase 2 có `project`, `category`, `task`, `task_category`, `subtask`, `activity`. `focus_session` đợi T6.2, `milestone` đợi T4.4, `alert_sent_at` đợi T8.1.
- **Dùng `refresh()` sau khi ghi, không dùng cache tag.** Trang đọc dữ liệu lúc request trong `<Suspense>`, Server Action gọi service rồi `refresh()`. Dữ liệu của một người dùng không cần cache phía server, và Claude tạo task qua MCP thì không có gì cũ để dọn.
- **Thêm `requireUserId()` không cache cho Server Action.** `getCurrentUser()` cache 5 phút ở trình duyệt nên không dùng để phân quyền khi ghi. Action đọc lại phiên mỗi lần gọi và không nhận `userId` từ client.
- **Server Action mỏng, logic nằm ở `src/services/`.** Zod validate tại service để web và MCP dùng chung. Lỗi validate trả về theo từng trường, không ném ra giao diện.
- **`timestamp with timezone` cho bảng của app.** Hạn được quy đổi tại `src/lib/datetime.ts` bằng `Intl`, không thêm thư viện ngày giờ. `due_has_time` phân biệt "hạn cả ngày" với "hạn 17:00".
- **`position` là `double precision`.** Thả giữa hai card thì lấy trung bình, chỉ ghi đúng một dòng. `shortcut: số thực sẽ cạn độ chính xác sau khoảng 50 lần chèn liên tiếp cùng một khe, đánh số lại cột khi khoảng cách quá nhỏ`.
- **Cấp số task bằng `UPDATE project SET task_seq = task_seq + 1 RETURNING`.** Câu lệnh đơn nguyên tử, không cần khóa riêng.
- **Activity ghi trong cùng transaction với thay đổi.** Lịch sử không thể lệch so với dữ liệu. Vì vậy T2.8 sửa lại các hàm service đã viết, nên service phải gọn từ đầu.
- **Tìm kiếm bằng `unaccent(title) ILIKE unaccent(query)`.** Một người dùng với vài nghìn task thì không cần full-text index.
- **Xóa cứng chỉ có ở web, có xác nhận.** MCP chỉ được hủy, đúng quy ước `PLAN.md` mục 5.
- **Bộ phận lùi khỏi V1 ẩn hẳn:** Assignee, Members, Visibility, Workflow statuses, Attachment, Break into subtasks, tab Files.

Giữ nguyên từ các phase trước: nội dung người dùng nhập dùng `font-content`; form khóa submit tới khi hydrate; rate limit e2e dùng IP riêng; `.test` không gửi mail; mỗi task một commit; không chờ CI giữa các task, nhưng CI phải xanh trước checkpoint.

## Dependency Graph

```text
T2.1 Schema, datetime, service task
  ├── T2.2 Create project ── T2.2b Project trên Sidebar và drawer
  │         │
  │         └──────────┐
  └── T2.3 Create task ┴── T2.4 Board
                              ├── T2.5 Kéo thả ── T2.6 Board phone/tablet, List
                              ├── T2.7 Task detail ── T2.7b Checklist ── T2.8 Comment, activity
                              ├── T2.9 Tìm kiếm
                              └── T2.10 Quick-add (cần T2.3)
```

Mỗi task để lại một đường dùng được từ giao diện tới DB.

## Task List

Chi tiết tiêu chí nằm trong `tasks/todo.md`.

### Nhóm A: Tạo và nhìn thấy dữ liệu

- [x] T2.1 Schema, datetime và service task (M)
- [ ] T2.2 Create project (M)
- [ ] T2.2b Project trên Sidebar và drawer (S)
- [ ] T2.3 Create task (M)
- [ ] T2.4 Board đọc dữ liệu (M)

### Checkpoint A

- [ ] E2E đăng nhập → tạo project → tạo task → thấy trên Board pass trên desktop và mobile
- [ ] Bạn đã xem Board và form tạo task

### Nhóm B: Di chuyển task

- [ ] T2.5 Kéo thả (M)
- [ ] T2.6 Board phone/tablet và List view (M)

### Checkpoint B

- [ ] Đổi status được bằng chuột, bàn phím và cảm ứng
- [ ] Bạn đã thử trên điện thoại hoặc iPad thật

### Nhóm C: Chi tiết task

- [ ] T2.7 Task detail (M)
- [ ] T2.7b Checklist (S)
- [ ] T2.8 Comment và activity (M)

### Nhóm D: Thao tác nhanh

- [ ] T2.9 Tìm kiếm (S)
- [ ] T2.10 Quick-add (M)

### Checkpoint hoàn thành Phase 2

- [ ] E2E đăng nhập → tạo → kéo → hoàn thành pass trên desktop và mobile
- [ ] `PLAN.md` đã đánh dấu xong Phase 2
- [ ] Sẵn sàng sang T3.1

## Parallelization

- **Tuần tự:** T2.1 → T2.4, vì cùng sửa schema và thứ tự migration.
- **Song song được sau Checkpoint A:** nhóm B, nhóm C và T2.9.
- **Cần phối hợp:** T2.8 sửa mọi hàm ghi của service, nên làm sau khi các hàm đó đã ổn định.

## Risks and Mitigations

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Kéo thả trên cảm ứng xung đột với cuộn trang; test tự động mô phỏng kém | Cao | `TouchSensor` có độ trễ, luôn có menu "Move to" làm đường dự phòng; thử trên thiết bị thật ở Checkpoint B |
| Cập nhật lạc quan lệch với server khi mạng lỗi | TB | Giữ trạng thái trước khi kéo, lỗi thì quay về và báo; test bằng `page.route` chặn request |
| Sai ngày do múi giờ, nhất là hạn gần nửa đêm | TB | Test bảng ở `lib/datetime`, đọc múi giờ từ `user.timezone` |
| Trang tải chậm khi Neon vừa thức | TB | Khung trang tĩnh hiện ngay, dữ liệu stream trong `<Suspense>`; đã đo khoảng 2 giây |
| Hai card trùng `position` khi kéo liên tiếp | Thấp | Sắp xếp phụ theo `id` để thứ tự vẫn xác định |
| Sidebar quá dài khi nhiều project | Thấp | Vùng giữa Sidebar đã tự cuộn; test với 30 project |
| Test ghi nhiều dữ liệu vào Neon `dev` | Thấp | Xóa user sau mỗi test, dữ liệu xóa theo cascade |

## Việc bạn cần làm

| Khi nào | Việc |
|---|---|
| Checkpoint A | Xem Board và form tạo task, nói điều muốn đổi |
| Checkpoint B | Thử kéo thả trên điện thoại hoặc iPad thật. App chưa deploy nên cần tunnel như lần trước, hoặc cùng mạng Wi-Fi |

## Open Questions

Plan chạy theo mặc định bên dưới. Trả lời khác thì mình sửa lại.

- **Xóa task có khôi phục được không?** Mặc định xóa hẳn sau khi xác nhận; muốn giữ lại thì dùng trạng thái Canceled.
