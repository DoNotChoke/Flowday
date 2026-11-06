# Phase 7 — Danh sách việc

Tổng quan và quyết định: `tasks/plan.md`.

**Mọi task** chỉ xong khi đạt tiêu chí riêng, đã chạy thử thật, `npm run check` và `npm run test:e2e` pass trên máy, đã push (không chờ CI giữa các task, nhưng CI phải xanh trước khi qua checkpoint), không còn code thừa và không có thay đổi ngoài phạm vi. Trước khi viết code Next, đọc guide liên quan trong `node_modules/next/dist/docs/`. Nối lệnh commit bằng `&&`, không để test fail đi vào commit.

---

## Nhóm A: Streak

### T7.1 Service thống kê

**Mô tả:** `src/lib/streak.ts`: hàm thuần nhận các ngày có hoạt động và ngày hôm nay, trả streak hiện tại, dài nhất và ngày mất streak. `src/services/stats.ts`: `activityDays(userId, timeZone, from, to)` gom theo ngày trong SQL (task xong, phiên Focus hoàn thành, giây Focus); `getStreak(userId)`; `getSummary(userId, range)` cho completion rate (kèm khoảng trước) và focus hours. Đo truy vấn và thêm index nếu cần: dời sang lúc đo với dữ liệu mẫu ở checkpoint cuối.

**Tiêu chí nghiệm thu:**
- [x] Một ngày được tính khi có task xong hoặc phiên Focus hoàn thành, theo múi giờ người dùng.
- [x] Hôm nay chưa làm thì streak đếm tới hôm qua; trống cả hôm qua thì streak là 0 và có ngày mất streak.
- [x] Không đọc được dữ liệu của người khác.

**Kiểm chứng:**
- [x] Vitest bảng cho `streak.ts`: chuỗi đứt, hôm nay chưa làm, chuỗi qua cuối tháng và cuối năm, không có hoạt động.
- [x] Vitest cho `stats.ts`: task xong lúc 23:30 và 00:30 ở múi giờ dương và âm, ngày đổi giờ, đổi múi giờ người dùng, phiên Focus chưa hoàn thành không tính, user khác.

**Phụ thuộc:** Không

**File dự kiến:** `src/lib/streak.ts`, `src/lib/streak.test.ts`, `src/services/stats.ts`, `src/services/stats.test.ts`, có thể `drizzle/0008_*.sql`

**Quy mô:** M

---

### T7.2 Streak và KPI

**Mô tả:** Trang 07 tại `/history`: header, thẻ streak (cháy khi còn, tắt khi mất, kèm lời nhắc và 7 ngày của tuần này), KPI Completion rate và Focus hours. Thẻ streak nhỏ trên Sidebar dẫn tới `/history`. Cờ lửa trên ô ngày có hoạt động ở lịch. Mọi nơi đọc từ `getStreak`.

**Tiêu chí nghiệm thu:**
- [x] `/history`, Sidebar và lịch hiện cùng một con số và cùng những ngày.
- [x] Thẻ streak có hai trạng thái như thiết kế; hiệu ứng tắt khi `prefers-reduced-motion`.
- [x] Người mới chưa có hoạt động thấy trạng thái rỗng rõ ràng, không chia cho 0.

**Kiểm chứng:**
- [x] E2E tạo dữ liệu 3 ngày liên tiếp, kiểm tra số ở `/history`, Sidebar và cờ trên lịch.
- [x] So ảnh với `design/screens/07-history-streak.html` ở 390 và 1440 px.

**Phụ thuộc:** T7.1

**File dự kiến:** `src/app/(app)/history/page.tsx`, `src/app/(app)/history/StreakCard.tsx`, `src/components/app/Sidebar.tsx`, `src/app/(app)/calendar/DayGrid.tsx`, `src/app/(app)/calendar/page.tsx`, `e2e/history.spec.ts`

**Quy mô:** M

---

### T7.3 Heatmap

**Mô tả:** 53 tuần tới hôm nay, 5 mức màu `heat-0` tới `heat-4`, nhãn tháng, nhãn thứ. Rê chuột hoặc chạm vào ô để xem ngày và số task, số phiên Focus. Tiêu đề "n tasks completed in the last year", dòng "Longest streak · Most active: thứ".

**Tiêu chí nghiệm thu:**
- [x] Số trong ô khớp service; ô hôm nay có viền.
- [x] Ở 390 px lưới cuộn ngang bên trong khối của nó, trang không cuộn ngang; chạm vào ô hiện chi tiết.
- [x] Trình đọc màn hình đọc được tổng và chi tiết từng ngày.

**Kiểm chứng:**
- [x] E2E: ô của một ngày có task xong hiện đúng số; chạm trên mobile hiện chi tiết.

**Phụ thuộc:** T7.1

**File dự kiến:** `src/app/(app)/history/Heatmap.tsx`, `src/app/(app)/history/page.tsx`, `src/services/stats.ts`, `e2e/history.spec.ts`

**Quy mô:** S

---

## Checkpoint A

- [x] Streak cùng một số ở `/history`, Sidebar và lịch.
- [x] CI xanh.
- [ ] Bạn đã xem `/history` với dữ liệu thật của mình.

---

## Nhóm B: Phần còn lại của History

### T7.4 Biểu đồ và danh sách

**Mô tả:** Daily tasks overview: hai đường Completed và Created theo ngày (SVG tự vẽ như bản mẫu, trục tự co theo số lớn nhất). Time by category: thanh ngang giờ Focus theo category. Recently completed: 5 task xong gần nhất, category, thời gian tương đối.

**Tiêu chí nghiệm thu:**
- [x] Số liệu khớp service; không thêm thư viện chart.
- [x] Biểu đồ có nhãn cho trình đọc màn hình và đọc được khi không có dữ liệu.
- [x] Không cuộn ngang ở 360 px.

**Kiểm chứng:**
- [x] Vitest cho truy vấn tạo/xong theo ngày và giờ theo category.
- [x] E2E kiểm tra Recently completed và Time by category với dữ liệu tạo sẵn.

**Phụ thuộc:** T7.1

**File dự kiến:** `src/services/stats.ts`, `src/services/stats.test.ts`, `src/app/(app)/history/DailyChart.tsx`, `src/app/(app)/history/page.tsx`, `e2e/history.spec.ts`

**Quy mô:** M

---

### T7.5 Khoảng thời gian và CSV

**Mô tả:** Nhóm nút Week/Month/Year trên URL (`?range=`), áp dụng cho KPI, biểu đồ và Time by category. Nút Export CSV tải `GET /history/export?range=`: các task xong trong khoảng (ngày xong, mã, tên, project, category, estimate, phút Focus).

**Tiêu chí nghiệm thu:**
- [x] Đổi khoảng thời gian thì số liệu đổi theo và tải lại vẫn giữ.
- [x] File mở đúng tiếng Việt trong Excel nhờ BOM UTF-8.
- [x] Ô bắt đầu bằng `= + - @` được vô hiệu hóa; người chưa đăng nhập bị chặn.

**Kiểm chứng:**
- [x] Vitest cho hàm tạo CSV: BOM, dấu phẩy và dấu ngoặc kép trong tên, CSV injection.
- [x] E2E tải file và kiểm tra nội dung.

**Phụ thuộc:** T7.2

**File dự kiến:** `src/lib/csv.ts`, `src/lib/csv.test.ts`, `src/app/(app)/history/export/route.ts`, `src/app/(app)/history/page.tsx`, `e2e/history.spec.ts`

**Quy mô:** S

---

### T7.6 Achievements

**Mô tả:** 6 huy hiệu: 7-day streak, 30-day streak (theo streak dài nhất), 100 tasks, 500 tasks, Early bird (xong task trước 6 giờ sáng theo múi giờ người dùng), Inbox zero (đã xong ít nhất 1 task và hiện không còn task mở). Huy hiệu chưa mở hiện mờ.

**Tiêu chí nghiệm thu:**
- [x] Mỗi huy hiệu mở đúng ngưỡng.
- [x] Trình đọc màn hình đọc được huy hiệu nào đã mở, nào chưa.

**Kiểm chứng:**
- [x] Vitest bảng cho điều kiện từng huy hiệu, có ngay dưới và ngay trên ngưỡng.

**Phụ thuộc:** T7.2

**File dự kiến:** `src/services/stats.ts`, `src/services/stats.test.ts`, `src/app/(app)/history/page.tsx`

**Quy mô:** S

---

## Nhóm C: Project

### T7.7 Thời gian và Burndown của project

**Mô tả:** Trang project thêm KPI "Time logged vs estimate" (giờ Focus của task trong project / tổng estimate), dòng Budget ("Budget 80h · on track" hoặc "over"), và biểu đồ Burndown (SVG tự vẽ): giờ estimate còn lại theo ngày và đường Ideal từ `start_date` tới `target_date`.

**Tiêu chí nghiệm thu:**
- [x] Số liệu khớp DB; task đã hủy không tính vào estimate còn lại.
- [x] Số task không có estimate được ghi rõ dưới biểu đồ.
- [x] Project chưa có ngày thì ẩn đường Ideal; chưa có task thì hiện trạng thái rỗng.

**Kiểm chứng:**
- [x] Vitest bảng: task không có estimate, task thêm giữa chừng, task hủy, project chưa có ngày, user khác.
- [x] E2E xem KPI và Burndown trên desktop và mobile.

**Phụ thuộc:** Không (chỉ cần `focus_session` đã có)

**File dự kiến:** `src/services/projects.ts`, `src/services/projects.test.ts`, `src/app/(app)/projects/[id]/page.tsx`, `src/app/(app)/projects/[id]/Burndown.tsx`, `e2e/project-overview.spec.ts`

**Quy mô:** M

---

## Checkpoint hoàn thành Phase 7

- [x] Dữ liệu mẫu một năm: `/history` tải dưới 1 giây. Đo ngày 2026-11-06 với 1.460 task và 1.095 phiên Focus: mọi truy vấn của trang mất khoảng 230 ms khi đã ấm, 519 ms lần đầu, từ máy dev tới Neon Singapore. Chưa cần thêm index.
- [x] CI xanh.
- [ ] Bạn đã thử trên điện thoại hoặc iPad thật.
- [ ] `PLAN.md` đã đánh dấu xong Phase 7.
