# Phase 5 — Danh sách việc

Tổng quan và quyết định: `tasks/plan.md`.

**Mọi task** chỉ xong khi đạt tiêu chí riêng, đã chạy thử thật, `npm run check` và `npm run test:e2e` pass trên máy, đã push (không chờ CI giữa các task, nhưng CI phải xanh trước khi qua checkpoint), không còn code thừa và không có thay đổi ngoài phạm vi. Trước khi viết code Next, đọc guide liên quan trong `node_modules/next/dist/docs/`. Nối lệnh commit bằng `&&`, không để test fail đi vào commit.

---

## Nhóm A: Xem lịch

### T5.1 Lịch tháng

**Mô tả:** Trang 06 tại `/calendar` từ dữ liệu thật, cho màn hình từ 744 px. Header có tên tháng, nút tháng trước/sau và Today. Segmented Day/Week/Month thêm ở T5.4, không dựng nút tắt trước. Lưới 6 × 7 bắt đầu từ thứ Hai; mỗi ô tối đa 2 chip, còn lại "+n more"; ô hôm nay và ô đang chọn nổi bật như thiết kế. Agenda bên phải liệt kê task của ngày đang chọn, mỗi dòng có giờ hoặc "Due"/"Planned", tên, category và estimate, bấm vào mở Task detail. Trạng thái trên URL (`?date=`). `getCalendar(userId, from, to)` trong `src/services/calendar.ts`.

**Tiêu chí nghiệm thu:**
- [x] Task hiện theo `planned_at`, không có thì theo `due_at`; task đã hủy không hiện, task đã xong hiện mờ.
- [x] Task gần nửa đêm rơi đúng ngày theo múi giờ người dùng; tuần bắt đầu từ thứ Hai.
- [x] Chuyển tháng, Today và chọn ngày đổi URL; tải lại giữ nguyên.
- [x] Không thấy task của người khác.

**Kiểm chứng:**
- [x] Vitest cho `getCalendar`: múi giờ dương và âm, hạn 23:30 và 00:30, ngày đổi giờ, `planned_at` thắng `due_at`, user khác.
- [x] E2E tạo task có hạn, mở `/calendar?date=`, thấy chip và dòng agenda; bấm mở Task detail.
- [x] So ảnh với `design/screens/06-calendar.html` ở 820 và 1440 px.

**Phụ thuộc:** Không

**File dự kiến:** `src/services/calendar.ts`, `src/services/calendar.test.ts`, `src/app/(app)/calendar/page.tsx`, `src/app/(app)/calendar/MonthGrid.tsx`, `src/app/(app)/calendar/Agenda.tsx`, `e2e/calendar.spec.ts`

**Quy mô:** M

---

### T5.2 Lịch mobile

**Mô tả:** Dưới 744 px: lưới tháng gọn, mỗi ô chỉ có số ngày và tối đa 3 chấm màu; chạm ngày để xem agenda nằm dưới lưới. Header gọn lại một hàng.

**Tiêu chí nghiệm thu:**
- [x] Không có cuộn ngang ở 360 và 390 px.
- [x] Chạm ngày đổi agenda bên dưới; mỗi ô có nhãn cho trình đọc màn hình (ngày và số task).
- [x] Vùng chạm của ô ngày tối thiểu 44 px.

**Kiểm chứng:**
- [x] E2E project `mobile`: chạm ngày, thấy agenda, kiểm tra không cuộn ngang.

**Phụ thuộc:** T5.1

**File dự kiến:** `src/app/(app)/calendar/MonthGrid.tsx`, `src/app/(app)/calendar/page.tsx`, `e2e/calendar.spec.ts`

**Quy mô:** S

---

## Checkpoint A

- [x] Task hiện đúng ngày trên desktop, iPad và phone.
- [x] CI xanh.
- [x] Bạn đã xem lịch thật trên máy.

---

## Nhóm B: Lên lịch

### T5.3 Unscheduled và sheet chọn ngày

**Mô tả:** Khối "Unscheduled · n" dưới agenda liệt kê task chưa xong, chưa hủy, không có `planned_at` và `due_at`. Mỗi dòng có nút "Plan" mở `Sheet` với `DateField`, mặc định là ngày đang chọn. `updateTask` nhận thêm `plannedDate` (lưu nửa đêm theo múi giờ người dùng, `null` để bỏ lịch) và ghi activity. Task detail có thêm ô "Planned" để đổi hoặc bỏ lịch.

**Tiêu chí nghiệm thu:**
- [ ] Lên lịch xong, task rời Unscheduled, số đếm giảm 1 và task hiện ở ngày đã chọn.
- [ ] `planned_at` lưu đúng ngày theo múi giờ người dùng; bỏ lịch trả task về Unscheduled.
- [ ] Mỗi lần đổi lịch có một dòng activity.
- [ ] Không lên lịch được task của người khác.

**Kiểm chứng:**
- [ ] Vitest cho `plannedDate` trong `updateTask`: lưu, bỏ, múi giờ âm, user khác.
- [ ] E2E desktop và mobile: tạo task không ngày → Plan → thấy trong agenda, tải lại vẫn còn.

**Phụ thuộc:** T5.1

**File dự kiến:** `src/services/tasks.ts`, `src/services/tasks.test.ts`, `src/services/calendar.ts`, `src/app/(app)/calendar/Unscheduled.tsx`, `src/app/(app)/calendar/actions.ts`, `src/app/(app)/tasks/[id]/TaskFields.tsx`, `e2e/calendar.spec.ts`

**Quy mô:** M

---

### T5.3b Kéo task vào ngày

**Mô tả:** Trên lưới tháng (từ 744 px), kéo một dòng Unscheduled thả vào ô ngày để lên lịch, dùng `@dnd-kit` với Mouse, Touch (có độ trễ) và Keyboard sensor như Board. Cập nhật lạc quan; lỗi thì task quay về Unscheduled.

**Tiêu chí nghiệm thu:**
- [ ] Kéo thả lưu `planned_at` đúng ngày của ô, tải lại vẫn còn.
- [ ] Làm được bằng bàn phím và có thông báo cho trình đọc màn hình.
- [ ] Trên iPad vừa cuộn được vừa kéo được.

**Kiểm chứng:**
- [ ] E2E desktop: kéo bằng chuột và bằng bàn phím.

**Phụ thuộc:** T5.3

**File dự kiến:** `src/app/(app)/calendar/MonthGrid.tsx`, `src/app/(app)/calendar/Unscheduled.tsx`, `src/app/(app)/calendar/CalendarDnd.tsx`, `e2e/calendar.spec.ts`

**Quy mô:** S

---

## Nhóm C: Các view khác

### T5.4 Week và Day

**Mô tả:** Bật Segmented Day/Week/Month (`?view=`). Week: 7 cột từ thứ Hai của tuần chứa ngày đang chọn, mỗi cột liệt kê chip đầy đủ; dưới 744 px là danh sách 7 ngày xếp dọc. Day: agenda cỡ lớn của ngày đang chọn. Nút trước/sau đi theo view (tháng, tuần, ngày). Cùng đọc từ `getCalendar`.

**Tiêu chí nghiệm thu:**
- [ ] Chuyển qua lại 3 view giữ nguyên ngày đang chọn.
- [ ] Trước/sau nhảy đúng một tháng, một tuần hoặc một ngày.
- [ ] Không có cuộn ngang ở 360, 820 và 1440 px.

**Kiểm chứng:**
- [ ] E2E chuyển Month → Week → Day và quay lại, kiểm tra `?date=` không đổi và task vẫn hiện.

**Phụ thuộc:** T5.1

**File dự kiến:** `src/app/(app)/calendar/page.tsx`, `src/app/(app)/calendar/WeekView.tsx`, `src/app/(app)/calendar/Agenda.tsx`, `e2e/calendar.spec.ts`

**Quy mô:** M

---

## Checkpoint hoàn thành Phase 5

- [ ] E2E tạo task không ngày → lên lịch → hiện trong agenda pass trên desktop và mobile.
- [ ] CI xanh.
- [ ] Bạn đã thử trên điện thoại hoặc iPad thật.
- [ ] `PLAN.md` đã đánh dấu xong Phase 5 (T5.3b ghi thêm vào danh sách).
