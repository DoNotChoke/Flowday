# Phase 6 — Danh sách việc

Tổng quan và quyết định: `tasks/plan.md`.

**Mọi task** chỉ xong khi đạt tiêu chí riêng, đã chạy thử thật, `npm run check` và `npm run test:e2e` pass trên máy, đã push (không chờ CI giữa các task, nhưng CI phải xanh trước khi qua checkpoint), không còn code thừa và không có thay đổi ngoài phạm vi. Trước khi viết code Next, đọc guide liên quan trong `node_modules/next/dist/docs/`. Nối lệnh commit bằng `&&`, không để test fail đi vào commit.

---

## Nhóm A: Bộ đếm

### T6.1 Bộ đếm

**Mô tả:** Trang 08 tại `/focus`: tab Focus / Short break / Long break, vòng đếm có tiến độ, Start/Pause, Reset, Skip, và "+5 min" khi đang chạy. Thời lượng mặc định 25/5/15 tới T6.4. Logic là hàm thuần trong `src/lib/focusTimer.ts`; trạng thái lưu ở `localStorage`, số còn lại tính từ `endsAt`. Hết giờ thì hiện thông báo của hệ điều hành (xin quyền lúc bấm Start lần đầu), kêu chuông ngắn (Web Audio), chuyển sang mode tiếp theo và chờ Start. Tiêu đề tab hiện thời gian còn lại khi đang chạy. Vòng đếm rộng `min(300px, 80vw)`.

**Tiêu chí nghiệm thu:**
- [x] Để tab nền 5 phút rồi quay lại, số còn lại vẫn đúng.
- [x] Tải lại trang giữa phiên, đang chạy thì vẫn chạy, đang dừng thì vẫn dừng, cùng số còn lại.
- [x] Đổi mode, Reset, Skip, +5 min đúng như thiết kế; đang chạy thì đổi mode phải qua Reset hoặc Skip.
- [x] Hết giờ khi đang ở tab khác thì có thông báo của hệ điều hành; bị từ chối quyền thì trang ghi rõ và vẫn có chuông.
- [x] Số đếm có `aria-live` chỉ đọc mỗi phút, không đọc mỗi giây; mọi nút dùng được bằng bàn phím.

**Kiểm chứng:**
- [x] Vitest cho `focusTimer`: start, pause, resume, reset, skip, +5 min khi chạy và khi dừng, hết giờ, chu kỳ 4 Focus thì Long break.
- [x] E2E dùng `page.clock`: chạy, tua 5 phút, tải lại, tua tới hết giờ thấy mode chuyển sang Short break; thông báo được gọi (giả `Notification` trong trang).
- [x] Không cuộn ngang ở 360 px; so ảnh với `design/screens/08-focus-mode.html` ở 390 và 1440 px.

**Phụ thuộc:** Không

**File dự kiến:** `src/lib/focusTimer.ts`, `src/lib/focusTimer.test.ts`, `src/app/(app)/focus/page.tsx`, `src/app/(app)/focus/Timer.tsx`, `e2e/focus.spec.ts`

**Quy mô:** M

---

### T6.5 Bộ đếm nhỏ trên Sidebar

**Mô tả:** Khi có phiên đang chạy hoặc đang dừng, Sidebar (desktop) và top bar (phone, tablet) hiện một nút nhỏ: mode và thời gian còn lại, bấm vào thì về `/focus`. Đọc chung trạng thái `localStorage` với trang Focus, nghe sự kiện `storage` để cập nhật giữa các tab. Phiên hết giờ khi đang ở trang khác vẫn báo như ở trang Focus. Ẩn khi đang ở `/focus` và khi không có phiên.

**Tiêu chí nghiệm thu:**
- [x] Bắt đầu phiên rồi sang `/tasks` thấy bộ đếm nhỏ chạy đúng giờ.
- [x] Phiên kết thúc ở trang khác vẫn có thông báo và chuông.
- [x] Không có cuộn ngang ở 360 px; có nhãn cho trình đọc màn hình.

**Kiểm chứng:**
- [x] E2E dùng `page.clock`: Start ở `/focus`, sang `/tasks`, tua thời gian, thấy số đổi; bấm vào về `/focus`.

**Phụ thuộc:** T6.1

**File dự kiến:** `src/components/app/FocusPill.tsx`, `src/components/app/Sidebar.tsx`, `src/components/app/TopBar.tsx`, `src/lib/focusTimer.ts`, `e2e/focus.spec.ts`

**Quy mô:** S

---

## Checkpoint A

- [x] Bộ đếm đúng giờ khi để tab nền và sau khi tải lại.
- [x] CI xanh.
- [ ] Bạn đã thử: bắt đầu phiên, làm ở cửa sổ khác, nhận thông báo khi hết giờ.
- [ ] Bạn đã thử Calendar (Phase 5) trên điện thoại hoặc iPad thật; `PLAN.md` đánh dấu xong Phase 5, ghi thêm T5.3b.

---

## Nhóm B: Lưu phiên và tùy chỉnh

### T6.2 Lưu phiên và Time tracked

**Mô tả:** Migration thêm bảng `focus_session` (`id`, `user_id`, `task_id?` set null, `mode`, `started_at`, `ended_at`, `seconds`, `completed`), index theo `user_id, ended_at`. Service `src/services/focus.ts`: `recordSession` (id từ trình duyệt, `on conflict do nothing`, kiểm tra quyền, số giây không quá khoảng thời gian thật và tối đa 4 giờ), `trackedSeconds(userId, taskId)`. Bộ đếm gửi phiên khi hết giờ, khi Skip hoặc Reset sau ít nhất 1 phút focus, và khi mở lại trang thấy phiên đã hết giờ. Task detail có khối "Time tracked" (giờ:phút, kèm Est.) và nút "Start focus session" tới `/focus?task=<id>`; trang Focus hiện "Working on" với tên task. `?task=` chỉ đổi task khi bộ đếm không chạy.

**Tiêu chí nghiệm thu:**
- [x] Xong một phiên gắn với task, Time tracked của task tăng đúng số phút.
- [x] Gửi lại cùng một phiên không tạo dòng trùng.
- [x] Số giây vượt khoảng thời gian thật, `ended_at` ở tương lai, hoặc task của người khác đều bị từ chối.
- [x] Phiên Break không cộng vào Time tracked.

**Kiểm chứng:**
- [x] Vitest cho `recordSession` và `trackedSeconds`: trùng id, giới hạn số giây, user khác, task đã xóa (`task_id` thành null).
- [x] E2E desktop và mobile: Task detail → Start focus session → tua hết 25 phút → quay lại Task detail thấy `0:25`.

**Phụ thuộc:** T6.1

**File dự kiến:** `src/lib/db/schema.ts`, `drizzle/0007_focus_sessions.sql`, `src/services/focus.ts`, `src/services/focus.test.ts`, `src/app/(app)/focus/actions.ts`, `src/app/(app)/focus/Timer.tsx`, `src/app/(app)/tasks/[id]/page.tsx`, `e2e/focus.spec.ts`

**Quy mô:** M

---

### T6.3 Today's queue

**Mô tả:** Khối "Today's queue" bên cạnh bộ đếm: task chưa xong đang làm, hoặc có ngày lên lịch hay hạn là hôm nay theo múi giờ người dùng. Mỗi dòng có số phiên đã focus / ước tính và tổng thời gian ước tính ở đầu khối. Chạm một dòng để chọn làm "Working on" (khi bộ đếm không chạy). "Next:" là dòng kế tiếp. "Session n of 4" đếm theo số phiên Focus hoàn thành hôm nay.

**Tiêu chí nghiệm thu:**
- [ ] Queue khớp DB: không có task đã xong, đã hủy, hay của ngày khác.
- [ ] Chọn task từ queue đổi "Working on" và "Next".
- [ ] "Session n of 4" tăng sau mỗi phiên Focus hoàn thành và quay về 1 sau phiên thứ 4.

**Kiểm chứng:**
- [ ] Vitest cho truy vấn queue và đếm phiên hôm nay, có múi giờ âm và phiên gần nửa đêm.
- [ ] E2E chọn task từ queue rồi chạy một phiên.

**Phụ thuộc:** T6.2

**File dự kiến:** `src/services/focus.ts`, `src/services/focus.test.ts`, `src/app/(app)/focus/page.tsx`, `src/app/(app)/focus/Queue.tsx`, `e2e/focus.spec.ts`

**Quy mô:** S

---

### T6.4 Tự đặt thời lượng

**Mô tả:** Migration thêm ba cột vào `user`: `focus_min` (mặc định 25), `short_break_min` (5), `long_break_min` (15). Nút "Timer settings" trên trang Focus mở `Sheet`: mỗi mode một ô số, Focus có chip nhanh 25 / 50 / 90. `updateTimerSettings` trong `src/services/profile.ts` kiểm tra Focus 5–180, Break 1–60. Thời lượng mới áp dụng từ phiên sau; phiên đang chạy giữ nguyên.

**Tiêu chí nghiệm thu:**
- [x] Đặt Focus 50 phút, lần Start sau đếm từ 50:00; tải lại và đổi máy vẫn giữ.
- [x] Giá trị ngoài khoảng bị từ chối, lỗi hiện tại ô tương ứng.
- [x] Phiên đang chạy không bị đổi khi lưu thời lượng mới.

**Kiểm chứng:**
- [x] Vitest cho `updateTimerSettings`: giá trị hợp lệ, ngoài khoảng, không đổi của user khác.
- [x] E2E chọn chip 50, Start, thấy 50:00.

**Phụ thuộc:** T6.1 (làm trước T6.2 theo yêu cầu của bạn)

**File dự kiến:** `src/lib/db/auth-schema.ts`, `drizzle/0006_timer_settings.sql`, `src/services/profile.ts`, `src/services/profile.test.ts`, `src/app/(app)/focus/TimerSettings.tsx`, `src/app/(app)/focus/actions.ts`, `e2e/focus.spec.ts`

**Quy mô:** S

---

## Checkpoint hoàn thành Phase 6

- [ ] Chạy hết một phiên, số liệu xuất hiện đúng trong Task detail, trên desktop và mobile.
- [ ] CI xanh.
- [ ] `PLAN.md` đã đánh dấu xong Phase 6.
