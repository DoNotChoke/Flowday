# Implementation Plan: Flowday — Phase 4 (Project) và Settings

> Nguồn: `PLAN.md` (mục 3, 4, 6). Danh sách việc chi tiết: `tasks/todo.md`. Khảo sát ngày 2026-11-02. Kế hoạch Phase 2 đã xong, xem lại bằng `git show 2b28c24:tasks/plan.md`.

## Overview

Phase 4 biến project từ một cái tên trên Sidebar thành nơi theo dõi được công việc: trang tổng quan có số liệu thật, sửa và lưu trữ project, bảng task, tab Board và List, milestones. Phase này cũng làm phần Settings không dính MCP, vì Phase 3 đã được gác lại và trang Settings đang trống.

**Hoàn thành khi:**

1. E2E tạo project từ template → thêm task → Overview cập nhật đúng chạy trên cả desktop và mobile.
2. Mọi hàm service mới nhận `userId` và có test chứng minh user A không đọc hoặc sửa được dữ liệu của user B.
3. Không có cuộn ngang ở 360, 390, 820 và 1440 px trên mọi trang mới.

## Hiện trạng đã kiểm tra

| Hạng mục | Kết quả | Ảnh hưởng |
|---|---|---|
| Repo | `main` có Phase 2 đóng, CI xanh ở Run 31 | Bắt đầu từ nền đã kiểm chứng |
| `/projects/[id]` | Chỉ có tiêu đề, ghi `shortcut` chờ T4.1 | Viết lại trang |
| `/settings` | Chỉ có tiêu đề | Viết mới |
| `project` | Đã có `archived_at`, `budget_hours`, `start_date`, `target_date` | T4.1 và T4.1b không cần migration |
| `task.project_id` | `on delete set null` | Xóa project không xóa task, nhưng V1 chỉ lưu trữ |
| `getBoard` | Đã nhận `projectId`, nhưng card chưa có estimate và cờ quá hạn | T4.2 thêm hai trường, không viết truy vấn mới |
| `listProjects` | Bỏ qua project đã lưu trữ | Sidebar tự đúng; form task cần xử lý task thuộc project đã lưu trữ |
| `/tasks/new?project=` | Đã chọn sẵn project | "Add task" chỉ cần một link |
| `ProjectForm` | Dùng state riêng, chưa nhận giá trị ban đầu | T4.1b thêm prop, không viết form mới |
| Migration | 0000–0004, CI chạy `db:migrate` | T4.4 thêm 0005, chỉ thêm bảng và cột |
| Thiết kế | Trang 10 có Share, Members, Assignee, Team workload, Timeline, Files, Burndown, Time logged | Xem mục "Không làm trong phase này" |

## Architecture Decisions

- **Số liệu project tính bằng một hàm service, `getProjectOverview`.** Đọc qua `getBoard` để Board, bảng và KPI cùng một nguồn. Mốc thời gian (quá hạn, số ngày còn lại) tính theo `user.timezone`.
- **Trạng thái tab nằm trên URL** (`?view=board`, `?status=completed`), giống `/tasks`. Tải lại và chia sẻ link đều giữ nguyên.
- **Lưu trữ thay cho xóa project.** Task giữ nguyên, vẫn hiện trên `/tasks`. Khôi phục ở Settings. Đúng quy ước "không có xóa cứng ngoài ý muốn" của `PLAN.md`.
- **`key` không đổi sau khi tạo.** Đổi tên project không đổi mã task, vì mã đã xuất hiện trong activity và có thể đã được ghi lại ở nơi khác.
- **Trạng thái milestone được suy ra, không lưu.** `Done` khi có task và mọi task không hủy đều xong, `In progress` khi có ít nhất một task xong hoặc đang làm, còn lại là `Planned`. Không có cột nào có thể lệch.
- **Sửa project dùng lại `ProjectForm`**, thêm prop giá trị ban đầu, ẩn template và starter tasks.
- **Giữ nguyên từ các phase trước:** nội dung người dùng nhập dùng `font-content`; form khóa submit tới khi hydrate; `.catch` của Server Action phải qua `unstable_rethrow`; mọi thay đổi trên task ghi activity; test chờ server trả lời trước khi tải lại trang; mỗi task một commit; không chờ CI giữa các task, nhưng CI phải xanh trước checkpoint.

## Không làm trong phase này

| Phần trong thiết kế | Lý do |
|---|---|
| Share, Members, Assignee, Team workload | Lùi khỏi V1, app cá nhân |
| Tab Timeline, Files | Lùi khỏi V1 |
| KPI Time logged, Budget, Burndown | T7.7, cần dữ liệu focus |
| `milestones` trong `create_project`, `milestone` trong `create_task` | Chuyển sang T3.2 cùng MCP |
| Connected apps, hướng dẫn kết nối Claude | Ở lại T3.4 cùng Phase 3 |
| Đổi email, đổi mật khẩu trong Settings | `forgot-password` đã đổi được mật khẩu; đợi khi cần |

## Dependency Graph

```text
T4.1 Overview ──┬── T4.1b Sửa và lưu trữ
                ├── T4.2 Bảng task ── T4.3 Tab Board và List
                └── T4.4 Milestones ── T4.4b Gán task vào milestone

T4.1b ── T4.5 Settings (khôi phục project đã lưu trữ)
```

Mỗi task để lại một đường dùng được từ giao diện tới DB.

## Task List

Chi tiết tiêu chí nằm trong `tasks/todo.md`.

### Nhóm A: Xem và quản lý project

- [x] T4.1 Project overview (M)
- [x] T4.1b Sửa và lưu trữ project (M)

### Checkpoint A

- [x] Số liệu Overview khớp DB trên desktop và mobile
- [x] Bạn đã xem Overview và trang sửa project

### Nhóm B: Task trong project

- [x] T4.2 Bảng Project tasks (M)
- [x] T4.3 Tab Board và List (S)

### Nhóm C: Milestones

- [x] T4.4 Milestones (M)
- [x] T4.4b Gán task vào milestone (S)

### Checkpoint B

- [ ] Hoàn thành task làm đổi % và trạng thái milestone
- [ ] Bạn đã thử trên điện thoại hoặc iPad thật

### Nhóm D: Settings

- [ ] T4.5 Settings (M)

### Checkpoint hoàn thành Phase 4

- [ ] E2E tạo project từ template → thêm task → Overview cập nhật đúng pass trên desktop và mobile
- [ ] CI xanh
- [ ] `PLAN.md` đã đánh dấu xong Phase 4
- [ ] Sẵn sàng sang Phase 5

## Parallelization

- **Tuần tự:** T4.1 trước mọi task còn lại, vì cùng dựng trang `/projects/[id]`. T4.4 trước T4.4b vì có migration.
- **Song song được sau T4.1:** T4.1b, T4.2 và T4.4.
- **Cần phối hợp:** T4.2 và T4.3 cùng sửa phần dưới trang, nên làm liền nhau.

## Risks and Mitigations

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Task thuộc project đã lưu trữ: ô Project ở trang chi tiết không có lựa chọn đó và có thể làm mất liên kết khi lưu | TB | T4.1b thêm project hiện tại vào danh sách lựa chọn, có test |
| Đổi múi giờ làm số ngày và nhãn hạn đổi theo | Thấp | Đúng ý muốn, vì `due_at` lưu UTC; T4.5 có test đổi múi giờ |
| Tên ở Sidebar còn cũ sau khi đổi, do `getCurrentUser` cache 5 phút ở trình duyệt | TB | T4.5 tìm cách dọn cache hoặc tải lại đầy đủ; có E2E kiểm tra Sidebar |
| Tốc độ: `/projects/[id]` đọc nhiều bảng, mỗi truy vấn khoảng 50 ms từ máy bạn | TB | Khung trang và dữ liệu dùng `<Suspense>`; gộp truy vấn khi có thể; đo lại sau deploy |
| Hạn "hôm nay" tính nhầm là quá hạn gần nửa đêm | TB | Test bảng theo múi giờ cho `getProjectOverview` |
| Migration 0005 trên Neon `dev` | Thấp | Chỉ thêm bảng và cột có thể rỗng, CI chạy trên DB sạch |

## Việc bạn cần làm

| Khi nào | Việc |
|---|---|
| Checkpoint A | Xem Overview và trang sửa project, nói điều muốn đổi |
| Checkpoint B | Thử trên điện thoại hoặc iPad thật qua ngrok |

## Open Questions

Plan chạy theo mặc định bên dưới. Trả lời khác thì mình sửa lại.

- **Deploy lên Vercel sớm?** Mặc định chưa đưa vào phase này. Mình đề xuất làm ngay sau Phase 4 để dùng thật và đo lại tốc độ, bạn quyết định ở Checkpoint hoàn thành.
- **Có cần xóa hẳn project không?** Mặc định chỉ lưu trữ.
