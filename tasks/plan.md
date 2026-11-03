# Implementation Plan: Flowday — Phase 5 (Calendar)

> Nguồn: `PLAN.md` (mục 3, 4, 6). Danh sách việc chi tiết: `tasks/todo.md`. Khảo sát ngày 2026-11-03. Kế hoạch Phase 4 đã xong, xem lại bằng `git show b87f213:tasks/plan.md`.

## Overview

Phase 5 biến trang `/calendar` đang trống thành lịch dùng được: xem task theo tháng, tuần, ngày; xem agenda của một ngày; lên lịch cho task chưa có ngày bằng kéo thả hoặc sheet chọn ngày.

**Hoàn thành khi:**

1. E2E tạo task không ngày → lên lịch → hiện trong agenda chạy trên cả desktop và mobile.
2. Task gần nửa đêm rơi đúng ngày theo múi giờ người dùng, có test bảng.
3. Không có cuộn ngang ở 360, 390, 820 và 1440 px trên `/calendar`.

## Hiện trạng đã kiểm tra

| Hạng mục | Kết quả | Ảnh hưởng |
|---|---|---|
| Repo | `main` có Phase 4 đóng, CI xanh ở Run 41 | Bắt đầu từ nền đã kiểm chứng |
| `/calendar` | Chỉ có tiêu đề | Viết mới |
| `task.planned_at` | Đã có cột, chưa nơi nào đọc hay ghi | Không cần migration |
| Quy tắc hiển thị | `PLAN.md`: theo `planned_at`, nếu không có thì `due_at`; thiếu cả hai là Unscheduled | Dùng nguyên |
| `lib/datetime` | Có `zonedToUtc`, `utcToZoned` | Đủ để tính khung lưới theo múi giờ |
| `@dnd-kit` | Đã cài, Board đã dùng Mouse/Touch/Keyboard sensor | T5.3b dùng lại cách cấu hình |
| `DateField`, `Sheet` | Đã có, chạy tốt trên iPad | Sheet chọn ngày không cần component mới |
| `updateTask` | Ghi activity, nhận `actor` | Thêm trường `plannedDate` thay cho hàm mới |
| Thiết kế | Trang 06 chỉ có Month; có "Synced with Google Calendar" và cờ streak | Xem mục "Không làm trong phase này" |

## Architecture Decisions

- **Một hàm service `getCalendar(userId, from, to)`** trả task trong khoảng ngày, mỗi task kèm `day` (ngày theo múi giờ người dùng), `time` và `kind` (`planned` hoặc `due`). Ngày được tính trong SQL bằng `(coalesce(planned_at, due_at) at time zone tz)::date`, nên đúng cả khi đổi giờ mùa hè. Month, Week, Day và agenda cùng đọc từ đây.
- **`planned_at` là một ngày, không có giờ.** Lưu nửa đêm theo múi giờ người dùng. Agenda hiện "Planned" cho task đã lên lịch; task chỉ có hạn hiện giờ hạn hoặc "Due". `shortcut: không có giờ cho planned_at, thêm cột planned_has_time nếu cần xếp theo khung giờ`.
- **Trạng thái nằm trên URL:** `/calendar?view=month|week|day&date=2026-11-03`. Ngày chọn đi theo URL nên đổi view giữ nguyên ngày, tải lại không mất.
- **Tuần bắt đầu từ thứ Hai.** Lưới tháng luôn 6 hàng × 7 cột như thiết kế.
- **Task đã xong vẫn hiện, mờ và gạch ngang; task đã hủy không hiện.** Unscheduled chỉ gồm task chưa xong, chưa hủy.
- **Màu chip** lấy từ category đầu tiên của task, không có thì từ màu project, không có nữa thì màu trung tính.
- **Week và Day là danh sách theo ngày, không có lưới giờ**, vì `planned_at` không có giờ. Week là 7 cột chip, Day là agenda cỡ lớn.
- **Lên lịch đi qua `updateTask`** với trường mới `plannedDate`, nên có activity và kiểm tra quyền sẵn. Task detail có thêm ô "Planned" để đổi hoặc bỏ lịch.
- **Giữ nguyên từ các phase trước:** nội dung người dùng nhập dùng `font-content`; form khóa submit tới khi hydrate; `.catch` của Server Action phải qua `unstable_rethrow`; test chờ server trả lời trước khi tải lại trang; mỗi task một commit; không chờ CI giữa các task, nhưng CI phải xanh trước checkpoint.

## Không làm trong phase này

| Phần trong thiết kế | Lý do |
|---|---|
| "Synced with Google Calendar" | Lùi khỏi V1 (`PLAN.md` mục 8) |
| Cờ streak trên ô ngày | Cần service streak của T7.1; chuyển sang T7.2 cùng các chỗ thay số giả khác |
| Lưới theo giờ trong Week và Day | `planned_at` không có giờ, xem Architecture Decisions |
| Kéo task đã có ngày sang ngày khác trên lưới | Đổi được ở ô "Planned" của Task detail; thêm nếu bạn cần |

## Dependency Graph

```text
T5.1 Lịch tháng ──┬── T5.2 Lịch mobile
                  ├── T5.3 Lên lịch bằng sheet ── T5.3b Kéo vào ngày
                  └── T5.4 Week và Day
```

Mỗi task để lại một đường dùng được từ giao diện tới DB.

## Task List

Chi tiết tiêu chí nằm trong `tasks/todo.md`.

### Nhóm A: Xem lịch

- [x] T5.1 Lịch tháng (M)
- [x] T5.2 Lịch mobile (S)

### Checkpoint A

- [ ] Task hiện đúng ngày trên desktop, iPad và phone
- [ ] Bạn đã xem lịch thật trên máy

### Nhóm B: Lên lịch

- [ ] T5.3 Unscheduled và sheet chọn ngày (M)
- [ ] T5.3b Kéo task vào ngày (S)

### Nhóm C: Các view khác

- [ ] T5.4 Week và Day (M)

### Checkpoint hoàn thành Phase 5

- [ ] E2E tạo task không ngày → lên lịch → hiện trong agenda pass trên desktop và mobile
- [ ] CI xanh
- [ ] Bạn đã thử trên điện thoại hoặc iPad thật
- [ ] `PLAN.md` đã đánh dấu xong Phase 5

## Parallelization

- **Tuần tự:** T5.1 trước mọi task còn lại, vì dựng service và trang. T5.3 trước T5.3b vì kéo thả dùng cùng action.
- **Song song được sau T5.1:** T5.2, T5.3 và T5.4.
- **Cần phối hợp:** T5.2 và T5.4 cùng sửa phần header và lưới của trang, nên làm liền nhau hoặc tuần tự.

## Risks and Mitigations

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Task gần nửa đêm rơi sai ngày | TB | Tính ngày trong SQL theo `user.timezone`; test bảng với múi giờ dương, âm và ngày đổi giờ |
| Kéo thả trên iPad xung đột với cuộn | TB | Dùng `TouchSensor` có độ trễ như Board; sheet chọn ngày là đường chính trên cảm ứng |
| Tốc độ: lịch tháng đọc 42 ngày task | Thấp | Một truy vấn có khoảng ngày; thêm index nếu đo thấy chậm |
| Tháng nhiều task làm ô bị tràn | Thấp | Tối đa 2 chip mỗi ô, còn lại "+n more" như thiết kế |
| E2E phụ thuộc ngày hiện tại | TB | Test dùng `?date=` cố định và tạo task theo ngày đó |

## Việc bạn cần làm

| Khi nào | Việc |
|---|---|
| Checkpoint A | Xem lịch trên desktop và điện thoại qua ngrok, nói điều muốn đổi |
| Checkpoint hoàn thành | Thử lên lịch trên điện thoại hoặc iPad thật |

## Open Questions

Plan chạy theo mặc định bên dưới. Trả lời khác thì mình sửa lại.

- **Week và Day có cần lưới theo giờ không?** Mặc định không, vì task lên lịch theo ngày.
- **Task đã xong có hiện trên lịch không?** Mặc định có, mờ đi.
- **Deploy lên Vercel sớm?** Vẫn để ngoài phase này. Mình vẫn đề xuất deploy sớm để đo tốc độ thật.
