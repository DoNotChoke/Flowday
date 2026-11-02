# Phase 4 — Danh sách việc

Tổng quan và quyết định: `tasks/plan.md`.

**Mọi task** chỉ xong khi đạt tiêu chí riêng, đã chạy thử thật, `npm run check` và `npm run test:e2e` pass trên máy, đã push (không chờ CI giữa các task, nhưng CI phải xanh trước khi qua checkpoint), không còn code thừa và không có thay đổi ngoài phạm vi. Trước khi viết code Next, đọc guide liên quan trong `node_modules/next/dist/docs/`. Nối lệnh commit bằng `&&`, không để test fail đi vào commit.

---

## Nhóm A: Xem và quản lý project

### T4.1 Project overview

**Mô tả:** Trang 10 tại `/projects/[id]`: header theo màu project có icon, mã · template, tên, mục tiêu, nút Add task (`/tasks/new?project=`) và nút sửa. Ba KPI: Progress, Tasks (`11 / 18`, kèm số đang mở và số quá hạn), Target date (kèm số ngày còn lại). `getProjectOverview` trong `src/services/projects.ts` tính số liệu theo múi giờ người dùng. Bỏ `shortcut` cũ.

**Tiêu chí nghiệm thu:**
- [x] Số liệu khớp DB; task đã hủy không tính vào Progress.
- [x] Số quá hạn và số ngày còn lại tính theo múi giờ người dùng; hạn hôm nay chưa tính là quá hạn.
- [x] Project không có task hoặc không có ngày đích hiện trạng thái rỗng rõ ràng, không chia cho 0.
- [x] Project của người khác hoặc id sai trả 404.

**Kiểm chứng:**
- [x] Vitest cho `getProjectOverview`, có múi giờ âm, hạn gần nửa đêm, project rỗng, user khác.
- [x] E2E tạo project, xem KPI ở desktop và mobile.
- [x] So ảnh với `design/screens/10-project-overview.html` ở 390 và 1440 px.

**Phụ thuộc:** Không

**File dự kiến:** `src/services/projects.ts`, `src/services/projects.test.ts`, `src/app/(app)/projects/[id]/page.tsx`, `e2e/project-overview.spec.ts`

**Quy mô:** M

---

### T4.1b Sửa và lưu trữ project

**Mô tả:** Trang `/projects/[id]/settings` dùng lại `ProjectForm` với giá trị ban đầu, ẩn template và starter tasks. `updateProject`, `archiveProject`, `restoreProject` trong service. Lưu trữ có xác nhận bằng `Sheet`. `key` không sửa được. Trang của project đã lưu trữ có nhãn và nút khôi phục. Task thuộc project đã lưu trữ vẫn giữ được liên kết khi sửa.

**Tiêu chí nghiệm thu:**
- [x] Sửa tên, mục tiêu, màu, icon, ngày, time budget được lưu; mã task không đổi.
- [x] Project lưu trữ biến khỏi Sidebar và form tạo task, task không mất và vẫn hiện trên `/tasks`.
- [x] Sửa task thuộc project đã lưu trữ không làm mất liên kết project.
- [x] Không sửa hay lưu trữ được project của người khác.

**Kiểm chứng:**
- [x] Vitest cho sửa, lưu trữ, khôi phục, user khác.
- [x] E2E sửa rồi tải lại, lưu trữ rồi khôi phục.

**Phụ thuộc:** T4.1

**File dự kiến:** `src/services/projects.ts`, `src/app/(app)/projects/new/ProjectForm.tsx`, `src/app/(app)/projects/[id]/settings/page.tsx`, `src/app/(app)/projects/[id]/actions.ts`, `e2e/project-overview.spec.ts`

**Quy mô:** M

---

## Checkpoint A

- [x] Số liệu Overview khớp DB trên desktop và mobile.
- [x] CI xanh.
- [x] Bạn đã xem Overview và trang sửa project.

---

## Nhóm B: Task trong project

### T4.2 Bảng Project tasks

**Mô tả:** Khối Project tasks ở Overview: lọc status kèm số đếm trên URL (`?status=`), các cột mã và tên, Priority, Estimate, Due, Status. Dưới 744 px đổi thành danh sách thẻ. Thêm `estimateMin` và cờ quá hạn vào card của `getBoard`. Nút "+ Add task to project". Ẩn cột Assignee.

**Tiêu chí nghiệm thu:**
- [x] Lọc giữ trên URL, số đếm đúng từng status.
- [x] Task quá hạn tô đỏ; task đã xong hoặc đã hủy thì không.
- [x] Không có cuộn ngang ở 360 px.

**Kiểm chứng:**
- [x] Vitest cho cờ quá hạn theo múi giờ.
- [x] E2E lọc, tải lại, mở task.

**Phụ thuộc:** T4.1

**File dự kiến:** `src/services/board.ts`, `src/services/board.test.ts`, `src/app/(app)/projects/[id]/ProjectTasks.tsx`, `src/app/(app)/projects/[id]/page.tsx`, `e2e/project-overview.spec.ts`

**Quy mô:** M

---

### T4.3 Tab Board và List

**Mô tả:** Tab Overview, Board, List trên URL (`?view=`). Hai tab sau dùng lại `Board` của `/tasks`, lọc theo project. Ẩn Timeline và Files.

**Tiêu chí nghiệm thu:**
- [x] Kéo thả và Move to trong tab Board cũng cập nhật `/tasks`.
- [x] Tab giữ trên URL, tải lại vẫn đúng.
- [x] Trên phone vẫn có tab status và Move to như `/tasks`.

**Kiểm chứng:**
- [x] E2E chuyển tab, đổi status, xem lại ở `/tasks` trên desktop và mobile.

**Phụ thuộc:** T4.2

**File dự kiến:** `src/app/(app)/projects/[id]/page.tsx`, `e2e/project-overview.spec.ts`

**Quy mô:** S

---

## Nhóm C: Milestones

### T4.4 Milestones

**Mô tả:** Bảng `milestone` (project, tên, hạn, vị trí), cột `task.milestone_id` có `on delete set null`, migration 0005. `src/services/milestones.ts` thêm, sửa, xóa, liệt kê kèm số task. Khối Milestones ở Overview và sheet "+ Milestone".

**Tiêu chí nghiệm thu:**
- [x] Thêm, sửa, xóa milestone được lưu sau khi tải lại.
- [x] Xóa milestone không xóa task.
- [x] Project không có milestone hiện trạng thái rỗng và nút thêm.
- [x] Không đụng được milestone của project người khác.

**Kiểm chứng:**
- [x] Vitest cho thêm, sửa, xóa, user khác, tên rỗng.
- [x] Migration chạy sạch trên DB rỗng ở CI.
- [x] E2E thêm, sửa, xóa.

**Phụ thuộc:** T4.1

**File dự kiến:** `src/lib/db/schema.ts`, `drizzle/0005_*.sql`, `src/services/milestones.ts`, `src/services/milestones.test.ts`, `src/app/(app)/projects/[id]/Milestones.tsx`

**Quy mô:** M

---

### T4.4b Gán task vào milestone

**Mô tả:** Tile Milestone ở Task detail, chỉ hiện khi task có project. `updateTask` kiểm tra milestone thuộc đúng project và ghi activity. Đổi project thì bỏ milestone. Milestone hiện % và trạng thái suy ra từ task.

**Tiêu chí nghiệm thu:**
- [ ] Hoàn thành task làm đổi % và trạng thái của milestone; task đã hủy không tính.
- [ ] Không gán được milestone của project khác; đổi project tự bỏ milestone.
- [ ] Milestone không có task hiện `Planned`, 0%.

**Kiểm chứng:**
- [ ] Test bảng cho % và trạng thái.
- [ ] E2E gán task, hoàn thành, xem lại ở Overview.

**Phụ thuộc:** T4.4

**File dự kiến:** `src/services/milestones.ts`, `src/services/tasks.ts`, `src/app/(app)/tasks/[id]/TaskFields.tsx`, `src/app/(app)/tasks/[id]/page.tsx`

**Quy mô:** S

---

## Checkpoint B

- [ ] Hoàn thành task làm đổi % và trạng thái milestone.
- [ ] CI xanh.
- [ ] Bạn đã thử trên điện thoại hoặc iPad thật.

---

## Nhóm D: Settings

### T4.5 Settings

**Mô tả:** Trang Settings phần không dính MCP. Hồ sơ: tên, múi giờ. Category: đổi tên, xóa. Project: danh sách đã lưu trữ và nút khôi phục. Đăng xuất đã có ở Sidebar nên không thêm. Connected apps ở lại T3.4.

**Tiêu chí nghiệm thu:**
- [ ] Đổi tên hiện ngay ở Sidebar và lời chào.
- [ ] Đổi múi giờ làm hạn và "Today" đổi theo; giá trị ngoài danh sách IANA bị từ chối.
- [ ] Đổi tên category hiện trên card; trùng tên bị từ chối; xóa category không xóa task.
- [ ] Khôi phục project đưa nó về Sidebar.

**Kiểm chứng:**
- [ ] Vitest cho `updateProfile`, đổi tên và xóa category, user khác.
- [ ] E2E đổi tên, đổi múi giờ, khôi phục project.

**Phụ thuộc:** T4.1b

**File dự kiến:** `src/services/profile.ts`, `src/services/categories.ts`, `src/app/(app)/settings/page.tsx`, `src/app/(app)/settings/SettingsForms.tsx`, `src/app/(app)/settings/actions.ts`

**Quy mô:** M

---

## Checkpoint hoàn thành Phase 4

- [ ] E2E tạo project từ template → thêm task → Overview cập nhật đúng pass trên desktop và mobile.
- [ ] CI xanh.
- [ ] `PLAN.md` đã đánh dấu xong Phase 4.
- [ ] Sẵn sàng sang Phase 5.
