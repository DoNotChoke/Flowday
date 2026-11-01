# Phase 2 — Danh sách việc

Tổng quan và quyết định: `tasks/plan.md`.

**Mọi task** chỉ xong khi đạt tiêu chí riêng, đã chạy thử thật, `npm run check` và `npm run test:e2e` pass trên máy, đã push (không chờ CI giữa các task, nhưng CI phải xanh trước khi qua checkpoint), không còn code thừa và không có thay đổi ngoài phạm vi. Trước khi viết code Next, đọc guide liên quan trong `node_modules/next/dist/docs/`.

---

## Nhóm A: Tạo và nhìn thấy dữ liệu

### T2.1 Schema, datetime và service task

**Mô tả:** Chuyển bảng Better Auth sang `src/lib/db/auth-schema.ts` (sửa lệnh `auth generate` trong `README.md`), `schema.ts` re-export và thêm `project`, `category`, `task`, `task_category`, `subtask`, `activity` theo `PLAN.md` mục 3, bỏ các cột của phase sau. Hook `user.create.after` tạo 7 category mặc định, kèm migration chèn cho user đã có. `src/lib/datetime.ts` đổi `YYYY-MM-DD` + `HH:mm` theo múi giờ sang `Date` và ngược lại bằng `Intl`. `src/lib/auth/session.ts` thêm `requireUserId()` không cache. `src/services/tasks.ts` có `createTask`, `getTask`, `listTasks`, `updateTask`, `deleteTask`, validate bằng zod.

**Tiêu chí nghiệm thu:**
- [x] User A không đọc, sửa hay xóa được task của user B; không gắn được project hay category của user B vào task.
- [x] `2026-11-06` + `17:00` ở `Asia/Ho_Chi_Minh` lưu thành `10:00Z`; test bảng có múi giờ âm và hạn gần nửa đêm.
- [x] Đăng ký xong có đủ 7 category; `(user_id, client_request_id)` unique.
- [x] Chạy `auth generate` không làm mất bảng của app.

**Kiểm chứng:**
- [x] `npm test` và test `requireUserId()` từ chối khi không có phiên.
- [x] `npm run db:migrate` chạy trên `dev` và DB trống của CI; migration chỉ thêm, không xóa.

**Phụ thuộc:** Phase 1

**File dự kiến:** `src/lib/db/auth-schema.ts`, `src/lib/db/schema.ts`, `src/lib/datetime.ts`, `src/services/tasks.ts`, `src/services/tasks.test.ts`, `src/lib/auth/index.ts`, `src/lib/auth/session.ts`, `drizzle/*`, `README.md`

**Quy mô:** M

---

### T2.2 Create project

**Mô tả:** `src/services/projects.ts` với `createProject`: sinh `key` bỏ dấu tiếng Việt qua `unaccent` trong Postgres (hoặc chuẩn hóa NFD), trùng thì thêm số, tạo starter tasks theo template trong một transaction, cấp số bằng `UPDATE ... RETURNING`. Trang 09 tại `/projects/new`: 4 template, tên, prefix, mục tiêu, 6 màu, 6 icon, ngày bắt đầu và kết thúc, time budget, Live preview. Ẩn Members, Workflow statuses, Visibility. Thêm `flex-wrap` cho hàng màu và icon, `Project name` chỉ span từ `md`.

**Tiêu chí nghiệm thu:**
- [x] Tạo từ template sinh đúng starter tasks, mã `FLW-1` trở đi.
- [x] `Đồ án tốt nghiệp` cho prefix `DAT`; prefix trùng thì thành `DAT2`. Prefix chỉ đọc như thiết kế.
- [x] Tạo đồng thời 2 task không bị trùng số.
- [x] Không có cuộn ngang ở 360 px.

**Kiểm chứng:**
- [x] Vitest chạy 10 lần tạo song song và test cô lập theo user.
- [x] E2E tạo project từ form và thấy Live preview cập nhật.
- [x] So ảnh với `design/screens/09-create-project.html` ở 390 và 1440 px.

**Phụ thuộc:** T2.1

**File dự kiến:** `src/services/projects.ts`, `src/services/projects.test.ts`, `src/app/(app)/projects/new/page.tsx`, `src/app/(app)/projects/new/ProjectForm.tsx`, `src/app/(app)/projects/new/actions.ts`, `e2e/projects.spec.ts`

**Quy mô:** M

---

### T2.2b Project trên Sidebar và drawer

**Mô tả:** Thay dòng "No projects yet" bằng danh sách thật: chấm màu, tên, số task. Thêm mục Projects vào drawer mobile. Mục đang mở được highlight. Trang `/projects/[id]` tạm có tiêu đề cho tới T4.1.

**Tiêu chí nghiệm thu:**
- [ ] Project mới xuất hiện ngay sau khi tạo, số task khớp DB.
- [ ] 30 project vẫn cuộn trong Sidebar, nút đăng xuất luôn thấy.
- [ ] Tên project dài bị cắt gọn, không gây cuộn ngang.

**Kiểm chứng:**
- [ ] `e2e/shell.spec.ts` thêm các trường hợp trên ở 1366 × 600 và 390 px.

**Phụ thuộc:** T2.2

**File dự kiến:** `src/components/app/ProjectLinks.tsx`, `src/components/app/Sidebar.tsx`, `src/components/app/TopBar.tsx`, `src/app/(app)/projects/[id]/page.tsx`, `e2e/shell.spec.ts`

**Quy mô:** S

---

### T2.3 Create task

**Mô tả:** Trang 04 tại `/tasks/new`, nhận `?project=`: tên, mô tả, priority, category nhiều lựa chọn, tạo category mới tại chỗ, project, time estimate (giờ, phút, chip nhanh, số phiên focus), status, ngày giờ, nhắc hạn, Live preview. Sửa dòng mô tả nhắc hạn cho khớp phạm vi V1. "+ New project" mở sheet để không mất nội dung đang nhập, hoặc lưu nháp trong `sessionStorage`. Ẩn Assignee, Break into subtasks.

**Tiêu chí nghiệm thu:**
- [ ] Tạo task xong về `/tasks` và thấy task đó.
- [ ] Lỗi validation hiện tại đúng trường, không mất nội dung đã nhập.
- [ ] Bấm "+ New project" rồi quay lại vẫn còn nội dung.
- [ ] Hạn `17:00` lưu đúng theo múi giờ của người dùng.

**Kiểm chứng:**
- [ ] E2E tạo task đủ trường trên desktop và mobile, tải lại vẫn còn.
- [ ] So ảnh với `design/screens/04-create-task.html` ở 390 và 1440 px.

**Phụ thuộc:** T2.1, T2.2

**File dự kiến:** `src/app/(app)/tasks/new/page.tsx`, `src/app/(app)/tasks/new/TaskForm.tsx`, `src/app/(app)/tasks/new/actions.ts`, `src/services/categories.ts`, `e2e/tasks.spec.ts`

**Quy mô:** M

---

### T2.4 Board đọc dữ liệu

**Mô tả:** Trang 03 tại `/tasks`: lời chào, số task đến hạn hôm nay, 4 thẻ thống kê với delta 7 ngày, lọc category và project, sort, 4 cột, card với vòng %, trạng thái rỗng. Thêm prop bo góc cho `Card`, badge số task ở mục My tasks. Chưa có ô search (T2.9) và số streak (T7.2). Dữ liệu nằm trong `<Suspense>`, có skeleton.

**Tiêu chí nghiệm thu:**
- [ ] Số liệu và delta khớp DB, "hôm nay" tính theo múi giờ người dùng.
- [ ] Vòng % là subtask done/total; không có subtask thì 100% khi completed, ngược lại 0%.
- [ ] Lọc và sort nằm trên URL, tải lại vẫn giữ.
- [ ] Task của Claude sau này không cần thay đổi gì ở Board.

**Kiểm chứng:**
- [ ] Vitest cho service thống kê với dữ liệu biên quanh nửa đêm.
- [ ] E2E lọc và sort; không có cuộn ngang ở 1024 và 1440 px.
- [ ] So ảnh với `design/screens/03-tasks-board.html` ở 1440 px.

**Phụ thuộc:** T2.3

**File dự kiến:** `src/app/(app)/tasks/page.tsx`, `src/components/app/board/Board.tsx`, `src/components/app/board/TaskCard.tsx`, `src/components/ui/Card.tsx`, `src/services/tasks.ts`

**Quy mô:** M

---

## Checkpoint A

- [ ] E2E đăng nhập → tạo project → tạo task → thấy trên Board pass trên desktop và mobile.
- [ ] CI xanh.
- [ ] Bạn đã xem Board và form tạo task.

---

## Nhóm B: Di chuyển task

### T2.5 Kéo thả

**Mô tả:** Cài `@dnd-kit/core` và `@dnd-kit/sortable`. Đổi status và thứ tự, cập nhật lạc quan, `moveTask` trong service ghi `position` và `completed_at`. Hỗ trợ `KeyboardSensor` và `TouchSensor` có độ trễ. Có thông báo cho trình đọc màn hình.

**Tiêu chí nghiệm thu:**
- [ ] Kéo sang cột khác được lưu sau khi tải lại.
- [ ] Lỗi mạng thì card quay về chỗ cũ và có thông báo.
- [ ] Bàn phím di chuyển được card giữa các cột.
- [ ] Vuốt dọc trên cảm ứng cuộn trang, giữ lâu mới kéo.

**Kiểm chứng:**
- [ ] Vitest cho `moveTask`: giữa hai card, đầu cột, cuối cột, cột rỗng, task của user khác.
- [ ] E2E kéo bằng chuột, bằng bàn phím, và chặn mạng bằng `page.route`.

**Phụ thuộc:** T2.4

**File dự kiến:** `package.json`, `src/components/app/board/Board.tsx`, `src/app/(app)/tasks/actions.ts`, `src/services/tasks.ts`, `e2e/board.spec.ts`

**Quy mô:** M

---

### T2.6 Board phone/tablet và List view

**Mô tả:** Tab theo status dưới `md`, lưới 2×2 ở tablet, 4 cột từ `xl`. Menu "Move to" trên mọi thiết bị cảm ứng. Chế độ List dưới `md` là danh sách thẻ.

**Tiêu chí nghiệm thu:**
- [ ] Đổi status được ở 390 và 820 px chỉ bằng cảm ứng.
- [ ] Chế độ Board hoặc List giữ trên URL.
- [ ] Không có cuộn ngang ở 360, 390, 744, 820 và 1180 px.

**Kiểm chứng:**
- [ ] E2E trên project mobile dùng "Move to".
- [ ] Bạn thử trên điện thoại hoặc iPad thật.

**Phụ thuộc:** T2.5

**File dự kiến:** `src/components/app/board/Board.tsx`, `src/components/app/board/MoveMenu.tsx`, `src/components/app/board/TaskList.tsx`, `e2e/board.spec.ts`

**Quy mô:** M

---

## Checkpoint B

- [ ] Đổi status được bằng chuột, bàn phím và cảm ứng.
- [ ] CI xanh.
- [ ] Bạn đã thử trên điện thoại hoặc iPad thật.

---

## Nhóm C: Chi tiết task

### T2.7 Task detail

**Mô tả:** Trang 05 tại `/tasks/[id]`: mã task, project, sửa từng trường tại chỗ, đổi status, estimate, hủy và xóa có xác nhận bằng `Sheet`. Ẩn Team, Attachment. Khối Time tracked đợi T6.2.

**Tiêu chí nghiệm thu:**
- [ ] Sửa trường nào được lưu trường đó, tải lại vẫn còn.
- [ ] Xóa cần xác nhận, xong về Board; hủy chuyển sang Canceled và khôi phục được.
- [ ] Task của người khác hoặc id sai trả 404.

**Kiểm chứng:**
- [ ] Vitest cho `deleteTask` và hủy.
- [ ] E2E sửa, hủy, xóa trên desktop và mobile.
- [ ] So ảnh với `design/screens/05-task-detail.html` ở 390 và 1440 px.

**Phụ thuộc:** T2.4

**File dự kiến:** `src/app/(app)/tasks/[id]/page.tsx`, `src/app/(app)/tasks/[id]/TaskFields.tsx`, `src/app/(app)/tasks/[id]/actions.ts`, `e2e/task-detail.spec.ts`

**Quy mô:** M

---

### T2.7b Checklist

**Mô tả:** `src/services/subtasks.ts` thêm, tick, sửa, xóa, sắp xếp. Thanh tiến độ ở trang chi tiết, nhấn Enter để thêm.

**Tiêu chí nghiệm thu:**
- [ ] % trên Board đổi theo checklist.
- [ ] Không đụng được subtask của task người khác.

**Kiểm chứng:**
- [ ] Vitest và E2E tick rồi xem lại trên Board.

**Phụ thuộc:** T2.7

**File dự kiến:** `src/services/subtasks.ts`, `src/services/subtasks.test.ts`, `src/app/(app)/tasks/[id]/Checklist.tsx`, `src/app/(app)/tasks/[id]/actions.ts`

**Quy mô:** S

---

### T2.8 Comment và activity

**Mô tả:** Ghi `activity` trong cùng transaction ở mọi hàm ghi của service, có `actor` để Phase 3 ghi `mcp`. Comment là một `type`. Hiện dòng thời gian ở trang chi tiết, thời gian tương đối theo múi giờ.

**Tiêu chí nghiệm thu:**
- [ ] Mọi thay đổi có dòng activity đúng thứ tự thời gian.
- [ ] Ghi activity lỗi thì thay đổi cũng không được lưu.
- [ ] Comment rỗng bị từ chối; nội dung hiện đúng tiếng Việt và không chạy HTML.

**Kiểm chứng:**
- [ ] Vitest cho từng loại thay đổi và trường hợp rollback.
- [ ] E2E thêm comment rồi tải lại.

**Phụ thuộc:** T2.7b

**File dự kiến:** `src/services/activity.ts`, `src/services/activity.test.ts`, `src/services/tasks.ts`, `src/services/subtasks.ts`, `src/app/(app)/tasks/[id]/Activity.tsx`

**Quy mô:** M

---

## Nhóm D: Thao tác nhanh

### T2.9 Tìm kiếm

**Mô tả:** Ô search trên Board và `⌘K`/`Ctrl+K`. `searchTasks` dùng `unaccent` theo tiêu đề và mô tả. Ẩn gợi ý phím trên thiết bị cảm ứng.

**Tiêu chí nghiệm thu:**
- [ ] Gõ `do an` tìm được `Đồ án`.
- [ ] Ký tự `%` và `_` được hiểu là ký tự thường.
- [ ] `Ctrl+K` không kích hoạt khi đang gõ trong ô khác nếu trình duyệt đã dùng phím đó.

**Kiểm chứng:**
- [ ] Vitest cho bỏ dấu, ký tự đặc biệt, cô lập theo user.
- [ ] E2E tìm rồi mở task.

**Phụ thuộc:** T2.4

**File dự kiến:** `src/services/tasks.ts`, `src/components/app/board/SearchBox.tsx`, `e2e/board.spec.ts`

**Quy mô:** S

---

### T2.10 Quick-add

**Mô tả:** Cài `chrono-node`. Phím `N` mở `Sheet`, `parseQuickAdd` tách `#category`, `!priority` và ngày tự nhiên theo múi giờ người dùng, hiện trước kết quả phân tích khi gõ.

**Tiêu chí nghiệm thu:**
- [ ] "Review PR tomorrow 9am #Development !high" cho đúng tên, ngày, giờ, category, priority.
- [ ] `N` không kích hoạt khi đang gõ trong input.
- [ ] Category không tồn tại được báo, không tự tạo.

**Kiểm chứng:**
- [ ] Test bảng cho `parseQuickAdd`, có tên tiếng Việt và câu không có ngày.
- [ ] E2E mở bằng phím, tạo task, thấy trên Board.

**Phụ thuộc:** T2.3, T2.4

**File dự kiến:** `package.json`, `src/lib/quickAdd.ts`, `src/lib/quickAdd.test.ts`, `src/components/app/QuickAdd.tsx`, `src/app/(app)/layout.tsx`

**Quy mô:** M

---

## Checkpoint hoàn thành Phase 2

- [ ] E2E đăng nhập → tạo → kéo → hoàn thành pass trên desktop và mobile.
- [ ] CI xanh.
- [ ] `PLAN.md` đã đánh dấu xong Phase 2.
- [ ] Sẵn sàng sang T3.1.
