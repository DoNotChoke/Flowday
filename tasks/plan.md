# Implementation Plan: Flowday — Phase 6 (Focus)

> Nguồn: `PLAN.md` (mục 3, 4, 6). Danh sách việc chi tiết: `tasks/todo.md`. Khảo sát ngày 2026-11-03. Kế hoạch Phase 5 xem lại bằng `git show 7f12e24:tasks/plan.md`.

## Overview

Phase 6 biến trang `/focus` đang trống thành bộ đếm Pomodoro dùng được khi bạn làm việc ở cửa sổ khác: đếm đúng giờ kể cả khi tab nằm nền, báo hết giờ bằng thông báo của hệ điều hành, thời lượng tự đặt được, không mất phiên khi tải lại, lưu phiên vào DB, cộng thời gian vào task và gợi ý việc cần làm hôm nay.

**Hoàn thành khi:**

1. Chạy hết một phiên Focus gắn với task, thời gian hiện đúng ở ô Time tracked của Task detail.
2. Để tab nền hoặc tải lại trang giữa phiên vẫn đúng giờ, có E2E dùng đồng hồ giả của Playwright.
3. Không có cuộn ngang ở 360, 390, 820 và 1440 px trên `/focus`.

**Còn mở từ Phase 5:** thử Calendar trên điện thoại hoặc iPad thật, rồi đánh dấu Phase 5 xong trong `PLAN.md` (kèm T5.3b). Gộp vào Checkpoint A bên dưới.

## Hiện trạng đã kiểm tra

| Hạng mục | Kết quả | Ảnh hưởng |
|---|---|---|
| Repo | `main` có Phase 5 xong, CI xanh ở Run 46 | Bắt đầu từ nền đã kiểm chứng |
| `/focus` | Chỉ có tiêu đề; đã có trong Sidebar và bottom nav | Viết mới trang |
| `focus_session` | Chưa có bảng; `PLAN.md` đã định nghĩa cột | T6.2 thêm migration, chỉ thêm bảng |
| Thiết kế trang 08 | Tab mode, vòng đếm, "Session 3 of 4", Working on / Next, Start-Pause-Reset-Skip, Today's queue, Ambient sound, ghi chú tắt thông báo | Xem mục "Không làm trong phase này" |
| Thiết kế trang 05 | Khối "Time tracked" với Est. và nút "Start focus session" | T6.2 thêm vào Task detail |
| Bản mẫu | Trừ dần bằng `setInterval` | Không dùng: tab nền bị trì hoãn nên sai giờ khi bạn làm ở cửa sổ khác |
| `planned_at`, `due_at` | Đã có từ Phase 5 | Today's queue lấy task lên lịch hoặc tới hạn hôm nay |
| Form tạo task | Đã ghi "≈ n focus sessions (25 min)" | Queue dùng cùng quy ước 25 phút một phiên |

## Architecture Decisions

- **Đồng hồ tính theo mốc thời gian.** Khi chạy chỉ lưu `endsAt`; số còn lại là `endsAt - Date.now()` ở mỗi lần vẽ. Khi dừng lưu `remainingMs`. Tab nền bị trì hoãn cũng không lệch, nên bạn bấm Start rồi làm việc ở cửa sổ khác được.
- **Trạng thái bộ đếm nằm ở `localStorage`**, không ở server: `{ id, mode, taskId, startedAt, endsAt | remainingMs, focusedMs }`. Tải lại trang thì đọc lại. `shortcut: phiên đang chạy chỉ thấy trên thiết bị đã bắt đầu nó, lưu lên server nếu cần đồng bộ nhiều máy`.
- **Logic đồng hồ là hàm thuần trong `src/lib/focusTimer.ts`** (start, pause, resume, reset, skip, +5 min, finish, next mode), test được bằng Vitest không cần trình duyệt.
- **Báo hết giờ bằng thông báo của hệ điều hành** (Notification API), xin quyền một lần khi bấm Start lần đầu. Thông báo hiện cả khi bạn đang ở cửa sổ khác. Kèm tiếng chuông ngắn tạo bằng Web Audio (không cần file) và tiêu đề tab hiện thời gian còn lại. Bị từ chối quyền thì vẫn còn chuông và tiêu đề tab.
- **Thời lượng linh hoạt.** Mỗi mode có thời lượng riêng do bạn đặt (Focus 5–180 phút, Break 1–60 phút), lưu ở bảng `user` để mọi máy dùng chung. Đang chạy có nút "+5 min". Skip sau ít nhất 1 phút vẫn cộng thời gian đã làm.
- **Bộ đếm nhỏ trên Sidebar và top bar** khi có phiên, bấm vào thì về `/focus`. Đọc chung trạng thái `localStorage` với trang Focus.
- **Chỉ lưu phiên đã kết thúc.** Hết giờ, Skip hoặc Reset sau ít nhất 1 phút focus thì gửi một dòng `focus_session`. `completed = true` chỉ khi chạy hết giờ. Time tracked cộng mọi giây đã focus; streak (Phase 7) chỉ tính phiên `completed`.
- **Mỗi phiên có `id` tạo ở trình duyệt.** Lưu bằng `on conflict do nothing`, nên gửi lại sau khi tải trang hoặc mất mạng không tạo dòng trùng. Phiên hết giờ lúc tab đóng sẽ được lưu khi mở lại trang.
- **Server không tin số giây từ trình duyệt:** `seconds` không vượt quá `ended_at - started_at` và tối đa 4 giờ; `ended_at` không ở tương lai; `task_id` phải thuộc người dùng.
- **Chu kỳ Pomodoro:** sau Focus là Short break, sau mỗi Focus thứ 4 trong ngày là Long break. Hết giờ thì chuyển mode nhưng không tự chạy. "Session n of 4" đếm theo số phiên Focus hoàn thành hôm nay, theo múi giờ người dùng.
- **Today's queue** là task chưa xong, đang làm (`in_process`), hoặc có ngày lên lịch hay hạn là hôm nay. Mỗi dòng ghi số phiên đã focus / số phiên ước tính (`ceil(estimate / thời lượng Focus)`).
- **Giữ nguyên từ các phase trước:** form khóa submit tới khi hydrate; `.catch` của Server Action phải qua `unstable_rethrow`; test chờ server trả lời trước khi tải lại trang; mỗi task một commit; không chờ CI giữa các task, nhưng CI phải xanh trước checkpoint.

## Không làm trong phase này

| Phần trong thiết kế | Lý do |
|---|---|
| Ambient sound (Rain, Café, Lo-fi) và Volume | Bỏ theo quyết định của bạn |
| Tắt thông báo khi đang focus | Thuộc T8.2, khi đã có thông báo |
| Đổi số Focus trước Long break (mặc định 4) | Chưa cần; hằng số một chỗ |
| Streak và focus hours ở History | Phase 7 đọc từ `focus_session` |

## Dependency Graph

```text
T6.1 Bộ đếm (client) ──┬── T6.2 Lưu phiên + Time tracked ──┬── T6.3 Today's queue
                       │                                   └── T6.4 Tự đặt thời lượng
                       └── T6.5 Bộ đếm nhỏ trên Sidebar
```

Mỗi task để lại một đường dùng được: T6.1 là bộ đếm chạy được, T6.5 cho thấy nó ở mọi trang, T6.2 nối nó với DB và Task detail, T6.3 thêm gợi ý việc, T6.4 cho đổi thời lượng.

## Task List

Chi tiết tiêu chí nằm trong `tasks/todo.md`.

### Nhóm A: Bộ đếm

- [x] T6.1 Bộ đếm (M)
- [x] T6.4 Tự đặt thời lượng (S), làm sớm theo yêu cầu của bạn
- [x] T6.5 Bộ đếm nhỏ trên Sidebar (S)

### Checkpoint A

- [x] Bộ đếm đúng giờ khi để tab nền và sau khi tải lại
- [ ] Bạn đã thử: bắt đầu phiên, làm ở cửa sổ khác, nhận thông báo khi hết giờ
- [ ] Bạn đã thử Calendar (Phase 5) trên điện thoại hoặc iPad thật; `PLAN.md` đánh dấu xong Phase 5

### Nhóm B: Lưu phiên và tùy chỉnh

- [x] T6.2 Lưu phiên và Time tracked (M)
- [x] T6.3 Today's queue (S)

### Checkpoint hoàn thành Phase 6

- [x] Chạy hết một phiên, số liệu xuất hiện đúng trong Task detail, trên desktop và mobile
- [ ] CI xanh
- [ ] `PLAN.md` đã đánh dấu xong Phase 6

## Parallelization

T6.1 trước mọi task. T6.5 chỉ cần T6.1, làm ngay sau để bạn thử ở Checkpoint A. T6.4 đã làm sớm theo yêu cầu của bạn (migration 0006); T6.2 dùng migration 0007 và phải xong trước T6.3.

## Risks and Mitigations

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Bạn từ chối quyền thông báo, hoặc Windows bật Focus Assist | TB | Vẫn còn chuông và tiêu đề tab; trang Focus ghi rõ khi quyền bị chặn |
| iOS Safari tạm dừng JavaScript khi khóa màn hình | Thấp | Đồng hồ tính theo mốc thời gian nên mở lại vẫn đúng; phiên hết giờ trong lúc đó được lưu khi mở lại |
| Trình duyệt chặn âm thanh khi chưa có thao tác người dùng | Thấp | Tạo `AudioContext` lúc bấm Start, là lúc có thao tác |
| Đổi thời lượng giữa phiên làm số còn lại nhảy | Thấp | Thời lượng mới áp dụng từ phiên sau; phiên đang chạy chỉ đổi bằng +5 min |
| Lưu trùng phiên khi gửi lại | TB | `id` tạo ở trình duyệt, `on conflict do nothing`, có test |
| Đồng hồ máy người dùng sai | Thấp | Server giới hạn số giây và từ chối `ended_at` ở tương lai |
| E2E chờ 25 phút thật | Cao | Dùng `page.clock` của Playwright để tua thời gian |
| Hai tab cùng mở app | Thấp | Cùng đọc một `localStorage`; nghe sự kiện `storage` để tab kia cập nhật |

## Việc bạn cần làm

| Khi nào | Việc |
|---|---|
| Checkpoint A | Bắt đầu một phiên rồi làm việc ở cửa sổ khác tới khi hết giờ, xem thông báo hiện ra. Thử Calendar của Phase 5 nếu chưa |
| Checkpoint hoàn thành | Chạy một phiên ngắn gắn với task và xem Time tracked |

## Open Questions

Plan chạy theo mặc định bên dưới. Trả lời khác thì mình sửa lại.

- **Phiên dừng giữa chừng có tính vào Time tracked không?** Mặc định có, nếu đã focus ít nhất 1 phút. Không tính vào streak.
- **Hết Focus có tự chạy Break luôn không?** Mặc định không, chỉ chuyển mode và chờ bấm Start.
- **Chip nhanh cho Focus:** mặc định 25 / 50 / 90 phút.
