# Implementation Plan: Flowday — Phase 7 (History và streak)

> Nguồn: `PLAN.md` (mục 3, 4, 6). Danh sách việc chi tiết: `tasks/todo.md`. Khảo sát ngày 2026-11-06. Kế hoạch Phase 6 xem lại bằng `git show c3a6334:tasks/plan.md`.

## Overview

Phase 7 biến trang `/history` đang trống thành nơi nhìn lại công việc: streak, KPI, heatmap một năm, biểu đồ, thời gian theo category, việc vừa xong, huy hiệu, xuất CSV. Phase này cũng đưa streak thật lên Sidebar và lịch, và thêm thời gian đã làm cùng biểu đồ Burndown cho trang project.

**Hoàn thành khi:**

1. Streak hiện cùng một con số ở `/history`, Sidebar và lịch; test bảng phủ chuỗi đứt, hôm nay chưa làm, đổi múi giờ, ngày cuối tháng.
2. Với dữ liệu mẫu một năm, `/history` tải dưới 1 giây.
3. Không có cuộn ngang ở 360, 390, 820 và 1440 px trên `/history`.

## Hiện trạng đã kiểm tra

| Hạng mục | Kết quả | Ảnh hưởng |
|---|---|---|
| Repo | `main` có Phase 6 xong, CI xanh ở Run 52; bạn đã thử Phase 5 và 6 | Bắt đầu từ nền đã kiểm chứng |
| `/history` | Chỉ có tiêu đề | Viết mới |
| Dữ liệu | `task.completed_at`, `task.canceled_at`, `task.created_at`, `focus_session` (`ended_at`, `seconds`, `completed`) | Đủ để tính mọi số liệu, không cần bảng mới |
| Index | `task` chỉ có index theo `user_id, status, position`; `focus_session` có `user_id, ended_at` | T7.1 thêm index `task (user_id, completed_at)` nếu đo thấy chậm |
| Quy tắc streak | `PLAN.md`: một ngày được tính khi có ít nhất 1 task xong **hoặc** 1 phiên Focus hoàn thành, theo múi giờ người dùng | Dùng nguyên |
| Sidebar | Thiết kế có thẻ "12 days · Current streak"; Sidebar hiện không có thẻ này | T7.2 thêm thẻ với số thật |
| Lịch | Cờ streak trên ô ngày được dời từ Phase 5 | T7.2 thêm |
| Board | Thiết kế trang 03 không có số streak | Không cần sửa |
| Trang project | Đã có KPI Progress, Tasks, Target date; `budget_hours`, `start_date`, `target_date` có sẵn | T7.7 thêm KPI và Burndown |
| Thiết kế trang 07 | Streak (cháy/tắt), 2 KPI, heatmap 53 tuần, Daily tasks overview, Time by category, Recently completed, 6 huy hiệu, Week/Month/Year, Export CSV | Làm hết |

## Architecture Decisions

- **Gom theo ngày ngay trong SQL.** `(completed_at at time zone tz)::date` và `(ended_at at time zone tz)::date`, `group by` ngày. Postgres đổi giờ mùa hè đúng theo tên múi giờ; mỗi biểu đồ một truy vấn, không kéo từng dòng về máy chủ.
- **Logic streak là hàm thuần trong `src/lib/streak.ts`:** nhận danh sách ngày có hoạt động và ngày hôm nay, trả streak hiện tại, dài nhất, ngày mất streak. Test bảng không cần DB.
- **Hôm nay chưa làm thì streak vẫn còn**, đếm tới hôm qua, kèm lời nhắc "Finish 1 task today to reach n + 1". Chỉ mất khi cả hôm qua cũng trống.
- **Một hàm `getStreak(userId)`** cho mọi nơi hiện streak (History, Sidebar, lịch), nên không thể lệch số.
- **Định nghĩa số liệu:**
  - *Completion rate:* trong các task tạo trong khoảng thời gian (trừ task đã hủy), bao nhiêu phần trăm đã xong; so với khoảng liền trước.
  - *Focus hours:* tổng giây Focus trong khoảng, kèm trung bình mỗi ngày.
  - *Heatmap:* mỗi ô là số task xong cộng số phiên Focus hoàn thành trong ngày; nhãn ghi riêng hai số.
  - *Time by category:* giờ Focus của task, tính vào category đầu tiên theo tên (giống chip trên lịch); task không category vào "Uncategorized".
- **Khoảng thời gian trên URL:** `/history?range=week|month|year`, mặc định Month. Áp dụng cho KPI, biểu đồ, Time by category và CSV; heatmap luôn là 53 tuần.
- **Biểu đồ là SVG tự vẽ** như bản mẫu, không thêm thư viện chart.
- **Huy hiệu tính lúc xem, không lưu.** "Inbox zero" là: đã xong ít nhất 1 task và hiện không còn task nào đang mở. `shortcut: huy hiệu không lưu nên Inbox zero có thể khóa lại, thêm bảng achievement nếu cần giữ vĩnh viễn`.
- **CSV qua một Route Handler** `GET /history/export?range=`, có BOM UTF-8 để Excel đọc đúng tiếng Việt; ô bắt đầu bằng `= + - @` được thêm dấu `'` để chống CSV injection.
- **Burndown** theo `PLAN.md`: giờ estimate còn lại mỗi ngày, suy ra từ `created_at`, `completed_at`, `canceled_at`; đường Ideal từ `start_date` tới `target_date`.
- **Giữ nguyên từ các phase trước:** nội dung người dùng nhập dùng `font-content`; test chờ server trả lời trước khi tải lại trang; mỗi task một commit; không chờ CI giữa các task, nhưng CI phải xanh trước checkpoint.

## Không làm trong phase này

| Phần trong thiết kế | Lý do |
|---|---|
| Ghi lịch sử đổi estimate cho Burndown | `PLAN.md` đã ghi `shortcut`; thêm bảng snapshot nếu cần chính xác tuyệt đối |
| Lưu huy hiệu vĩnh viễn | Xem Architecture Decisions |
| Chia giờ Focus cho nhiều category của một task | Tính vào category đầu tiên; đủ cho V1 |

## Dependency Graph

```text
T7.1 Service thống kê ──┬── T7.2 Streak và KPI ──┬── T7.5 Khoảng thời gian và CSV
                        │                        └── T7.6 Achievements
                        ├── T7.3 Heatmap
                        └── T7.4 Biểu đồ và danh sách

T7.7 Thời gian và Burndown của project (độc lập, chỉ cần focus_session)
```

## Task List

Chi tiết tiêu chí nằm trong `tasks/todo.md`.

### Nhóm A: Streak

- [x] T7.1 Service thống kê (M)
- [x] T7.2 Streak và KPI (M)
- [x] T7.3 Heatmap (S)

### Checkpoint A

- [x] Streak cùng một số ở `/history`, Sidebar và lịch
- [ ] Bạn đã xem `/history` với dữ liệu thật của mình

### Nhóm B: Phần còn lại của History

- [x] T7.4 Biểu đồ và danh sách (M)
- [x] T7.5 Khoảng thời gian và CSV (S)
- [x] T7.6 Achievements (S)

### Nhóm C: Project

- [x] T7.7 Thời gian và Burndown của project (M)

### Checkpoint hoàn thành Phase 7

- [x] Dữ liệu mẫu một năm: `/history` tải dưới 1 giây (truy vấn ~230 ms)
- [ ] CI xanh
- [ ] Bạn đã thử trên điện thoại hoặc iPad thật
- [ ] `PLAN.md` đã đánh dấu xong Phase 7

## Parallelization

- **Tuần tự:** T7.1 trước T7.2–T7.6, vì cùng dựng service và trang.
- **Song song được sau T7.1:** T7.3 và T7.4.
- **Độc lập:** T7.7 làm lúc nào cũng được.
- **Cần phối hợp:** T7.2, T7.5 và T7.6 cùng sửa phần đầu trang `/history`, nên làm liền nhau.

## Risks and Mitigations

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Ngày sai do múi giờ hoặc đổi giờ mùa hè | Cao | Gom ngày trong SQL theo tên múi giờ; test bảng có múi giờ âm, ngày đổi giờ, cuối tháng, đổi múi giờ người dùng |
| `/history` chậm với dữ liệu một năm | TB | Gom trong SQL, chạy các truy vấn song song, thêm index `task (user_id, completed_at)`; script tạo dữ liệu mẫu để đo |
| Thẻ streak trên Sidebar thêm một truy vấn vào mọi trang | TB | Nằm trong `<Suspense>` nên không chặn trang; một truy vấn gom ngày có index |
| Hiệu ứng lửa gây khó chịu | Thấp | Tắt khi `prefers-reduced-motion` |
| Burndown sai khi task không có estimate hoặc project chưa có ngày | TB | Test bảng; ghi rõ số task không có estimate dưới biểu đồ; không có ngày thì ẩn đường Ideal |
| CSV injection | TB | Thêm `'` trước ô bắt đầu bằng `= + - @`, có test |

## Việc bạn cần làm

| Khi nào | Việc |
|---|---|
| Checkpoint A | Xem `/history`, Sidebar và lịch; xác nhận streak đúng với những ngày bạn đã làm |
| Checkpoint hoàn thành | Mở CSV bằng Excel; thử `/history` trên điện thoại hoặc iPad |

## Open Questions

Plan chạy theo mặc định bên dưới. Trả lời khác thì mình sửa lại.

- **Completion rate tính thế nào?** Mặc định: trong các task tạo trong khoảng thời gian (trừ đã hủy), phần trăm đã xong.
- **Khoảng thời gian mặc định?** Mặc định Month.
- **Early bird** mở khi xong một task trước 6 giờ sáng theo múi giờ của bạn. Mặc định giữ như vậy.
